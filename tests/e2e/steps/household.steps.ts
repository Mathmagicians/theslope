import {expect} from '@playwright/test'
import {defineParameterType} from 'playwright-bdd'
import {Then, fromScene} from '~~/tests/e2e/fixtures'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'

/** The admin's lists of the residents the Heynabo import keeps, by their names in a feature */
const ADMIN_LISTS = ['households', 'users', 'inhabitants'] as const
type AdminList = typeof ADMIN_LISTS[number]

defineParameterType({name: 'adminList', regexp: [...ADMIN_LISTS]})

const firstEntry = <T>(entries: T[]): T => {
    expect(Array.isArray(entries)).toBe(true)
    expect(entries.length).toBeGreaterThan(0)
    return entries[0]!
}

Then('the {adminList} list is non-empty', async ({scene}, list: AdminList) => {
    const context = fromScene(scene, 'context')
    switch (list) {
        case 'households': {
            const household = firstEntry(await HouseholdFactory.getAllHouseholds(context))
            expect(household.id).toBeDefined()
            expect(household.name).toBeDefined()
            expect(household.inhabitants).toBeDefined()
            break
        }
        case 'users': {
            const user = firstEntry(await UserFactory.getUsers(context))
            expect(user.id).toBeDefined()
            expect(user.email).toBeDefined()
            break
        }
        case 'inhabitants':
            firstEntry(await HouseholdFactory.getAllInhabitants(context))
            break
    }
})
