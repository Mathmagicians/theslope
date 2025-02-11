import {test, expect} from '@playwright/test'
const adminFile = 'playwright/.auth/admin.json'

const testSalt = Date.now().toString()
const userEmail = `minnie-admin-users-${testSalt}@andeby.dk`

test("PUT with query params should add a user to the database, and GET will retrieve the user", async ({browser}) => {
    const context = await browser.newContext({
        storageState: adminFile
    })

    const response = await context.request.put('/api/admin/users', {
        params:  {
            email: userEmail,
            phone: '+4512345678',
            systemRole: 'ADMIN'
        }
    })
    expect(response.status()).toBe(201)
    const responseBody = await response.json()
    expect(responseBody).toHaveProperty('email')
    expect(responseBody.email).toBe(userEmail)
})

test.skip('PUT without email query param should return a validation error', ({request}) => {
})

test.skip('GET should return a list of users from the database', ({request}) => {

})
