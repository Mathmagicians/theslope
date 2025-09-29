// Helpers to work with bdd tests for Household aggregate root and strongly related entities (Inhabitants)

import {expect, BrowserContext} from "@playwright/test"
import testHelpers from "../testHelpers"

const {salt, headers} = testHelpers
const INHABITANT_ENDPOINT = '/api/admin/inhabitant'

export class HouseholdFactory {

    // === HOUSEHOLD METHODS ===

    static readonly defaultHouseholdData = (testSalt: string = Date.now().toString()) => {
        const now = new Date()
        return {
            heynaboId: 0,
            pbsId: 0,
            name: salt('Test Household', testSalt),
            address: salt('123 Andeby', testSalt),
            movedInDate: now
        }
    }

    static readonly createHousehold = async (
        context: BrowserContext,
        householdName: string,
        expectedStatus: number = 201
    ): Promise<any> => {
        const householdData = {
            ...this.defaultHouseholdData(),
            name: householdName
        }

        const response = await context.request.put('/api/admin/household', {
            headers: headers,
            data: householdData
        })

        const status = response.status()
        const responseBody = await response.json()

        expect(status, 'Unexpected status').toBe(expectedStatus)

        if (expectedStatus === 201) {
            expect(responseBody.id, 'Response should contain the new household ID').toBeDefined()
        }

        return responseBody
    }

    /**
     * Create household with inhabitants (for 3a, 3b test scenarios)
     */
    static readonly createHouseholdWithInhabitants = async (
        context: BrowserContext,
        name: string = 'Test Household', // FIXME create zod schema for household and use as type
        inhabitantCount: number = 2
    ): Promise<{household: any, inhabitants: any[]}> => {
        const household = await this.createHousehold(context, name)
        const inhabitants = await Promise.all(
            Array(inhabitantCount).fill(0)
                .map((_, i) => this.createInhabitantForHousehold(context, household.id, `Inhabitant ${i}`))
        )
        return {household, inhabitants}
    }

    /**
     * Delete household (for 3b test scenarios)
     */
    static readonly deleteHousehold = async (
        context: BrowserContext,
        householdId: number,
        expectedStatus: number = 200
    ): Promise<any> => {
        const response = await context.request.delete(`/api/admin/household/${householdId}`)

        const status = response.status()
        expect(status, 'Unexpected status').toBe(expectedStatus)

        if (expectedStatus === 200) {
            const responseBody = await response.json()
            return responseBody
        }

        return null
    }

    // === INHABITANT METHODS ===

    static readonly defaultInhabitantData = (testSalt: string = Date.now().toString()) => {
        return {
            heynaboId: 30000 + Math.floor(Math.random() * 70000),
            name: salt('Test', testSalt),
            lastName: salt('Inhabitant', testSalt),
            pictureUrl: null,
            birthDate: null
        }
    }

    /**
     * Create inhabitant for existing household
     */
    static readonly createInhabitantForHousehold = async (
        context: BrowserContext,
        householdId: number,
        inhabitantName?: string,
        expectedStatus: number = 201
    ): Promise<any> => {
        const inhabitantData = {
            ...this.defaultInhabitantData(),
            householdId: householdId
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
        const responseBody = await response.json()

        expect(status, 'Unexpected status').toBe(expectedStatus)

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
        const responseBody = await response.json()

        expect(status, 'Unexpected status').toBe(expectedStatus)

        if (expectedStatus === 201) {
            expect(responseBody.id, 'Response should contain the new inhabitant ID').toBeDefined()
            expect(responseBody.userId, 'Response should contain the new user ID').toBeDefined()
        }

        return responseBody
    }

    /**
     * Get user by ID (for testing user associations)
     */
    static readonly getUserById = async (context: BrowserContext, userId: number): Promise<any> => {
        const response = await context.request.get(`/api/admin/user/${userId}`)
        expect(response.status()).toBe(200)

        const responseBody = await response.json()
        expect(responseBody.id).toBe(userId)
        return responseBody
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
