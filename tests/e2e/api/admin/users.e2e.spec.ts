import {test, expect} from '@playwright/test'
import {UserFactory} from '../../testDataFactories/userFactory'
import testHelpers from '../../testHelpers'

const {validatedBrowserContext} = testHelpers

// Variable to store ID for cleanup
let createdUserIds: number[] = []
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
    const foundUser = users.find((u: any) => u.email === newUser.email)

    expect(foundUser).toBeTruthy()
    expect(foundUser.id).toBe(created.id)
})

// Test for validation
test("PUT /api/admin/users validation should fail for invalid user data", async ({browser}) => {
    const context = await validatedBrowserContext(browser)

    // Try to create a user without an email (should fail validation)
    const response = await context.request.put('/api/admin/users', {
        data: {
            phone: '+4512345678',
            systemRoles: ['ADMIN']
        }
    })

    // Should return 400 Bad Request for validation error
    expect(response.status()).toBe(400)
})

test('GET /api/admin/users should return a list of users from the database', async ({browser}) => {
    const context = await validatedBrowserContext(browser)

    const response = await context.request.get('/api/admin/users')
    expect(response.status()).toBe(200)

    const users = await response.json()
    expect(Array.isArray(users)).toBe(true)

    if (users.length > 0) {
        const user = users[0]
        expect(user).toHaveProperty('id')
        expect(user).toHaveProperty('email')
        expect(user).toHaveProperty('systemRoles')
        expect(Array.isArray(user.systemRoles)).toBe(true)
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

    const adminResponse = await context.request.get('/api/admin/users/by-role/ADMIN')
    expect(adminResponse.status()).toBe(200)
    const adminUsers = await adminResponse.json()
    expect(Array.isArray(adminUsers)).toBe(true)
    const foundAdmin = adminUsers.find((u: any) => u.id === adminUser.id)
    expect(foundAdmin).toBeTruthy()
    expect(foundAdmin.systemRoles).toContain('ADMIN')

    const allergyManagerResponse = await context.request.get('/api/admin/users/by-role/ALLERGYMANAGER')
    expect(allergyManagerResponse.status()).toBe(200)
    const allergyManagers = await allergyManagerResponse.json()
    expect(Array.isArray(allergyManagers)).toBe(true)
    const foundAllergyManager = allergyManagers.find((u: any) => u.id === allergyManagerUser.id)
    expect(foundAllergyManager).toBeTruthy()
    expect(foundAllergyManager.systemRoles).toContain('ALLERGYMANAGER')
    expect(foundAllergyManager).toHaveProperty('Inhabitant')

    const adminManager = allergyManagers.find((m: any) => m.systemRoles.includes('ALLERGYMANAGER') && m.Inhabitant)
    if (adminManager) {
        expect(adminManager.Inhabitant).toHaveProperty('name')
        expect(adminManager.Inhabitant).toHaveProperty('lastName')
        expect(adminManager.Inhabitant).toHaveProperty('pictureUrl')
        expect(typeof adminManager.Inhabitant.name).toBe('string')
        expect(typeof adminManager.Inhabitant.lastName).toBe('string')
    }

    const regularUserInAdminList = adminUsers.find((u: any) => u.id === regularUser.id)
    expect(regularUserInAdminList).toBeFalsy()
})

test('GET /api/admin/users/by-role/ALLERGYMANAGER should return seeded admin with Inhabitant', async ({browser}) => {
    const context = await validatedBrowserContext(browser)

    const response = await context.request.get('/api/admin/users/by-role/ALLERGYMANAGER')
    expect(response.status()).toBe(200)

    const allergyManagers = await response.json()
    expect(Array.isArray(allergyManagers)).toBe(true)

    const seededAdmin = allergyManagers.find((u: any) => u.email === 'agata@mathmagicians.dk')
    expect(seededAdmin).toBeTruthy()
    expect(seededAdmin.Inhabitant).toBeTruthy()
    expect(seededAdmin.Inhabitant).not.toBeNull()
    expect(seededAdmin.Inhabitant.name).toBeTruthy()
    expect(seededAdmin.Inhabitant.pictureUrl).toBeTruthy()
})

test('GET /api/admin/users/by-role/[role] should return users with multiple roles', async ({browser}) => {
    const context = await validatedBrowserContext(browser)

    // Create user with both ADMIN and ALLERGYMANAGER roles
    const multiRoleUser = await UserFactory.createUser(context, UserFactory.createAdminAndAllergyManager())
    createdUserIds.push(multiRoleUser.id as number)

    // User should appear in ADMIN list
    const adminResponse = await context.request.get('/api/admin/users/by-role/ADMIN')
    expect(adminResponse.status()).toBe(200)
    const adminUsers = await adminResponse.json()
    const foundInAdminList = adminUsers.find((u: any) => u.id === multiRoleUser.id)
    expect(foundInAdminList).toBeTruthy()

    // User should also appear in ALLERGYMANAGER list
    const allergyManagerResponse = await context.request.get('/api/admin/users/by-role/ALLERGYMANAGER')
    expect(allergyManagerResponse.status()).toBe(200)
    const allergyManagers = await allergyManagerResponse.json()
    const foundInAllergyManagerList = allergyManagers.find((u: any) => u.id === multiRoleUser.id)
    expect(foundInAllergyManagerList).toBeTruthy()
    expect(foundInAllergyManagerList.systemRoles).toEqual(expect.arrayContaining(['ADMIN', 'ALLERGYMANAGER']))
})

// Cleanup after all tests
test.afterAll(async ({browser}) => {
    // Only run cleanup if we created a user
    if (createdUserIds.length > 0) {
        const context = await validatedBrowserContext(browser)
        // iterate over list and delete each user
        for (const id of createdUserIds) {
            try {
                const deleted = await UserFactory.deleteUser(context, id)
                expect(deleted.id).toBe(id)
            } catch (error) {
                console.error(`Failed to delete test user with ID ${id}:`, error)
            }
        }
    }
})
