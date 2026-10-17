import {describe, it, expect, vi} from 'vitest'
import {scaffoldPrebookings} from '~~/server/utils/scaffoldPrebookings'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'

// The scaffolder reads the app config from the Nitro auto-import scope
vi.stubGlobal('useAppConfig', () => ({theslope: {}}))

const d1Client = {} as D1Database

describe('scaffoldPrebookings', () => {
    // User mode books for a household on a user's behalf: the audit names the user and the run stays in the household
    it.each([
        {missing: 'userId', options: {householdId: 1}},
        {missing: 'householdId', options: {userId: 1}}
    ])('refuses user mode without $missing', async ({options}) => {
        await expect(scaffoldPrebookings(d1Client, {...options, seasonId: 1, desiredOrders: [OrderFactory.defaultDesiredOrder()]}))
            .rejects.toThrow('User mode (desiredOrders provided) requires both householdId and userId')
    })
})
