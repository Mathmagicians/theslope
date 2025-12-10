import type {BrowserContext} from "@playwright/test"
import {expect} from "@playwright/test"
import testHelpers from "../testHelpers"
import type {UserDetail, UserCreate} from "~/composables/useCoreValidation"
import {useCoreValidation} from "~/composables/useCoreValidation"
import {HouseholdFactory} from "./householdFactory"

const {salt, headers} = testHelpers
const {SystemRoleSchema} = useCoreValidation()
const SystemRole = SystemRoleSchema.enum

export class UserFactory {

    static readonly defaultUserData: UserCreate = {
        email: 'minnie-admin-users@andeby.dk',
        phone: '+4512345678',
        passwordHash: 'caramba',
        systemRoles: [] // Regular user has empty roles array
    }

    static readonly defaultUser = (testSalt: string = testHelpers.temporaryAndRandom()): UserCreate => {
        return {
            ...this.defaultUserData,
            email: salt('minnie-admin-users', testSalt) + '@andeby.dk'
        }
    }

    /**
     * Create test UserDetail with Inhabitant data for component tests
     * Combines UserCreate and InhabitantCreate data patterns
     * Uses schema validation to ensure data integrity
     */
    static readonly defaultUserWithInhabitant = (
        testSalt: string = testHelpers.temporaryAndRandom(),
        overrides?: Partial<UserDetail>
    ): UserDetail => {
        const {UserDetailSchema} = useCoreValidation()
        const userData = this.defaultUser(testSalt)
        const inhabitantData = HouseholdFactory.defaultInhabitantData(testSalt)
        const householdData = HouseholdFactory.defaultHouseholdData(testSalt)

        const userDetail: UserDetail = {
            id: overrides?.id ?? 1,
            email: overrides?.email ?? userData.email,
            phone: overrides?.phone ?? userData.phone,
            systemRoles: overrides?.systemRoles ?? userData.systemRoles,
            createdAt: overrides?.createdAt ?? new Date(),
            updatedAt: overrides?.updatedAt ?? new Date(),
            Inhabitant: overrides?.Inhabitant ?? {
                id: 1,
                heynaboId: inhabitantData.heynaboId,
                householdId: 1,
                name: inhabitantData.name,
                lastName: inhabitantData.lastName,
                pictureUrl: inhabitantData.pictureUrl,
                birthDate: inhabitantData.birthDate,
                household: {
                    id: 1,
                    heynaboId: householdData.heynaboId,
                    pbsId: householdData.pbsId,
                    movedInDate: householdData.movedInDate,
                    name: householdData.name,
                    shortName: salt('TH', testSalt), // Computed from address in real data
                    address: householdData.address
                }
            }
        }

        // Validate with schema
        return UserDetailSchema.parse(userDetail)
    }

    static readonly createUser = async (context: BrowserContext, aUser: UserCreate = this.defaultUser() ): Promise<UserDetail> => {
        // Users API uses request body (ADR-002 pattern)
        const response = await context.request.put('/api/admin/users', {
            headers: headers,
            data: aUser
        })

        const status = response.status()
        const responseBody = await response.json()

        expect(status, 'Unexpected status').toBe(201)
        expect(responseBody.id, 'Response should contain the new user ID').toBeDefined()
        expect(responseBody.email, 'Response should contain the email').toBe(aUser.email)

        return responseBody
    }

    static readonly deleteUser = async (context: BrowserContext, id: number): Promise<UserDetail> => {
        const deleteResponse = await context.request.delete(`/api/admin/users/${id}`)
        expect(deleteResponse.status()).toBe(200)
        const responseBody = await deleteResponse.json()
        expect(responseBody).toBeDefined()
        return responseBody
    }

    static readonly cleanupUsers = async (
        context: BrowserContext,
        userIds: number[]
    ): Promise<void> => {
        await Promise.all(userIds.map(async (id) => {
            const response = await context.request.delete(`/api/admin/users/${id}`)
            if (response.status() !== 200 && response.status() !== 404) {
                console.warn(`Failed to cleanup user ${id}: status ${response.status()}`)
            }
        }))
    }

    static readonly createAdmin = (testSalt: string = testHelpers.temporaryAndRandom()) => {
        return {
            ...this.defaultUser(testSalt),
            systemRoles: [SystemRole.ADMIN] as const
        }
    }

    static readonly createAllergyManager = (testSalt: string = testHelpers.temporaryAndRandom()) => {
        return {
            ...this.defaultUser(testSalt),
            systemRoles: [SystemRole.ALLERGYMANAGER] as const
        }
    }

    static readonly createAdminAndAllergyManager = (testSalt: string = testHelpers.temporaryAndRandom()) => {
        return {
            ...this.defaultUser(testSalt),
            systemRoles: [SystemRole.ADMIN, SystemRole.ALLERGYMANAGER] as const
        }
    }

    static readonly createChef = (testSalt: string = testHelpers.temporaryAndRandom()) => {
        return {
            ...this.defaultUser(testSalt),
            systemRoles: [] as const // Chefs are regular users with inhabitant roles
        }
    }
}
