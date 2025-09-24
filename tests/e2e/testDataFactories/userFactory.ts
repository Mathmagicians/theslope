import type {BrowserContext} from "@playwright/test"
import {expect} from "@playwright/test"
import testHelpers from "../testHelpers"
import type {User, UserCreate} from "~/composables/useUserValidation"

const {salt, headers} = testHelpers

export class UserFactory {
    static readonly defaultUserData: UserCreate = {
        email: 'minnie-admin-users@andeby.dk',
        phone: '+4512345678',
        passwordHash: 'caramba',
        systemRole: 'USER'
    }

    static readonly defaultUser = (testSalt: string = Date.now().toString()) => {
        const saltedUser = {
            ...this.defaultUserData,
            email: salt('minnie-admin-users', testSalt) + '@andeby.dk'
        }
        return saltedUser
    }

    static readonly createUser = async (context: BrowserContext, aUser: UserCreate): Promise<User> => {
        // Users API uses query parameters, not request body
        const response = await context.request.put('/api/admin/users', {
            headers: headers,
            params: {
                email: aUser.email,
                phone: aUser.phone,
                systemRole: aUser.systemRole
            }
        })

        const status = response.status()
        const responseBody = await response.json()

        expect(status, 'Unexpected status').toBe(201)
        expect(responseBody.id, 'Response should contain the new user ID').toBeDefined()
        expect(responseBody.email, 'Response should contain the email').toBe(aUser.email)

        return responseBody
    }

    static readonly deleteUser = async (context: BrowserContext, id: number): Promise<User> => {
        const deleteResponse = await context.request.delete(`/api/admin/users/${id}`)
        expect(deleteResponse.status()).toBe(200)
        const responseBody = await deleteResponse.json()
        expect(responseBody).toBeDefined()
        return responseBody
    }

    static readonly createAdmin = (testSalt: string = Date.now().toString()) => {
        return {
            ...this.defaultUser(testSalt),
            systemRole: 'ADMIN' as const
        }
    }

    static readonly createChef = (testSalt: string = Date.now().toString()) => {
        return {
            ...this.defaultUser(testSalt),
            systemRole: 'USER' as const // Chefs are typically users with inhabitant roles
        }
    }
}