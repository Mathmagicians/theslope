import {describe, it, expect, beforeAll} from 'vitest'
import {isSameDay} from 'date-fns'
import {useBilling} from '~/composables/useBilling'
import type {InvoiceDisplay, TransactionDisplay} from '~/composables/useBillingValidation'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {itemAt} from '~~/tests/component/listHelpers'

describe('useBilling', () => {
    // @nuxt/test-utils 4 starts Nuxt in beforeAll: composables run there, not in the describe body
    type Billing = ReturnType<typeof useBilling>
    let calculateClosedBillingPeriod: Billing['calculateClosedBillingPeriod']
    let calculateCurrentBillingPeriod: Billing['calculateCurrentBillingPeriod']
    let getBillingPeriodForDate: Billing['getBillingPeriodForDate']
    let controlInvoices: Billing['controlInvoices']
    let controlTransactions: Billing['controlTransactions']
    let groupByCostEntry: Billing['groupByCostEntry']
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
            groupByCostEntry,
            groupByHouseholdEntry,
            decideBillingSideEffects
        } = useBilling())
    })
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
        const makeTx = (amount: number): TransactionDisplay => BillingFactory.defaultTransactionDisplay({amount})

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

    // ========== GROUPING TESTS ==========

    describe('groupByCostEntry', () => {
        const order = (id: number, dinnerEventId: number, priceAtBooking: number) => ({
            ...OrderFactory.defaultOrder('cost-entry', {id, dinnerEventId, priceAtBooking}),
            dinnerEvent: {...DinnerEventFactory.defaultDinnerEventDisplay('cost-entry'), id: dinnerEventId}
        })

        it('GIVEN three orders on two dinners WHEN grouping by dinner THEN one entry per dinner, in the orders\' order, with its orders and their summed amount', () => {
            const grouped = groupByCostEntry([order(1, 31, 4000), order(2, 32, 1700), order(3, 31, 4000)], o => o.priceAtBooking)

            expect(grouped.map(entry => ({dinner: entry.dinnerEvent.id, orders: entry.items.map(o => o.id), total: entry.totalAmount})))
                .toEqual([{dinner: 31, orders: [1, 3], total: 8000}, {dinner: 32, orders: [2], total: 1700}])
        })
    })

    describe('groupByHouseholdEntry', () => {
        const makeTx = (householdId: number, pbsId: number, address: string, amount: number): TransactionDisplay =>
            BillingFactory.defaultTransactionDisplay({
                id: householdId * 10, amount,
                inhabitant: {id: 1, name: 'Test', household: {id: householdId, pbsId, address}}
            })

        // Verifies grouped output is ordered by address, then pbsId as tiebreaker.
        it('GIVEN transactions pre-sorted by address then pbsId WHEN grouping THEN output is sorted by address then pbsId, one entry per household with summed totals', () => {
            const input = [
                makeTx(1, 3000, 'Abbey Road 1', 4000),        // address "A" + lower pbs
                makeTx(2, 7000, 'Abbey Road 1', 4000),        // same address, higher pbs → after 1
                makeTx(3, 1000, 'Penny Lane 4', 4000),        // different address
                makeTx(4, 5000, 'Skråningen 31', 4000),
                makeTx(1, 3000, 'Abbey Road 1', 1700)         // merged into first entry
            ]
            const grouped = groupByHouseholdEntry(input, tx => tx.amount, tx => tx.inhabitant.household)

            expect(grouped.map(g => g.address)).toEqual(['Abbey Road 1', 'Abbey Road 1', 'Penny Lane 4', 'Skråningen 31'])
            expect(grouped.map(g => g.pbsId)).toEqual([3000, 7000, 1000, 5000])
            expect(itemAt(grouped, 0).totalAmount).toBe(5700)  // 4000 + 1700 merged
            expect(itemAt(grouped, 0).computedTotal).toBe(5700)
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
        const dinner = {
            ...DinnerEventFactory.defaultDinnerEventDetail(),
            date: new Date(2026, 3, 14, 18),
            menuTitle: 'Risotto',
            cookingTeam: SeasonFactory.defaultCookingTeamDisplay({name: 'Madhold 2 - 08/25-06/26'})
        }
        const payer = {id: 1, email: 'anna@example.com', name: 'Anna H.'}

        it.each([
            {desc: 'a titled dinner with a team', dinner, payer, words: '"Risotto" 14/04/2026, Anna H. bestiller for Madhold 2'},
            {desc: 'a dinner without a team', dinner: {...dinner, cookingTeam: null}, payer, words: '"Risotto" 14/04/2026, Anna H. bestiller'},
            {desc: 'a dinner without a title', dinner: {...dinner, menuTitle: ''}, payer, words: '14/04/2026, Anna H. bestiller for Madhold 2'},
            {desc: 'a payer without a name', dinner, payer: {id: 1, email: 'anna@example.com'}, words: '"Risotto" 14/04/2026, anna@example.com bestiller for Madhold 2'}
        ])('GIVEN $desc WHEN building the words THEN they read as the ledger does', ({dinner: d, payer: p, words}) => {
            expect(expenseNoteWords(d, p)).toBe(words)
        })
    })
})
