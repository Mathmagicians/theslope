import type {DateRange} from '~/types/dateTypes'
import {createDateRange, formatDateRange} from '~/utils/date'
import {useSeason} from '~/composables/useSeason'
import {useBookingValidation, type TicketType} from '~/composables/useBookingValidation'
import {chunkArray} from '~/utils/batchUtils'
import type {TransactionDisplay} from '~/composables/useBillingValidation'

const LINK_TRANSACTION_BATCH_SIZE = 90

/**
 * Grouped transactions by dinner event for display
 */
export interface DinnerTransactionGroup {
    dinnerEventId: number
    date: Date
    menuTitle: string
    transactions: TransactionDisplay[]
    totalAmount: number
    ticketCounts: string
}

/**
 * Billing business logic composable
 *
 * Pure functions for billing period calculations and transaction display.
 * Uses cutoff day from app configuration via useSeason.
 */
export const useBilling = () => {
    const {getBillingCutoffDay} = useSeason()
    const {TicketTypeSchema} = useBookingValidation()
    const TicketType = TicketTypeSchema.enum

    /**
     * Format ticket counts for display (e.g., "2V 1B")
     * Generic: accepts any array of objects with ticketType (TransactionDisplay, OrderDisplay, etc.)
     */
    const formatTicketCounts = <T extends { ticketType: TicketType | null }>(items: T[]): string => {
        const counts = {adult: 0, child: 0, baby: 0}
        for (const item of items) {
            if (item.ticketType === TicketType.ADULT) counts.adult++
            else if (item.ticketType === TicketType.CHILD) counts.child++
            else if (item.ticketType === TicketType.BABY) counts.baby++
        }
        const parts: string[] = []
        if (counts.adult > 0) parts.push(`${counts.adult}V`)
        if (counts.child > 0) parts.push(`${counts.child}B`)
        if (counts.baby > 0) parts.push(`${counts.baby}b`)
        return parts.join(' ') || '-'
    }

    /**
     * Group transactions by dinner event for display.
     * Returns groups sorted by date descending.
     */
    const groupTransactionsByDinner = (transactions: TransactionDisplay[]): DinnerTransactionGroup[] => {
        const grouped = new Map<number, DinnerTransactionGroup>()

        for (const tx of transactions) {
            const existing = grouped.get(tx.dinnerEvent.id)
            if (existing) {
                existing.transactions.push(tx)
                existing.totalAmount += tx.amount
            } else {
                grouped.set(tx.dinnerEvent.id, {
                    dinnerEventId: tx.dinnerEvent.id,
                    date: new Date(tx.dinnerEvent.date),
                    menuTitle: tx.dinnerEvent.menuTitle,
                    transactions: [tx],
                    totalAmount: tx.amount,
                    ticketCounts: ''
                })
            }
        }

        return Array.from(grouped.values())
            .map(g => ({...g, ticketCounts: formatTicketCounts(g.transactions)}))
            .sort((a, b) => b.date.getTime() - a.date.getTime())
    }

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

    /**
     * Get the billing period that a given dinner date belongs to.
     *
     * Billing periods run from cutoffDay+1 to cutoffDay of next month.
     * E.g., with cutoff day 17: Oct 18 - Nov 17, Nov 18 - Dec 17, etc.
     *
     * @param dinnerDate - The date of the dinner event
     * @returns The billing period containing this dinner date with payment date
     */
    const getBillingPeriodForDate = (dinnerDate: Date): {
        dateRange: DateRange
        billingPeriod: string
        paymentDate: Date
    } => {
        const cutoffDay = getBillingCutoffDay()
        const day = dinnerDate.getDate()

        let periodStart: Date
        let periodEnd: Date

        if (day <= cutoffDay) {
            // Dinner is in first half of month → period started previous month
            // E.g., Oct 10 with cutoff 17 → Sep 18 - Oct 17
            periodStart = new Date(dinnerDate.getFullYear(), dinnerDate.getMonth() - 1, cutoffDay + 1)
            periodEnd = new Date(dinnerDate.getFullYear(), dinnerDate.getMonth(), cutoffDay)
        } else {
            // Dinner is in second half of month → period started this month
            // E.g., Oct 25 with cutoff 17 → Oct 18 - Nov 17
            periodStart = new Date(dinnerDate.getFullYear(), dinnerDate.getMonth(), cutoffDay + 1)
            periodEnd = new Date(dinnerDate.getFullYear(), dinnerDate.getMonth() + 1, cutoffDay)
        }

        const dateRange = createDateRange(periodStart, periodEnd)
        // Payment date is 1st of month after period ends
        const paymentDate = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 1)

        return {
            dateRange,
            billingPeriod: formatDateRange(dateRange),
            paymentDate
        }
    }

    const chunkTransactionIds = chunkArray<number>(LINK_TRANSACTION_BATCH_SIZE)

    return {
        calculateClosedBillingPeriod,
        calculateCurrentBillingPeriod,
        getBillingPeriodForDate,
        groupTransactionsByDinner,
        formatTicketCounts,
        chunkTransactionIds
    }
}
