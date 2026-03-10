import {describe, it, expect} from 'vitest'
import {getHouseholdUrl} from '~/utils/household'

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
            tab: 'bookings',
            expected: '/household/S_31/bookings?pbs=12345',
            description: 'with bookings tab'
        },
        {
            shortName: 'S_31',
            pbsId: 12345,
            tab: 'members',
            expected: '/household/S_31/members?pbs=12345',
            description: 'with members tab'
        },
        {
            shortName: 'S_31',
            pbsId: 99999,
            tab: 'allergies',
            expected: '/household/S_31/allergies?pbs=99999',
            description: 'with different pbsId'
        },
        {
            shortName: 'AR_1_th',
            pbsId: 42,
            tab: 'economy',
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
        const result = getHouseholdUrl('A B', 100, 'bookings')
        expect(result).toBe('/household/A%20B/bookings?pbs=100')
    })
})
