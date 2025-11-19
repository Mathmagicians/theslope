import type {BrowserContext} from "@playwright/test"
import {expect} from "@playwright/test"
import testHelpers from "../testHelpers"
import type {UserDetail, UserCreate} from "~/composables/useCoreValidation"
import {useCoreValidation} from "~/composables/useCoreValidation"

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

    static readonly defaultUser = (testSalt: string = Date.now().toString()): UserCreate => {
        const saltedUser = {
            ...this.defaultUserData,
            email: salt('minnie-admin-users', testSalt) + '@andeby.dk'
        }
        return saltedUser
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

    static readonly createAdmin = (testSalt: string = Date.now().toString()) => {
        return {
            ...this.defaultUser(testSalt),
            systemRoles: [SystemRole.ADMIN] as const
        }
    }

    static readonly createAllergyManager = (testSalt: string = Date.now().toString()) => {
        return {
            ...this.defaultUser(testSalt),
            systemRoles: [SystemRole.ALLERGYMANAGER] as const
        }
    }

    static readonly createAdminAndAllergyManager = (testSalt: string = Date.now().toString()) => {
        return {
            ...this.defaultUser(testSalt),
            systemRoles: [SystemRole.ADMIN, SystemRole.ALLERGYMANAGER] as const
        }
    }

    static readonly createChef = (testSalt: string = Date.now().toString()) => {
        return {
            ...this.defaultUser(testSalt),
            systemRoles: [] as const // Chefs are regular users with inhabitant roles
        }
    }
}
