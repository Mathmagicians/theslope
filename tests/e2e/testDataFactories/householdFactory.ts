// Helpers to work with bdd tests for Household aggregate root and strongly related entities (Inhabitants)

import type { BrowserContext} from "@playwright/test"
import {expect} from "@playwright/test"
import testHelpers from "../testHelpers"
import type {HouseholdDetail, HouseholdDisplay, InhabitantDetail, InhabitantCreate, UserDisplay} from "~/composables/useCoreValidation"
import {useCoreValidation} from "~/composables/useCoreValidation"
import {useBookingValidation, type InhabitantUpdateResponse} from "~/composables/useBookingValidation"
import {useHeynaboValidation, type HeynaboImportResponse} from "~/composables/useHeynaboValidation"

const {salt, saltedId, temporaryAndRandom, headers} = testHelpers
const {createDefaultWeekdayMap, InhabitantDetailSchema, UserDisplaySchema, HouseholdDisplaySchema} = useCoreValidation()
const {DinnerModeSchema, InhabitantUpdateResponseSchema} = useBookingValidation()
const {HeynaboImportResponseSchema} = useHeynaboValidation()
const DinnerMode = DinnerModeSchema.enum
const HOUSEHOLD_ENDPOINT = '/api/admin/household'
const INHABITANT_ENDPOINT = `${HOUSEHOLD_ENDPOINT}/inhabitants`
const HEYNABO_IMPORT_ENDPOINT = '/api/admin/heynabo/import'

// Use high base ID to avoid conflicts with real Heynabo data (which uses low IDs)
const TEST_DATA_ID_BASE = 900000

export class HouseholdFactory {

    // === HOUSEHOLD METHODS ===

    static readonly defaultHouseholdData = (testSalt: string = temporaryAndRandom()) => {
        const now = new Date()
        return {
            heynaboId: saltedId(TEST_DATA_ID_BASE, testSalt),
            pbsId: saltedId(TEST_DATA_ID_BASE, testSalt),
            name: salt('Test Household Hurlumhej', testSalt),
            address: salt('Andeby 123', testSalt),
            movedInDate: now
        }
    }

    static readonly createHousehold = async (
        context: BrowserContext,
        partialHousehold: Partial<ReturnType<typeof HouseholdFactory.defaultHouseholdData>> = {},
        expectedStatus: number = 201
    ): Promise<HouseholdDetail> => {
        const {HouseholdDetailSchema} = useCoreValidation()

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
            return HouseholdDetailSchema.parse(responseBody)
        }

        return responseBody
    }

    static readonly createHouseholdWithInhabitants = async (
        context: BrowserContext,
        partialHousehold: Partial<ReturnType<typeof HouseholdFactory.defaultHouseholdData>> = {},
        inhabitantCount: number = 2
    ): Promise<{household: HouseholdDetail, inhabitants: InhabitantDetail[]}> => {
        const household = await this.createHousehold(context, partialHousehold)
        const inhabitants = []
        for (let i = 0; i < inhabitantCount; i++) {
            const inhabitant = await this.createInhabitantForHousehold(context, household.id, `Donald${i} Duck`)
            inhabitants.push(inhabitant)
        }

        // Refetch household to include newly created inhabitants (ADR-009: mutations return Detail with relations)
        const householdWithInhabitants = await this.getHouseholdById(context, household.id)
        expect(householdWithInhabitants, `Household ${household.id} should exist after creation`).not.toBeNull()

        return {household: householdWithInhabitants!, inhabitants}
    }


    static readonly getHouseholdById = async (
        context: BrowserContext,
        householdId: number,
        expectedStatus: number = 200
    ): Promise<HouseholdDetail | null> => {
        const {HouseholdDetailSchema} = useCoreValidation()
        const response = await context.request.get(`${HOUSEHOLD_ENDPOINT}/${householdId}`)

        const status = response.status()
        expect(status, 'Unexpected status').toBe(expectedStatus)

        if (expectedStatus === 200) {
            const rawData = await response.json()
            return HouseholdDetailSchema.parse(rawData)
        }
        return null
    }

    /**
     * Get all households (Display type per ADR-009)
     */
    static readonly getAllHouseholds = async (context: BrowserContext): Promise<HouseholdDisplay[]> => {
        const response = await context.request.get(HOUSEHOLD_ENDPOINT)
        expect(response.status()).toBe(200)

        const responseBody = await response.json()
        expect(Array.isArray(responseBody)).toBe(true)
        return HouseholdDisplaySchema.array().parse(responseBody)
    }

    /**
     * Update household (for setting TheSlope-owned fields like pbsId, movedInDate, moveOutDate)
     */
    static readonly updateHousehold = async (
        context: BrowserContext,
        householdId: number,
        updates: Partial<HouseholdDetail>,
        expectedStatus: number = 200
    ): Promise<HouseholdDetail | null> => {
        const {HouseholdDetailSchema} = useCoreValidation()
        const response = await context.request.post(`${HOUSEHOLD_ENDPOINT}/${householdId}`, {
            headers: headers,
            data: updates
        })

        const status = response.status()
        expect(status, 'Unexpected status').toBe(expectedStatus)

        if (expectedStatus === 200) {
            const rawData = await response.json()
            return HouseholdDetailSchema.parse(rawData)
        }
        return null
    }

    /**
     * Delete household(s) - accepts single ID or array of IDs
     * Always returns HouseholdDetail[] for consistent typing
     * For cleanup (afterAll): Don't pass expectedStatus - silent on success, logs only failures
     * For API tests: Pass expectedStatus (e.g. 200) - validates status for each deletion
     */
    static readonly deleteHousehold = async (
        context: BrowserContext,
        householdIds: number | number[],
        expectedStatus?: number
    ): Promise<HouseholdDetail[]> => {
        const {HouseholdDetailSchema} = useCoreValidation()
        const ids = Array.isArray(householdIds) ? householdIds : [householdIds]

        // Delete households (repository handles Invoice cleanup + cascades for inhabitants, orders, allergies, assignments)
        const results = await Promise.all(
            ids.map(async (id) => {
                try {
                    const response = await context.request.delete(`${HOUSEHOLD_ENDPOINT}/${id}`)
                    const status = response.status()

                    // Cleanup mode - silent on success, log only failures
                    if (expectedStatus === undefined) {
                        if (status === 200) {
                            return await response.json()
                        } else if (status === 404) {
                            return null // Already deleted
                        } else {
                            const body = await response.json()
                            console.error(`❌ Failed to delete household ${id} (status ${status}): ${body.message || body.statusMessage}`)
                            return null
                        }
                    }

                    // API test mode - validate expectedStatus
                    if (status === expectedStatus) {
                        return status === 200 ? await response.json() : null
                    } else if (status === 404 && expectedStatus === 200) {
                        return null
                    } else {
                        const body = await response.json()
                        console.warn(`❌ Household ${id} deletion returned ${status} (expected ${expectedStatus}): ${body.message || body.statusMessage}`)
                        return null
                    }
                } catch (error) {
                    console.error(`❌ Failed to delete household ${id}:`, error)
                    return null
                }
            })
        )

        // Validate and return
        return results.filter(r => r !== null).map(r => {
            return HouseholdDetailSchema.parse(r)
        }) as HouseholdDetail[]
    }

    // === INHABITANT METHODS ===

    static readonly defaultInhabitantData = (testSalt: string = temporaryAndRandom()): InhabitantCreate => {
        return {
            heynaboId: saltedId(TEST_DATA_ID_BASE, testSalt),
            householdId: 1,  // Default household ID for test data
            name: salt('Anders', testSalt),
            lastName: salt('And', testSalt),
            pictureUrl: null,
            birthDate: new Date('1990-01-15'),
            dinnerPreferences: createDefaultWeekdayMap(DinnerMode.DINEIN)
        }
    }

    /**
     * Create inhabitant with config object pattern (ADR-003)
     * Preferred method - allows setting any inhabitant field including dinnerPreferences
     */
    static readonly createInhabitantWithConfig = async (
        context: BrowserContext,
        householdId: number,
        partialInhabitant: Partial<Omit<InhabitantCreate, 'householdId'>> = {},
        expectedStatus: number = 201
    ): Promise<InhabitantDetail> => {
        // Merge partial with defaults, householdId always from parameter
        const inhabitantData: InhabitantCreate = {
            ...this.defaultInhabitantData(temporaryAndRandom()),
            ...partialInhabitant,
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
     * Create inhabitant for existing household (legacy signature)
     * Calls createInhabitantWithConfig internally
     */
    static readonly createInhabitantForHousehold = async (
        context: BrowserContext,
        householdId: number,
        inhabitantName: string = "Pluto Hund",
        birthDate?: Date | null,
        expectedStatus: number = 201
    ): Promise<InhabitantDetail> => {
        // Split name into first and last
        const nameParts = inhabitantName.split(' ')
        // Only use defaults for success cases (201) - validation tests need exact invalid data
        const firstName = expectedStatus === 201 ? (nameParts[0] || 'Pluto') : (nameParts[0] || '')
        const lastName = expectedStatus === 201 ? (nameParts.slice(1).join(' ') || 'Hund') : (nameParts.slice(1).join(' ') || '')

        return this.createInhabitantWithConfig(context, householdId, {
            name: firstName,
            lastName: lastName,
            birthDate: birthDate !== undefined ? birthDate : null
        }, expectedStatus)
    }


    /**
     * Get inhabitant by ID
     */
    static readonly getInhabitantById = async (
        context: BrowserContext,
        inhabitantId: number,
        expectedStatus: number = 200
    ): Promise<InhabitantDetail | null> => {
        const response = await context.request.get(`${INHABITANT_ENDPOINT}/${inhabitantId}`)

        const status = response.status()
        expect(status, 'Unexpected status').toBe(expectedStatus)

        if (expectedStatus === 200) {
            const responseBody = await response.json()
            expect(responseBody.id).toBe(inhabitantId)
            return InhabitantDetailSchema.parse(responseBody)
        }

        return null
    }

    /**
     * Get all inhabitants
     */
    static readonly getAllInhabitants = async (context: BrowserContext): Promise<InhabitantDetail[]> => {
        const response = await context.request.get(INHABITANT_ENDPOINT)
        expect(response.status()).toBe(200)

        const responseBody = await response.json()
        expect(Array.isArray(responseBody)).toBe(true)
        return InhabitantDetailSchema.array().parse(responseBody)
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
    ): Promise<InhabitantDetail> => {
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
    static readonly getUserByEmail = async (context: BrowserContext, email: string): Promise<UserDisplay> => {
        const response = await context.request.get(`/api/admin/users?email=${email}`)
        expect(response.status()).toBe(200)

        const responseBody = await response.json()
        expect(Array.isArray(responseBody)).toBe(true)
        expect(responseBody.length).toBe(1)

        const user = UserDisplaySchema.parse(responseBody[0])
        expect(user.email).toBe(email)
        return user
    }

    /**
     * Update inhabitant (for preference updates, etc.)
     * When dinnerPreferences updated, triggers re-scaffolding.
     * If seasonId not provided, endpoint uses active season.
     *
     * Returns InhabitantUpdateResponse: { inhabitant, scaffoldResult }
     * ADR-009: Operation result type wrapping entity + side effect
     *
     * @param seasonId - Optional seasonId query param for parallel-safe testing
     */
    static readonly updateInhabitant = async (
        context: BrowserContext,
        inhabitantId: number,
        updates: Partial<InhabitantDetail>,
        expectedStatus: number = 200,
        seasonId?: number,
        assertResponse?: (response: InhabitantUpdateResponse) => void
    ): Promise<InhabitantUpdateResponse | null> => {
        const url = seasonId !== undefined
            ? `${INHABITANT_ENDPOINT}/${inhabitantId}?seasonId=${seasonId}`
            : `${INHABITANT_ENDPOINT}/${inhabitantId}`

        const response = await context.request.post(url, {
            headers: headers,
            data: updates
        })

        const status = response.status()
        expect(status, 'Unexpected status').toBe(expectedStatus)

        if (expectedStatus !== 200) {
            return null
        }

        const raw = await response.json()
        const parsed = InhabitantUpdateResponseSchema.parse(raw)

        if (assertResponse) {
            assertResponse(parsed)
        }

        return parsed
    }

    /**
     * Delete inhabitant (for API test scenarios)
     */
    static readonly deleteInhabitant = async (
        context: BrowserContext,
        inhabitantId: number,
        expectedStatus: number = 200
    ): Promise<InhabitantDetail | null> => {
        const response = await context.request.delete(`${INHABITANT_ENDPOINT}/${inhabitantId}`)
        const status = response.status()

        if (status === expectedStatus) {
            return status === 200 ? InhabitantDetailSchema.parse(await response.json()) : null
        } else if (status === 404 && expectedStatus === 200) {
            return null
        } else {
            const body = await response.text()
            console.warn(`❌ Inhabitant ${inhabitantId} deletion returned ${status} (expected ${expectedStatus}):`, body)
            return null
        }
    }

    // === HEYNABO IMPORT METHODS ===

    /**
     * Run Heynabo import - syncs households/inhabitants/users from Heynabo
     * ADR-013: Heynabo is source of truth for its data
     */
    static readonly runHeynaboImport = async (
        context: BrowserContext,
        expectedStatus: number = 200
    ): Promise<HeynaboImportResponse> => {
        const response = await context.request.get(HEYNABO_IMPORT_ENDPOINT)
        const responseBody = await response.text()
        const status = response.status()

        expect(status, `Expected ${expectedStatus} but got ${status}: ${responseBody}`).toBe(expectedStatus)

        return HeynaboImportResponseSchema.parse(JSON.parse(responseBody))
    }
}
