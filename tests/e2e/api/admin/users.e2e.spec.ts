import {test, expect} from '@playwright/test'
const adminFile = 'playwright/.auth/admin.json'

const testSalt = Date.now().toString()
const userEmail = `minnie-admin-users-${testSalt}@andeby.dk`
//TODO refactor to use testObjects users
// TODO refactor to use beforeAll, afterAll for setup/teardown

// Create a test fixture that shares the context and handles cleanup
const testWithCleanup = test.extend({
  // Fixture that cleans up after all tests
  cleanupContext: async ({browser}, use) => {
    // Use the test context first
    const context = await browser.newContext({
      storageState: adminFile
    })
    
    await use(context)
    
    // Run cleanup after tests
    await test.step('Cleanup created test user', async () => {
      // First get the user ID from the users list
      const usersResponse = await context.request.get('/api/admin/users')
      const users = await usersResponse.json()
      const userToDelete = users.find(u => u.email === userEmail)
      
      if (userToDelete) {
        // Found the user, attempt to delete by ID
        const deleteResponse = await context.request.delete(`/api/admin/users/${userToDelete.id}`)
        expect(deleteResponse.status()).toBe(200)
      }
      
      // Verify the user is not in the list
      const verifyResponse = await context.request.get('/api/admin/users')
      const updatedUsers = await verifyResponse.json()
      const userStillExists = updatedUsers.find(u => u.email === userEmail)
      expect(userStillExists).toBeUndefined()
    })
  }
})

testWithCleanup("PUT with query params should add a user to the database, and GET will retrieve the user", async ({cleanupContext}) => {
    const response = await cleanupContext.request.put('/api/admin/users', {
        params: {
            email: userEmail,
            phone: '+4512345678',
            systemRole: 'ADMIN'
        }
    })
    expect(response.status()).toBe(201)
    const responseBody = await response.json()
    expect(responseBody).toHaveProperty('email')
    expect(responseBody.email).toBe(userEmail)
    
    // Verify user was created by getting the user list
    const listResponse = await cleanupContext.request.get('/api/admin/users')
    expect(listResponse.status()).toBe(200)
    
    const users = await listResponse.json()
    const foundUser = users.find(u => u.email === userEmail)
    
    expect(foundUser).toBeTruthy()
    expect(foundUser.email).toBe(userEmail)
})

test('PUT without email query param should return a validation error', async ({browser}) => {
    const context = await browser.newContext({
        storageState: adminFile
    })
    
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

test('GET should return a list of users from the database', async ({browser}) => {
    const context = await browser.newContext({
        storageState: adminFile
    })
    
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
