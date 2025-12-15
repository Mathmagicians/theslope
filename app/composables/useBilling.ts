import type {DateRange} from '~/types/dateTypes'
import {createDateRange, formatDateRange} from '~/utils/date'
import {useSeason} from '~/composables/useSeason'

/**
 * Billing business logic composable
 *
 * Pure functions for billing period calculations.
 * Uses cutoff day from app configuration via useSeason.
 */
export const useBilling = () => {
    const {getBillingCutoffDay} = useSeason()

    /**
     * Calculate billing period dates relative to a reference date.
     *
     * @param referenceDate - Date to calculate from
     * @param monthOffset - 0 for current period, -1 for previous (closed) period
     * @returns DateRange for the billing period
     */
    const calculateBillingPeriodRange = (referenceDate: Date, monthOffset: number): DateRange => {
        const cutoffDay = getBillingCutoffDay()
        const currentDay = referenceDate.getDate()
        const baseOffset = currentDay <= cutoffDay ? -1 : 0

        return createDateRange(
            new Date(referenceDate.getFullYear(), referenceDate.getMonth() + baseOffset + monthOffset, cutoffDay + 1),
            new Date(referenceDate.getFullYear(), referenceDate.getMonth() + baseOffset + monthOffset + 1, cutoffDay)
        )
    }

    /**
     * Calculate the CLOSED billing period (for monthly billing generation).
     * Returns the last completed billing period that should be billed.
     */
    const calculateClosedBillingPeriod = (referenceDate: Date = new Date()): {
        dateRange: DateRange
        paymentDate: Date
        billingPeriod: string
    } => {
        const cutoffDay = getBillingCutoffDay()
        const currentDay = referenceDate.getDate()
        const dateRange = calculateBillingPeriodRange(referenceDate, -1)

        const paymentDate = currentDay <= cutoffDay
            ? new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
            : new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1)

        return {
            dateRange,
            paymentDate,
            billingPeriod: formatDateRange(dateRange)
        }
    }

    /**
     * Calculate the CURRENT (open) billing period (for household view).
     * Returns the period currently accumulating transactions.
     */
    const calculateCurrentBillingPeriod = (referenceDate: Date = new Date()): DateRange =>
        calculateBillingPeriodRange(referenceDate, 0)

    return {
        calculateClosedBillingPeriod,
        calculateCurrentBillingPeriod
    }
}
