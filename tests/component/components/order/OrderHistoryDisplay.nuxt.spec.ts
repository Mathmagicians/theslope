// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount, flushPromises} from '@vue/test-utils'
import OrderHistoryDisplay from '~/components/order/OrderHistoryDisplay.vue'
import type {OrderHistoryDisplay as OrderHistoryEntry} from '~/composables/useBookingValidation'
import {useHousehold} from '~/composables/useHousehold'
import {BOOKING_WORDS} from '~/config/bookingWords'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {asyncDataStatus, mountWithTooltipProvider, resetStores} from '~~/tests/component/testHelpers'

const ORDER_ID = 77
const MEMBER = {name: 'Anna', lastName: 'Bruun Hansen'}
const orderDetailOf = (performedByUser: OrderHistoryEntry['performedByUser']) => ({
    ...OrderFactory.defaultOrderDetail('order-history', {id: ORDER_ID}),
    history: [OrderFactory.defaultOrderHistoryDisplay('order-history', {orderId: ORDER_ID, performedByUserId: performedByUser?.id ?? null, performedByUser})]
})
const orderDetailEndpoint = vi.fn(() => orderDetailOf({id: 5, email: 'anna@example.com', Inhabitant: MEMBER}))
registerEndpoint(`/api/order/${ORDER_ID}`, orderDetailEndpoint)

enableAutoUnmount(afterEach)

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

    it.each([
        {writer: 'a member', performedByUser: {id: 5, email: 'anna@example.com', Inhabitant: MEMBER}, name: (): string => useHousehold().formatNameWithInitials(MEMBER)},
        {writer: 'the system account', performedByUser: {id: 99, email: 'system@example.com', Inhabitant: null}, name: (): string => BOOKING_WORDS.ticketChange.bySystem},
        {writer: 'a user since deleted', performedByUser: null, name: (): string => BOOKING_WORDS.ticketChange.bySystem}
    ])('GIVEN a history row written by $writer WHEN the timeline renders THEN it names the writer as the booking page names a person, never by e-mail', async ({performedByUser, name}) => {
        orderDetailEndpoint.mockImplementationOnce(() => orderDetailOf(performedByUser))
        const wrapper = await mountWithTooltipProvider(OrderHistoryDisplay, {props: {orderId: ORDER_ID}})

        await vi.waitFor(() => expect(wrapper.text()).toContain(name()))
        expect(wrapper.text()).not.toContain('@example.com')
    })
})
