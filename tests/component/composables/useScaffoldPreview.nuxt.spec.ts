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
import {useScaffoldPreview} from '~/composables/useBookingUi'
import type {ScaffoldOrdersRequest} from '~/composables/useBookingValidation'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
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
