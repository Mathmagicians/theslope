import {formatDate, formatDateRange, createDateRange} from "../../../app/utils/date"
import {useSeasonValidation, type Season} from "../../../app/composables/useSeasonValidation"
import {
    type CookingTeam,
    type TeamRole
} from "../../../app/composables/useCookingTeamValidation"
import testHelpers from "../testHelpers"
import {expect, BrowserContext} from "@playwright/test";
import {HouseholdFactory} from "./householdFactory";

const {serializeSeason, deserializeSeason} = useSeasonValidation()
const {salt, headers} = testHelpers
const ADMIN_TEAM_ENDPOINT = '/api/admin/team'

export class SeasonFactory {
    static readonly today = new Date()
    static readonly ninetyDaysLater = new Date(this.today.getTime() + 90 * 24 * 60 * 60 * 1000)
    static readonly tomorrow = new Date(this.today.getTime() + 1 * 24 * 60 * 60 * 1000)

    // Default season data for tests
    static readonly defaultSeasonData: Season = {
        shortName: 'TestSeason',
        seasonDates: {
            start: this.today,
            end: this.ninetyDaysLater
        },
        holidayDates: [createDateRange(this.today, this.tomorrow)],
        isActive: false,
        cookingDays: {
            mandag: true,
            tirsdag: true,
            onsdag: true,
            torsdag: true,
            fredag: false,
            loerdag: false,
            soendag: false
        },
        holidays: [ createDateRange(this.today, this.tomorrow)],
        ticketIsCancellableDaysBefore: 10,
        diningModeIsEditableMinutesBefore: 90
    }

    // TODO static factory method with updated season with an extra holiday

    static readonly defaultSeason = (testSalt: string = Date.now().toString()) => {
        const saltedSeason = {
            ...this.defaultSeasonData,
            shortName: salt(this.defaultSeasonData.shortName as string, testSalt)
        }
        return {
            season: saltedSeason,
            serializedSeason: serializeSeason(saltedSeason)
        }
    }

    static readonly createSeason = async (
        context: BrowserContext,
        aSeason: Partial<Season> = this.defaultSeason().season,
        expectedStatus: number = 201
    ): Promise<Season> => {
        // For expected failures, send raw data to test server validation
        // For expected success, use serializeSeason for proper client-side validation
        const requestData = expectedStatus === 201
            ? serializeSeason(aSeason as Season)
            : aSeason

        const response = await context.request.put('/api/admin/season',
            {
                headers: headers,
                data: requestData
            })
        const status = response.status()
        const responseBody = await response.json()

        expect(status, 'Unexpected status').toBe(expectedStatus)

        // Only check for ID on successful creation
        if (expectedStatus === 201) {
            expect(responseBody.id, 'Response should contain the new season ID').toBeDefined()
        }

        return responseBody
    }

    static readonly deleteSeason = async (
        context: BrowserContext,
        id: number,
        expectedStatus: number = 200
    ): Promise<Season | null> => {
        const deleteResponse = await context.request.delete(`/api/admin/season/${id}`)
        expect(deleteResponse.status()).toBe(expectedStatus)

        if (expectedStatus === 200) {
            const responseBody = await deleteResponse.json()
            expect(responseBody).toBeDefined()
            return responseBody
        }

        return null
    }

    static readonly createSeasonWithTeams = async (
        context: BrowserContext,
        seasonData: Partial<Season> = this.defaultSeason().season,
        teamCount: number = 2
    ): Promise<{ season: Season, teams: any[] }> => {
        const season = await this.createSeason(context, seasonData)
        const teams = await Promise.all(
            Array(teamCount).fill(0).map(() => this.createCookingTeamForSeason(context, season.id as number))
        )
        return {season, teams}
    }

    static readonly generateDinnerEventsForSeason = async (
        context: BrowserContext,
        seasonId: number,
        expectedStatus: number = 201
    ): Promise<any> => {
        const response = await context.request.post(`/api/admin/season/${seasonId}/generate-dinner-events`)

        const status = response.status()
        expect(status, `Expected status ${expectedStatus}`).toBe(expectedStatus)

        if (expectedStatus === 201) {
            const responseBody = await response.json()
            expect(responseBody.seasonId).toBe(seasonId)
            expect(responseBody.eventCount).toBeGreaterThan(0)
            expect(Array.isArray(responseBody.events)).toBe(true)
            return responseBody
        }

        return await response.json()
    }

    static readonly createDinnerEventsForSeason = async (
        context: BrowserContext,
        seasonId: number,
        eventCount: number = 3
    ): Promise<any[]> => {
        throw new Error('createDinnerEventsForSeason: Not implemented - mock method')
    }

    /**
     * Create season with teams and dinner events (for comprehensive test scenarios)
     */
    static readonly createSeasonWithTeamsAndDinners = async (
        context: BrowserContext,
        options: {
            withTeams?: number,
            withEvents?: number,
            withAssignments?: number
        } = {}
    ): Promise<any> => {
        throw new Error('createSeasonWithTeamsAndDinners: Not implemented - mock method')
    }

    // === COOKING TEAM METHODS ===

    static readonly createCookingTeamForSeason = async (
        context: BrowserContext,
        seasonId: number,
        teamName: string = 'TestTeam',
        expectedStatus: number = 201
    ): Promise<CookingTeam> => {
        const teamData = {
            name: salt(teamName),
            seasonId: seasonId
        }
        const response = await context.request.put(ADMIN_TEAM_ENDPOINT, {
            headers: headers,
            data: teamData
        })
        const status = response.status()
        const responseBody = await response.json()
        expect(status, 'Unexpected status').toBe(expectedStatus)
        if (expectedStatus === 201) {
            expect(responseBody.id, 'Response should contain the new team ID').toBeDefined()
            expect(responseBody.seasonId).toBe(seasonId)
        }
        return responseBody
    }

    static readonly createCookingTeamWithMembersForSeason = async (
        context: BrowserContext,
        seasonId: number,
        teamName: string = salt('TestTeam'),
        memberCount: number = 3
    ): Promise<any> => {
        // First create the team
        const team = await this.createCookingTeamForSeason(context, seasonId, teamName)

        // Create household with inhabitants
        const householdWithInhabitants = await HouseholdFactory.createHouseholdWithInhabitants(context, `House-of-${teamName}`, memberCount)

        // Assign members to team with different roles
        const roles: TeamRole[] = ['CHEF', 'COOK', 'JUNIORHELPER']
        await Promise.all(
            householdWithInhabitants.inhabitants.map((inhabitant: any, index: number) =>
                this.assignMemberToTeam(context, team.id, inhabitant.id, roles[index % roles.length])
            )
        )

        // Return team with member assignments and household for cleanup
        const teamWithAssignments = await this.getCookingTeamById(context, team.id)
        return {
            ...teamWithAssignments,
            householdId: householdWithInhabitants.household.id
        }
    }

    static readonly getCookingTeamById = async (
        context: BrowserContext,
        teamId: number,
        expectedStatus: number = 200
    ): Promise<any> => {
        const response = await context.request.get(`${ADMIN_TEAM_ENDPOINT}/${teamId}`)

        const status = response.status()
        expect(status, 'Unexpected status').toBe(expectedStatus)

        if (expectedStatus === 200) {
            const responseBody = await response.json()
            expect(responseBody.id).toBe(teamId)
            return responseBody
        }

        return null
    }

    static readonly getCookingTeamAssignment = async (
        context: BrowserContext,
        assignmentId: number,
        expectedStatus: number = 200
    ): Promise<any> => {
        const response = await context.request.get(`/api/admin/team/assignment/${assignmentId}`)

        const status = response.status()
        expect(status, 'Unexpected status').toBe(expectedStatus)

        if (expectedStatus === 200) {
            const responseBody = await response.json()
            expect(responseBody.id).toBe(assignmentId)
            return responseBody
        }

        return null
    }

    static readonly assignMemberToTeam = async (
        context: BrowserContext,
        teamId: number,
        inhabitantId: number,
        role: TeamRole,
        expectedStatus: number = 201
    ): Promise<any> => {
        const teamAssignmentData = {
            teamId: teamId,
            inhabitantId: inhabitantId,
            role: role
        }
        const response = await context.request.put(`${ADMIN_TEAM_ENDPOINT}/assignment`, {
            headers: headers,
            data: teamAssignmentData
        })

        const status = response.status()
        expect(status, 'Unexpected status').toBe(expectedStatus)

        if (expectedStatus === 201) {
            return await response.json()
        }
        return null
    }

    static readonly removeMemberFromTeam = async (
        context: BrowserContext,
        teamId: number,
        assignmentId: number,
        expectedStatus: number = 200
    ): Promise<any> => {
        const response = await context.request.delete(`${ADMIN_TEAM_ENDPOINT}/assignment/${assignmentId}`)

        const status = response.status()
        expect(status, 'Unexpected status').toBe(expectedStatus)

        if (expectedStatus === 200) {
            return await response.json()
        }
        return null
    }

    /**
     * Associate team with dinner events (weak relation) for 1a, 1b test scenarios
     */
    static readonly assignTeamToDinnerEvents = async (
        context: BrowserContext,
        teamId: number,
        eventIds: number[]
    ): Promise<any[]> => {
        throw new Error('assignTeamToDinnerEvents: Not implemented - mock method')
    }

    /**
     * Delete cooking team (for 1a test scenarios)
     */
    static readonly deleteCookingTeam = async (
        context: BrowserContext,
        teamId: number,
        expectedStatus: number = 200
    ): Promise<any> => {
        const response = await context.request.delete(`${ADMIN_TEAM_ENDPOINT}/${teamId}`)

        const status = response.status()
        expect(status, 'Unexpected status').toBe(expectedStatus)
        if (expectedStatus === 200) {
            return await response.json()
        }
        return null
    }

    static readonly getCookingTeamsForSeason = async (
        context: BrowserContext,
        seasonId: number
    ): Promise<any[]> => {
        const response = await context.request.get(`${ADMIN_TEAM_ENDPOINT}?seasonId=${seasonId}`)
        expect(response.status()).toBe(200)

        const responseBody = await response.json()
        expect(Array.isArray(responseBody)).toBe(true)
        return responseBody
    }

    static readonly getAllCookingTeams = async (context: BrowserContext): Promise<any[]> => {
        const response = await context.request.get(ADMIN_TEAM_ENDPOINT)
        expect(response.status()).toBe(200)

        const responseBody = await response.json()
        expect(Array.isArray(responseBody)).toBe(true)
        return responseBody
    }

}
