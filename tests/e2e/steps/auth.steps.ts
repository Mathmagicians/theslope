import {expect} from '@playwright/test'
import {defineParameterType} from 'playwright-bdd'
import {Given, When, Then, fromScene, ACTOR, REQUEST, type Actor, type Request} from '~~/tests/e2e/fixtures'
import {testCredentials} from '~~/tests/e2e/config'
import testHelpers from '~~/tests/e2e/testHelpers'

const {adminUserName, password} = testCredentials
const {headers} = testHelpers

/** The refusals by their words, each with the status it answers (ADR-002) */
const REFUSALS = {invalid: 400, unauthenticated: 401, forbidden: 403, unknown: 404} as const

defineParameterType({name: 'request', regexp: Object.values(REQUEST)})
defineParameterType({
    name: 'refusal',
    regexp: Object.keys(REFUSALS),
    transformer: (refusal: string) => REFUSALS[refusal as keyof typeof REFUSALS]
})

Given('{actor} is signed in', async ({contextOf, scene}, actor: Actor) => {
    scene.context = await contextOf(actor)
    scene.actor = actor
})

Given('a visitor without a session', async ({contextOf, scene}) => {
    scene.context = await contextOf(ACTOR.VISITOR)
    scene.actor = ACTOR.VISITOR
})

Then('the {request} is refused as {refusal}', async ({scene}, request: Request, status: number) => {
    const answer = fromScene(scene, 'answer')
    expect(answer.request, 'the scenario sent the request it reads').toBe(request)
    expect(answer.status, `the ${request} is refused with ${status}`).toBe(status)
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
