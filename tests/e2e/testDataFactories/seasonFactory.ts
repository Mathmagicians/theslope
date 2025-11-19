import {useSeasonValidation, type Season} from "~/composables/useSeasonValidation"
import {useWeekDayMapValidation} from "~/composables/useWeekDayMapValidation"
import type {
    CookingTeamDisplay,
    CookingTeamDetail,
    CookingTeamAssignment,
    TeamRole
} from "~/composables/useCookingTeamValidation"
import type {DinnerEventDisplay} from "~/composables/useBookingValidation"
import testHelpers from "../testHelpers"
import {expect, type BrowserContext} from "@playwright/test"
import {HouseholdFactory} from "./householdFactory"
import {TicketFactory} from "./ticketFactory"
import {DinnerEventFactory} from "./dinnerEventFactory"

// Serialization now handled internally by repository layer
const {salt, temporaryAndRandom, headers} = testHelpers
const {createDefaultWeekdayMap} = useWeekDayMapValidation()
const ADMIN_TEAM_ENDPOINT = '/api/admin/team'

export class SeasonFactory {
    static readonly today = new Date(2025, 0, 1) // Jan 1, 2025 (Wed)
    static readonly oneWeekLater = new Date(2025, 0, 7) // Jan 7, 2025 (Tue) - generates exactly 3 events with Mon/Wed/Fri

    // Singleton cache for active season (only one can exist at a time)
    private static activeSeason: Season | null = null
    // Remember the previously active season before we activate our test season
    private static previouslyActiveSeason: Season | null = null

    /**
     * Generate a unique test date to avoid collisions between parallel test runs
     * @returns Date with random year (4025-4124) and random month (0-11)
     */
    static readonly generateUniqueDate = (): Date => {
        const randomYearOffset = Math.floor(Math.random() * 100) // 0-99
        const randomMonth = Math.floor(Math.random() * 12) // 0-11
        const year = 4025 + randomYearOffset
        return new Date(year, randomMonth, 1)
    }

    // Default season data for tests
    // Jan 1-7, 2025 with Mon/Wed/Fri = exactly 3 events (Wed Jan 1, Fri Jan 3, Mon Jan 6)
    static readonly defaultSeasonData: Season = {
        shortName: 'TestSeason',
        seasonDates: {
            start: this.today,
            end: this.oneWeekLater
        },
        holidays: [],
        isActive: false,
        cookingDays: createDefaultWeekdayMap([true, false, true, false, true, false, false]), // Mon, Wed, Fri
        consecutiveCookingDays: 1,
        ticketPrices: TicketFactory.defaultTicketPrices(),
        ticketIsCancellableDaysBefore: 10,
        diningModeIsEditableMinutesBefore: 90
    }

    // Default cooking team data for unit tests (no HTTP calls)
    static readonly defaultCookingTeamData = {
        seasonId: 1,
        name: "TestTeam"
    }

    static readonly defaultCookingTeam = (overrides = {}): Partial<CookingTeamDisplay> => ({
        ...SeasonFactory.defaultCookingTeamData,
        ...overrides
    })

    static readonly defaultCookingTeamDisplay = (overrides = {}): CookingTeamDisplay => ({
        id: 1,
        seasonId: 1,
        name: "TestTeam",
        cookingDaysCount: 0,
        assignments: [],
        ...overrides
    })

    static readonly defaultCookingTeamDetail = (overrides = {}): CookingTeamDetail => ({
        ...SeasonFactory.defaultCookingTeamDisplay(),
        dinnerEvents: [
            // Default includes sample dinner events for testing Detail pattern
            {
                id: 1,
                date: new Date(2025, 0, 1),
                menuTitle: 'Test Menu 1',
                menuDescription: 'Test Description',
                menuPictureUrl: null,
                state: 'SCHEDULED' as const,
                totalCost: 0,
                chefId: null,
                cookingTeamId: 1,
                heynaboEventId: null,
                seasonId: 1,
                createdAt: new Date(),
                updatedAt: new Date()
            } as DinnerEventDisplay
        ],
        ...overrides
    })

    static readonly defaultCookingTeamAssignment = (overrides = {}): CookingTeamAssignment => ({
        cookingTeamId: 1,
        inhabitantId: 42,
        role: 'CHEF' as const,
        allocationPercentage: 100,
        ...overrides
    })

    static readonly defaultSeason = (testSalt: string = Date.now().toString()): Season => {
        return {
            ...this.defaultSeasonData,
            shortName: salt(this.defaultSeasonData.shortName, testSalt)
        }
    }

    static readonly createSeason = async (
        context: BrowserContext,
        aSeason: Partial<Season> = {},
        expectedStatus: number = 201
    ): Promise<Season> => {
        // Merge partial with defaults to create full Season object
        const fullSeason: Season = {
            ...this.defaultSeason(),
            ...aSeason
        }

        // For expected failures, send raw data to test server validation
        // For expected success, send full domain object (repository handles serialization)
        const requestData = expectedStatus === 201
            ? fullSeason
            : aSeason

        const response = await context.request.put('/api/admin/season',
            {
                headers: headers,
                data: requestData
            })
        const status = response.status()
        const responseBody = await response.json()

        expect(status, `Expected ${expectedStatus}, got ${status}. Response: ${JSON.stringify(responseBody)}`).toBe(expectedStatus)

        // Only check for ID on successful creation
        if (expectedStatus === 201) {
            expect(responseBody.id, 'Response should contain the new season ID').toBeDefined()
        }

        return responseBody
    }

    /**
     * SINGLETON: Create and activate a season (only one active season allowed)
     * Returns cached instance if already created, otherwise creates and activates new season
     * Remembers the previously active season to restore after cleanup
     * @param context BrowserContext for API requests
     * @param aSeason Partial season data (only used on first call)
     * @returns Active Season (singleton)
     */
    static readonly createActiveSeason = async (
        context: BrowserContext,
        aSeason: Partial<Season> = {}
    ): Promise<Season> => {
        // Return cached active season if it exists
        if (this.activeSeason) {
            console.info('🌞 > SEASON_FACTORY > Returning cached active season:', this.activeSeason.shortName)
            return this.activeSeason
        }

        // Remember the currently active season (if any) before we deactivate it
        const activeSeasonIdResponse = await context.request.get('/api/admin/season/active', { headers })
        const currentActiveSeasonId = await activeSeasonIdResponse.json() as number | null

        if (currentActiveSeasonId) {
            const seasonResponse = await context.request.get(`/api/admin/season/${currentActiveSeasonId}`, { headers })
            this.previouslyActiveSeason = await seasonResponse.json()
            console.info('🌞 > SEASON_FACTORY > Remembered previously active season:', this.previouslyActiveSeason.shortName)
        }

        // Create the season (always creates with isActive: false per defaultSeason)
        const createdSeason = await this.createSeason(context, aSeason)

        // Activate it via the activation endpoint (this deactivates the previous active season)
        const response = await context.request.post('/api/admin/season/active', {
            headers: headers,
            data: { seasonId: createdSeason.id }
        })

        expect(response.status(), `Expected 200, got ${response.status()}`).toBe(200)
        const activatedSeason = await response.json()
        expect(activatedSeason.isActive, 'Season should be active').toBe(true)

        // Cache the active season
        this.activeSeason = activatedSeason
        console.info('🌞 > SEASON_FACTORY > Created and cached active season:', activatedSeason.shortName)

        return activatedSeason
    }

    /**
     * Clean up the cached active season singleton
     * Deletes the test season from database, clears the cache, and restores previously active season
     * @param context BrowserContext for API requests
     */
    static readonly cleanupActiveSeason = async (context: BrowserContext): Promise<void> => {
        if (this.activeSeason) {
            console.info('🌞 > SEASON_FACTORY > Cleaning up cached active season:', this.activeSeason.shortName)
            await this.deleteSeason(context, this.activeSeason.id!)
            this.activeSeason = null
            console.info('🌞 > SEASON_FACTORY > Active season cache cleared')
        }

        // Restore the previously active season if one existed
        if (this.previouslyActiveSeason) {
            console.info('🌞 > SEASON_FACTORY > Restoring previously active season:', this.previouslyActiveSeason.shortName)
            const response = await context.request.post('/api/admin/season/active', {
                headers: headers,
                data: { seasonId: this.previouslyActiveSeason.id }
            })
            expect(response.status(), `Expected 200, got ${response.status()}`).toBe(200)
            console.info('🌞 > SEASON_FACTORY > Previously active season restored')
            this.previouslyActiveSeason = null
        }
    }

    static readonly getAllSeasons = async (
        context: BrowserContext,
        expectedStatus: number = 200
    ): Promise<Season[]> => {
        const {SeasonSchema} = useSeasonValidation()
        const response = await context.request.get('/api/admin/season')
        expect(response.status()).toBe(expectedStatus)
        const rawData = await response.json()

        // Validate API returns data conforming to SeasonSchema (converts ISO strings to Dates)
        const parsedSeasons = rawData.map((season: any) => {
            const result = SeasonSchema.safeParse(season)
            expect(result.success, `API should return valid Season objects. Errors: ${JSON.stringify(result.success ? [] : result.error.errors)}`).toBe(true)
            return result.data!
        })

        return parsedSeasons
    }

    static readonly getSeason = async (
        context: BrowserContext,
        id: number,
        expectedStatus: number = 200
    ): Promise<Season> => {
        const {SeasonSchema} = useSeasonValidation()
        const response = await context.request.get(`/api/admin/season/${id}`)
        expect(response.status()).toBe(expectedStatus)
        const rawData = await response.json()

        // Validate API returns data conforming to SeasonSchema (converts ISO strings to Dates)
        const result = SeasonSchema.safeParse(rawData)
        expect(result.success, `API should return valid Season object. Errors: ${JSON.stringify(result.success ? [] : result.error.errors)}`).toBe(true)

        return result.data!
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

    /**
     * Cleanup multiple seasons by ID (for test afterAll hooks)
     * Automatically includes singleton active season if it exists
     * Gracefully handles 404 errors for already-deleted seasons
     */
    static readonly cleanupSeasons = async (
        context: BrowserContext,
        seasonIds: number[]
    ): Promise<void> => {
        // Add active season to cleanup list if it exists
        const allSeasonIds = this.activeSeason?.id
            ? [...seasonIds, this.activeSeason.id]
            : seasonIds

        if (allSeasonIds.length === 0) return

        // Delete all seasons in parallel
        await Promise.all(
            allSeasonIds.map(async (id) => {
                try {
                    await this.deleteSeason(context, id)
                } catch (error) {
                    console.error(`Failed to delete test season with ID ${id}:`, error)
                }
            })
        )

        // Clear singleton cache
        if (this.activeSeason) {
            console.info('🌞 > SEASON_FACTORY > Cleared cached active season')
            this.activeSeason = null
        }
    }

    static readonly createSeasonWithTeams = async (
        context: BrowserContext,
        seasonData: Partial<Season> = this.defaultSeason(),
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
     * Create a single dinner event for a season (convenience wrapper)
     */
    static readonly createDinnerEventForSeason = async (
        context: BrowserContext,
        seasonId: number,
        overrides: Partial<DinnerEventDisplay> = {}
    ): Promise<DinnerEventDisplay> => {
        return await DinnerEventFactory.createDinnerEvent(context, {
            seasonId,
            ...overrides
        })
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
        expectedStatus: number = 201,
        overrides: Partial<CookingTeam> = {}
    ): Promise<CookingTeam> => {
        const teamData = {
            // Only salt for success cases (201) - validation tests need exact invalid data
            name: expectedStatus === 201 ? salt(teamName) : teamName,
            seasonId: seasonId,
            ...overrides
        }
        const response = await context.request.put(ADMIN_TEAM_ENDPOINT, {
            headers: headers,
            data: teamData
        })
        const status = response.status()
        const errorBody = status !== expectedStatus ? await response.text() : ''
        const responseBody = status === expectedStatus ? await response.json() : null
        expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)
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
        memberCount: number = 2
    ): Promise<any> => {
        // First create the team
        const team = await this.createCookingTeamForSeason(context, seasonId, teamName)

        // Create household with inhabitants
        const householdWithInhabitants = await HouseholdFactory.createHouseholdWithInhabitants(context, {name: `House-of-${teamName}`}, memberCount)

        // Assign members to team with different roles
        const roles: TeamRole[] = ['CHEF', 'COOK', 'JUNIORHELPER']
        await Promise.all(
            householdWithInhabitants.inhabitants.map((inhabitant: any, index: number) =>
                this.assignMemberToTeam(context, team.id!, inhabitant.id, roles[index % roles.length]!)
            )
        )

        // Return team with member assignments and household for cleanup
        const teamWithAssignments = await this.getCookingTeamById(context, team.id!)
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
            cookingTeamId: teamId,  // Schema expects 'cookingTeamId' not 'teamId'
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

    static readonly assignTeamAffinities = async (context: BrowserContext, seasonId: number): Promise<{seasonId: number, teamCount: number, teams: any[]}> => {
        const response = await context.request.post(`/api/admin/season/${seasonId}/assign-team-affinities`)
        expect(response.status()).toBe(200)
        return response.json()
    }

    static readonly assignCookingTeams = async (context: BrowserContext, seasonId: number): Promise<{seasonId: number, eventCount: number, events: any[]}> => {
        const response = await context.request.post(`/api/admin/season/${seasonId}/assign-cooking-teams`)
        expect(response.status()).toBe(200)
        return response.json()
    }

}
