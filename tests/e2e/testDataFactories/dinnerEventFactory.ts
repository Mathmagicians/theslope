import {formatDate} from "../../../app/utils/date"
import {
    type DinnerEvent,
    type DinnerEventCreate
} from "../../../app/composables/useDinnerEventValidation"
import testHelpers from "../testHelpers"
import {expect, BrowserContext} from "@playwright/test"

const {salt, headers, pollUntil} = testHelpers
const DINNER_EVENT_ENDPOINT = '/api/admin/dinner-event'

export class DinnerEventFactory {
    static readonly today = new Date()
    static readonly tomorrow = new Date(this.today.getTime() + 24 * 60 * 60 * 1000)

    static readonly defaultDinnerEventData: DinnerEventCreate = {
        date: this.tomorrow,
        menuTitle: 'Test Menu',
        menuDescription: 'A delicious test menu',
        menuPictureUrl: null,
        dinnerMode: 'DINEIN',
        chefId: null,
        cookingTeamId: null,
        seasonId: null
    }

    static readonly defaultDinnerEvent = (testSalt: string = Date.now().toString()) => {
        return {
            ...this.defaultDinnerEventData,
            menuTitle: salt(this.defaultDinnerEventData.menuTitle, testSalt)
        }
    }

    static readonly createDinnerEvent = async (
        context: BrowserContext,
        dinnerEventData: Partial<DinnerEventCreate> = this.defaultDinnerEvent(),
        expectedStatus: number = 201
    ): Promise<DinnerEvent> => {
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
    ): Promise<DinnerEvent | null> => {
        const response = await context.request.get(`${DINNER_EVENT_ENDPOINT}/${dinnerEventId}`)

        const status = response.status()
        expect(status, `Expected status ${expectedStatus}`).toBe(expectedStatus)

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
    ): Promise<DinnerEvent | null> => {
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
    ): Promise<DinnerEvent[]> => {
        const response = await context.request.get(`${DINNER_EVENT_ENDPOINT}?seasonId=${seasonId}`)

        const status = response.status()
        expect(status, `Expected status ${expectedStatus}`).toBe(expectedStatus)

        if (expectedStatus === 200) {
            const responseBody = await response.json()
            expect(Array.isArray(responseBody)).toBe(true)
            return responseBody
        }

        return []
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
     * @returns Promise<DinnerEvent[]> - Array of generated dinner events
     * @throws Error if expected count not reached within maxAttempts
     */
    static readonly waitForDinnerEventsGeneration = async (
        context: BrowserContext,
        seasonId: number,
        expectedCount: number,
        maxAttempts: number = 5,
        initialDelayMs: number = 500
    ): Promise<DinnerEvent[]> => {
        return await pollUntil(
            () => this.getDinnerEventsForSeason(context, seasonId),
            (events) => events.length === expectedCount,
            maxAttempts,
            initialDelayMs
        )
    }
}
