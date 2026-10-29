// @vitest-environment nuxt
/**
 * useScaffoldPreview: the server's dry run of a request, read component-local as the booking views read it. The
 * composable runs in a host component's setup (it mounts and keys its read per instance) and reads through the real
 * bookings store; only HTTP is faked (testing.md Rule 6).
 */
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount, flushPromises} from '@vue/test-utils'
import {defineComponent, h, shallowRef} from 'vue'
import {useScaffoldPreview, useExpectedBookings, expectedBookingKey} from '~/composables/useBookingUi'
import {useBookingValidation, type DinnerEventDisplay, type OrderDisplay, type ScaffoldOrdersRequest} from '~/composables/useBookingValidation'
import type {HouseholdDetail} from '~/composables/useCoreValidation'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {registerEmptyStoreEndpoints, registerScaffoldEndpoint, resetStores, untilTrue} from '~~/tests/component/testHelpers'

enableAutoUnmount(afterEach)

registerEmptyStoreEndpoints()
const scaffold = registerScaffoldEndpoint()

// A request names the dinners it asks about, and the run that answers it decides those dinners
const requestFor = (dinnerEventId: number): ScaffoldOrdersRequest => ({householdId: 1, dinnerEventIds: [dinnerEventId], orders: []})
const runFor = ({dinnerEventIds}: ScaffoldOrdersRequest) =>
    OrderFactory.defaultScaffoldOrdersResponse({dinners: dinnerEventIds.map(id => ({id, date: DinnerEventFactory.dinnerEventAt(id, 60).date}))})

beforeEach(() => {
    resetStores()
    scaffold.reset()
    scaffold.answers.expected = runFor
})

type Preview = ReturnType<typeof useScaffoldPreview<ScaffoldOrdersRequest>>

const mountPreview = async (request: () => ScaffoldOrdersRequest | null, options: Parameters<typeof useScaffoldPreview>[2] = {}): Promise<Preview> => {
    let preview: Preview | undefined
    await mountSuspended(defineComponent({
        setup() {
            const bookingsStore = useBookingsStore()
            preview = useScaffoldPreview(request, standing => bookingsStore.previewBookings(standing), options)
            return () => h('div')
        }
    }))
    return preview!
}

// The dinners the shown reply decided: which request it answers
const answeredDinners = (preview: Preview) => preview.result.value?.dinners.map(({id}) => id) ?? null
const sentRequests = () => scaffold.sent.map(({body}) => body)

describe('useScaffoldPreview', () => {
    it('GIVEN a debounced request WHEN it changes three times in a row THEN one read goes out, with the last request, and its reply shows', async () => {
        const request = shallowRef<ScaffoldOrdersRequest | null>(null)
        const preview = await mountPreview(() => request.value, {debounced: true})

        for (const dinnerEventId of [1, 2, 3]) {
            request.value = requestFor(dinnerEventId)
            await nextTick()
        }

        await untilTrue(() => preview.result.value !== null)
        expect(sentRequests()).toEqual([requestFor(3)])
        expect(answeredDinners(preview)).toEqual([3])
    })

    it('WHEN the request changes THEN pending holds from the change until the reply lands', async () => {
        const request = shallowRef<ScaffoldOrdersRequest | null>(null)
        const preview = await mountPreview(() => request.value, {debounced: true})
        expect(preview.pending.value).toBe(false)
        const release = scaffold.hold('expected')

        request.value = requestFor(1)
        expect(preview.pending.value).toBe(true)
        await untilTrue(() => scaffold.sent.length > 0)
        expect(preview.pending.value).toBe(true)
        release()

        await untilTrue(() => !preview.pending.value)
        expect(answeredDinners(preview)).toEqual([1])
    })

    it('GIVEN the reply of a request WHEN the request changes THEN that reply shows no more, and the new request\'s reply shows once it lands', async () => {
        const request = shallowRef<ScaffoldOrdersRequest | null>(requestFor(1))
        const preview = await mountPreview(() => request.value, {debounced: true})
        await untilTrue(() => preview.result.value !== null)
        const release = scaffold.hold('expected')

        request.value = requestFor(2)
        expect(preview.result.value).toBeNull()
        await untilTrue(() => scaffold.sent.length > 1)
        expect(preview.result.value).toBeNull()
        release()

        await untilTrue(() => preview.result.value !== null)
        expect(answeredDinners(preview)).toEqual([2])
    })

    it('GIVEN a null request THEN nothing is read, nothing shows and nothing is pending', async () => {
        const preview = await mountPreview(() => null)
        await flushPromises()

        expect(sentRequests()).toEqual([])
        expect({result: preview.result.value, pending: preview.pending.value}).toEqual({result: null, pending: false})
    })
})

// The planned bookings: the dry run with no orders on the household's dinners that have not started, read again once
// the orders change
describe('useExpectedBookings', () => {
    const {DINEIN} = useBookingValidation().DinnerModeSchema.enum
    const household = HouseholdFactory.defaultHouseholdDetail('expected')
    const started = DinnerEventFactory.dinnerEventAt(11, -1)
    const coming = DinnerEventFactory.dinnerEventAt(12, 3)
    const later = DinnerEventFactory.dinnerEventAt(13, 10)
    type Expected = ReturnType<typeof useExpectedBookings>

    const mountExpected = async (householdOf: () => HouseholdDetail | null, dinners: () => DinnerEventDisplay[], orders: () => OrderDisplay[] = () => []): Promise<Expected> => {
        let expected: Expected | undefined
        await mountSuspended(defineComponent({
            setup() {
                expected = useExpectedBookings(householdOf, dinners, orders)
                return () => h('div')
            }
        }))
        return expected!
    }

    it.each([
        {given: 'no household', householdOf: () => null, dinners: [coming], read: []},
        {given: 'only a dinner that has started', householdOf: () => household, dinners: [started], read: []},
        {given: 'a dinner that has started and two to come', householdOf: () => household, dinners: [started, coming, later], read: [{householdId: household.id, dinnerEventIds: [coming.id, later.id], orders: []}]}
    ])('GIVEN $given THEN the dry run asks about the dinners that have not started', async ({householdOf, dinners, read}) => {
        await mountExpected(householdOf, () => dinners)
        await flushPromises()

        expect(sentRequests()).toEqual(read)
    })

    it('GIVEN a reply THEN each person\'s planned mode is keyed by their own cell, and nothing is pending', async () => {
        scaffold.answers.expected = () => OrderFactory.defaultScaffoldOrdersResponse({results: [OrderFactory.defaultBookingResult({inhabitantId: 7, dinnerEventId: coming.id, dinnerMode: DINEIN})]})
        const expected = await mountExpected(() => household, () => [coming])

        await untilTrue(() => expected.expectedModes.value.size > 0)
        expect([...expected.expectedModes.value]).toEqual([[expectedBookingKey(7, coming.id), DINEIN]])
        expect(expected.isExpectedPending.value).toBe(false)
    })

    it('WHEN the orders change THEN the dry run is read again', async () => {
        const orders = shallowRef<OrderDisplay[]>([])
        await mountExpected(() => household, () => [coming], () => orders.value)
        await untilTrue(() => scaffold.sent.length === 1)

        orders.value = [OrderFactory.defaultOrder('expected', {dinnerEventId: coming.id})]

        await untilTrue(() => scaffold.sent.length === 2)
        expect(sentRequests()).toEqual([1, 2].map(() => ({householdId: household.id, dinnerEventIds: [coming.id], orders: []})))
    })
})
