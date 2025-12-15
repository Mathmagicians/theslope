import {describe, it, expect} from 'vitest'
import {isSameDay} from 'date-fns'
import {useBilling} from '~/composables/useBilling'

describe('useBilling', () => {
    const {calculateClosedBillingPeriod, calculateCurrentBillingPeriod} = useBilling()

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
})
