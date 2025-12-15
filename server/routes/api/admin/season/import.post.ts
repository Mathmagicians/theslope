import {defineEventHandler, setResponseStatus, readValidatedBody} from 'h3'
import {z} from 'zod'
import {isSameDay} from 'date-fns'
import {parseCalendarCSV, parseTeamsCSV} from '~~/server/utils/csvImport'
import {fetchSeasons, createSeason, updateSeason, fetchInhabitants, createTeam} from '~~/server/data/prismaRepository'
import {saveDinnerEvents, assignCookingTeamToDinnerEvent, fetchDinnerEvents} from '~~/server/data/financesRepository'
import {createJobRun, completeJobRun} from '~~/server/data/maintenanceRepository'
import {useSeason} from '~/composables/useSeason'
import {useMaintenanceValidation} from '~/composables/useMaintenanceValidation'
import type {Season} from '~/composables/useSeasonValidation'
import type {CookingTeamCreate, CookingTeamDetail} from '~/composables/useCookingTeamValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error} = eventHandlerHelper
const {JobType, JobStatus} = useMaintenanceValidation()

/**
 * Request schema for season import
 */
const SeasonImportRequestSchema = z.object({
    calendarCsv: z.string().min(1, 'Calendar CSV content is required'),
    teamsCsv: z.string().min(1, 'Teams CSV content is required')
})

/**
 * Response type for season import
 */
interface SeasonImportResponse {
    seasonId: number
    seasonShortName: string
    isNew: boolean
    teamsCreated: number
    dinnerEventsCreated: number
    teamAssignmentsCreated: number
    unmatchedNames: string[]
}

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

        // Create name matcher: normalize and compare first name + last name
        const normalizedInhabitants = allInhabitants.map(i => ({
            id: i.id,
            fullName: `${i.name} ${i.lastName}`.toLowerCase().trim()
        }))

        const matchInhabitant = (csvName: string): number | null => {
            const normalizedCsvName = csvName.toLowerCase().trim()
            const match = normalizedInhabitants.find(i => i.fullName === normalizedCsvName)
            return match?.id ?? null
        }

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

        // Step 6: Create cooking teams with assignments
        const dinnerEvents = await fetchDinnerEvents(d1Client, savedSeason.id!)
        const createdTeams: CookingTeamDetail[] = []

        // Build inhabitant lookup by ID for assignment creation
        const inhabitantById = new Map(allInhabitants.map(i => [i.id, i]))

        // Count how many teams each inhabitant is assigned to (for allocation percentage)
        const teamCountByInhabitant = new Map<number, number>()
        for (const parsedTeam of parsedTeams.teams) {
            for (const member of parsedTeam.members) {
                if (member.inhabitantId !== null) {
                    const count = teamCountByInhabitant.get(member.inhabitantId) ?? 0
                    teamCountByInhabitant.set(member.inhabitantId, count + 1)
                }
            }
        }

        for (const parsedTeam of parsedTeams.teams) {
            const assignments = parsedTeam.members
                .filter(m => m.inhabitantId !== null)
                .map(m => {
                    const inhabitant = inhabitantById.get(m.inhabitantId!)!
                    const teamCount = teamCountByInhabitant.get(m.inhabitantId!) ?? 1
                    const allocationPercentage = Math.round(100 / teamCount)
                    return {
                        inhabitantId: m.inhabitantId!,
                        role: m.role,
                        allocationPercentage,
                        affinity: m.affinity,
                        inhabitant
                    }
                })

            const teamCreate: CookingTeamCreate = {
                seasonId: savedSeason.id!,
                name: parsedTeam.name,
                affinity: null,
                assignments
            }

            const createdTeam = await createTeam(d1Client, teamCreate)
            createdTeams.push(createdTeam)
            console.info(`${LOG} Created team: ${createdTeam.name} (ID: ${createdTeam.id}) with ${assignments.length} members`)
        }

        // Step 7: Assign cooking teams to dinner events based on calendar mapping
        // Map team number from CSV (1, 2, 3...) to created team (by index)
        const teamNumberToId = new Map<number, number>()
        const teamNumbers = Array.from(parsedCalendar.teamDateMapping.keys()).sort((a, b) => a - b)
        teamNumbers.forEach((teamNum, index) => {
            const team = createdTeams[index]
            if (team && index < createdTeams.length) {
                teamNumberToId.set(teamNum, team.id!)
            }
        })

        let teamAssignmentsCreated = 0
        for (const [teamNum, dates] of parsedCalendar.teamDateMapping) {
            const cookingTeamId = teamNumberToId.get(teamNum)
            if (!cookingTeamId) {
                console.warn(`${LOG} No team found for team number ${teamNum}`)
                continue
            }

            for (const date of dates) {
                const dinnerEvent = dinnerEvents.find(de => isSameDay(de.date, date))
                if (dinnerEvent) {
                    await assignCookingTeamToDinnerEvent(d1Client, dinnerEvent.id!, cookingTeamId)
                    teamAssignmentsCreated++
                }
            }
        }

        console.info(`${LOG} Assigned ${teamAssignmentsCreated} dinner events to teams`)

        const response: SeasonImportResponse = {
            seasonId: savedSeason.id!,
            seasonShortName: savedSeason.shortName!,
            isNew,
            teamsCreated: createdTeams.length,
            dinnerEventsCreated,
            teamAssignmentsCreated,
            unmatchedNames: parsedTeams.unmatched
        }

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
