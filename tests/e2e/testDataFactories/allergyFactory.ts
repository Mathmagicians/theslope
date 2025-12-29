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

    /**
     * Create mock AllergyTypeDetail data with inhabitants for component tests (no API call)
     * Returns array of AllergyTypeDetail objects (includes inhabitants with allergyUpdatedAt)
     */
    static readonly createMockAllergyTypesWithInhabitants = (): AllergyTypeDetail[] => [
        {
            id: 1,
            name: 'Mælk',
            description: 'Laktoseintolerans',
            icon: '🥛',
            inhabitants: [
                { id: 1, heynaboId: 101, userId: null, householdId: 1, name: 'Anna', lastName: 'Hansen', pictureUrl: null, birthDate: new Date('1990-01-01'), inhabitantComment: null, allergyUpdatedAt: new Date('2025-01-01') },
                { id: 2, heynaboId: 102, userId: null, householdId: 2, name: 'Bob', lastName: 'Jensen', pictureUrl: null, birthDate: new Date('1985-05-15'), inhabitantComment: 'Mild', allergyUpdatedAt: new Date('2025-01-05') }
            ]
        },
        {
            id: 2,
            name: 'Jordnødder',
            description: 'Nøddeallergi',
            icon: '🥜',
            inhabitants: [
                { id: 3, heynaboId: 103, userId: null, householdId: 3, name: 'Clara', lastName: 'Petersen', pictureUrl: null, birthDate: new Date('1995-03-20'), inhabitantComment: 'Alvorlig', allergyUpdatedAt: new Date('2025-01-10') }
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
        await Promise.all(allergyTypeIds.map(async (id) => {
            const response = await context.request.delete(`${ALLERGY_TYPE_ENDPOINT}/${id}`)
            if (response.status() !== 200 && response.status() !== 404) {
                console.warn(`Failed to cleanup allergy type ${id}: status ${response.status()}`)
            }
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
        expectedStatus: number = 201
    ): Promise<AllergyDetail> => {
        const response = await context.request.put(ALLERGY_ENDPOINT, {
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
        expectedStatus: number = 200
    ): Promise<AllergyDetail> => {
        const response = await context.request.post(`${ALLERGY_ENDPOINT}/${id}`, {
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
        expectedStatus: number = 200
    ): Promise<AllergyDisplay | null> => {
        const response = await context.request.delete(`${ALLERGY_ENDPOINT}/${id}`)

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
        for (const id of allergyIds) {
            try {
                await this.deleteAllergy(context, id)
            } catch (error) {
                console.warn(`Failed to cleanup allergy ${id}:`, error)
            }
        }
    }
}
