import {useSeasonValidation, type Season} from "~/composables/useSeasonValidation"
import {useWeekDayMapValidation} from "~/composables/useWeekDayMapValidation"
import {useCookingTeamValidation} from "~/composables/useCookingTeamValidation"
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
const {CookingTeamDetailSchema} = useCookingTeamValidation()
const ADMIN_TEAM_ENDPOINT = '/api/admin/team'

export class SeasonFactory {
    // Pure dates (midnight) for serialization roundtrip stability
    static readonly today = (() => {
        const date = new Date()
        date.setHours(0, 0, 0, 0)
        return date
    })() // Current date at midnight for realistic deadline testing

    static readonly oneWeekLater = (() => {
        const date = new Date()
        date.setDate(date.getDate() + 7)
        date.setHours(0, 0, 0, 0)
        return date
    })() // 7 days from today at midnight - short season for fast tests

    // Fixed singleton name for parallel-safe active season (shared across all test workers)
    static readonly E2E_SINGLETON_NAME = 'TestSeason-E2E-Singleton'

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
    // 7-day season starting from current date with Mon/Wed/Fri cooking days for fast, realistic testing
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

    static readonly defaultSeason = (testSalt: string = temporaryAndRandom()): Season => {
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
        const {SeasonSchema} = useSeasonValidation()

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

        // Only validate and check for ID on successful creation
        if (expectedStatus === 201) {
            expect(responseBody.id, 'Response should contain the new season ID').toBeDefined()

            // Validate API returns data conforming to SeasonSchema (converts ISO strings to Dates)
            const result = SeasonSchema.safeParse(responseBody)
            expect(result.success, `API should return valid Season object. Errors: ${JSON.stringify(result.success ? [] : result.error.errors)}`).toBe(true)

            return result.data!
        }

        return responseBody
    }

    /**
     * SINGLETON: Create and activate a season (only one active season allowed)
     * Uses fixed singleton name (E2E_SINGLETON_NAME) for parallel-safe execution
     * Returns cached instance if already created, otherwise creates and activates new season
     * If singleton season exists in DB, uses it (parallel-safe across workers)
     * Remembers the previously active season to restore after cleanup
     * @param context BrowserContext for API requests
     * @param aSeason Partial season data (merged with defaults, shortName always overridden to E2E_SINGLETON_NAME)
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

        // Check if the singleton test season already exists in DB (parallel-safe)
        const allSeasons = await this.getAllSeasons(context)
        const existingSingleton = allSeasons.find(s => s.shortName === this.E2E_SINGLETON_NAME)

        if (existingSingleton) {
            console.info('🌞 > SEASON_FACTORY > Found existing singleton season:', existingSingleton.shortName)

            // If it's already active, use it
            if (existingSingleton.isActive) {
                this.activeSeason = existingSingleton
                console.info('🌞 > SEASON_FACTORY > Singleton season is already active')
                return existingSingleton
            }

            // Otherwise, activate it (this deactivates any other active season)
            console.info('🌞 > SEASON_FACTORY > Activating existing singleton season')
            const response = await context.request.post('/api/admin/season/active', {
                headers: headers,
                data: { seasonId: existingSingleton.id }
            })

            expect(response.status(), `Expected 200, got ${response.status()}`).toBe(200)
            const rawSeason = await response.json()

            // Validate response
            const {SeasonSchema} = useSeasonValidation()
            const result = SeasonSchema.safeParse(rawSeason)
            expect(result.success, `API should return valid Season object. Errors: ${JSON.stringify(result.success ? [] : result.error.errors)}`).toBe(true)
            const activatedSeason = result.data!

            expect(activatedSeason.isActive, 'Season should be active').toBe(true)

            this.activeSeason = activatedSeason
            return activatedSeason
        }

        // Remember the currently active season (if any) to restore later
        const currentActiveSeasonId = await this.getActiveSeasonId(context)
        if (currentActiveSeasonId) {
            const seasonResponse = await context.request.get(`/api/admin/season/${currentActiveSeasonId}`, { headers })
            const existingActiveSeason = await seasonResponse.json()

            // Only remember it if it's not a test season (don't restore test seasons)
            if (!existingActiveSeason.shortName?.startsWith('TestSeason')) {
                this.previouslyActiveSeason = existingActiveSeason
                console.info('🌞 > SEASON_FACTORY > Remembered previously active season:', existingActiveSeason.shortName)
            }
        }

        // Try to create new singleton season (race condition: another worker might create it first)
        console.info('🌞 > SEASON_FACTORY > Creating new singleton season:', this.E2E_SINGLETON_NAME)
        let createdSeason: Season | null = null

        try {
            createdSeason = await this.createSeason(context, {
                ...aSeason,
                shortName: this.E2E_SINGLETON_NAME // Override to fixed singleton name
            })
        } catch (error: any) {
            // Unique constraint violation - another worker created the singleton first
            console.info('🌞 > SEASON_FACTORY > Singleton already exists (created by another worker), fetching it')

            // Fetch the existing singleton
            const allSeasonsAfterError = await this.getAllSeasons(context)
            const existingSingleton = allSeasonsAfterError.find(s => s.shortName === this.E2E_SINGLETON_NAME)

            if (!existingSingleton) {
                throw new Error('Failed to create singleton and could not find existing singleton season')
            }

            // Activate it if not already active
            if (!existingSingleton.isActive) {
                console.info('🌞 > SEASON_FACTORY > Activating existing singleton season')
                const response = await context.request.post('/api/admin/season/active', {
                    headers: headers,
                    data: { seasonId: existingSingleton.id }
                })
                expect(response.status(), `Expected 200, got ${response.status()}`).toBe(200)
                const rawSeason = await response.json()

                // Validate response
                const {SeasonSchema} = useSeasonValidation()
                const result = SeasonSchema.safeParse(rawSeason)
                expect(result.success, `API should return valid Season object. Errors: ${JSON.stringify(result.success ? [] : result.error.errors)}`).toBe(true)
                const activatedSeason = result.data!

                this.activeSeason = activatedSeason
                return activatedSeason
            } else {
                console.info('🌞 > SEASON_FACTORY > Using existing active singleton season')
                this.activeSeason = existingSingleton
                return existingSingleton
            }
        }

        // We successfully created the singleton - activate it
        const response = await context.request.post('/api/admin/season/active', {
            headers: headers,
            data: { seasonId: createdSeason.id }
        })

        expect(response.status(), `Expected 200, got ${response.status()}`).toBe(200)
        const rawSeason = await response.json()

        // Validate response
        const {SeasonSchema} = useSeasonValidation()
        const result = SeasonSchema.safeParse(rawSeason)
        expect(result.success, `API should return valid Season object. Errors: ${JSON.stringify(result.success ? [] : result.error.errors)}`).toBe(true)
        const activatedSeason = result.data!

        expect(activatedSeason.isActive, 'Season should be active').toBe(true)

        // Cache the active season
        this.activeSeason = activatedSeason
        console.info('🌞 > SEASON_FACTORY > Created and cached singleton active season:', activatedSeason.shortName)

        // Create default dinner events for the singleton season
        await this.createDefaultDinnerEvents(context, activatedSeason)

        return activatedSeason
    }

    /**
     * Create default dinner events for the singleton season on all cooking days
     * This is called automatically when creating a new singleton season
     * Uses computeCookingDates helper to find all cooking days in the 7-day season
     * @param context BrowserContext for API requests
     * @param season The season to create dinner events for
     */
    private static readonly createDefaultDinnerEvents = async (
        context: BrowserContext,
        season: Season
    ): Promise<void> => {
        // Check if dinner events already exist using DinnerEventFactory
        const existingEvents = await DinnerEventFactory.getDinnerEventsForSeason(context, season.id!)

        if (existingEvents.length > 0) {
            return
        }

        // Use computeCookingDates helper to find all cooking days in the season
        const {computeCookingDates} = await import('~/utils/season')
        const cookingDates = computeCookingDates(
            season.cookingDays,
            season.seasonDates,
            season.holidays
        )

        // Create dinner events for all cooking days using DinnerEventFactory
        for (let i = 0; i < cookingDates.length; i++) {
            await DinnerEventFactory.createDinnerEvent(context, {
                seasonId: season.id!,
                date: cookingDates[i],
                menuTitle: `Singleton Test Menu ${i + 1}`,
                menuDescription: `Test meal for day ${i + 1}`
            })
        }

        // Verify all dinner events were created successfully
        const createdEvents = await DinnerEventFactory.getDinnerEventsForSeason(context, season.id!)
        expect(createdEvents.length, `Singleton season should have ${cookingDates.length} dinner events (one per cooking day)`).toBe(cookingDates.length)
    }

    /**
     * Clean up the cached active season singleton
     * Deletes the test season from database, clears the cache, and restores previously active season
     * Gracefully handles parallel workers trying to delete the same singleton (ignores 404)
     * @param context BrowserContext for API requests
     */
    static readonly cleanupActiveSeason = async (context: BrowserContext): Promise<void> => {
        // Look up singleton in database (don't rely on in-memory cache - global teardown runs in separate process)
        const allSeasons = await this.getAllSeasons(context)
        const singleton = allSeasons.find(s => s.shortName === this.E2E_SINGLETON_NAME)

        if (singleton) {
            console.info('🌞 > SEASON_FACTORY > Cleaning up singleton season:', singleton.shortName)
            try {
                await this.deleteSeason(context, singleton.id!)
                console.info('🌞 > SEASON_FACTORY > Singleton season deleted')
            } catch (error) {
                // Ignore 404 errors - another worker already deleted the singleton
                console.info('🌞 > SEASON_FACTORY > Season already deleted (by another worker), skipping')
            }
        }

        // Clear in-memory cache (may be null if global teardown process)
        this.activeSeason = null

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
        // Delete all orders first (Order -> TicketPrice has onDelete: Restrict)
        try {
            const season = await this.getSeason(context, id)
            if (season?.dinnerEvents) {
                const {OrderFactory} = await import('./orderFactory')
                for (const dinnerEvent of season.dinnerEvents) {
                    try {
                        const ordersResponse = await context.request.get(`/api/order?dinnerEventId=${dinnerEvent.id}`, { headers })
                        if (ordersResponse.ok()) {
                            const orders = await ordersResponse.json()
                            for (const order of orders) {
                                try {
                                    await OrderFactory.deleteOrder(context, order.id)
                                } catch (orderError) {
                                    console.warn(`❌ Cleanup failed: Could not delete order ${order.id} for season ${id}:`, orderError)
                                }
                            }
                        }
                    } catch (fetchError) {
                        console.warn(`❌ Cleanup failed: Could not fetch orders for dinner event ${dinnerEvent.id} (season ${id}):`, fetchError)
                    }
                }
            }
        } catch (error: any) {
            // Only log if not a 404 (season already deleted is expected)
            if (error?.matcherResult?.actual !== 404) {
                console.warn(`❌ Cleanup failed: Could not fetch season ${id} for order cleanup:`, error)
            }
        }

        // Try to delete season - be resilient in cleanup (expectedStatus === 200)
        try {
            const deleteResponse = await context.request.delete(`/api/admin/season/${id}`)

            if (deleteResponse.status() === expectedStatus) {
                if (expectedStatus === 200) {
                    return await deleteResponse.json()
                }
                return null
            } else if (deleteResponse.status() === 404 && expectedStatus === 200) {
                // Already deleted - silent success for cleanup
                return null
            } else {
                const errorBody = await deleteResponse.text()
                console.warn(`❌ Cleanup failed: Season ${id} deletion returned ${deleteResponse.status()} (expected ${expectedStatus}):`, errorBody)
                return null
            }
        } catch (deleteError) {
            console.warn(`❌ Cleanup failed: Exception deleting season ${id}:`, deleteError)
            return null
        }
    }

    /**
     * Cleanup multiple seasons by ID (for test afterAll hooks)
     * NOTE: Does NOT delete singleton active season - that's cleaned up by global teardown
     * Worker-safe: Filters out singleton by name (E2E_SINGLETON_NAME) not by ID
     * Gracefully handles 404 errors for already-deleted seasons
     */
    static readonly cleanupSeasons = async (
        context: BrowserContext,
        seasonIds: number[]
    ): Promise<void> => {
        if (seasonIds.length === 0) return

        // Fetch all seasons to identify singleton by name (worker-safe)
        const allSeasons = await this.getAllSeasons(context)
        const singletonId = allSeasons.find(s => s.shortName === this.E2E_SINGLETON_NAME)?.id

        // Filter out singleton season ID if present
        const filteredIds = seasonIds.filter(id => id !== singletonId)

        if (filteredIds.length === 0) {
            console.info('🌞 > SEASON_FACTORY > No seasons to cleanup (singleton excluded)')
            return
        }

        console.info(`🌞 > SEASON_FACTORY > Cleaning up ${filteredIds.length} test season(s)`)

        // Delete all seasons in parallel
        await Promise.all(
            filteredIds.map(async (id) => {
                try {
                    await this.deleteSeason(context, id)
                } catch (error) {
                    console.error(`Failed to delete test season with ID ${id}:`, error)
                }
            })
        )
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
        const response = await context.request.post(`/api/admin/season/${seasonId}/generate-dinner-events`, {
            headers: headers
        })

        const status = response.status()
        const errorBody = status !== expectedStatus ? await response.text() : ''
        expect(status, `Expected ${expectedStatus}. Response: ${errorBody}`).toBe(expectedStatus)

        if (expectedStatus === 201) {
            const responseBody = await response.json()
            expect(responseBody.seasonId).toBe(seasonId)
            expect(responseBody.eventCount).toBeGreaterThan(0)
            expect(Array.isArray(responseBody.events)).toBe(true)
            return responseBody
        }

        return await response.json()
    }

    /**
     * Get active season ID via API
     * @returns number | null - Active season ID or null if none active
     */
    static readonly getActiveSeasonId = async (
        context: BrowserContext
    ): Promise<number | null> => {
        const response = await context.request.get('/api/admin/season/active', { headers })

        // 204 No Content = no active season (null)
        if (response.status() === 204) {
            return null
        }

        // 200 OK = active season ID
        expect(response.status()).toBe(200)
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
        overrides: Partial<CookingTeamDetail> = {}
    ): Promise<CookingTeamDetail> => {
        const teamData = {
            // Only salt for success cases (201) - validation tests need exact invalid data
            name: expectedStatus === 201 ? salt(teamName) : teamName,
            seasonId: seasonId,
            ...overrides
        }
        const response = await context.request.put(ADMIN_TEAM_ENDPOINT, {
            headers: headers,
            data: [teamData]
        })
        const status = response.status()
        const errorBody = status !== expectedStatus ? await response.text() : ''
        expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

        if (expectedStatus === 201) {
            const responseBody = await response.json()
            const validatedTeams = CookingTeamDetailSchema.array().parse(responseBody)
            expect(validatedTeams[0]!.id, 'Response should contain the new team ID').toBeDefined()
            expect(validatedTeams[0]!.seasonId).toBe(seasonId)
            return validatedTeams[0]!
        }
        return null as unknown as CookingTeamDetail
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
            role: role,
            allocationPercentage: 100,
            affinity: null
        }
        const response = await context.request.put(`${ADMIN_TEAM_ENDPOINT}/assignment`, {
            headers: headers,
            data: teamAssignmentData
        })

        const status = response.status()
        const errorBody = status !== expectedStatus ? await response.text() : ''
        expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

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
        const status = response.status()
        const errorBody = status !== 200 ? await response.text() : ''
        expect(status, `Expected 200. Response: ${errorBody}`).toBe(200)

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
