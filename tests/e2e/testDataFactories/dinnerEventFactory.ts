import {
    type DinnerEventDisplay,
    type DinnerEventDetail,
    type DinnerEventCreate,
    type HeynaboEventResponse,
    useBookingValidation
} from "~/composables/useBookingValidation"
import type { TeamRole } from "~/composables/useCookingTeamValidation"
import testHelpers from "../testHelpers"
import {expect, type BrowserContext} from "@playwright/test"

const {salt, headers, pollUntil, temporaryAndRandom} = testHelpers
const DINNER_EVENT_ENDPOINT = '/api/admin/dinner-event'
const { DinnerStateSchema } = useBookingValidation()

export class DinnerEventFactory {
    static readonly today = new Date()
    static readonly tomorrow = new Date(this.today.getTime() + 24 * 60 * 60 * 1000)

    static readonly defaultDinnerEventData: DinnerEventCreate = {
        date: this.tomorrow,
        menuTitle: 'Test Menu',
        menuDescription: 'A delicious test menu',
        menuPictureUrl: null,
        state: DinnerStateSchema.enum.SCHEDULED,
        totalCost: 0,
        chefId: null,
        cookingTeamId: null,
        heynaboEventId: null,
        seasonId: null,
        createdAt: this.today,
        updatedAt: this.today
    }

    static readonly defaultDinnerEvent = (testSalt: string = temporaryAndRandom()) => {
        return {
            ...this.defaultDinnerEventData,
            menuTitle: salt(this.defaultDinnerEventData.menuTitle, testSalt)
        }
    }

    static readonly defaultDinnerEventCreate = (testSalt?: string): DinnerEventCreate => ({
        ...this.defaultDinnerEventData,
        menuTitle: testSalt ? salt(this.defaultDinnerEventData.menuTitle, testSalt) : this.defaultDinnerEventData.menuTitle
    })

    static readonly defaultDinnerEventDisplay = (testSalt?: string): DinnerEventDisplay => ({
        id: 1,
        date: this.tomorrow,
        menuTitle: testSalt ? salt('Test Menu', testSalt) : 'Test Menu',
        menuDescription: 'A delicious test menu',
        menuPictureUrl: null,
        state: DinnerStateSchema.enum.SCHEDULED,
        totalCost: 0,
        chefId: null,
        cookingTeamId: null,
        heynaboEventId: null,
        seasonId: null,
        createdAt: this.today,
        updatedAt: this.today
    })

    /**
     * Create dinner event display at specific days from today
     * Useful for testing deadline-based logic (before/after cancellation deadline)
     */
    static readonly dinnerEventAt = (id: number, daysFromToday: number): DinnerEventDisplay => {
        const date = new Date()
        date.setHours(0, 0, 0, 0)
        date.setDate(date.getDate() + daysFromToday)
        return { ...this.defaultDinnerEventDisplay(), id, date }
    }

    static readonly defaultDinnerEventDetail = (testSalt?: string): DinnerEventDetail => ({
        ...this.defaultDinnerEventDisplay(testSalt),
        menuDescription: 'A delicious test menu',
        menuPictureUrl: null,
        totalCost: 0,
        heynaboEventId: null,
        seasonId: null,
        createdAt: this.today,
        updatedAt: this.today,
        chef: null,
        cookingTeam: null,
        tickets: []
    })

    /**
     * Create a Prisma-format dinner event detail with JSON strings for testing deserialization (ADR-010)
     * Simulates what comes directly from the database before deserialization
     */
    static readonly defaultSerializedDinnerEventDetail = (overrides: {
        chef?: Record<string, unknown> | null,
        cookingTeam?: Record<string, unknown> | null,
        tickets?: Array<Record<string, unknown>>,
        allergens?: Array<{allergyType: Record<string, unknown>}>
    } = {}) => ({
        id: 1,
        date: this.tomorrow,
        menuTitle: 'Test Menu',
        menuDescription: 'A delicious test menu',
        menuPictureUrl: null,
        state: DinnerStateSchema.enum.SCHEDULED,
        totalCost: 0,
        chefId: overrides.chef ? 1 : null,
        cookingTeamId: overrides.cookingTeam ? 1 : null,
        heynaboEventId: null,
        seasonId: null,
        createdAt: this.today,
        updatedAt: this.today,
        chef: overrides.chef ?? null,
        cookingTeam: overrides.cookingTeam ?? null,
        tickets: overrides.tickets ?? [],
        allergens: overrides.allergens ?? []
    })

    /**
     * Create a serialized inhabitant (chef/ticket holder) with dinnerPreferences as JSON string
     * Used for testing deserialization
     */
    static readonly serializedInhabitant = (dinnerPreferences: string | null = null) => ({
        id: 1,
        heynaboId: 12345,
        householdId: 1,
        name: 'Test',
        lastName: 'Chef',
        pictureUrl: null,
        birthDate: null,
        dinnerPreferences
    })

    /**
     * Create a serialized cooking team with affinity as JSON string
     * Used for testing deserialization
     */
    static readonly serializedCookingTeam = (affinity: string | null = null) => ({
        id: 1,
        seasonId: 1,
        name: 'Test Team',
        affinity,
        assignments: []
    })

    static readonly createDinnerEvent = async (
        context: BrowserContext,
        dinnerEventData: Partial<DinnerEventCreate> = this.defaultDinnerEvent(),
        expectedStatus: number = 201
    ): Promise<DinnerEventDisplay> => {
        const requestData = {
            ...this.defaultDinnerEvent(),
            ...dinnerEventData
        }

        const response = await context.request.put(DINNER_EVENT_ENDPOINT, {
            headers: headers,
            data: requestData
        })

        const status = response.status()
        expect(status, `Expected status ${expectedStatus}`).toBe(expectedStatus)

        if (expectedStatus === 201) {
            const responseBody = await response.json()
            expect(responseBody.id, 'Response should contain dinner event ID').toBeDefined()
            return responseBody
        }

        return await response.json()
    }

    static readonly getDinnerEvent = async (
        context: BrowserContext,
        dinnerEventId: number,
        expectedStatus: number = 200
    ): Promise<DinnerEventDetail | null> => {
        const response = await context.request.get(`${DINNER_EVENT_ENDPOINT}/${dinnerEventId}`)

        const status = response.status()
        const errorBody = status !== expectedStatus ? await response.text() : ''
        expect(status, `Expected status ${expectedStatus}. Response: ${errorBody}`).toBe(expectedStatus)

        if (expectedStatus === 200) {
            const responseBody = await response.json()
            expect(responseBody.id).toBe(dinnerEventId)
            return responseBody
        }

        return null
    }

    static readonly updateDinnerEvent = async (
        context: BrowserContext,
        dinnerEventId: number,
        dinnerEventData: Partial<DinnerEventCreate>,
        expectedStatus: number = 200
    ): Promise<DinnerEventDisplay | null> => {
        // Uses consolidated chef endpoint (ADR-013: user token with system fallback)
        const response = await context.request.post(`/api/chef/dinner/${dinnerEventId}`, {
            headers: headers,
            data: dinnerEventData
        })

        const status = response.status()
        const errorBody = status !== expectedStatus ? await response.text() : ''
        expect(status, `Expected status ${expectedStatus}. Response: ${errorBody}`).toBe(expectedStatus)

        if (expectedStatus === 200) {
            const responseBody = await response.json()
            expect(responseBody.id).toBe(dinnerEventId)
            return responseBody
        }

        return null
    }

    static readonly deleteDinnerEvent = async (
        context: BrowserContext,
        dinnerEventId: number,
        expectedStatus: number = 200
    ): Promise<DinnerEventDisplay | null> => {
        const response = await context.request.delete(`${DINNER_EVENT_ENDPOINT}/${dinnerEventId}`)

        const status = response.status()
        expect(status, `Expected status ${expectedStatus}`).toBe(expectedStatus)

        if (expectedStatus === 200) {
            return await response.json()
        }

        return null
    }

    static readonly getDinnerEventsForSeason = async (
        context: BrowserContext,
        seasonId: number,
        expectedStatus: number = 200
    ): Promise<DinnerEventDisplay[]> => {
        const {DinnerEventDisplaySchema} = useBookingValidation()
        const response = await context.request.get(`${DINNER_EVENT_ENDPOINT}?seasonId=${seasonId}`)

        const status = response.status()
        expect(status, `Expected status ${expectedStatus}`).toBe(expectedStatus)

        if (expectedStatus === 200) {
            const responseBody = await response.json()
            expect(Array.isArray(responseBody), 'Response should be an array').toBe(true)

            // Deserialize dates from ISO strings to Date objects
            return responseBody.map((event: unknown) => DinnerEventDisplaySchema.parse(event))
        }

        return []
    }

    static readonly assignRoleToDinnerEvent = async (
        context: BrowserContext,
        dinnerEventId: number,
        inhabitantId: number,
        role: TeamRole,
        expectedStatus: number = 200
    ): Promise<DinnerEventDetail | null> => {
        const {DinnerEventDetailSchema} = useBookingValidation()
        const response = await context.request.post(
            `/api/team/cooking/${dinnerEventId}/assign-role`,
            {
                headers: headers,
                data: { inhabitantId, role }
            }
        )

        const status = response.status()
        const errorBody = status !== expectedStatus ? await response.text() : ''
        expect(status, `POST assign-role should return ${expectedStatus}. Response: ${errorBody}`).toBe(expectedStatus)

        if (expectedStatus === 200) {
            // ADR-010: Validate response through schema to catch deserialization issues
            const responseBody = await response.json()
            return DinnerEventDetailSchema.parse(responseBody)
        }
        return null
    }

    /**
     * Wait for dinner events to be generated for a season
     * Polls the API with exponential backoff until the expected number of events are created
     *
     * @param context - Browser context for API requests
     * @param seasonId - Season ID to check
     * @param expectedCount - Expected number of events
     * @param maxAttempts - Maximum polling attempts (default 5)
     * @param initialDelayMs - Initial delay between attempts in ms (default 500ms), doubles on each attempt
     * @returns Promise<DinnerEventDisplay[]> - Array of generated dinner events
     * @throws Error if expected count not reached within maxAttempts
     */
    static readonly waitForDinnerEventsGeneration = async (
        context: BrowserContext,
        seasonId: number,
        expectedCount: number,
        maxAttempts: number = 5,
        initialDelayMs: number = 500
    ): Promise<DinnerEventDisplay[]> => {
        return await pollUntil(
            () => this.getDinnerEventsForSeason(context, seasonId),
            (events) => events.length === expectedCount,
            maxAttempts,
            initialDelayMs
        )
    }

    /**
     * Clean up Heynabo events created during testing
     * Uses Heynabo API to delete events (requires system credentials)
     *
     * @param context - Browser context for API requests
     * @param heynaboEventIds - Array of Heynabo event IDs to delete
     * @throws Error if cleanup fails (logged but doesn't fail tests)
     */
    static readonly cleanupHeynaboEvents = async (
        context: BrowserContext,
        heynaboEventIds: number[] = []
    ): Promise<void> => {
        console.info(`Cleaning up Heynabo events (${heynaboEventIds.length} explicit + nuke)...`)

        const response = await context.request.post('/api/test/heynabo/cleanup', {
            headers: headers,
            data: { eventIds: heynaboEventIds, nuke: true }
        })

        const status = response.status()
        if (status !== 200) {
            const errorBody = await response.text()
            console.warn(`Heynabo cleanup failed with status ${status}: ${errorBody}`)
        } else {
            const result = await response.json()
            console.info(`Heynabo cleanup successful: ${JSON.stringify(result)}`)
        }
    }

    /**
     * Update allergens for a dinner event (chef operation)
     *
     * @param context - Browser context for API requests
     * @param dinnerEventId - Dinner event ID
     * @param allergenIds - Array of allergen type IDs to assign
     * @param expectedStatus - Expected HTTP status (default 200)
     * @returns Promise<DinnerEventDetail> - Updated dinner event with allergens
     */
    static readonly updateDinnerEventAllergens = async (
        context: BrowserContext,
        dinnerEventId: number,
        allergenIds: number[],
        expectedStatus: number = 200
    ): Promise<DinnerEventDetail> => {
        // Uses consolidated chef endpoint
        const response = await context.request.post(`/api/chef/dinner/${dinnerEventId}`, {
            headers: headers,
            data: {allergenIds}
        })

        const status = response.status()
        const errorBody = status !== expectedStatus ? await response.text() : ''
        expect(status, `Expected status ${expectedStatus}. Response: ${errorBody}`).toBe(expectedStatus)

        return await response.json()
    }

    /**
     * Fetch Heynabo event details via test endpoint
     *
     * @param context - Browser context for API requests
     * @param heynaboEventId - Heynabo event ID
     * @returns Promise<HeynaboEventResponse> - Event details from Heynabo including start/end times
     */
    static readonly getHeynaboEvent = async (
        context: BrowserContext,
        heynaboEventId: number
    ): Promise<HeynaboEventResponse> => {
        const response = await context.request.get(`/api/test/heynabo/event/${heynaboEventId}`)
        expect(response.status()).toBe(200)
        return await response.json()
    }
}
