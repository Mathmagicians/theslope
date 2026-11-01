import {describe, it, expect} from 'vitest'
import {createMemoryHistory, createRouter} from 'vue-router'
import {getHouseholdUrl, householdBookingsRedirect, HOUSEHOLD_TAB} from '~/utils/household'

describe('getHouseholdUrl', () => {
    it.each([
        {
            shortName: 'S_31',
            pbsId: 12345,
            tab: undefined,
            expected: '/household/S_31?pbs=12345',
            description: 'without tab'
        },
        {
            shortName: 'S_31',
            pbsId: 12345,
            tab: HOUSEHOLD_TAB.bookings,
            expected: '/household/S_31/bookings?pbs=12345',
            description: 'with bookings tab'
        },
        {
            shortName: 'S_31',
            pbsId: 12345,
            tab: HOUSEHOLD_TAB.members,
            expected: '/household/S_31/members?pbs=12345',
            description: 'with members tab'
        },
        {
            shortName: 'S_31',
            pbsId: 99999,
            tab: HOUSEHOLD_TAB.allergies,
            expected: '/household/S_31/allergies?pbs=99999',
            description: 'with different pbsId'
        },
        {
            shortName: 'AR_1_th',
            pbsId: 42,
            tab: HOUSEHOLD_TAB.economy,
            expected: '/household/AR_1_th/economy?pbs=42',
            description: 'with multi-segment shortName'
        }
    ])('builds URL $description → $expected', ({shortName, pbsId, tab, expected}) => {
        expect(getHouseholdUrl(shortName, pbsId, tab)).toBe(expected)
    })

    it('encodes special characters in shortName', () => {
        const result = getHouseholdUrl('Ø_31', 100)
        expect(result).toBe('/household/%C3%98_31?pbs=100')
    })

    it('encodes spaces in shortName', () => {
        const result = getHouseholdUrl('A B', 100, HOUSEHOLD_TAB.bookings)
        expect(result).toBe('/household/A%20B/bookings?pbs=100')
    })
})

// A household's page without a tab opens its bookings with the whole query
describe('householdBookingsRedirect', () => {
    const router = createRouter({history: createMemoryHistory(), routes: [{path: '/household/:shortname', component: {}}]})
    const bookingsOf = (household: string) => `/household/${household}/${HOUSEHOLD_TAB.bookings}`

    it.each([
        {desc: 'a household with its pbs number', url: '/household/S_31?pbs=12345', path: bookingsOf('S_31'), query: {pbs: '12345'}},
        {desc: 'a household with more query', url: '/household/S_31?pbs=12345&date=2026-11-01', path: bookingsOf('S_31'), query: {pbs: '12345', date: '2026-11-01'}},
        {desc: 'a household without a pbs number', url: '/household/S_31', path: bookingsOf('S_31'), query: {}},
        {desc: 'an encoded short name', url: '/household/%C3%98_31?pbs=100', path: bookingsOf('%C3%98_31'), query: {pbs: '100'}},
        {desc: 'a trailing slash', url: '/household/S_31/?pbs=100', path: bookingsOf('S_31'), query: {pbs: '100'}}
    ])('GIVEN $desc WHEN the page opens THEN it goes to the bookings tab with the query', ({url, path, query}) => {
        expect(householdBookingsRedirect(router.resolve(url))).toEqual({path, query})
    })
})
