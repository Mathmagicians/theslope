import {describe, it, expect, beforeAll} from 'vitest'
import {isSameDay} from 'date-fns'
import {useBilling, TICKET_COUNTS} from '~/composables/useBilling'
import {useBookingValidation} from '~/composables/useBookingValidation'
import type {InvoiceDisplay, TransactionDisplay} from '~/composables/useBillingValidation'
import type {OrderDisplay} from '~/composables/useBookingValidation'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'

describe('useBilling', () => {
    // @nuxt/test-utils 4 starts Nuxt in beforeAll: composables run there, not in the describe body
    type Billing = ReturnType<typeof useBilling>
    let calculateClosedBillingPeriod: Billing['calculateClosedBillingPeriod']
    let calculateCurrentBillingPeriod: Billing['calculateCurrentBillingPeriod']
    let getBillingPeriodForDate: Billing['getBillingPeriodForDate']
    let controlInvoices: Billing['controlInvoices']
    let controlTransactions: Billing['controlTransactions']
    let controlOrders: Billing['controlOrders']
    let formatTicketCounts: Billing['formatTicketCounts']
    let groupByHouseholdEntry: Billing['groupByHouseholdEntry']
    let decideBillingSideEffects: Billing['decideBillingSideEffects']
    let expenseNoteWords: Billing['expenseNoteWords']
    beforeAll(() => {
        ({
            expenseNoteWords,
            calculateClosedBillingPeriod,
            calculateCurrentBillingPeriod,
            getBillingPeriodForDate,
            controlInvoices,
            controlTransactions,
            controlOrders,
            formatTicketCounts,
            groupByHouseholdEntry,
            decideBillingSideEffects
        } = useBilling())
    })
    const {TicketTypeSchema, DinnerModeSchema, OrderStateSchema} = useBookingValidation()
    const TicketType = TicketTypeSchema.enum
    type TicketTypeValue = typeof TicketType[keyof typeof TicketType]

    // Cutoff day is 17 (from app.config.ts)
    // Period: 18th of month N to 17th of month N+1

    describe('calculateCurrentBillingPeriod', () => {
        it.each([
            ['on cutoff', new Date(2025, 11, 17), new Date(2025, 10, 18), new Date(2025, 11, 17)],
            ['after cutoff', new Date(2025, 11, 18), new Date(2025, 11, 18), new Date(2026, 0, 17)],
        ])('%s', (_, ref, expectedStart, expectedEnd) => {
            const result = calculateCurrentBillingPeriod(ref)
            expect(isSameDay(result.start, expectedStart)).toBe(true)
            expect(isSameDay(result.end, expectedEnd)).toBe(true)
        })
    })

    describe('calculateClosedBillingPeriod', () => {
        it.each([
            ['before cutoff', new Date(2025, 11, 10), new Date(2025, 9, 18), new Date(2025, 10, 17), new Date(2025, 11, 1)],
            ['after cutoff', new Date(2025, 11, 20), new Date(2025, 10, 18), new Date(2025, 11, 17), new Date(2026, 0, 1)],
        ])('%s', (_, ref, expectedStart, expectedEnd, expectedPayment) => {
            const result = calculateClosedBillingPeriod(ref)
            expect(isSameDay(result.dateRange.start, expectedStart)).toBe(true)
            expect(isSameDay(result.dateRange.end, expectedEnd)).toBe(true)
            expect(isSameDay(result.paymentDate, expectedPayment)).toBe(true)
        })

        it('returns formatted billingPeriod string', () => {
            const result = calculateClosedBillingPeriod(new Date(2025, 11, 20))
            expect(result.billingPeriod).toBe('18/11/2025-17/12/2025')
        })
    })

    describe('getBillingPeriodForDate', () => {
        // Cutoff day 17: periods run from 18th to 17th
        // Dinners on/before 17th belong to period ending that month
        // Dinners after 17th belong to period ending next month

        it.each([
            // [description, dinnerDate, expectedStart, expectedEnd, expectedPayment]
            ['Oct 17 (on cutoff)', new Date(2025, 9, 17), new Date(2025, 8, 18), new Date(2025, 9, 17), new Date(2025, 10, 1)],
            ['Oct 18 (after cutoff)', new Date(2025, 9, 18), new Date(2025, 9, 18), new Date(2025, 10, 17), new Date(2025, 11, 1)],
            ['Dec 20 (year boundary)', new Date(2025, 11, 20), new Date(2025, 11, 18), new Date(2026, 0, 17), new Date(2026, 1, 1)],
        ])('%s → correct period', (_, dinnerDate, expectedStart, expectedEnd, expectedPayment) => {
            const result = getBillingPeriodForDate(dinnerDate)
            expect(isSameDay(result.dateRange.start, expectedStart)).toBe(true)
            expect(isSameDay(result.dateRange.end, expectedEnd)).toBe(true)
            expect(isSameDay(result.paymentDate, expectedPayment)).toBe(true)
        })

        it('returns formatted billingPeriod string', () => {
            const result = getBillingPeriodForDate(new Date(2025, 9, 25))
            expect(result.billingPeriod).toBe('18/10/2025-17/11/2025')
        })
    })

    // ========== CONTROL SUM TESTS ==========

    describe('controlInvoices', () => {
        const makeInvoice = (amount: number): InvoiceDisplay => ({
            ...BillingFactory.defaultInvoiceData('control-test'),
            amount
        })

        it.each([
            ['exact match', [10000, 20000, 30000], 60000, true],
            ['mismatch', [10000, 20000], 60000, false]
        ])('%s', (_, amounts, expected, shouldBeValid) => {
            const invoices = amounts.map(makeInvoice)
            const result = controlInvoices(invoices, expected)

            expect(result.computed).toBe(amounts.reduce((a, b) => a + b, 0))
            expect(result.expected).toBe(expected)
            expect(result.isValid).toBe(shouldBeValid)
        })
    })

    describe('controlTransactions', () => {
        const makeTx = (amount: number): TransactionDisplay => ({
            id: 1, orderId: 1, amount, createdAt: new Date(), orderSnapshot: '{}',
            dinnerEvent: {id: 1, date: new Date(), menuTitle: 'Test'},
            inhabitant: {id: 1, name: 'Test', household: {id: 1, pbsId: 100, address: 'Test'}},
            ticketType: TicketType.ADULT
        })

        it.each([
            ['exact match', [5000, 3000, 2000], 10000, true],
            ['mismatch', [5000, 3000], 10000, false]
        ])('%s', (_, amounts, expected, shouldBeValid) => {
            const transactions = amounts.map(makeTx)
            const result = controlTransactions(transactions, expected)

            expect(result.computed).toBe(amounts.reduce((a, b) => a + b, 0))
            expect(result.expected).toBe(expected)
            expect(result.isValid).toBe(shouldBeValid)
        })
    })

    describe('controlOrders', () => {
        const {ADULT, CHILD, BABY} = TicketType
        const makeOrder = (priceAtBooking: number, ticketType: TicketTypeValue): OrderDisplay => ({
            id: 1, inhabitantId: 1, dinnerEventId: 1, ticketPriceId: 1,
            bookedByUserId: 1, dinnerMode: DinnerModeSchema.enum.DINEIN,
            state: OrderStateSchema.enum.BOOKED, priceAtBooking, isGuestTicket: false, ticketType,
            releasedAt: null, closedAt: null, createdAt: new Date(), updatedAt: new Date()
        })

        // The ticket counts' wording is formatTicketCounts', below
        it.each([
            // [description, orders, expectedAmount, expectedCounts, shouldBeValid]
            ['amount + counts match', [[10000, ADULT], [10000, ADULT], [5000, CHILD]], 25000, '2V 1B', true],
            ['amount mismatch', [[10000, ADULT], [10000, ADULT]], 25000, '2V', false],
            ['counts mismatch', [[10000, ADULT], [10000, ADULT]], 20000, '3V', false]
        ] as const)('%s', (_, orderData, expectedAmount, expectedCounts, shouldBeValid) => {
            const orders = orderData.map(([price, type]) => makeOrder(price, type))
            const result = controlOrders(orders, expectedAmount, expectedCounts)

            expect(result.isValid).toBe(shouldBeValid)
            expect(result.expected).toBe(expectedAmount)
            expect(result.ticketCounts.expected).toBe(expectedCounts)
        })

        it('returns computed values correctly', () => {
            const orders = [
                makeOrder(10000, ADULT),
                makeOrder(10000, ADULT),
                makeOrder(5000, CHILD),
                makeOrder(0, BABY)
            ]
            const result = controlOrders(orders, 25000, '2V 1B 1b')

            expect(result.computed).toBe(25000)
            expect(result.ticketCounts.computed).toBe('2V 1B 1b')
            expect(result.ticketCounts.isValid).toBe(true)
            expect(result.isValid).toBe(true)
        })
    })

    // ========== GROUPING TESTS ==========

    describe('groupByHouseholdEntry', () => {
        const makeTx = (householdId: number, pbsId: number, address: string, amount: number): TransactionDisplay => ({
            id: householdId * 10, orderId: 1, amount, createdAt: new Date(), orderSnapshot: '{}',
            dinnerEvent: {id: 1, date: new Date(), menuTitle: 'Test'},
            inhabitant: {id: 1, name: 'Test', household: {id: householdId, pbsId, address}},
            ticketType: TicketType.ADULT
        })

        // Verifies grouped output is ordered by address, then pbsId as tiebreaker.
        it('GIVEN transactions pre-sorted by address then pbsId WHEN grouping THEN output is sorted by address then pbsId, one entry per household with summed totals', () => {
            const grouper = groupByHouseholdEntry<TransactionDisplay>(tx => tx.inhabitant.household)
            const input = [
                makeTx(1, 3000, 'Abbey Road 1', 4000),        // address "A" + lower pbs
                makeTx(2, 7000, 'Abbey Road 1', 4000),        // same address, higher pbs → after 1
                makeTx(3, 1000, 'Penny Lane 4', 4000),        // different address
                makeTx(4, 5000, 'Skråningen 31', 4000),
                makeTx(1, 3000, 'Abbey Road 1', 1700)         // merged into first entry
            ]
            const grouped = grouper(input, tx => tx.amount)

            expect(grouped.map(g => g.address)).toEqual(['Abbey Road 1', 'Abbey Road 1', 'Penny Lane 4', 'Skråningen 31'])
            expect(grouped.map(g => g.pbsId)).toEqual([3000, 7000, 1000, 5000])
            expect(grouped[0]!.totalAmount).toBe(5700)  // 4000 + 1700 merged
            expect(grouped[0]!.computedTotal).toBe(5700)
        })
    })

    // ========== FORMAT TICKET COUNTS TESTS ==========

    describe('formatTicketCounts', () => {
        const {ADULT, CHILD, BABY} = TicketType
        const makeItem = (t: TicketTypeValue | null) => ({ticketType: t})

        describe('with array input', () => {
            it.each([
                ['mixed types', [ADULT, ADULT, CHILD, BABY, BABY], '2V 1B 2b'],
                ['empty array', [], '-'],
                ['null ticketTypes ignored', [null, ADULT, null], '1V'],
            ] as const)('%s → %s', (_, types, expected) => {
                expect(formatTicketCounts(types.map(makeItem))).toBe(expected)
            })
        })

        describe('with map input', () => {
            it.each([
                ['mixed types', {[ADULT]: 200, [CHILD]: 50, [BABY]: 1}, '200V 50B 1b'],
                ['empty map', {}, '-'],
                ['partial map', {[ADULT]: 100, [BABY]: 2}, '100V 2b'],
            ] as const)('%s → %s', (_, counts, expected) => {
                expect(formatTicketCounts(counts)).toBe(expected)
            })
        })
    })

    // One builder, three wordings of the same counts
    describe('TICKET_COUNTS', () => {
        const {ADULT, CHILD, BABY} = TicketType
        const FULL = {[ADULT]: 8, [CHILD]: 1, [BABY]: 2}
        const ZERO_TYPE = {[ADULT]: 2, [CHILD]: 0, [BABY]: 1}
        const EMPTY = {}

        it.each([
            {variant: 'compact', desc: 'full counts', counts: FULL, text: '8V 1B 2b'},
            {variant: 'compact', desc: 'a zero type', counts: ZERO_TYPE, text: '2V 1b'},
            {variant: 'compact', desc: 'no counts', counts: EMPTY, text: '-'},
            {variant: 'sentence', desc: 'full counts', counts: FULL, text: '8 voksne, 1 barn, 2 babyer'},
            {variant: 'sentence', desc: 'a zero type', counts: ZERO_TYPE, text: '2 voksne, 1 baby'},
            {variant: 'sentence', desc: 'no counts', counts: EMPTY, text: ''},
            {variant: 'labelled', desc: 'full counts', counts: FULL, text: 'Voksen: 8| Barn: 1| Baby: 2'},
            {variant: 'labelled', desc: 'a zero type', counts: ZERO_TYPE, text: 'Voksen: 2| Barn: 0| Baby: 1'},
            {variant: 'labelled', desc: 'no counts', counts: EMPTY, text: 'Voksen: 0| Barn: 0| Baby: 0'}
        ] as const)('$variant over $desc reads "$text"', ({variant, counts, text}) => {
            expect(TICKET_COUNTS[variant].text(counts)).toBe(text)
        })

        it('names the ticket type of each part, so a list renders one part per type', () => {
            expect(TICKET_COUNTS.labelled.parts(ZERO_TYPE)).toEqual([
                {ticketType: ADULT, text: 'Voksen: 2'},
                {ticketType: CHILD, text: '| Barn: 0'},
                {ticketType: BABY, text: '| Baby: 1'}
            ])
            expect(TICKET_COUNTS.compact.parts(ZERO_TYPE).map(part => part.ticketType)).toEqual([ADULT, BABY])
        })
    })

    describe('decideBillingSideEffects', () => {
        it.each([
            ['a period fully done at its version', {version: 1, archivedVersion: 1, notifiedVersion: 1}, {archive: false, notify: false}],
            ['a period whose content changed since (catch-up)', {version: 2, archivedVersion: 1, notifiedVersion: 1}, {archive: true, notify: true}],
            ['a period with its archive done and its mail pending (queue was down)', {version: 1, archivedVersion: 1, notifiedVersion: 0}, {archive: false, notify: true}],
            ['a period with its mail done and its archive pending (R2 put failed, or a migrated period: mailed at v1 by definition)', {version: 1, archivedVersion: 0, notifiedVersion: 1}, {archive: true, notify: false}]
        ])('redoes only what is missing or stale for %s', (_name, stamps, plan) => {
            expect(decideBillingSideEffects(stamps)).toEqual(plan)
        })
    })

    describe('expenseNoteWords', () => {
        const dinner = {date: new Date(2026, 3, 14, 18), menuTitle: 'Risotto', cookingTeam: {name: 'Madhold 2 - 08/25-06/26'}}
        const payer = {email: 'anna@example.com', name: 'Anna H.'}

        it.each([
            {desc: 'a titled dinner with a team', dinner, payer, words: '"Risotto" 14/04/2026, Anna H. bestiller for Madhold 2'},
            {desc: 'a dinner without a team', dinner: {...dinner, cookingTeam: null}, payer, words: '"Risotto" 14/04/2026, Anna H. bestiller'},
            {desc: 'a dinner without a title', dinner: {...dinner, menuTitle: ''}, payer, words: '14/04/2026, Anna H. bestiller for Madhold 2'},
            {desc: 'a payer without a name', dinner, payer: {email: 'anna@example.com'}, words: '"Risotto" 14/04/2026, anna@example.com bestiller for Madhold 2'}
        ])('GIVEN $desc WHEN building the words THEN they read as the ledger does', ({dinner: d, payer: p, words}) => {
            expect(expenseNoteWords(d, p)).toBe(words)
        })
    })
})
