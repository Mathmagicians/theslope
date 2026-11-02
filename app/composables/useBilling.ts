import type {DateRange} from '~/types/dateTypes'
import {addMonths, setDate, startOfDay, startOfMonth} from 'date-fns'
import {createDateRange, formatDate, formatDateRange} from '~/utils/date'
import {useSeason} from '~/composables/useSeason'
import {useTicket} from '~/composables/useTicket'
import {useCookingTeam} from '~/composables/useCookingTeam'
import type {TicketType, DinnerEventDetail} from '~/composables/useBookingValidation'
import {chunkArray} from '~/utils/batchUtils'
import type {BillingSideEffectStamps, InvoiceDisplay, PayerSnapshot, TransactionDisplay, OrderSnapshot} from '~/composables/useBillingValidation'

const LINK_TRANSACTION_BATCH_SIZE = 90

// An economy group (CostEntry, HouseholdEntry): the base its first item opens it with, its items, their total amount and
// their ticket counts
type GroupEntry<T, Base> = Base & {items: T[], totalAmount: number, ticketCounts: string}
// A dinner's group; a household's group with its control sum, the total its items add up to
export type CostEntry<T> = GroupEntry<T, {dinnerEvent: OrderSnapshot['dinnerEvent']}>
export type HouseholdEntry<T> = GroupEntry<T, OrderSnapshot['inhabitant']['household'] & {computedTotal: number}>

/**
 * Billing business logic composable
 *
 * Pure functions for billing period calculations and transaction display.
 * Uses cutoff day from app configuration via useSeason.
 */
export const useBilling = () => {
    const {getBillingCutoffDay} = useSeason()
    const {formatTicketCounts} = useTicket()

    /**
     * Curried generic groupBy factory for economy views.
     * Creates specialized groupers for CostEntry (by dinner) and HouseholdEntry (by household).
     *
     * Type params:
     * - T: Item type (must have ticketType for formatting)
     * - Base: The context/base fields returned by createBase ({dinnerEvent}, or the household with its control sum); an
     *   entry is the base with its items, their total amount and their ticket counts
     *
     * @param config.getKey - Extract grouping key from item
     * @param config.createBase - Create base entry fields from first item
     * @param config.onAccumulate - Optional extra accumulation (e.g., computedTotal for HouseholdEntry)
     * @param config.sortBy - Optional custom sort (default: preserve insertion order)
     */
    const createGroupBy = <
        T extends { ticketType: TicketType | null },
        Base
    >(
        config: {
            getKey: (item: T) => number
            createBase: (item: T) => Base
            onAccumulate?: (entry: GroupEntry<T, Base>, amount: number) => void
            sortBy?: (a: GroupEntry<T, Base>, b: GroupEntry<T, Base>) => number
        }
    ) => (
        items: T[],
        getAmount: (item: T) => number
    ): GroupEntry<T, Base>[] => {
        const grouped = new Map<number, GroupEntry<T, Base>>()

        for (const item of items) {
            const key = config.getKey(item)
            const amount = getAmount(item)
            const existing = grouped.get(key)

            if (existing) {
                existing.items.push(item)
                existing.totalAmount += amount
                config.onAccumulate?.(existing, amount)
            } else {
                const entry: GroupEntry<T, Base> = {
                    ...config.createBase(item),
                    items: [item],
                    totalAmount: amount,
                    ticketCounts: ''
                }
                config.onAccumulate?.(entry, amount)
                grouped.set(key, entry)
            }
        }

        const entries = Array.from(grouped.values())
            .map(g => ({...g, items: [...g.items], ticketCounts: formatTicketCounts(g.items)}))

        return config.sortBy ? entries.sort(config.sortBy) : entries
    }

    /**
     * Group items by dinner event for economy display, one entry per dinnerEvent.id in the items' order.
     *
     * @example
     * const grouped = groupByCostEntry(orders, o => o.priceAtBooking)
     */
    const groupByCostEntry = <T extends { ticketType: TicketType | null, dinnerEvent: OrderSnapshot['dinnerEvent'] }>(
        items: T[],
        getAmount: (item: T) => number
    ): CostEntry<T>[] => createGroupBy({
        getKey: (item: T) => item.dinnerEvent.id,
        createBase: (item: T) => ({ dinnerEvent: item.dinnerEvent })
    })(items, getAmount)

    /**
     * Group items by household for PBS/revisor view.
     * Parallel to groupByCostEntry but groups by household instead of dinner.
     *
     * @param getHousehold - Extract household info from item
     */
    const groupByHouseholdEntry = <T extends { ticketType: TicketType | null }>(
        items: T[],
        getAmount: (item: T) => number,
        getHousehold: (item: T) => OrderSnapshot['inhabitant']['household']
    ): HouseholdEntry<T>[] => createGroupBy({
        getKey: (item: T) => getHousehold(item).id,
        createBase: (item: T) => {
            const household = getHousehold(item)
            return {id: household.id, pbsId: household.pbsId, address: household.address, computedTotal: 0}
        },
        onAccumulate: (entry, amount) => { entry.computedTotal += amount }
        // No sortBy: input transactions are pre-sorted by household address at the DB layer
        // (fetchUnbilledTransactions orderBy). Map grouping preserves insertion order.
    })(items, getAmount)

    /**
     * Calculate billing period dates relative to a reference date.
     *
     * @param referenceDate - Date to calculate from
     * @param monthOffset - 0 for current period, -1 for previous (closed) period
     * @returns DateRange for the billing period, from midnight of the day after the cutoff to midnight of the next cutoff
     */
    const calculateBillingPeriodRange = (referenceDate: Date, monthOffset: number): DateRange => {
        const cutoffDay = getBillingCutoffDay()
        const baseOffset = referenceDate.getDate() <= cutoffDay ? -1 : 0
        const startMonth = addMonths(startOfDay(referenceDate), baseOffset + monthOffset)

        return createDateRange(setDate(startMonth, cutoffDay + 1), setDate(addMonths(startMonth, 1), cutoffDay))
    }

    /** Payment date is the 1st of the month after the period ends */
    const paymentDateOf = (dateRange: DateRange): Date => startOfMonth(addMonths(dateRange.end, 1))

    /**
     * Calculate the CLOSED billing period (for monthly billing generation).
     * Returns the last completed billing period that should be billed.
     */
    const calculateClosedBillingPeriod = (now: Date): {
        dateRange: DateRange
        paymentDate: Date
        billingPeriod: string
    } => {
        const dateRange = calculateBillingPeriodRange(now, -1)

        return {
            dateRange,
            paymentDate: paymentDateOf(dateRange),
            billingPeriod: formatDateRange(dateRange)
        }
    }

    /**
     * Calculate the CURRENT (open) billing period (for household view).
     * Returns the period currently accumulating transactions.
     */
    const calculateCurrentBillingPeriod = (now: Date): DateRange =>
        calculateBillingPeriodRange(now, 0)

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
        const dateRange = calculateBillingPeriodRange(dinnerDate, 0)

        return {
            dateRange,
            billingPeriod: formatDateRange(dateRange),
            paymentDate: paymentDateOf(dateRange)
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
     * What a closed billing period still needs (the monthly run converges every period). A side effect is
     * current when its delivered version equals the period's content version; catch-up billing bumps the version,
     * so the period gets a fresh archive and a fresh mail.
     */
    const decideBillingSideEffects = ({version, archivedVersion, notifiedVersion}: BillingSideEffectStamps): {archive: boolean, notify: boolean} => ({
        archive: archivedVersion < version,
        notify: notifiedVersion < version
    })

    /**
     * The note a grocery line starts with, as the ledgers read it where lines of many dinners meet: the menu in quotes with
     * the dinner's date, then who bought for which team. The words end at bestiller for a dinner without a team and start
     * at the date for one without a title. The entry form prefills them; the route writes them for a body without a note
     */
    const {getTeamShortName} = useCookingTeam()
    const expenseNoteWords = (dinner: DinnerEventDetail, payer: PayerSnapshot): string => {
        const title = dinner.menuTitle ? `"${dinner.menuTitle}" ` : ''
        const team = dinner.cookingTeam ? ` for ${getTeamShortName(dinner.cookingTeam.name)}` : ''
        return `${title}${formatDate(dinner.date)}, ${payer.name ?? payer.email} bestiller${team}`
    }

    return {
        expenseNoteWords,
        calculateClosedBillingPeriod,
        calculateCurrentBillingPeriod,
        getBillingPeriodForDate,
        groupByCostEntry,
        groupByHouseholdEntry,
        chunkTransactionIds,
        // Control sums
        createControlSum,
        controlInvoices,
        controlTransactions,
        // Monthly run side effects
        decideBillingSideEffects
    }
}

// Export control types
export type ControlResult<T> = {
    computed: T
    expected: T
    isValid: boolean
}

export type ControlSumResult = ControlResult<number>
