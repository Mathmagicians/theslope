// @vitest-environment nuxt
/**
 * CostLine - one line of the economy views: an order with its eater, or a billed transaction.
 *
 * A billed line carries no order state: its badge reads the close, or Frigivet when its snapshot kept the eating mode
 * Ingen, and it shows no eating mode glyph. A live order shows its state and its mode. Each line reads its eater's name
 * and its amount, and opens its order's history while the order lives.
 */
import {describe, it, expect, afterEach} from 'vitest'
import {enableAutoUnmount} from '@vue/test-utils'
import {mountWithTooltipProvider, findByTestId, itemAt} from '~~/tests/component/testHelpers'
import CostLine from '~/components/economy/CostLine.vue'
import {useBillingValidation, CostLineKind, type TransactionDisplay} from '~/composables/useBillingValidation'
import {DinnerMode, OrderState, type OrderDisplay} from '~/composables/useBookingValidation'
import {ORDER_STATE_LABELS} from '~/composables/useBookingUi'
import {useTicket} from '~/composables/useTicket'
import {BUTTON_WORDS} from '~/config/buttonWords'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'

enableAutoUnmount(afterEach)

const {deserializeTransaction} = useBillingValidation()
const {formatKroner} = useTicket()
const eater = itemAt(HouseholdFactory.defaultHouseholdDetail('cost-line').inhabitants, 0)

// A billed line whose order is gone: everything it shows comes from the snapshot
const billedLine = (dinnerMode?: DinnerMode) =>
    deserializeTransaction(BillingFactory.defaultPrismaTransaction('cost-line', 'noOrder', {snapshotDinnerMode: dinnerMode}))
const transactionLine = (transaction: TransactionDisplay) =>
    ({line: {kind: CostLineKind.TRANSACTION, transaction}, name: transaction.inhabitant.name, amount: transaction.amount})
const orderLine = (order: OrderDisplay) =>
    ({line: {kind: CostLineKind.ORDER, order, inhabitant: eater}, name: eater.name, amount: order.priceAtBooking})

describe('CostLine', () => {
    it.each([
        {desc: 'a billed released ticket', shown: () => transactionLine(billedLine(DinnerMode.NONE)), state: ORDER_STATE_LABELS[OrderState.RELEASED], glyph: false, history: false},
        {desc: 'a billed ticket whose snapshot has no mode', shown: () => transactionLine(billedLine()), state: ORDER_STATE_LABELS[OrderState.CLOSED], glyph: false, history: false},
        {desc: 'a billed ticket whose order lives', shown: () => transactionLine(BillingFactory.defaultTransactionDisplay({orderId: 7, amount: 1700})), state: ORDER_STATE_LABELS[OrderState.CLOSED], glyph: false, history: true},
        {desc: 'a live order', shown: () => orderLine(OrderFactory.defaultOrder('cost-line', {state: OrderState.BOOKED, dinnerMode: DinnerMode.TAKEAWAY})), state: ORDER_STATE_LABELS[OrderState.BOOKED], glyph: true, history: true}
    ])('GIVEN $desc THEN it reads its eater, its amount and its state, the eating mode glyph shows: $glyph, the history opens: $history', async ({shown, state, glyph, history}) => {
        const {line, name, amount} = shown()

        const wrapper = await mountWithTooltipProvider(CostLine, {props: {line, historyOrderId: null}})

        expect([name, formatKroner(amount), state.label].filter(text => !wrapper.text().includes(text))).toEqual([])
        expect(findByTestId(wrapper, 'dinner-mode-selector').exists()).toBe(glyph)
        expect(wrapper.find(`button[aria-label="${BUTTON_WORDS.history}"]`).exists()).toBe(history)
    })
})
