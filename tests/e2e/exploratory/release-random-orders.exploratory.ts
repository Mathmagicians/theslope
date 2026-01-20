/**
 * EXPLORATORY TEST: Release orders by updating inhabitant preferences to NONE
 *
 * NOT part of default test suite - only runs when explicitly targeted.
 *
 * Usage:
 *   npm run test:exploratory
 *
 * Flow:
 * 1. Find inhabitants with BOOKED orders in next 10 days
 * 2. Update their preferences to NONE (all days)
 * 3. Scaffold triggers → orders get released
 */
import {test, expect} from '@playwright/test'
import testHelpers from '../testHelpers'
import {HouseholdFactory} from '../testDataFactories/householdFactory'
import type {OrderDisplay} from '~/composables/useBookingValidation'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'

const {validatedBrowserContext, headers} = testHelpers
const {DinnerModeSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum
const {createDefaultWeekdayMap} = useWeekDayMapValidation({valueSchema: DinnerModeSchema, defaultValue: DinnerMode.NONE})
const ORDER_ENDPOINT = '/api/order'

const INHABITANTS_TO_UPDATE = 20

test('Release orders by setting inhabitant preferences to NONE', async ({browser}) => {
    const context = await validatedBrowserContext(browser)

    // 1. Fetch BOOKED orders (next 10 days implied by active season window)
    console.log('📋 Fetching BOOKED orders...')
    const response = await context.request.get(
        `${ORDER_ENDPOINT}?allHouseholds=true&state=BOOKED`,
        {headers}
    )
    expect(response.status()).toBe(200)
    const allBooked: OrderDisplay[] = await response.json()
    console.log(`📊 Found ${allBooked.length} BOOKED orders`)

    if (allBooked.length === 0) {
        console.log('⚠️ No BOOKED orders - nothing to release')
        return
    }

    // 2. Get unique inhabitant IDs and shuffle
    const inhabitantIds = [...new Set(allBooked.map(o => o.inhabitantId))]
        .sort(() => Math.random() - 0.5)
        .slice(0, INHABITANTS_TO_UPDATE)
    console.log(`🎯 Selected ${inhabitantIds.length} inhabitants to update`)

    // 3. Update each inhabitant's preferences to NONE
    let totalReleased = 0
    for (const inhabitantId of inhabitantIds) {
        const res = await HouseholdFactory.updateInhabitant(context, inhabitantId, {
            dinnerPreferences: createDefaultWeekdayMap(DinnerMode.NONE)
        })

        if (res) {
            const released = res.scaffoldResult?.released ?? 0
            totalReleased += released
            console.log(`  ✅ Inhabitant ${inhabitantId}: released ${released}`)
        } else {
            console.log(`  ❌ Inhabitant ${inhabitantId}: update failed`)
        }
    }

    console.log(`\n═══════════════════════════════════════`)
    console.log(`📊 TOTAL RELEASED: ${totalReleased}`)
    console.log(`═══════════════════════════════════════`)
})
