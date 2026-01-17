import type {DateRange} from '~/types/dateTypes'
import {createDateRange, formatDateRange} from '~/utils/date'
import {useSeason} from '~/composables/useSeason'
import {useBookingValidation, type TicketType} from '~/composables/useBookingValidation'
import {chunkArray} from '~/utils/batchUtils'
import type {TransactionDisplay, CostEntry} from '~/composables/useBillingValidation'

const LINK_TRANSACTION_BATCH_SIZE = 90

/**
 * @deprecated Use CostEntry<TransactionDisplay> instead
 */
export type DinnerTransactionGroup = CostEntry<TransactionDisplay> & {
    /** @deprecated Use items instead */
    transactions: TransactionDisplay[]
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
     * Generic grouping by dinner event for economy display.
     * Works with any item type (Orders, Transactions) that has ticketType.
     *
     * @param items - Items to group
     * @param getDinner - Extract dinner info from item
     * @param getAmount - Extract amount from item (priceAtBooking for Orders, amount for Transactions)
     * @returns CostEntry groups sorted by date descending
     */
    const groupByCostEntry = <T extends { ticketType: TicketType | null }>(
        items: T[],
        getDinner: (item: T) => { id: number, date: Date, menuTitle: string },
        getAmount: (item: T) => number
    ): CostEntry<T>[] => {
        const grouped = new Map<number, CostEntry<T>>()

        for (const item of items) {
            const dinner = getDinner(item)
            const existing = grouped.get(dinner.id)
            if (existing) {
                existing.items.push(item)
                existing.totalAmount += getAmount(item)
            } else {
                grouped.set(dinner.id, {
                    dinnerEventId: dinner.id,
                    date: new Date(dinner.date),
                    menuTitle: dinner.menuTitle,
                    items: [item],
                    totalAmount: getAmount(item),
                    ticketCounts: ''
                })
            }
        }

        // Map preserves insertion order - caller provides pre-sorted items
        return Array.from(grouped.values())
            .map(g => ({...g, items: [...g.items], ticketCounts: formatTicketCounts(g.items)}))
    }

    /**
     * Group transactions by dinner event for display.
     * @deprecated Use groupByCostEntry with transaction accessors instead
     */
    const groupTransactionsByDinner = (transactions: TransactionDisplay[]): DinnerTransactionGroup[] =>
        groupByCostEntry(
            transactions,
            tx => tx.dinnerEvent,
            tx => tx.amount
        ).map(g => ({...g, transactions: g.items}))

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

    /**
     * Join orders with dinner events for economy display.
     * Pure function - testable without stores.
     *
     * @param orders - Orders to join (OrderDisplay)
     * @param dinnerEvents - Dinner events lookup
     * @param getInhabitantName - Function to resolve inhabitant name from ID
     * @returns Orders with dinner event and inhabitant info attached
     */
    const joinOrdersWithDinnerEvents = <T extends { dinnerEventId: number, inhabitantId: number, ticketType: TicketType | null }>(
        orders: T[],
        dinnerEvents: Map<number, { id: number, date: Date, menuTitle: string }>,
        getInhabitantName: (inhabitantId: number) => string
    ): (T & { dinnerEvent: { id: number, date: Date, menuTitle: string }, inhabitant: { id: number, name: string } })[] =>
        orders
            .filter(o => dinnerEvents.has(o.dinnerEventId))
            .map(o => ({
                ...o,
                dinnerEvent: dinnerEvents.get(o.dinnerEventId)!,
                inhabitant: { id: o.inhabitantId, name: getInhabitantName(o.inhabitantId) }
            }))

    return {
        calculateClosedBillingPeriod,
        calculateCurrentBillingPeriod,
        getBillingPeriodForDate,
        groupByCostEntry,
        joinOrdersWithDinnerEvents,
        groupTransactionsByDinner, // @deprecated - use groupByCostEntry
        formatTicketCounts,
        chunkTransactionIds
    }
}
