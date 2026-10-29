import {addDays, isSameDay, startOfDay} from "date-fns"
import {
    type DinnerEventDisplay,
    type DinnerEventDetail,
    type DinnerEventCreate,
    type HeynaboEventResponse,
    type MenuSwapStrategy,
    type SerializedDinnerEvent,
    type SerializedDinnerEventDetail,
    type SerializedDinnerTicket,
    useBookingValidation
} from "~/composables/useBookingValidation"
import type { TeamRole, SerializedCookingTeamDisplay } from "~/composables/useCookingTeamValidation"
import type { SerializedInhabitant } from "~/composables/useCoreValidation"
import type {Season} from "~/composables/useSeasonValidation"
import {computeCookingDates} from "~/utils/season"
import testHelpers from "../testHelpers"
import {expect, type BrowserContext} from "@playwright/test"

const {salt, headers, pollUntil, temporaryAndRandom} = testHelpers
const DINNER_EVENT_ENDPOINT = '/api/admin/dinner-event'
const { DinnerStateSchema, DinnerModeSchema, OrderStateSchema, TicketTypeSchema } = useBookingValidation()

export class DinnerEventFactory {
    static readonly today = new Date()
    static readonly tomorrow = addDays(this.today, 1)

    static readonly dinnerEventDetailPath = (dinnerEventId: number): string =>
        `${DINNER_EVENT_ENDPOINT}/${dinnerEventId}`

    static readonly defaultDinnerEventData: DinnerEventCreate = {
        date: this.tomorrow,
        menuTitle: 'Test Menu',
        menuDescription: 'A delicious test menu',
        menuPictureUrl: null,
        state: DinnerStateSchema.enum.SCHEDULED,
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

    /** A dinner row as a read loads it: the Display's columns and the expense rows behind its cost */
    static readonly serializedDinnerEvent = (overrides: Partial<SerializedDinnerEvent> = {}): SerializedDinnerEvent => {
        const {allergens: _allergens, ...columns} = this.defaultDinnerEventDisplay()
        return {...columns, expenses: [], ...overrides}
    }

    /**
     * Create dinner event display at specific days from today
     * Useful for testing deadline-based logic (before/after cancellation deadline)
     */
    static readonly dinnerEventAt = (id: number, daysFromToday: number): DinnerEventDisplay => ({
        ...this.defaultDinnerEventDisplay(),
        id,
        date: startOfDay(addDays(new Date(), daysFromToday))
    })

    /**
     * A dinner on each of the season's cooking days in the week that starts `daysFromToday` days ahead, holidays left
     * out: a week holds every weekday once, so each cooking day gets one dinner whatever weekday today is. Ids count up
     * from `firstId`
     */
    static readonly dinnerEventsOnCookingDays = (season: Season, daysFromToday: number, firstId: number = 1): DinnerEventDisplay[] => {
        const start = startOfDay(addDays(new Date(), daysFromToday))
        return computeCookingDates(season.cookingDays, {start, end: addDays(start, 6)}, season.holidays)
            .map((date, index) => ({...this.defaultDinnerEventDisplay(), id: firstId + index, date, seasonId: season.id ?? null}))
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
        tickets: [],
        expenses: []
    })

    /**
     * Create a Prisma-format dinner event detail with JSON strings for testing deserialization (ADR-010)
     * Simulates what comes directly from the database before deserialization
     */
    static readonly defaultSerializedDinnerEventDetail = (overrides: Partial<SerializedDinnerEventDetail> = {}): SerializedDinnerEventDetail => ({
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
        chef: null,
        cookingTeam: null,
        tickets: [],
        allergens: [],
        expenses: [],
        ...overrides
    })

    /**
     * Create a serialized inhabitant (chef/ticket holder) with dinnerPreferences as JSON string
     * Used for testing deserialization
     */
    static readonly serializedInhabitant = (dinnerPreferences: string | null = null): SerializedInhabitant => ({
        id: 1,
        heynaboId: 12345,
        householdId: 1,
        name: 'Test',
        lastName: 'Chef',
        pictureUrl: null,
        birthDate: null,
        dinnerPreferences
    })

    /** A ticket row as the dinner's Detail read loads it: the order, its holder's row with allergies, its payer and its price row */
    static readonly serializedTicket = (overrides: Partial<SerializedDinnerTicket> = {}): SerializedDinnerTicket => ({
        id: 1,
        dinnerEventId: 1,
        inhabitantId: 1,
        bookedByUserId: null,
        ticketPriceId: 1,
        priceAtBooking: 4000,
        dinnerMode: DinnerModeSchema.enum.DINEIN,
        state: OrderStateSchema.enum.BOOKED,
        isGuestTicket: false,
        releasedAt: null,
        closedAt: null,
        createdAt: this.today,
        updatedAt: this.today,
        inhabitant: {...this.serializedInhabitant(), allergies: []},
        bookedByUser: null,
        ticketPrice: {id: 1, seasonId: 1, ticketType: TicketTypeSchema.enum.ADULT, price: 4000, description: null, maximumAgeLimit: null},
        ...overrides
    })

    /**
     * Create a serialized cooking team with affinity as JSON string
     * Used for testing deserialization
     */
    static readonly serializedCookingTeam = (affinity: string | null = null): SerializedCookingTeamDisplay => ({
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
    ): Promise<DinnerEventDetail> => {
        const {DinnerEventDetailSchema} = useBookingValidation()
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
            return DinnerEventDetailSchema.parse(await response.json())
        }

        return await response.json()
    }

    /** A dinner of the season `daysFromToday` days from today (negative in the past), at midnight, in `state` */
    static readonly createDinnerEventInState = (
        context: BrowserContext,
        seasonId: number,
        state: DinnerEventCreate['state'],
        daysFromToday: number,
        testSalt: string = temporaryAndRandom()
    ): Promise<DinnerEventDisplay> => this.createDinnerEvent(context, {
        seasonId,
        date: startOfDay(addDays(new Date(), daysFromToday)),
        menuTitle: salt(state, testSalt),
        state
    })

    /**
     * A browser spec's dinner stands alone on its day: the dinner and chef pages select a dinner by date, so a second
     * dinner on a day hides one of them. Picks a free day of the season at random, after the season's last dinner where
     * one is free, creates the dinner there and lists the season again; a day that turned double in the meantime gives
     * the dinner up and another day is tried.
     */
    static readonly createDinnerEventOnFreeDay = async (
        context: BrowserContext,
        season: Season,
        dinnerEventData: Partial<Omit<DinnerEventCreate, 'date'>> = {},
        attempts: number = 4
    ): Promise<DinnerEventDisplay> => {
        const first = startOfDay(new Date(Math.max(new Date(season.seasonDates.start).getTime(), this.tomorrow.getTime())))
        const last = startOfDay(new Date(season.seasonDates.end))
        const givenUp: Date[] = []
        for (let attempt = 0; attempt < attempts; attempt++) {
            const dinners = await this.getDinnerEventsForSeason(context, season.id!)
            const occupied = [...dinners.map(dinner => dinner.date), ...givenUp]
            const freeDays: Date[] = []
            for (let day = first; day <= last; day = addDays(day, 1)) {
                if (!occupied.some(date => isSameDay(date, day))) freeDays.push(day)
            }
            const lastDinner = occupied.length > 0 ? startOfDay(new Date(Math.max(...occupied.map(date => date.getTime())))) : null
            const afterLast = lastDinner ? freeDays.filter(day => day > lastDinner) : freeDays
            const candidates = afterLast.length > 0 ? afterLast : freeDays
            expect(candidates.length, `season ${season.shortName} has a free day for the spec's dinner`).toBeGreaterThan(0)
            const day = candidates[Math.floor(Math.random() * candidates.length)]!

            const dinner = await this.createDinnerEvent(context, {...dinnerEventData, date: day, seasonId: season.id!})
            if ((await this.dinnersOnDay(context, season.id!, day)).length === 1) return dinner
            await this.deleteDinnerEvent(context, dinner.id!, 200)
            givenUp.push(day)
        }
        throw new Error(`No day of season ${season.shortName} stayed free for the spec's dinner in ${attempts} attempts`)
    }

    /**
     * A serial spec's dinner alone on `day`: the dinners the season already holds on that day give way, since the
     * dinner and chef pages select a dinner by date. Serial only: a parallel spec's dinner on the day would go with them.
     */
    static readonly createDinnerEventAloneOnDay = async (
        context: BrowserContext,
        season: Season,
        day: Date,
        dinnerEventData: Partial<Omit<DinnerEventCreate, 'date'>> = {}
    ): Promise<DinnerEventDisplay> => {
        for (const dinner of await this.dinnersOnDay(context, season.id!, day)) {
            await this.deleteDinnerEvent(context, dinner.id!, 200)
        }
        return await this.createDinnerEvent(context, {...dinnerEventData, date: day, seasonId: season.id!})
    }

    /** The season's dinners on `day` */
    private static readonly dinnersOnDay =async (context: BrowserContext, seasonId: number, day: Date): Promise<DinnerEventDisplay[]> =>
        (await this.getDinnerEventsForSeason(context, seasonId)).filter(dinner => isSameDay(dinner.date, day))

    static readonly getDinnerEvent = async (
        context: BrowserContext,
        dinnerEventId: number,
        expectedStatus: number = 200
    ): Promise<DinnerEventDetail | null> => {
        const response = await context.request.get(`${DINNER_EVENT_ENDPOINT}/${dinnerEventId}`)

        const status = response.status()
        const errorBody = status !== expectedStatus ? await response.text() : ''
        expect(status, `Expected status ${expectedStatus}. Response: ${errorBody}`).toBe(expectedStatus)

        if (expectedStatus === 200 || expectedStatus === 207) {
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

        if (expectedStatus === 200 || expectedStatus === 207) {
            const responseBody = await response.json()
            expect(responseBody.id).toBe(dinnerEventId)
            return responseBody
        }

        return null
    }

    /**
     * Delete a dinner event, returns the deleted dinner event
     * Cleanup (afterAll): no expectedStatus - a dinner event already gone counts as removed, any other status fails
     * API tests: pass expectedStatus - the deletion answers it
     */
    static readonly deleteDinnerEvent = async (
        context: BrowserContext,
        dinnerEventId: number,
        expectedStatus?: number
    ): Promise<DinnerEventDisplay | null> => {
        const response = await context.request.delete(`${DINNER_EVENT_ENDPOINT}/${dinnerEventId}`)
        const status = response.status()
        const body = await response.text()
        expect(expectedStatus === undefined ? [200, 404] : [expectedStatus], `Unexpected status deleting dinner event ${dinnerEventId}: ${body}`).toContain(status)
        return status === 200 ? JSON.parse(body) : null
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
        expectedStatus: number = 200,
        menuStrategy?: MenuSwapStrategy
    ): Promise<DinnerEventDetail | null> => {
        const {DinnerEventDetailSchema} = useBookingValidation()
        const response = await context.request.post(
            `/api/team/cooking/${dinnerEventId}/assign-role`,
            {
                headers: headers,
                data: { inhabitantId, role, ...(menuStrategy && {menuStrategy}) }
            }
        )

        const status = response.status()
        const errorBody = status !== expectedStatus ? await response.text() : ''
        expect(status, `POST assign-role should return ${expectedStatus}. Response: ${errorBody}`).toBe(expectedStatus)

        if (expectedStatus === 200 || expectedStatus === 207) {
            // ADR-010: Validate response through schema to catch deserialization issues
            const responseBody = await response.json()
            return DinnerEventDetailSchema.parse(responseBody)
        }
        return null
    }

    static readonly removeRoleFromDinnerEvent = async (
        context: BrowserContext,
        dinnerEventId: number,
        inhabitantId: number,
        role: TeamRole,
        expectedStatus: number = 200
    ): Promise<DinnerEventDetail | null> => {
        const {DinnerEventDetailSchema} = useBookingValidation()
        const response = await context.request.post(
            `/api/team/cooking/${dinnerEventId}/remove-role`,
            {
                headers: headers,
                data: { inhabitantId, role }
            }
        )

        const status = response.status()
        const errorBody = status !== expectedStatus ? await response.text() : ''
        expect(status, `POST remove-role should return ${expectedStatus}. Response: ${errorBody}`).toBe(expectedStatus)

        if (expectedStatus === 200) {
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
     */
    static readonly cleanupHeynaboEvents = async (
        context: BrowserContext,
        heynaboEventIds: number[] = []
    ): Promise<void> => {
        const response = await context.request.post('/api/test/heynabo/cleanup', {
            headers: headers,
            data: { eventIds: heynaboEventIds, nuke: true }
        })
        expect(response.status(), `Unexpected status cleaning up Heynabo events: ${await response.text()}`).toBe(200)
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

    static readonly deleteHeynaboEvent = async (
        context: BrowserContext,
        heynaboEventId: number,
        expectedGoneStatus: number = 404
    ): Promise<void> => {
        const deleteResponse = await context.request.delete(`/api/test/heynabo/event/${heynaboEventId}`)
        expect(deleteResponse.status()).toBe(200)

        const getResponse = await context.request.get(`/api/test/heynabo/event/${heynaboEventId}`)
        expect(getResponse.status()).toBe(expectedGoneStatus)
    }
}
