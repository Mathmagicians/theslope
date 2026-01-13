import {test, expect} from '@playwright/test'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import {useCoreValidation} from '~/composables/useCoreValidation'
import type {UserDisplay} from '~/composables/useCoreValidation'

const {validatedBrowserContext} = testHelpers
const {UserDisplaySchema, SystemRoleSchema} = useCoreValidation()
const SystemRole = SystemRoleSchema.enum

// Constants for seeded data
const SEEDED_ADMIN_EMAIL = 'agata@mathmagicians.dk'

// Variable to store ID for cleanup
const createdUserIds: number[] = []
const newUser = UserFactory.defaultUser()

// Test for creating and retrieving a user
test("PUT /api/admin/users should create a new user and GET should retrieve it", async ({browser}) => {
    const context = await validatedBrowserContext(browser)
    const created = await UserFactory.createUser(context, newUser)
    // Save ID for cleanup
    createdUserIds.push(created.id as number)

    // Verify response
    expect(created).toHaveProperty('email')
    expect(created.email).toBe(newUser.email)

    // Get user list to verify it appears there
    const listResponse = await context.request.get('/api/admin/users')
    expect(listResponse.status()).toBe(200)

    const users = await listResponse.json()
    const foundUser = users.find((u: UserDisplay) => u.email === newUser.email)

    expect(foundUser).toBeTruthy()
    UserDisplaySchema.parse(foundUser) // Validate structure
    expect(foundUser!.id).toBe(created.id)
})

// Test for validation
test("PUT /api/admin/users validation should fail for invalid user data", async ({browser}) => {
    const context = await validatedBrowserContext(browser)

    // Try to create a user without an email (should fail validation)
    const response = await context.request.put('/api/admin/users', {
        data: {
            phone: '+4512345678',
            systemRoles: [SystemRole.ADMIN]
        }
    })

    // Should return 400 Bad Request for validation error
    expect(response.status()).toBe(400)
})

test('GET /api/admin/users should return a list of users from the database', async ({browser}) => {
    const context = await validatedBrowserContext(browser)

    const response = await context.request.get('/api/admin/users')
    expect(response.ok(), `Expected 200, got ${response.status()}: ${await response.text()}`).toBeTruthy()

    const users = await response.json()
    expect(Array.isArray(users)).toBe(true)

    // Validate each user with schema instead of manual property checks
    if (users.length > 0) {
        users.forEach((user: UserDisplay) => UserDisplaySchema.parse(user))
    }
})

test('GET /api/admin/users/by-role/[role] should return users with specific role', async ({browser}) => {
    const context = await validatedBrowserContext(browser)

    const adminUser = await UserFactory.createUser(context, UserFactory.createAdmin())
    createdUserIds.push(adminUser.id as number)

    const allergyManagerUser = await UserFactory.createUser(context, UserFactory.createAllergyManager())
    createdUserIds.push(allergyManagerUser.id as number)

    const regularUser = await UserFactory.createUser(context, UserFactory.defaultUser())
    createdUserIds.push(regularUser.id as number)

    const adminResponse = await context.request.get(`/api/admin/users/by-role/${SystemRole.ADMIN}`)
    expect(adminResponse.status()).toBe(200)
    const adminUsers = await adminResponse.json()
    expect(Array.isArray(adminUsers)).toBe(true)
    const foundAdmin = adminUsers.find((u: UserDisplay) => u.id === adminUser.id)
    expect(foundAdmin).toBeTruthy()
    UserDisplaySchema.parse(foundAdmin) // Validate structure
    expect(foundAdmin!.systemRoles).toContain(SystemRole.ADMIN)

    const allergyManagerResponse = await context.request.get(`/api/admin/users/by-role/${SystemRole.ALLERGYMANAGER}`)
    expect(allergyManagerResponse.status()).toBe(200)
    const allergyManagers = await allergyManagerResponse.json()
    expect(Array.isArray(allergyManagers)).toBe(true)
    const foundAllergyManager = allergyManagers.find((u: UserDisplay) => u.id === allergyManagerUser.id)
    expect(foundAllergyManager).toBeTruthy()
    UserDisplaySchema.parse(foundAllergyManager) // Validate structure including Inhabitant
    expect(foundAllergyManager!.systemRoles).toContain(SystemRole.ALLERGYMANAGER)

    // Verify at least one allergy manager has Inhabitant relation
    const adminManager = allergyManagers.find((m: UserDisplay) => m.systemRoles.includes(SystemRole.ALLERGYMANAGER) && m.Inhabitant)
    if (adminManager) {
        UserDisplaySchema.parse(adminManager) // Schema validates Inhabitant structure
    }

    const regularUserInAdminList = adminUsers.find((u: UserDisplay) => u.id === regularUser.id)
    expect(regularUserInAdminList).toBeFalsy()
})

test('GET /api/admin/users/by-role/ALLERGYMANAGER should return seeded admin with Inhabitant', async ({browser}) => {
    const context = await validatedBrowserContext(browser)

    const response = await context.request.get(`/api/admin/users/by-role/${SystemRole.ALLERGYMANAGER}`)
    expect(response.status()).toBe(200)

    const allergyManagers = await response.json()
    expect(Array.isArray(allergyManagers)).toBe(true)

    const seededAdmin = allergyManagers.find((u: UserDisplay) => u.email === SEEDED_ADMIN_EMAIL)
    expect(seededAdmin).toBeTruthy()
    UserDisplaySchema.parse(seededAdmin) // Validates Inhabitant structure
    expect(seededAdmin!.Inhabitant).toBeTruthy()
    expect(seededAdmin!.Inhabitant).not.toBeNull()
})

test('GET /api/admin/users/by-role/[role] should return users with multiple roles', async ({browser}) => {
    const context = await validatedBrowserContext(browser)

    // Create user with both ADMIN and ALLERGYMANAGER roles
    const multiRoleUser = await UserFactory.createUser(context, UserFactory.createAdminAndAllergyManager())
    createdUserIds.push(multiRoleUser.id as number)

    // User should appear in ADMIN list
    const adminResponse = await context.request.get(`/api/admin/users/by-role/${SystemRole.ADMIN}`)
    expect(adminResponse.status()).toBe(200)
    const adminUsers = await adminResponse.json()
    const foundInAdminList = adminUsers.find((u: UserDisplay) => u.id === multiRoleUser.id)
    expect(foundInAdminList).toBeTruthy()
    UserDisplaySchema.parse(foundInAdminList) // Validate structure

    // User should also appear in ALLERGYMANAGER list
    const allergyManagerResponse = await context.request.get(`/api/admin/users/by-role/${SystemRole.ALLERGYMANAGER}`)
    expect(allergyManagerResponse.status()).toBe(200)
    const allergyManagers = await allergyManagerResponse.json()
    const foundInAllergyManagerList = allergyManagers.find((u: UserDisplay) => u.id === multiRoleUser.id)
    expect(foundInAllergyManagerList).toBeTruthy()
    UserDisplaySchema.parse(foundInAllergyManagerList) // Validate structure
    expect(foundInAllergyManagerList!.systemRoles).toEqual(expect.arrayContaining([SystemRole.ADMIN, SystemRole.ALLERGYMANAGER]))
})

// Cleanup after all tests
test.afterAll(async ({browser}) => {
    if (createdUserIds.length > 0) {
        const context = await validatedBrowserContext(browser)
        await UserFactory.cleanupUsers(context, createdUserIds)
    }
})
