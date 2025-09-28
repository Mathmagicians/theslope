import {formatDate} from "../../../app/utils/date"
import type {Season} from "../../../app/composables/useSeasonValidation"
import {useSeasonValidation} from "../../../app/composables/useSeasonValidation"
import testHelpers from "../testHelpers"
import {expect, BrowserContext} from "@playwright/test";

const {serializeSeason, deserializeSeason} = useSeasonValidation()
const {salt, headers} = testHelpers
const ADMIN_TEAM_ENDPOINT = '/api/admin/team'

export class SeasonFactory {
    static readonly today = new Date()
    static readonly ninetyDaysLater = new Date(this.today.getTime() + 90 * 24 * 60 * 60 * 1000)

    static readonly defaultSeasonData: Season = {
        shortName: 'TestSeason',
        seasonDates: {
            start: formatDate(this.today),
            end: formatDate(this.ninetyDaysLater)
        },
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
        holidays: [],
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

    // === SEASON AGGREGATE METHODS ===

    /**
     * Create a season with cooking teams (for 2a, 2b test scenarios)
     */
    static readonly createSeasonWithTeams = async (
        context: BrowserContext,
        seasonData?: Partial<Season>,
        teamCount: number = 2
    ): Promise<{ season: Season, teams: any[] }> => {
        throw new Error('createSeasonWithTeams: Not implemented - mock method')
    }

    /**
     * Create dinner events for season (for 2a, 2b test scenarios)
     */
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

    /**
     * Create cooking team for existing season (for 1a, 1b test scenarios)
     */
    static readonly createCookingTeamForSeason = async (
        context: BrowserContext,
        seasonId: number,
        teamName: string = 'TestTeam',
        expectedStatus: number = 201
    ): Promise<any> => {
        const teamData = {
            name: salt(teamName, Date.now().toString()),
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

    /**
     * Create cooking team with member assignments (for 1a, 1b test scenarios)
     */
    static readonly createTeamWithMembers = async (
        context: BrowserContext,
        seasonId: number,
        teamName: string = 'TestTeam',
        memberCount: number = 3
    ): Promise<any> => {
        // First create the team
        const team = await this.createCookingTeamForSeason(context, seasonId, teamName)

        // Then add the specified number of members
        const members = []
        for (let i = 0; i < memberCount; i++) {
            const memberData = {
                seasonId: seasonId,
                name: salt(`TestMember${i + 1}`),
                role: i === 0 ? 'CHEF' : (i === 1 ? 'COOK' : 'JUNIOR_HELPER') // Vary roles
            }

            const member = await this.assignMemberToTeam(context, team.id, memberData)
            members.push(member)
        }

        // Return team with member assignments populated
        const teamWithMembers = await this.getCookingTeamById(context, team.id)
        return teamWithMembers
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
        memberData: any,
        expectedStatus: number = 201
    ): Promise<any> => {
        const response = await context.request.put(`${ADMIN_TEAM_ENDPOINT}/assignments`, {
            headers: headers,
            data: memberData
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
        memberAssignmentIds: number,
        expectedStatus: number = 200
    ): Promise<any[]> => {
        throw new Error('assignMembersToTeam: Not implemented - mock method')
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
