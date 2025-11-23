// Helpers to work with bdd tests for Household aggregate root and strongly related entities (Inhabitants)

import type { BrowserContext} from "@playwright/test"
import {expect} from "@playwright/test"
import testHelpers from "../testHelpers"
import type {HouseholdDetail, InhabitantDetail} from "~/composables/useCoreValidation"
import {useCoreValidation} from "~/composables/useCoreValidation"
import {useBookingValidation} from "~/composables/useBookingValidation"

const {salt, saltedId, temporaryAndRandom, headers} = testHelpers
const {createDefaultWeekdayMap} = useCoreValidation()
const {DinnerModeSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum
const HOUSEHOLD_ENDPOINT = '/api/admin/household'
const INHABITANT_ENDPOINT = `${HOUSEHOLD_ENDPOINT}/inhabitants`


export class HouseholdFactory {

    // === HOUSEHOLD METHODS ===

    static readonly defaultHouseholdData = (testSalt: string = temporaryAndRandom()) => {
        const now = new Date()
        return {
            heynaboId: saltedId(1000, testSalt),  // Base 1000 for household heynabo IDs
            pbsId: saltedId(2000, testSalt),      // Base 2000 for household PBS IDs
            name: salt('Test Household Hurlumhej', testSalt),
            address: salt('Andeby 123', testSalt),
            movedInDate: now
        }
    }

    static readonly createHousehold = async (
        context: BrowserContext,
        partialHousehold: Partial<ReturnType<typeof HouseholdFactory.defaultHouseholdData>> = {},
        expectedStatus: number = 201
    ): Promise<any> => {
        const {HouseholdWithInhabitantsSchema} = useCoreValidation()

        // Merge partial with defaults to create full Household object
        const householdData = {
            ...this.defaultHouseholdData(),  // Auto-generates unique salt
            ...partialHousehold  // Can override with specific values
        }

        // For expected failures, send only partial data to test server validation
        const requestData = expectedStatus === 201
            ? householdData
            : partialHousehold

        const response = await context.request.put(HOUSEHOLD_ENDPOINT, {
            headers: headers,
            data: requestData
        })

        const status = response.status()
        const errorBody = status !== expectedStatus ? await response.text() : ''
        const responseBody = status === expectedStatus ? await response.json() : null

        expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

        if (expectedStatus === 201) {
            expect(responseBody.id, 'Response should contain the new household ID').toBeDefined()

            // Validate API returns data conforming to HouseholdDetail schema
            const result = HouseholdWithInhabitantsSchema.safeParse(responseBody)
            expect(result.success, `API should return valid HouseholdDetail object. Errors: ${JSON.stringify(result.success ? [] : result.error.errors)}`).toBe(true)

            return result.data!
        }

        return responseBody
    }

    static readonly createHouseholdWithInhabitants = async (
        context: BrowserContext,
        partialHousehold: Partial<ReturnType<typeof HouseholdFactory.defaultHouseholdData>> = {},
        inhabitantCount: number = 2
    ): Promise<{household: HouseholdDetail, inhabitants: Inhabitant[]}> => {
        const household = await this.createHousehold(context, partialHousehold)
        const inhabitants = []
        for (let i = 0; i < inhabitantCount; i++) {
            const inhabitant = await this.createInhabitantForHousehold(context, household.id, `Donald${i} Duck`)
            inhabitants.push(inhabitant)
        }

        // Refetch household to include newly created inhabitants (ADR-009: mutations return Detail with relations)
        const householdWithInhabitants = await this.getHouseholdById(context, household.id)

        return {household: householdWithInhabitants, inhabitants}
    }


    static readonly getHouseholdById = async (
        context: BrowserContext,
        householdId: number,
        expectedStatus: number = 200
    ): Promise<any> => {
        const {HouseholdWithInhabitantsSchema} = useCoreValidation()
        const response = await context.request.get(`${HOUSEHOLD_ENDPOINT}/${householdId}`)

        const status = response.status()
        expect(status, 'Unexpected status').toBe(expectedStatus)

        if (expectedStatus === 200) {
            const rawData = await response.json()

            // Validate API returns data conforming to HouseholdDetail schema
            const result = HouseholdWithInhabitantsSchema.safeParse(rawData)
            expect(result.success, `API should return valid HouseholdDetail object. Errors: ${JSON.stringify(result.success ? [] : result.error.errors)}`).toBe(true)

            return result.data!
        }
        return null
    }

    static readonly deleteHousehold = async (
        context: BrowserContext,
        householdId: number,
        expectedStatus: number = 200
    ): Promise<any> => {
        const response = await context.request.delete(`${HOUSEHOLD_ENDPOINT}/${householdId}`)

        const status = response.status()
        expect(status, 'Unexpected status').toBe(expectedStatus)

        if (expectedStatus === 200) {
           return await response.json()
        }
        return null
    }

    // === INHABITANT METHODS ===

    static readonly defaultInhabitantData = (testSalt: string = temporaryAndRandom()): InhabitantDetail => {
        return {
            heynaboId: saltedId(3000, testSalt),  // Base 3000 for inhabitant heynabo IDs
            householdId: 1,  // Default household ID for test data
            name: salt('Anders', testSalt),
            lastName: salt('And', testSalt),
            pictureUrl: null,
            birthDate: new Date('1990-01-15'),
            dinnerPreferences: createDefaultWeekdayMap(DinnerMode.DINEIN)
        }
    }

    /**
     * Create inhabitant for existing household
     */
    static readonly createInhabitantForHousehold = async (
        context: BrowserContext,
        householdId: number,
        inhabitantName: string = "Pluto Hund",
        birthDate?: Date | null,
        expectedStatus: number = 201
    ): Promise<any> => {
        // Split name into first and last
        const nameParts = inhabitantName.split(' ')
        // Only use defaults for success cases (201) - validation tests need exact invalid data
        const firstName = expectedStatus === 201 ? (nameParts[0] || 'Pluto') : (nameParts[0] || '')
        const lastName = expectedStatus === 201 ? (nameParts.slice(1).join(' ') || 'Hund') : (nameParts.slice(1).join(' ') || '')

        // Generate unique testSalt for each inhabitant to avoid heynaboId collisions
        const inhabitantData = {
            ...this.defaultInhabitantData(temporaryAndRandom()),
            name: firstName,
            lastName: lastName,
            birthDate: birthDate !== undefined ? birthDate : null,
            householdId: householdId
        }

        const response = await context.request.put(INHABITANT_ENDPOINT, {
            headers: headers,
            data: inhabitantData
        })

        const status = response.status()
        const errorBody = status !== expectedStatus ? await response.text() : ''
        const responseBody = status === expectedStatus ? await response.json() : null

        expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

        if (expectedStatus === 201) {
            expect(responseBody.id, 'Response should contain the new inhabitant ID').toBeDefined()
        }

        return responseBody
    }


    /**
     * Create inhabitant from existing user (needed by seasonFactory for team assignments)
     */
    static readonly createInhabitantFromUser = async (
        context: BrowserContext,
        householdId: number,
        userId: number
    ): Promise<any> => {
        throw new Error('createInhabitantFromUser: Not implemented - mock method')
    }

    /**
     * Create multiple inhabitants (needed by seasonFactory for team assignments)
     */
    static readonly createInhabitants = async (
        context: BrowserContext,
        count: number = 5,
        householdId?: number
    ): Promise<any[]> => {
        throw new Error('createInhabitants: Not implemented - mock method')
    }

    /**
     * Get inhabitant by ID
     */
    static readonly getInhabitantById = async (
        context: BrowserContext,
        inhabitantId: number,
        expectedStatus: number = 200
    ): Promise<any> => {
        const response = await context.request.get(`${INHABITANT_ENDPOINT}/${inhabitantId}`)

        const status = response.status()
        expect(status, 'Unexpected status').toBe(expectedStatus)

        if (expectedStatus === 200) {
            const responseBody = await response.json()
            expect(responseBody.id).toBe(inhabitantId)
            return responseBody
        }

        return null
    }

    /**
     * Get all inhabitants
     */
    static readonly getAllInhabitants = async (context: BrowserContext): Promise<any[]> => {
        const response = await context.request.get(INHABITANT_ENDPOINT)
        expect(response.status()).toBe(200)

        const responseBody = await response.json()
        expect(Array.isArray(responseBody)).toBe(true)
        return responseBody
    }

    /**
     * Create inhabitant with user account
     */
    static readonly createInhabitantWithUser = async (
        context: BrowserContext,
        householdId: number,
        inhabitantName: string,
        email: string,
        expectedStatus: number = 201
    ): Promise<any> => {
        const inhabitantData = {
            ...this.defaultInhabitantData(),
            householdId: householdId,
            user: {
                email: email,
                passwordHash: 'test-hash'
            }
        }

        if (inhabitantName) {
            const nameParts = inhabitantName.split(' ')
            inhabitantData.name = nameParts[0] || 'Test'
            inhabitantData.lastName = nameParts.slice(1).join(' ') || 'Inhabitant'
        }

        const response = await context.request.put(INHABITANT_ENDPOINT, {
            headers: headers,
            data: inhabitantData
        })

        const status = response.status()
        const errorBody = status !== expectedStatus ? await response.text() : ''
        const responseBody = status === expectedStatus ? await response.json() : null

        expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

        if (expectedStatus === 201) {
            expect(responseBody.id, 'Response should contain the new inhabitant ID').toBeDefined()
            expect(responseBody.userId, 'Response should contain the new user ID').toBeDefined()
        }

        return responseBody
    }

    /**
     * Get user by email (for testing user associations)
     */
    static readonly getUserByEmail = async (context: BrowserContext, email: string): Promise<any> => {
        const response = await context.request.get(`/api/admin/users?email=${email}`)
        expect(response.status()).toBe(200)

        const responseBody = await response.json()
        expect(Array.isArray(responseBody)).toBe(true)
        expect(responseBody.length).toBe(1)

        const user = responseBody[0]
        expect(user.email).toBe(email)
        return user
    }

    /**
     * Update inhabitant (for preference updates, etc.)
     */
    static readonly updateInhabitant = async (
        context: BrowserContext,
        inhabitantId: number,
        updates: Partial<InhabitantDetail>,
        expectedStatus: number = 200
    ): Promise<any> => {
        const response = await context.request.post(`${INHABITANT_ENDPOINT}/${inhabitantId}`, {
            headers: headers,
            data: updates
        })

        const status = response.status()
        expect(status, 'Unexpected status').toBe(expectedStatus)

        if (expectedStatus === 200) {
            return await response.json()
        }

        return null
    }

    /**
     * Delete inhabitant (for 4a test scenarios)
     */
    static readonly deleteInhabitant = async (
        context: BrowserContext,
        inhabitantId: number,
        expectedStatus: number = 200
    ): Promise<any> => {
        const response = await context.request.delete(`${INHABITANT_ENDPOINT}/${inhabitantId}`)

        const status = response.status()
        expect(status, 'Unexpected status').toBe(expectedStatus)

        if (expectedStatus === 200) {
            const responseBody = await response.json()
            return responseBody
        }

        return null
    }
}
