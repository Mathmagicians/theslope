// @vitest-environment nuxt
/**
 * CostLine - one line of the economy views: a live order or a billed transaction.
 *
 * A billed line carries no order state: its badge reads the close, or Frigivet when its snapshot kept the eating mode
 * Ingen, and it shows no eating mode glyph. A live order shows its state and its mode.
 */
import {describe, it, expect, afterEach} from 'vitest'
import {enableAutoUnmount} from '@vue/test-utils'
import type {DefineComponent} from 'vue'
import {mountWithTooltipProvider, findByTestId} from '~~/tests/component/testHelpers'
import CostLineGeneric from '~/components/economy/CostLine.vue'
import {useBillingValidation} from '~/composables/useBillingValidation'
import {DinnerMode, OrderState} from '~/composables/useBookingValidation'
import {ORDER_STATE_LABELS} from '~/composables/useBookingUi'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'

// A generic component's type is a function; the mount helper keys on a constructor
const CostLine = CostLineGeneric as unknown as DefineComponent

enableAutoUnmount(afterEach)

const {deserializeTransaction} = useBillingValidation()
// A billed line whose order is gone: everything it shows comes from the snapshot
const billedLine = (dinnerMode?: DinnerMode) =>
    deserializeTransaction(BillingFactory.defaultPrismaTransaction('cost-line', 'noOrder', {snapshotDinnerMode: dinnerMode}))

describe('CostLine', () => {
    it.each([
        {desc: 'a billed released ticket', item: () => billedLine(DinnerMode.NONE), shown: ORDER_STATE_LABELS[OrderState.RELEASED], glyph: false},
        {desc: 'a billed ticket whose snapshot has no mode', item: () => billedLine(), shown: ORDER_STATE_LABELS[OrderState.CLOSED], glyph: false},
        {desc: 'a live order', item: () => OrderFactory.defaultOrderDetail(undefined, {state: OrderState.BOOKED, dinnerMode: DinnerMode.TAKEAWAY}), shown: ORDER_STATE_LABELS[OrderState.BOOKED], glyph: true}
    ])('GIVEN $desc THEN its badge reads its state and the eating mode glyph shows: $glyph', async ({item, shown, glyph}) => {
        const wrapper = await mountWithTooltipProvider(CostLine, {props: {item: item(), historyOrderId: null}})

        expect(wrapper.text()).toContain(shown.label)
        expect(findByTestId(wrapper, 'dinner-mode-selector').exists()).toBe(glyph)
    })
})
