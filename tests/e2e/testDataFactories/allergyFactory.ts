// Helpers to work with BDD tests for Allergy and AllergyType entities

import {expect, BrowserContext} from "@playwright/test"
import testHelpers from "../testHelpers"
import type {
    AllergyTypeResponse,
    AllergyTypeWithInhabitants,
    AllergyResponse,
    AllergyWithRelations
} from '~/composables/useAllergyValidation'

const {salt, headers} = testHelpers
const ALLERGY_TYPE_ENDPOINT = '/api/admin/allergy-type'
const ALLERGY_ENDPOINT = '/api/household/allergy'

export class AllergyFactory {

    // === ALLERGY TYPE METHODS ===

    static readonly defaultAllergyTypeData = (testSalt: string = Date.now().toString()) => ({
        name: salt('Peanuts', testSalt),
        description: salt('Alvorlig allergi mod jordnødder. Kan forårsage anafylaktisk shock.', testSalt),
        icon: '🥜'
    })

    static readonly createAllergyType = async (
        context: BrowserContext,
        partialAllergyType: Partial<ReturnType<typeof AllergyFactory.defaultAllergyTypeData>> = {},
        expectedStatus: number = 201
    ): Promise<AllergyTypeResponse> => {
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
    ): Promise<AllergyTypeResponse | null> => {
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

    static readonly getAllergyTypes = async (context: BrowserContext): Promise<AllergyTypeWithInhabitants[]> => {
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
    ): Promise<AllergyTypeResponse> => {
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
    ): Promise<AllergyTypeResponse | null> => {
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
        for (const id of allergyTypeIds) {
            try {
                await this.deleteAllergyType(context, id)
            } catch (error) {
                console.warn(`Failed to cleanup allergy type ${id}:`, error)
            }
        }
    }

    // === ALLERGY METHODS ===

    static readonly defaultAllergyData = (
        inhabitantId: number,
        allergyTypeId: number,
        testSalt: string = Date.now().toString()
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
    ): Promise<AllergyWithRelations> => {
        const response = await context.request.put(ALLERGY_ENDPOINT, {
            headers: headers,
            data: allergyData
        })

        const status = response.status()
        const responseBody = await response.json()

        expect(status, 'Unexpected status').toBe(expectedStatus)

        if (expectedStatus === 201) {
            expect(responseBody.id, 'Response should contain the new allergy ID').toBeDefined()
        }

        return responseBody
    }

    static readonly getAllergy = async (
        context: BrowserContext,
        id: number,
        expectedStatus: number = 200
    ): Promise<AllergyWithRelations | null> => {
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
    ): Promise<AllergyWithRelations[]> => {
        const response = await context.request.get(`${ALLERGY_ENDPOINT}?inhabitantId=${inhabitantId}`)
        expect(response.status()).toBe(200)

        const responseBody = await response.json()
        expect(Array.isArray(responseBody)).toBe(true)
        return responseBody
    }

    static readonly getAllergiesForHousehold = async (
        context: BrowserContext,
        householdId: number
    ): Promise<AllergyWithRelations[]> => {
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
    ): Promise<AllergyWithRelations> => {
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
    ): Promise<AllergyResponse | null> => {
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
