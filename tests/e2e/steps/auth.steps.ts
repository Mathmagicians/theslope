import {expect} from '@playwright/test'
import {Given, When, Then, fromScene} from '~~/tests/e2e/fixtures'
import {testCredentials} from '~~/tests/e2e/config'
import testHelpers from '~~/tests/e2e/testHelpers'

const {adminUserName, password} = testCredentials
const {headers} = testHelpers

Given('the admin is signed in', async ({adminContext, scene}) => {
    scene.context = adminContext
})

When('the admin signs in with the Heynabo credentials', async ({request, scene}) => {
    const response = await request.post('/api/auth/login', {headers, data: {email: adminUserName, password}})
    expect(response.status()).toBe(200)
    scene.signedInUser = await response.json()
})

Then('the sign-in answers the admin\'s UserDetail with the household', async ({scene}) => {
    const user = fromScene(scene, 'signedInUser')
    expect(user.id).toBeDefined()
    expect(user.email).toBe(adminUserName)
    expect(user.systemRoles).toBeDefined()

    // Inhabitant is nullable (User.Inhabitant? in the schema); the admin account has one
    if (user.Inhabitant) {
        expect(user.Inhabitant.id).toBeDefined()
        expect(user.Inhabitant.householdId).toBeDefined()
        expect(user.Inhabitant.household).toBeDefined()
        expect(user.Inhabitant.household.id).toBe(user.Inhabitant.householdId)
        expect(user.Inhabitant.household.address).toBeDefined()
    }
})
