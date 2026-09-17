import type {BrowserContext} from "@playwright/test"
import {expect} from "@playwright/test"
import testHelpers from "../testHelpers"
import type {UserDetail, UserCreate} from "~/composables/useCoreValidation"
import {useCoreValidation} from "~/composables/useCoreValidation"
import {HouseholdFactory} from "./householdFactory"
import {DEFAULT_APPEARANCE, DEFAULT_NOTIFICATION_CHANNELS, type UserPreferencesUpdate} from "~/composables/useUserPreferenceValidation"
import {useNotificationValidation, type SenderEmitResult} from "~/composables/useNotificationValidation"

const {salt, headers} = testHelpers
const {SystemRoleSchema} = useCoreValidation()
const SystemRole = SystemRoleSchema.enum

export class UserFactory {

    static readonly defaultUserData: UserCreate = {
        email: 'minnie-admin-users@andeby.dk',
        phone: '+4512345678',
        passwordHash: 'caramba',
        systemRoles: [], // Regular user has empty roles array
        notificationChannels: [...DEFAULT_NOTIFICATION_CHANNELS],
        appearance: {...DEFAULT_APPEARANCE}
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
            phone: overrides?.phone !== undefined ? overrides.phone : userData.phone,
            systemRoles: overrides?.systemRoles ?? userData.systemRoles,
            notificationChannels: overrides?.notificationChannels ?? userData.notificationChannels,
            appearance: overrides?.appearance ?? userData.appearance,
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
                    moveOutDate: null,
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

    /**
     * POST /api/user/preferences - the session user's own notification channels and appearance.
     * Returns the updated UserDetail on 200, null on an expected error status.
     */
    static readonly updateMyPreferences = async (
        context: BrowserContext,
        preferences: UserPreferencesUpdate,
        expectedStatus: number = 200
    ): Promise<UserDetail | null> => {
        const response = await context.request.post('/api/user/preferences', {headers, data: preferences})

        const status = response.status()
        const errorBody = status !== expectedStatus ? await response.text() : ''
        expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

        if (expectedStatus !== 200) return null
        const {UserDetailSchema} = useCoreValidation()
        return UserDetailSchema.parse(await response.json())
    }

    /** POST /api/user/notifications/test - one test message to the session user */
    static readonly sendTestNotification = async (
        context: BrowserContext,
        expectedStatus: number = 200
    ): Promise<SenderEmitResult | null> => {
        const response = await context.request.post('/api/user/notifications/test', {headers})

        const status = response.status()
        const errorBody = status !== expectedStatus ? await response.text() : ''
        expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

        if (expectedStatus !== 200) return null
        const {SenderEmitResultSchema} = useNotificationValidation()
        return SenderEmitResultSchema.parse(await response.json())
    }

    /** The user snapshot the session carries (GET /api/_auth/session) */
    static readonly getSessionUser = async (context: BrowserContext): Promise<UserDetail> => {
        const response = await context.request.get('/api/_auth/session', {headers})
        expect(response.status()).toBe(200)
        const {UserDetailSchema} = useCoreValidation()
        return UserDetailSchema.parse((await response.json()).user)
    }

    /** POST /api/admin/users/:id - the admin path used to arrange a member's phone for a test */
    static readonly setPhone = async (context: BrowserContext, userId: number, phone: string | null): Promise<void> => {
        const response = await context.request.post(`/api/admin/users/${userId}`, {headers, data: {phone}})
        expect(response.status(), 'Unexpected status setting phone').toBe(200)
    }

    /** GET /api/admin/users - the stored users, for a test that needs a user's persisted roles */
    static readonly getUsers = async (context: BrowserContext): Promise<UserDetail[]> => {
        const response = await context.request.get('/api/admin/users', {headers})
        expect(response.status(), 'Unexpected status listing users').toBe(200)
        return await response.json()
    }

    /**
     * POST /api/admin/users/:id - the admin path used to arrange a user's roles for a test.
     * ALLERGYMANAGER is TheSlope-owned, so it survives the user's next login; a spec that
     * grants it restores the original roles afterwards.
     */
    static readonly setSystemRoles = async (
        context: BrowserContext,
        userId: number,
        systemRoles: string[]
    ): Promise<void> => {
        const response = await context.request.post(`/api/admin/users/${userId}`, {headers, data: {systemRoles}})
        expect(response.status(), 'Unexpected status setting system roles').toBe(200)
    }

    /**
     * Run `body` with the user holding exactly `systemRoles`, then put the stored roles back.
     * Lets a test state the role it needs instead of depending on what the environment granted.
     * Roles live in the session snapshot, so `body` logs in again (`freshMemberContext`) to see them.
     */
    static readonly withSystemRoles = async <T>(
        adminContext: BrowserContext,
        userId: number,
        systemRoles: string[],
        body: () => Promise<T>
    ): Promise<T> => {
        const stored = (await UserFactory.getUsers(adminContext)).find(user => user.id === userId)
        expect(stored, `User ${userId} must exist to arrange its roles`).toBeDefined()
        const originalRoles = [...(stored!.systemRoles ?? [])]

        await UserFactory.setSystemRoles(adminContext, userId, systemRoles)
        try {
            return await body()
        } finally {
            await UserFactory.setSystemRoles(adminContext, userId, originalRoles)
        }
    }

    static readonly createAdmin = (testSalt: string = testHelpers.temporaryAndRandom()): UserCreate => {
        return {
            ...this.defaultUser(testSalt),
            systemRoles: [SystemRole.ADMIN]
        }
    }

    static readonly createAllergyManager = (testSalt: string = testHelpers.temporaryAndRandom()): UserCreate => {
        return {
            ...this.defaultUser(testSalt),
            systemRoles: [SystemRole.ALLERGYMANAGER]
        }
    }

    static readonly createAdminAndAllergyManager = (testSalt: string = testHelpers.temporaryAndRandom()): UserCreate => {
        return {
            ...this.defaultUser(testSalt),
            systemRoles: [SystemRole.ADMIN, SystemRole.ALLERGYMANAGER]
        }
    }

    static readonly createChef = (testSalt: string = testHelpers.temporaryAndRandom()) => {
        return {
            ...this.defaultUser(testSalt),
            systemRoles: [] as const // Chefs are regular users with inhabitant roles
        }
    }
}
