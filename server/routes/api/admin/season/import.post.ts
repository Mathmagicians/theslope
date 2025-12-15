import {defineEventHandler, setResponseStatus, readValidatedBody} from 'h3'
import {z} from 'zod'
import {isSameDay} from 'date-fns'
import {parseCalendarCSV, parseTeamsCSV} from '~~/server/utils/csvImport'
import {fetchSeasons, createSeason, updateSeason, fetchInhabitants, createTeam, fetchTeams, createTeamAssignment} from '~~/server/data/prismaRepository'
import {pruneAndCreate} from '~/utils/batchUtils'
import {saveDinnerEvents, assignCookingTeamToDinnerEvent, fetchDinnerEvents} from '~~/server/data/financesRepository'
import {createJobRun, completeJobRun} from '~~/server/data/maintenanceRepository'
import {useSeason} from '~/composables/useSeason'
import {useHousehold} from '~/composables/useHousehold'
import {useCookingTeam} from '~/composables/useCookingTeam'
import {useMaintenanceValidation, type SeasonImportResponse} from '~/composables/useMaintenanceValidation'
import type {Season} from '~/composables/useSeasonValidation'
import type {CookingTeamCreate, CookingTeamDisplay, CookingTeamAssignment} from '~/composables/useCookingTeamValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error} = eventHandlerHelper
const {JobType, JobStatus, SeasonImportResponseSchema} = useMaintenanceValidation()

/**
 * Request schema for season import
 */
const SeasonImportRequestSchema = z.object({
    calendarCsv: z.string().min(1, 'Calendar CSV content is required'),
    teamsCsv: z.string().min(1, 'Teams CSV content is required')
})

/**
 * POST /api/admin/season/import
 *
 * Import season and teams from CSV files
 *
 * Orchestrates:
 * 1. Parse calendar CSV → season data + team-to-date mapping
 * 2. Parse teams CSV → team definitions with inhabitant matching
 * 3. Upsert season (find by shortName or create new)
 * 4. Generate dinner events
 * 5. Create cooking teams with assignments
 * 6. Assign cooking teams to dinner events based on calendar mapping
 *
 * ADR-002: Separate validation vs business logic
 * ADR-015: Idempotent operations
 */
export default defineEventHandler(async (event): Promise<SeasonImportResponse> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    const LOG = '📥 > SEASON_IMPORT > '

    // Validation - fail early
    let calendarCsv: string
    let teamsCsv: string
    try {
        const body = await readValidatedBody(event, SeasonImportRequestSchema.parse)
        calendarCsv = body.calendarCsv
        teamsCsv = body.teamsCsv
    } catch (error) {
        return throwH3Error(`${LOG} Invalid request body`, error, 400)
    }

    // Business logic with job tracking
    const jobRun = await createJobRun(d1Client, {
        jobType: JobType.MAINTENANCE_IMPORT,
        triggeredBy: 'ADMIN:season-import'
    })

    try {
        // Step 1: Parse calendar CSV
        console.info(`${LOG} Parsing calendar CSV`)
        const parsedCalendar = parseCalendarCSV(calendarCsv)
        console.info(`${LOG} Calendar parsed: ${parsedCalendar.teamDateMapping.size} teams, dates ${parsedCalendar.seasonDates.start.toISOString().split('T')[0]} to ${parsedCalendar.seasonDates.end.toISOString().split('T')[0]}`)

        // Step 2: Parse teams CSV with inhabitant matching
        console.info(`${LOG} Parsing teams CSV`)
        const allInhabitants = await fetchInhabitants(d1Client)

        // Create name matcher using shared business logic
        const {createInhabitantMatcher} = useHousehold()
        const matchInhabitant = createInhabitantMatcher(allInhabitants)

        const parsedTeams = parseTeamsCSV(teamsCsv, matchInhabitant)
        console.info(`${LOG} Teams parsed: ${parsedTeams.teams.length} teams, ${parsedTeams.unmatched.length} unmatched names`)

        // Step 3: Build season data from defaults + CSV
        const {getDefaultSeason, generateDinnerEventDataForSeason} = useSeason()

        const defaultSeason = getDefaultSeason()
        const seasonFromCsv: Partial<Season> = {
            seasonDates: parsedCalendar.seasonDates,
            cookingDays: parsedCalendar.cookingDays,
            holidays: parsedCalendar.holidays.map(h => ({start: h.start, end: h.end}))
        }

        // Merge: defaults with CSV overrides
        const seasonData: Season = {
            ...defaultSeason,
            ...seasonFromCsv
        }

        // Step 4: Upsert season (find by shortName or create)
        const existingSeasons = await fetchSeasons(d1Client)
        const existingSeason = existingSeasons.find(s => s.shortName === seasonData.shortName)

        let savedSeason: Season
        let isNew = false
        let dinnerEventsCreated = 0

        if (existingSeason) {
            console.info(`${LOG} Updating existing season: ${existingSeason.shortName} (ID: ${existingSeason.id})`)
            seasonData.id = existingSeason.id
            await updateSeason(d1Client, seasonData)
            savedSeason = {...seasonData, id: existingSeason.id}
        } else {
            console.info(`${LOG} Creating new season: ${seasonData.shortName}`)
            savedSeason = await createSeason(d1Client, seasonData)
            isNew = true
            console.info(`${LOG} Created season ID: ${savedSeason.id}`)
        }

        // Step 5: Generate dinner events (if new season or regenerate)
        const dinnerEventData = generateDinnerEventDataForSeason(savedSeason)
        if (dinnerEventData.length > 0) {
            // Check if events already exist
            const existingEvents = await fetchDinnerEvents(d1Client, savedSeason.id!)
            if (existingEvents.length === 0) {
                const savedEvents = await saveDinnerEvents(d1Client, dinnerEventData)
                dinnerEventsCreated = savedEvents.length
                console.info(`${LOG} Created ${dinnerEventsCreated} dinner events`)
            } else {
                console.info(`${LOG} Season already has ${existingEvents.length} dinner events, skipping generation`)
            }
        }

        // Step 6: Create cooking teams with assignments (idempotent - ADR-015)
        const dinnerEvents = await fetchDinnerEvents(d1Client, savedSeason.id!)
        const existingTeams = await fetchTeams(d1Client, savedSeason.id!)
        const {createDefaultTeamName, extractTeamNumber} = useCookingTeam()

        // Build desired teams from CALENDAR team numbers (not just teams CSV)
        // Teams CSV provides member assignments; calendar provides team numbers
        type DesiredTeam = { teamNumber: number, teamCreate: CookingTeamCreate }

        const calendarTeamNumbers = Array.from(parsedCalendar.teamDateMapping.keys()).sort((a, b) => a - b)

        // Map CSV team name → parsed team (for member lookup)
        const csvTeamByNumber = new Map(
            parsedTeams.teams.map(t => [extractTeamNumber(t.name), t] as const)
                .filter((entry): entry is [number, typeof parsedTeams.teams[0]] => entry[0] !== null)
        )

        // Count team assignments per inhabitant for allocation percentage
        const teamCountByInhabitant = parsedTeams.teams
            .flatMap(t => t.members)
            .filter(m => m.inhabitantId !== null)
            .reduce((acc, m) => acc.set(m.inhabitantId!, (acc.get(m.inhabitantId!) ?? 0) + 1), new Map<number, number>())

        // Build desired team for each calendar team number
        const desiredTeams: DesiredTeam[] = calendarTeamNumbers.map(teamNumber => {
            const csvTeam = csvTeamByNumber.get(teamNumber)
            const assignments = csvTeam
                ? csvTeam.members
                    .filter(m => m.inhabitantId !== null)
                    .map(m => ({
                        inhabitantId: m.inhabitantId!,
                        role: m.role,
                        allocationPercentage: Math.round(100 / (teamCountByInhabitant.get(m.inhabitantId!) ?? 1)),
                        affinity: m.affinity
                    }))
                : []

            return {
                teamNumber,
                teamCreate: {
                    seasonId: savedSeason.id!,
                    name: createDefaultTeamName(savedSeason.shortName!, teamNumber),
                    affinity: null,
                    assignments
                }
            }
        })

        // Reconcile teams using pruneAndCreate
        const getTeamNumber = (item: CookingTeamDisplay | DesiredTeam): number | undefined =>
            'teamNumber' in item ? item.teamNumber : extractTeamNumber(item.name) ?? undefined

        const reconcileTeams = pruneAndCreate<CookingTeamDisplay, DesiredTeam, number>(
            getTeamNumber,
            () => true // Same team number = same team (don't update)
        )
        const teamReconciliation = reconcileTeams(existingTeams)(desiredTeams)

        // Create new teams
        const newTeams = await Promise.all(
            teamReconciliation.create.map(t => createTeam(d1Client, t.teamCreate))
        )
        newTeams.forEach(t => console.info(`${LOG} Created team: ${t.name} (ID: ${t.id}) with ${t.assignments.length} members`))

        // For existing teams, reconcile assignments
        type DesiredAssignment = CookingTeamCreate['assignments'] extends (infer A)[] | undefined ? A : never

        const reconcileAssignments = pruneAndCreate<CookingTeamAssignment, DesiredAssignment, number>(
            a => a.inhabitantId,
            (e, i) => e.role === i.role
        )

        let memberAssignmentsCreated = 0
        for (const desired of teamReconciliation.idempotent) {
            const existingTeam = existingTeams.find(e => extractTeamNumber(e.name) === desired.teamNumber)
            if (!existingTeam?.id || !desired.teamCreate.assignments) continue

            const assignmentReconciliation = reconcileAssignments(existingTeam.assignments)(desired.teamCreate.assignments)

            const createdAssignments = await Promise.all(
                assignmentReconciliation.create.map(a => createTeamAssignment(d1Client, {
                    cookingTeamId: existingTeam.id!,
                    inhabitantId: a.inhabitantId,
                    role: a.role,
                    allocationPercentage: a.allocationPercentage,
                    affinity: a.affinity ?? null
                }))
            )
            memberAssignmentsCreated += createdAssignments.length
            if (createdAssignments.length > 0) {
                console.info(`${LOG} Added ${createdAssignments.length} members to existing team: ${existingTeam.name}`)
            }
        }

        const teamsCreated = newTeams.length
        console.info(`${LOG} Teams: ${teamsCreated} created, ${teamReconciliation.idempotent.length} existing, ${memberAssignmentsCreated} member assignments added`)

        // Step 7: Assign cooking teams to dinner events based on calendar mapping
        const allTeams = [...existingTeams, ...newTeams]
        const teamNumberToId = new Map(
            allTeams
                .map(t => [extractTeamNumber(t.name), t.id] as const)
                .filter((entry): entry is [number, number] => entry[0] !== null && entry[1] !== undefined)
        )

        let dinnerTeamAssignments = 0
        for (const [teamNum, dates] of parsedCalendar.teamDateMapping) {
            const cookingTeamId = teamNumberToId.get(teamNum)
            if (!cookingTeamId) {
                console.warn(`${LOG} No team found for team number ${teamNum}`)
                continue
            }

            for (const date of dates) {
                const dinnerEvent = dinnerEvents.find(de => isSameDay(de.date, date))
                // Skip if already assigned to correct team (idempotent - ADR-015)
                if (dinnerEvent && dinnerEvent.cookingTeamId !== cookingTeamId) {
                    await assignCookingTeamToDinnerEvent(d1Client, dinnerEvent.id!, cookingTeamId)
                    dinnerTeamAssignments++
                }
            }
        }

        console.info(`${LOG} Assigned ${dinnerTeamAssignments} dinner events to teams`)

        // Build and validate response through schema (ADR-001)
        const response = SeasonImportResponseSchema.parse({
            seasonId: savedSeason.id!,
            seasonShortName: savedSeason.shortName!,
            isNew,
            teamsCreated,
            dinnerEventsCreated,
            teamAssignmentsCreated: dinnerTeamAssignments,
            unmatchedNames: parsedTeams.unmatched
        })

        // Complete job run with success or partial (if unmatched names)
        const status = parsedTeams.unmatched.length > 0 ? JobStatus.PARTIAL : JobStatus.SUCCESS
        await completeJobRun(d1Client, jobRun.id, status, response)

        setResponseStatus(event, isNew ? 201 : 200)
        return response
    } catch (error) {
        // Mark job as failed
        await completeJobRun(d1Client, jobRun.id, JobStatus.FAILED, undefined, String(error))
        return throwH3Error(`${LOG} Import failed`, error)
    }
})
