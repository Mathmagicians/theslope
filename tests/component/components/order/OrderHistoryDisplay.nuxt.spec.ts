// @vitest-environment nuxt
import {describe, it, expect, beforeEach, vi} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {flushPromises} from '@vue/test-utils'
import OrderHistoryDisplay from '~/components/order/OrderHistoryDisplay.vue'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {asyncDataStatus, mountWithTooltipProvider, resetStores} from '~~/tests/component/testHelpers'

const ORDER_ID = 77
const orderDetailEndpoint = vi.fn(() => ({
    ...OrderFactory.defaultOrderDetail('order-history', {id: ORDER_ID}),
    history: [OrderFactory.defaultOrderHistoryDisplay('order-history', {orderId: ORDER_ID})]
}))
registerEndpoint(`/api/order/${ORDER_ID}`, orderDetailEndpoint)

describe('OrderHistoryDisplay', () => {
    beforeEach(() => {
        resetStores()
        vi.clearAllMocks()
    })

    it('requests nothing for a deleted order and reads idle', async () => {
        const wrapper = await mountWithTooltipProvider(OrderHistoryDisplay, {props: {orderId: null}})
        await flushPromises()

        expect(orderDetailEndpoint).not.toHaveBeenCalled()
        expect(asyncDataStatus('order-history-null')).toBe('idle')
        expect(wrapper.text()).toContain('Ordre slettet')
    })

    it('fetches the order\'s history and renders its timeline', async () => {
        const wrapper = await mountWithTooltipProvider(OrderHistoryDisplay, {props: {orderId: ORDER_ID}})

        await vi.waitFor(() => expect(wrapper.text()).toContain('Bestilt'))
        expect(orderDetailEndpoint).toHaveBeenCalled()
        expect(asyncDataStatus(`order-history-${ORDER_ID}`)).toBe('success')
    })
})
