// Helpers to work with BDD tests for Allergy and AllergyType entities

import {expect, type BrowserContext} from "@playwright/test"
import testHelpers from "../testHelpers"
import type {
    AllergyTypeDisplay,
    AllergyTypeDetail,
    AllergyDisplay,
    AllergyDetail
} from '~/composables/useAllergyValidation'

const {salt, headers, temporaryAndRandom} = testHelpers
const ALLERGY_TYPE_ENDPOINT = '/api/admin/allergy-type'
const ALLERGY_ENDPOINT = '/api/household/allergy'
// A change to another household's allergies carries the override (ADR-004)
const allergyUrl = (path: string, adminBypass: boolean): string => adminBypass ? `${path}?adminBypass=true` : path

// The access cases' changes to an inhabitant's allergy: the status a landed change answers, whether the allergy exists
// before it, and the comments of the inhabitant's allergy of the type after it, as it lands and as it is refused
const ACCESS_COMMENT = 'Mild'
const ACCESS_UPDATED_COMMENT = 'Alvorlig'
const ALLERGY_CHANGES = [
    {change: 'adds', status: 201, given: false, after: {allowed: [ACCESS_COMMENT], refused: []}},
    {change: 'updates', status: 200, given: true, after: {allowed: [ACCESS_UPDATED_COMMENT], refused: [ACCESS_COMMENT]}},
    {change: 'removes', status: 200, given: true, after: {allowed: [], refused: [ACCESS_COMMENT]}}
] as const
export type AllergyChange = typeof ALLERGY_CHANGES[number]

export class AllergyFactory {

    // === UNIT TEST HELPERS ===

    /**
     * Create valid AllergyType data for unit tests
     * Can override any fields with custom values
     */
    static readonly createValidAllergyTypeData = (overrides = {}) => ({
        name: 'Peanuts',
        description: 'Alvorlig allergi mod jordnødder. Kan forårsage anafylaktisk shock.',
        icon: '🥜',
        ...overrides
    })

    /**
     * Create valid Allergy data for unit tests
     * Can override any fields with custom values
     */
    static readonly createValidAllergyData = (overrides = {}) => ({
        inhabitantId: 1,
        allergyTypeId: 1,
        inhabitantComment: 'Meget alvorlig - har EpiPen',
        ...overrides
    })

    // === MOCK DATA GENERATORS (for unit tests) ===

    /**
     * Create mock AllergyType data for unit tests (no API call)
     * Returns array of AllergyTypeDisplay objects
     */
    static readonly createMockAllergyTypes = (): AllergyTypeDisplay[] => [
        {
            id: 1,
            name: 'Peanuts',
            description: 'Peanut allergy - severe',
            icon: '🥜'
        },
        {
            id: 2,
            name: 'Lactose',
            description: 'Lactose intolerance',
            icon: '🥛'
        }
    ]

    /**
     * Create mock Allergy data for unit tests (no API call)
     * Returns array of AllergyDetail objects with full relations
     */
    static readonly createMockAllergies = (): AllergyDetail[] => [
        {
            id: 1,
            inhabitantId: 1,
            allergyTypeId: 1,
            inhabitantComment: 'Severe reaction',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            allergyType: {
                id: 1,
                name: 'Peanuts',
                description: 'Peanut allergy',
                icon: '🥜'
            },
            inhabitant: {
                id: 1,
                heynaboId: 1001,
                userId: null,
                householdId: 1,
                name: 'Alice',
                lastName: 'Anderson',
                pictureUrl: null,
                birthDate: new Date('1990-01-01')
            }
        }
    ]

    /** Allergy rows as the repository include loads them (with allergyType), one per mock allergy type */
    static readonly serializedAllergies = (count: number, inhabitantId: number = 1) =>
        this.createMockAllergyTypes().slice(0, count).map((allergyType, i) => ({
            ...this.createValidAllergyData({inhabitantId, allergyTypeId: allergyType.id}),
            id: i + 1,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            allergyType
        }))

    /**
     * Create mock AllergyTypeDetail data with inhabitants for component tests (no API call)
     * Returns array of AllergyTypeDetail objects (includes inhabitants with allergyUpdatedAt)
     */
    /** Birth date for a given age today - age-category test data without hardcoded dates */
    static readonly birthDateForAge = (years: number): Date => {
        const d = new Date()
        d.setFullYear(d.getFullYear() - years)
        return d
    }

    // Age mix is canonical: Anna adult, Bob child (8), Clara baby (1) - age-category
    // display tests rely on these without per-test overrides
    static readonly createMockAllergyTypesWithInhabitants = (): AllergyTypeDetail[] => [
        {
            id: 1,
            name: 'Mælk',
            description: 'Laktoseintolerans',
            icon: '🥛',
            inhabitants: [
                { id: 1, heynaboId: 101, userId: null, householdId: 1, name: 'Anna', lastName: 'Hansen', pictureUrl: null, birthDate: new Date('1990-01-01'), inhabitantComment: null, allergyUpdatedAt: new Date('2025-01-01') },
                { id: 2, heynaboId: 102, userId: null, householdId: 2, name: 'Bob', lastName: 'Jensen', pictureUrl: null, birthDate: AllergyFactory.birthDateForAge(8), inhabitantComment: 'Mild', allergyUpdatedAt: new Date('2025-01-05') }
            ]
        },
        {
            id: 2,
            name: 'Jordnødder',
            description: 'Nøddeallergi',
            icon: '🥜',
            inhabitants: [
                { id: 3, heynaboId: 103, userId: null, householdId: 3, name: 'Clara', lastName: 'Petersen', pictureUrl: null, birthDate: AllergyFactory.birthDateForAge(1), inhabitantComment: 'Alvorlig', allergyUpdatedAt: new Date('2025-01-10') }
            ]
        },
        {
            id: 3,
            name: 'Gluten',
            description: 'Cøliaki',
            icon: '🌾',
            inhabitants: [
                { id: 1, heynaboId: 101, userId: null, householdId: 1, name: 'Anna', lastName: 'Hansen', pictureUrl: null, birthDate: new Date('1990-01-01'), inhabitantComment: null, allergyUpdatedAt: new Date('2024-12-01') }
            ]
        }
    ]

    // === ALLERGY TYPE METHODS (for E2E tests) ===

    static readonly defaultAllergyTypeData = (testSalt: string = temporaryAndRandom()) => ({
        name: salt('Peanuts', testSalt),
        description: salt('Alvorlig allergi mod jordnødder. Kan forårsage anafylaktisk shock.', testSalt),
        icon: '🥜'
    })

    static readonly createAllergyType = async (
        context: BrowserContext,
        partialAllergyType: Partial<ReturnType<typeof AllergyFactory.defaultAllergyTypeData>> = {},
        expectedStatus: number = 201
    ): Promise<AllergyTypeDisplay> => {
        // Merge partial with defaults to create full AllergyType object
        const allergyTypeData = {
            ...this.defaultAllergyTypeData(),  // Auto-generates unique salt
            ...partialAllergyType  // Can override with specific values
        }

        // For expected failures, send only partial data to test server validation
        const requestData = expectedStatus === 201
            ? allergyTypeData
            : partialAllergyType

        const response = await context.request.put(ALLERGY_TYPE_ENDPOINT, {
            headers: headers,
            data: requestData
        })

        const status = response.status()
        const responseBody = await response.json()

        expect(status, 'Unexpected status').toBe(expectedStatus)

        if (expectedStatus === 201) {
            expect(responseBody.id, 'Response should contain the new allergy type ID').toBeDefined()
        }

        return responseBody
    }

    static readonly getAllergyType = async (
        context: BrowserContext,
        id: number,
        expectedStatus: number = 200
    ): Promise<AllergyTypeDisplay | null> => {
        const response = await context.request.get(`${ALLERGY_TYPE_ENDPOINT}/${id}`)

        const status = response.status()
        expect(status, 'Unexpected status').toBe(expectedStatus)

        if (expectedStatus === 200) {
            const responseBody = await response.json()
            expect(responseBody.id).toBe(id)
            return responseBody
        }

        return null
    }

    static readonly getAllergyTypes = async (context: BrowserContext): Promise<AllergyTypeDetail[]> => {
        const response = await context.request.get(ALLERGY_TYPE_ENDPOINT)
        expect(response.status()).toBe(200)

        const responseBody = await response.json()
        expect(Array.isArray(responseBody)).toBe(true)
        return responseBody
    }

    static readonly updateAllergyType = async (
        context: BrowserContext,
        id: number,
        updateData: Partial<ReturnType<typeof AllergyFactory.defaultAllergyTypeData>>,
        expectedStatus: number = 200
    ): Promise<AllergyTypeDisplay> => {
        const response = await context.request.post(`${ALLERGY_TYPE_ENDPOINT}/${id}`, {
            headers: headers,
            data: updateData
        })

        const status = response.status()
        const responseBody = await response.json()

        expect(status, 'Unexpected status').toBe(expectedStatus)

        if (expectedStatus === 200) {
            expect(responseBody.id).toBe(id)
        }

        return responseBody
    }

    static readonly deleteAllergyType = async (
        context: BrowserContext,
        id: number,
        expectedStatus: number = 200
    ): Promise<AllergyTypeDisplay | null> => {
        const response = await context.request.delete(`${ALLERGY_TYPE_ENDPOINT}/${id}`)

        const status = response.status()
        expect(status, 'Unexpected status').toBe(expectedStatus)

        if (expectedStatus === 200) {
            return await response.json()
        }
        return null
    }

    static readonly cleanupAllergyTypes = async (
        context: BrowserContext,
        allergyTypeIds: number[]
    ): Promise<void> => {
        // An allergy type already gone counts as removed
        await Promise.all(allergyTypeIds.map(async (id) => {
            const response = await context.request.delete(`${ALLERGY_TYPE_ENDPOINT}/${id}`)
            expect([200, 404], `Unexpected status cleaning up allergy type ${id}: ${await response.text()}`).toContain(response.status())
        }))
    }

    // === ALLERGY METHODS ===

    static readonly defaultAllergyData = (
        inhabitantId: number,
        allergyTypeId: number,
        testSalt: string = temporaryAndRandom()
    ) => ({
        inhabitantId,
        allergyTypeId,
        inhabitantComment: salt('Meget alvorlig - har EpiPen', testSalt)
    })

    static readonly createAllergy = async (
        context: BrowserContext,
        allergyData: {
            inhabitantId: number,
            allergyTypeId: number,
            inhabitantComment?: string | null
        },
        expectedStatus: number = 201,
        adminBypass: boolean = false
    ): Promise<AllergyDetail> => {
        const response = await context.request.put(allergyUrl(ALLERGY_ENDPOINT, adminBypass), {
            headers: headers,
            data: allergyData
        })

        const status = response.status()
        const responseBody = await response.json()

        expect(status, `Unexpected status creating allergy. Response: ${JSON.stringify(responseBody)}`).toBe(expectedStatus)

        if (expectedStatus === 201) {
            expect(responseBody.id, 'Response should contain the new allergy ID').toBeDefined()
        }

        return responseBody
    }

    static readonly getAllergy = async (
        context: BrowserContext,
        id: number,
        expectedStatus: number = 200
    ): Promise<AllergyDetail | null> => {
        const response = await context.request.get(`${ALLERGY_ENDPOINT}/${id}`)

        const status = response.status()
        expect(status, 'Unexpected status').toBe(expectedStatus)

        if (expectedStatus === 200) {
            const responseBody = await response.json()
            expect(responseBody.id).toBe(id)
            return responseBody
        }

        return null
    }

    static readonly getAllergiesForInhabitant = async (
        context: BrowserContext,
        inhabitantId: number
    ): Promise<AllergyDetail[]> => {
        const response = await context.request.get(`${ALLERGY_ENDPOINT}?inhabitantId=${inhabitantId}`)
        expect(response.status()).toBe(200)

        const responseBody = await response.json()
        expect(Array.isArray(responseBody)).toBe(true)
        return responseBody
    }

    static readonly getAllergiesForHousehold = async (
        context: BrowserContext,
        householdId: number
    ): Promise<AllergyDetail[]> => {
        const response = await context.request.get(`${ALLERGY_ENDPOINT}?householdId=${householdId}`)
        expect(response.status()).toBe(200)

        const responseBody = await response.json()
        expect(Array.isArray(responseBody)).toBe(true)
        return responseBody
    }

    static readonly updateAllergy = async (
        context: BrowserContext,
        id: number,
        updateData: {
            inhabitantId?: number,
            allergyTypeId?: number,
            inhabitantComment?: string | null
        },
        expectedStatus: number = 200,
        adminBypass: boolean = false
    ): Promise<AllergyDetail> => {
        const response = await context.request.post(allergyUrl(`${ALLERGY_ENDPOINT}/${id}`, adminBypass), {
            headers: headers,
            data: updateData
        })

        const status = response.status()
        const responseBody = await response.json()

        expect(status, 'Unexpected status').toBe(expectedStatus)

        if (expectedStatus === 200) {
            expect(responseBody.id).toBe(id)
        }

        return responseBody
    }

    static readonly deleteAllergy = async (
        context: BrowserContext,
        id: number,
        expectedStatus: number = 200,
        adminBypass: boolean = false
    ): Promise<AllergyDisplay | null> => {
        const response = await context.request.delete(allergyUrl(`${ALLERGY_ENDPOINT}/${id}`, adminBypass))

        const status = response.status()
        expect(status, 'Unexpected status').toBe(expectedStatus)

        if (expectedStatus === 200) {
            return await response.json()
        }
        return null
    }

    static readonly cleanupAllergies = async (
        context: BrowserContext,
        allergyIds: number[]
    ): Promise<void> => {
        // An allergy already gone counts as removed; the cleanup reaches any household's allergies through the override
        for (const id of allergyIds) {
            const response = await context.request.delete(allergyUrl(`${ALLERGY_ENDPOINT}/${id}`, true))
            expect([200, 404], `Unexpected status cleaning up allergy ${id}: ${await response.text()}`).toContain(response.status())
        }
    }

    // === ACCESS SCENARIO (ADR-004) ===

    static readonly ALLERGY_CHANGES = ALLERGY_CHANGES

    /**
     * One access case: a fresh allergy type (an inhabitant holds one allergy per type) and, for a change that needs it,
     * the allergy, both through the admin's override; then the actor's change without the override, its status asserted.
     * Returns the comments of the inhabitant's allergies of the type after the change
     */
    static readonly changeAllergyAs = async (
        adminContext: BrowserContext,
        actorContext: BrowserContext,
        {change, given}: AllergyChange,
        {inhabitantId, testSalt, expectedStatus, createdAllergyTypeIds}: {
            inhabitantId: number, testSalt: string, expectedStatus: number, createdAllergyTypeIds: number[]
        }
    ): Promise<Array<string | null | undefined>> => {
        const allergyType = await AllergyFactory.createAllergyType(adminContext, AllergyFactory.defaultAllergyTypeData(testSalt))
        createdAllergyTypeIds.push(allergyType.id)
        const allergyTypeId = allergyType.id
        const allergyId = given
            ? (await AllergyFactory.createAllergy(adminContext, {inhabitantId, allergyTypeId, inhabitantComment: ACCESS_COMMENT}, 201, true)).id
            : 0

        switch (change) {
            case 'adds':
                await AllergyFactory.createAllergy(actorContext, {inhabitantId, allergyTypeId, inhabitantComment: ACCESS_COMMENT}, expectedStatus)
                break
            case 'updates':
                await AllergyFactory.updateAllergy(actorContext, allergyId, {inhabitantComment: ACCESS_UPDATED_COMMENT}, expectedStatus)
                break
            case 'removes':
                await AllergyFactory.deleteAllergy(actorContext, allergyId, expectedStatus)
                break
        }

        return (await AllergyFactory.getAllergiesForInhabitant(adminContext, inhabitantId))
            .filter(allergy => allergy.allergyTypeId === allergyTypeId)
            .map(allergy => allergy.inhabitantComment)
    }
}
