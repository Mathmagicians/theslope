import {describe, it, expect} from 'vitest'
import {isSameDay} from 'date-fns'
import {useBilling} from '~/composables/useBilling'
import type {InvoiceDisplay, TransactionDisplay} from '~/composables/useBillingValidation'
import type {OrderDisplay} from '~/composables/useBookingValidation'

describe('useBilling', () => {
    const {
        calculateClosedBillingPeriod,
        calculateCurrentBillingPeriod,
        getBillingPeriodForDate,
        controlInvoices,
        controlTransactions,
        controlOrders
    } = useBilling()

    // Cutoff day is 17 (from app.config.ts)
    // Period: 18th of month N to 17th of month N+1

    describe('calculateCurrentBillingPeriod', () => {
        it.each([
            ['before cutoff', new Date(2025, 11, 10), new Date(2025, 10, 18), new Date(2025, 11, 17)],
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
            ['Oct 10 (before cutoff)', new Date(2025, 9, 10), new Date(2025, 8, 18), new Date(2025, 9, 17), new Date(2025, 10, 1)],
            ['Oct 17 (on cutoff)', new Date(2025, 9, 17), new Date(2025, 8, 18), new Date(2025, 9, 17), new Date(2025, 10, 1)],
            ['Oct 18 (after cutoff)', new Date(2025, 9, 18), new Date(2025, 9, 18), new Date(2025, 10, 17), new Date(2025, 11, 1)],
            ['Oct 25 (after cutoff)', new Date(2025, 9, 25), new Date(2025, 9, 18), new Date(2025, 10, 17), new Date(2025, 11, 1)],
            ['Nov 5 (before cutoff)', new Date(2025, 10, 5), new Date(2025, 9, 18), new Date(2025, 10, 17), new Date(2025, 11, 1)],
            ['Nov 17 (on cutoff)', new Date(2025, 10, 17), new Date(2025, 9, 18), new Date(2025, 10, 17), new Date(2025, 11, 1)],
            ['Nov 18 (after cutoff)', new Date(2025, 10, 18), new Date(2025, 10, 18), new Date(2025, 11, 17), new Date(2026, 0, 1)],
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
            id: 1, amount, cutoffDate: new Date(), paymentDate: new Date(),
            billingPeriod: '18/01-17/02', createdAt: new Date(),
            householdId: 1, billingPeriodSummaryId: 1, pbsId: 100, address: 'Test 1'
        })

        it.each([
            ['exact match', [10000, 20000, 30000], 60000, true],
            ['mismatch - too low', [10000, 20000], 60000, false],
            ['mismatch - too high', [10000, 20000, 30000, 5000], 60000, false],
            ['empty array', [], 0, true],
            ['single item', [50000], 50000, true],
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
            ticketType: 'ADULT'
        })

        it.each([
            ['exact match', [5000, 3000, 2000], 10000, true],
            ['mismatch', [5000, 3000], 10000, false],
            ['empty', [], 0, true],
        ])('%s', (_, amounts, expected, shouldBeValid) => {
            const transactions = amounts.map(makeTx)
            const result = controlTransactions(transactions, expected)

            expect(result.computed).toBe(amounts.reduce((a, b) => a + b, 0))
            expect(result.expected).toBe(expected)
            expect(result.isValid).toBe(shouldBeValid)
        })
    })

    describe('controlOrders', () => {
        const makeOrder = (priceAtBooking: number, ticketType: 'ADULT' | 'CHILD' | 'BABY'): OrderDisplay => ({
            id: 1, inhabitantId: 1, dinnerEventId: 1, ticketPriceId: 1,
            bookedByUserId: 1, householdId: 1, dinnerMode: 'DINEIN',
            state: 'BOOKED', priceAtBooking, isGuestTicket: false, ticketType,
            releasedAt: null, closedAt: null, createdAt: new Date(), updatedAt: new Date()
        })

        it.each([
            // [description, orders, expectedAmount, expectedCounts, shouldBeValid]
            ['amount + counts match', [[10000, 'ADULT'], [10000, 'ADULT'], [5000, 'CHILD']], 25000, '2V 1B', true],
            ['amount mismatch', [[10000, 'ADULT'], [10000, 'ADULT']], 25000, '2V', false],
            ['counts mismatch', [[10000, 'ADULT'], [10000, 'ADULT']], 20000, '3V', false],
            ['both mismatch', [[10000, 'ADULT']], 25000, '2V', false],
            ['empty', [], 0, '-', true],
            ['baby only (0 kr)', [[0, 'BABY']], 0, '1b', true],
            ['baby with adults', [[10000, 'ADULT'], [0, 'BABY']], 10000, '1V 1b', true],
        ] as const)('%s', (_, orderData, expectedAmount, expectedCounts, shouldBeValid) => {
            const orders = orderData.map(([price, type]) => makeOrder(price, type))
            const result = controlOrders(orders, expectedAmount, expectedCounts)

            expect(result.isValid).toBe(shouldBeValid)
            expect(result.expected).toBe(expectedAmount)
            expect(result.ticketCounts.expected).toBe(expectedCounts)
        })

        it('returns computed values correctly', () => {
            const orders = [
                makeOrder(10000, 'ADULT'),
                makeOrder(10000, 'ADULT'),
                makeOrder(5000, 'CHILD'),
                makeOrder(0, 'BABY')
            ]
            const result = controlOrders(orders, 25000, '2V 1B 1b')

            expect(result.computed).toBe(25000)
            expect(result.ticketCounts.computed).toBe('2V 1B 1b')
            expect(result.ticketCounts.isValid).toBe(true)
            expect(result.isValid).toBe(true)
        })
    })
})
