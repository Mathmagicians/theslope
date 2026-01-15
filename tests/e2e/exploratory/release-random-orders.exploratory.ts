/**
 * EXPLORATORY TEST: Release 100 random BOOKED orders via scaffold endpoint
 *
 * NOT part of default test suite - only runs when explicitly targeted.
 *
 * Usage:
 *   npx playwright test tests/e2e/exploratory/release-random-orders.exploratory.ts --project=chromium-api
 */
import {test, expect} from '@playwright/test'
import testHelpers from '../testHelpers'
import {OrderFactory} from '../testDataFactories/orderFactory'
import type {DesiredOrder, OrderDisplay} from '~/composables/useBookingValidation'
import {useBookingValidation} from '~/composables/useBookingValidation'

const {validatedBrowserContext, headers} = testHelpers
const ORDER_ENDPOINT = '/api/order'
const SCAFFOLD_ENDPOINT = '/api/household/order/scaffold'

const ORDERS_TO_RELEASE = 100

test('Release 100 random BOOKED orders via scaffold', async ({browser}) => {
    const context = await validatedBrowserContext(browser)
    const {OrderStateSchema, DinnerModeSchema} = useBookingValidation()

    // 1. Fetch all BOOKED orders
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

    // 2. Shuffle and pick up to 100
    const selected = [...allBooked]
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(ORDERS_TO_RELEASE, allBooked.length))
    console.log(`🎯 Selected ${selected.length} orders to release`)

    // 3. Group by household (scaffold works per-household)
    const byHousehold = new Map<number, OrderDisplay[]>()
    for (const order of selected) {
        // Need to fetch order detail to get householdId
        const detail = await OrderFactory.getOrder(context, order.id)
        if (!detail) continue
        const hid = detail.inhabitant.householdId
        if (!byHousehold.has(hid)) byHousehold.set(hid, [])
        byHousehold.get(hid)!.push(order)
    }

    // 4. Call scaffold per household with release orders
    let totalReleased = 0
    for (const [householdId, orders] of byHousehold) {
        const dinnerEventIds = [...new Set(orders.map(o => o.dinnerEventId))]
        const desiredOrders: DesiredOrder[] = orders.map(o => ({
            inhabitantId: o.inhabitantId,
            dinnerEventId: o.dinnerEventId,
            dinnerMode: DinnerModeSchema.enum.NONE,
            ticketPriceId: o.ticketPriceId,
            isGuestTicket: o.isGuestTicket,
            state: OrderStateSchema.enum.RELEASED,
            orderId: o.id
        }))

        const res = await context.request.post(SCAFFOLD_ENDPOINT, {
            headers,
            data: {householdId, dinnerEventIds, orders: desiredOrders}
        })

        if (res.status() === 200) {
            const result = await res.json()
            totalReleased += result.scaffoldResult.released
            console.log(`  ✅ Household ${householdId}: released ${result.scaffoldResult.released}`)
        } else {
            console.log(`  ❌ Household ${householdId}: ${res.status()} - ${await res.text()}`)
        }
    }

    console.log(`\n═══════════════════════════════════════`)
    console.log(`📊 TOTAL RELEASED: ${totalReleased}`)
    console.log(`═══════════════════════════════════════`)
})
