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
        params: {
            phone: '+4512345678',
            systemRole: 'ADMIN'
        }
    })

    // Should return 400 Bad Request for validation error
    expect(response.status()).toBe(400)
})

test('GET /api/admin/users should return a list of users from the database', async ({browser}) => {
    const context = await validatedBrowserContext(browser)

    // Get user list
    const response = await context.request.get('/api/admin/users')
    expect(response.status()).toBe(200)

    // Verify it's an array
    const users = await response.json()
    expect(Array.isArray(users)).toBe(true)

    // Verify each user has the expected properties
    if (users.length > 0) {
        const user = users[0]
        expect(user).toHaveProperty('id')
        expect(user).toHaveProperty('email')
    }
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
