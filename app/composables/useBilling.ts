import type {DateRange} from '~/types/dateTypes'
import {createDateRange, formatDateRange} from '~/utils/date'
import {useSeason} from '~/composables/useSeason'
import {useBookingValidation, type TicketType, type OrderDisplay} from '~/composables/useBookingValidation'
import {chunkArray} from '~/utils/batchUtils'
import type {CostEntry, HouseholdEntry, InvoiceDisplay, TransactionDisplay} from '~/composables/useBillingValidation'

const LINK_TRANSACTION_BATCH_SIZE = 90

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
     * Curried generic groupBy factory for economy views.
     * Creates specialized groupers for CostEntry (by dinner) and HouseholdEntry (by household).
     *
     * @param config.getKey - Extract grouping key from item
     * @param config.createBase - Create base entry fields from first item (without items/totalAmount/ticketCounts)
     * @param config.onAccumulate - Optional extra accumulation (e.g., computedTotal for HouseholdEntry)
     * @param config.sortBy - Optional custom sort (default: preserve insertion order)
     */
    const createGroupBy = <T extends { ticketType: TicketType | null }, C extends { items: T[], totalAmount: number, ticketCounts: string }>(
        config: {
            getKey: (item: T) => number
            createBase: (item: T) => Omit<C, 'items' | 'totalAmount' | 'ticketCounts'>
            onAccumulate?: (entry: C, amount: number) => void
            sortBy?: (a: C, b: C) => number
        }
    ) => (
        items: T[],
        getAmount: (item: T) => number
    ): C[] => {
        const grouped = new Map<number, C>()

        for (const item of items) {
            const key = config.getKey(item)
            const amount = getAmount(item)
            const existing = grouped.get(key)

            if (existing) {
                existing.items.push(item)
                existing.totalAmount += amount
                config.onAccumulate?.(existing, amount)
            } else {
                const entry = {
                    ...config.createBase(item),
                    items: [item],
                    totalAmount: amount,
                    ticketCounts: ''
                } as C
                config.onAccumulate?.(entry, amount)
                grouped.set(key, entry)
            }
        }

        const entries = Array.from(grouped.values())
            .map(g => ({...g, items: [...g.items], ticketCounts: formatTicketCounts(g.items)}))

        return config.sortBy ? entries.sort(config.sortBy) : entries
    }

    /**
     * Group items by dinner event for economy display.
     * Works with any item type (Orders, Transactions) that has ticketType.
     *
     * @param getDinner - Extract dinner info from item
     * @returns Curried function: (items, getAmount) => CostEntry[]
     */
    const groupByCostEntry = <T extends { ticketType: TicketType | null }>(
        getDinner: (item: T) => { id: number, date: Date, menuTitle: string }
    ) => createGroupBy<T, CostEntry<T>>({
        getKey: item => getDinner(item).id,
        createBase: item => {
            const dinner = getDinner(item)
            return {dinnerEventId: dinner.id, date: new Date(dinner.date), menuTitle: dinner.menuTitle}
        }
    })

    /**
     * Group items by household for PBS/revisor view.
     * Parallel to groupByCostEntry but groups by household instead of dinner.
     *
     * @param getHousehold - Extract household info from item
     * @returns Curried function: (items, getAmount) => HouseholdEntry[]
     */
    const groupByHouseholdEntry = <T extends { ticketType: TicketType | null }>(
        getHousehold: (item: T) => { id: number, pbsId: number, address: string }
    ) => createGroupBy<T, HouseholdEntry<T>>({
        getKey: item => getHousehold(item).id,
        createBase: item => {
            const household = getHousehold(item)
            return {householdId: household.id, pbsId: household.pbsId, address: household.address, computedTotal: 0}
        },
        onAccumulate: (entry, amount) => { entry.computedTotal += amount },
        sortBy: (a, b) => a.pbsId - b.pbsId
    })

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

    // ========== CONTROL SUM UTILITIES ==========

    /**
     * Generic control result - parametrized by value type
     * Used for audit/reconciliation: compare computed vs expected
     */
    interface ControlResult<T> {
        computed: T
        expected: T
        isValid: boolean
    }

    // Specific control types
    type ControlSumResult = ControlResult<number>
    type TicketCountsControl = ControlResult<string>

    /**
     * Create a curried control sum calculator.
     * Factory pattern: curry the amount extractor, then apply to items + expected.
     *
     * @param getAmount - Extract amount from each item
     * @returns Curried function: (items, expected) => ControlSumResult
     *
     * @example
     * // For invoices (at billing period level)
     * const controlInvoices = createControlSum<Invoice>(inv => inv.amount)
     * const result = controlInvoices(invoices, billingPeriod.totalAmount)
     *
     * // For transactions (at invoice level)
     * const controlTransactions = createControlSum<Transaction>(tx => tx.amount)
     * const result = controlTransactions(transactions, invoice.amount)
     */
    const createControlSum = <T>(getAmount: (item: T) => number) =>
        (items: T[], expected: number): ControlSumResult => {
            const computed = items.reduce((sum, item) => sum + getAmount(item), 0)
            return {computed, expected, isValid: computed === expected}
        }

    /**
     * Pre-curried control sum for invoices (billing period → invoices reconciliation)
     * Use: controlInvoices(invoices, billingPeriod.totalAmount)
     */
    const controlInvoices = createControlSum<InvoiceDisplay>(inv => inv.amount)

    /**
     * Pre-curried control sum for transactions (invoice → transactions reconciliation)
     * Use: controlTransactions(transactions, invoice.amount)
     */
    const controlTransactions = createControlSum<TransactionDisplay>(tx => tx.amount)

    /**
     * Order control result - verifies both ticket counts AND price sum
     */
    interface OrderControlResult extends ControlSumResult {
        ticketCounts: TicketCountsControl
    }

    /**
     * Control sum for orders (dinner → orders reconciliation)
     * Verifies BOTH ticket type counts ("2V 5B") AND price sum match
     *
     * @param orders - Orders to verify (OrderDisplay type)
     * @param expectedAmount - Expected total amount
     * @param expectedTicketCounts - Expected ticket counts string (e.g., "2V 5B")
     */
    const controlOrders = (
        orders: OrderDisplay[],
        expectedAmount: number,
        expectedTicketCounts: string
    ): OrderControlResult => {
        const computedAmount = orders.reduce((sum, o) => sum + o.priceAtBooking, 0)
        const computedTicketCounts = formatTicketCounts(orders)

        return {
            computed: computedAmount,
            expected: expectedAmount,
            isValid: computedAmount === expectedAmount && computedTicketCounts === expectedTicketCounts,
            ticketCounts: {
                computed: computedTicketCounts,
                expected: expectedTicketCounts,
                isValid: computedTicketCounts === expectedTicketCounts
            }
        }
    }

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
        groupByHouseholdEntry,
        joinOrdersWithDinnerEvents,
        formatTicketCounts,
        chunkTransactionIds,
        // Control sums
        createControlSum,
        controlInvoices,
        controlTransactions,
        controlOrders
    }
}

// Export control types
export type ControlResult<T> = {
    computed: T
    expected: T
    isValid: boolean
}

export type ControlSumResult = ControlResult<number>
export type TicketCountsControl = ControlResult<string>

export interface OrderControlResult extends ControlSumResult {
    ticketCounts: TicketCountsControl
}
