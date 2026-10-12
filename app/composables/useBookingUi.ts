/**
 * Pure UI composable for the Bookings domain (ADR-017)
 *
 * Client-only presentation of booking/dinner state: deadline badges, chef step
 * icons and the action preview shown before a booking is saved. Never imported
 * by server code — it depends on the design system and on useOrder, which rely
 * on Nuxt app auto-imports that do not exist in the Nitro bundle.
 *
 * Domain logic (step machine, deadlines, bucket resolution) stays in useBooking.
 */
import {
    DINNER_STEP_MAP,
    DinnerStepState,
    DEADLINE_LABELS,
    type AlarmLevel,
    type BookingAction,
    type OrderBucketResult,
    type ReleasedTicketCounts
} from '~/composables/useBooking'
import {useSeason, type SeasonDeadlines} from '~/composables/useSeason'
import {useOrder, type SpendingFigures} from '~/composables/useOrder'
import type {Expense} from '~/composables/useBillingValidation'
import {useBookingValidation, type DinnerEventDisplay, type OrderDisplay, type DesiredOrder, type OrderState, type OrderAuditAction} from '~/composables/useBookingValidation'
import {ICONS, COLOR, ALARM_TO_BADGE, type NuxtUIColor} from '~/composables/useTheSlopeDesignSystem'
import {calculateCountdown, formatDate, formatDateRange} from '~/utils/date'

// ============================================================================
// Deadline Badges
// ============================================================================

export interface DeadlineBadgeData {
    label: string
    icon: string
    color: typeof COLOR.success | typeof COLOR.error | typeof COLOR.warning | typeof COLOR.neutral
    value: string       // Badge text
    helpText: string
    step?: number       // Chef stepper: which step this badge belongs to
    alarm?: AlarmLevel  // Chef stepper: alarm level for conditional display
}

/** Icon per chef workflow step (DINNER_STEP_MAP is icon-free so the server can import it) */
// One label, icon and colour per order history action (OrderHistoryDisplay, TicketChanges)
export interface OrderActionLabel { icon: string; color: NuxtUIColor; label: string }
export const ORDER_ACTION_LABELS: Record<OrderAuditAction, OrderActionLabel> = {
    USER_BOOKED: {icon: ICONS.check, color: COLOR.success, label: 'Bestilt'},
    USER_CANCELLED: {icon: ICONS.xMark, color: COLOR.warning, label: 'Afmeldt'},
    USER_CLAIMED: {icon: ICONS.claim, color: COLOR.info, label: 'Købt fra anden'},
    SYSTEM_CREATED: {icon: ICONS.calendar, color: COLOR.neutral, label: 'Automatisk bestilling'},
    SYSTEM_DELETED: {icon: ICONS.xMark, color: COLOR.error, label: 'Slettet'},
    SYSTEM_UPDATED: {icon: ICONS.edit, color: COLOR.neutral, label: 'Opdateret'}
}

// One dinner of the team's cooking round (CookingRoundSpending): its allowance and spending in gross øre
export interface CookingRoundRow {
    dinnerEventId: number
    date: Date
    menuTitle: string
    isCurrent: boolean
    budgetGross: number
    spentGross: number
}

/** The words of a team's cooking round, shared by the Madbestilling hint and the Budget pane's round table */
export interface CookingRoundWords { team: string; heading: string }
export const cookingRoundWords = (teamShortName: string, first: Date, last: Date): CookingRoundWords => {
    const team = `Hele ${teamShortName}`
    return {team, heading: `${team}, for perioden ${formatDateRange({start: first, end: last})}`}
}

/**
 * A spending table fragment: a heading, the rows (a team's cooking days, or this dinner's receipts with the note
 * as the label) and a total row carrying the figures the rows add up to
 */
export type SpendingTableRow =
    | ({kind: 'dinner'} & CookingRoundRow)
    | {kind: 'receipt', id: string, date: Date, label: string, amount: number}
export interface SpendingFragment {
    heading: string
    rows: SpendingTableRow[]
    total: {label: string, figures: SpendingFigures}
}
export const dinnerSpendingFragment = (dinner: CookingRoundRow, receipts: Expense[]): SpendingFragment => ({
    heading: `${dinner.menuTitle}, ${formatDate(dinner.date)}`,
    rows: receipts.map(receipt => ({kind: 'receipt', id: `receipt-${receipt.id}`, date: receipt.createdAt, label: receipt.description, amount: receipt.amount})),
    total: {label: dinner.menuTitle, figures: {budgetGross: dinner.budgetGross, spentGross: dinner.spentGross}}
})
export const teamSpendingFragment = (rows: CookingRoundRow[], words: CookingRoundWords): SpendingFragment => ({
    heading: words.heading,
    rows: rows.map(row => ({kind: 'dinner', ...row})),
    total: {label: words.team, figures: useOrder().spendingTotals(rows)}
})

export const STEP_ICONS: Record<DinnerStepState, string> = {
    [DinnerStepState.SCHEDULED]: ICONS.calendar,
    [DinnerStepState.ANNOUNCED]: ICONS.megaphone,
    [DinnerStepState.BOOKING_CLOSED]: ICONS.ticket,
    [DinnerStepState.GROCERIES_DONE]: ICONS.shoppingCart,
    [DinnerStepState.CONSUMED]: ICONS.checkCircle
}

/**
 * Create booking deadline badge data
 * @param isOpen - Whether booking is still open (canModifyOrders)
 * @param releasedCounts - Released ticket counts with formatted breakdown (optional)
 */
export const createBookingBadge = (isOpen: boolean, releasedCounts?: ReleasedTicketCounts): DeadlineBadgeData => {
    const hasTickets = !isOpen && releasedCounts !== undefined && releasedCounts.total > 0
    return {
        label: DEADLINE_LABELS.BOOKING_CLOSED.label,
        icon: isOpen ? ICONS.lockOpen : (hasTickets ? ICONS.released : ICONS.lockClosed),
        color: isOpen ? COLOR.success : (hasTickets ? COLOR.warning : COLOR.error),
        value: isOpen ? 'Åben' : (hasTickets ? `${releasedCounts!.formatted} ledig${releasedCounts!.total === 1 ? '' : 'e'}` : 'Lukket'),
        helpText: isOpen
            ? DEADLINE_LABELS.BOOKING_CLOSED.openText
            : (hasTickets ? DEADLINE_LABELS.BOOKING_CLOSED.availableText(releasedCounts!.total) : DEADLINE_LABELS.BOOKING_CLOSED.closedText)
    }
}

/**
 * Create dining mode deadline badge data.
 * Shows urgency (yellow/red) when < 24h and still open.
 */
export const createDiningModeBadge = (
    isOpen: boolean,
    countdown?: { hours: number; formatted: string }
): DeadlineBadgeData => {
    // Show urgency when open and < 24h
    if (isOpen && countdown && countdown.hours > 0 && countdown.hours < 24) {
        return {
            label: DEADLINE_LABELS.DINING_MODE.label,
            icon: ICONS.lockOpen,
            color: countdown.hours < 1 ? COLOR.error : COLOR.warning,
            value: `lukker om ${countdown.formatted.toLowerCase()}`,
            helpText: DEADLINE_LABELS.DINING_MODE.openText
        }
    }
    return {
        label: DEADLINE_LABELS.DINING_MODE.label,
        icon: isOpen ? ICONS.lockOpen : ICONS.lockClosed,
        color: isOpen ? COLOR.success : COLOR.error,
        value: isOpen ? 'Åben' : 'Lukket',
        helpText: isOpen ? DEADLINE_LABELS.DINING_MODE.openText : DEADLINE_LABELS.DINING_MODE.closedText
    }
}

/**
 * Create booking view badges (for DinnerBookingForm, BookingGridView)
 */
export const createBookingBadges = (
    dinnerEvent: DinnerEventDisplay,
    deadlines: SeasonDeadlines,
    releasedCounts?: ReleasedTicketCounts
): { booking: DeadlineBadgeData; diningMode: DeadlineBadgeData } => {
    const diningModeCountdown = calculateCountdown(deadlines.getDiningModeDeadlineTime(dinnerEvent.date))
    return {
        booking: createBookingBadge(deadlines.canModifyOrders(dinnerEvent.date), releasedCounts),
        diningMode: createDiningModeBadge(deadlines.canEditDiningMode(dinnerEvent.date), diningModeCountdown)
    }
}

/**
 * The save button's label, a preview of what the one booking path will do: an existing ticket is updated, a new one
 * is booked before the deadline; after it the claim buys a ticket for sale, else takes a place in the queue
 */
export const bookingSaveLabel = (action: BookingAction, hasTicket: boolean, hasReleasedTickets: boolean): string => {
    if (hasTicket) return 'Opdater'
    if (action !== 'claim') return 'Book'
    return hasReleasedTickets ? 'Køb billet' : 'Skriv på venteliste'
}

/** A member's place in the queue of a sold-out dinner, rendered compact beside the name */
export const createWaitlistBadge = (position: number): DeadlineBadgeData => ({
    label: 'Venteliste',
    icon: ICONS.waitlist,
    color: COLOR.neutral,
    value: `#${position} i køen`,
    helpText: 'Du får en billet, når en bliver ledig eller kokken frigiver portioner'
})

// ============================================================================
// Action Preview - Show users what will happen before they save
// ============================================================================

export type ActionType = 'create' | 'delete' | 'release' | 'reclaim' | 'claim' | 'leave' | 'requeue' | 'updateMode'

export interface ActionPreviewItem {
    name: string
    action: ActionType
    icon: string
    color: typeof COLOR.primary | typeof COLOR.error | typeof COLOR.info | typeof COLOR.neutral
    text: string
}

export const useBookingUi = () => {
    const {DinnerStateSchema, OrderStateSchema} = useBookingValidation()
    const DinnerState = DinnerStateSchema.enum
    const {orderStateConfig, formatGuestLabel} = useOrder()
    const {getCookingDeadlineThresholds} = useSeason()

    const ACTION_PREVIEW = {
        create:     { icon: ICONS.plusCircle, template: (n: string) => `${n} tilmeldes` },
        delete:     { icon: ICONS.xMark,      template: (n: string) => `${n} frameldes` },
        release:    { icon: ICONS.released,   template: (n: string) => `${n}s billet frigives` },
        reclaim:    { icon: ICONS.undo,       template: (n: string) => `${n} tilmeldes igen` },
        claim:      { icon: ICONS.claim,      template: (n: string) => `${n} køber fra andre` },
        leave:      { icon: ICONS.xMark,      template: (n: string) => `${n} forlader ventelisten` },
        requeue:    { icon: ICONS.waitlist,   template: (n: string) => `${n} skrives på ventelisten igen` },
        updateMode: { icon: ICONS.edit,       template: (n: string) => `${n} opdaterer spisning` }
    } as const

    type BucketKey = keyof OrderBucketResult<DesiredOrder>

    const BUCKET_TO_ACTION: Record<Exclude<BucketKey, 'idempotent' | 'update'>, ActionType> = {
        create: 'create',
        delete: 'delete',
        claim: 'claim',
        leave: 'leave',
        requeue: 'requeue'
    }

    const getUpdateAction = (
        order: DesiredOrder,
        existingById: Map<number, OrderDisplay>,
        OrderState: { RELEASED: OrderState }
    ): ActionType => {
        const existing = order.orderId ? existingById.get(order.orderId) : null
        if (order.state === OrderState.RELEASED) return 'release'
        if (existing?.state === OrderState.RELEASED) return 'reclaim'
        return 'updateMode'
    }

    const formatActionPreview = (
        buckets: OrderBucketResult<DesiredOrder>,
        existingOrders: OrderDisplay[],
        getInhabitantName: (id: number) => string
    ): ActionPreviewItem[] => {
        const OrderStateEnum = OrderStateSchema.enum
        const existingById = new Map(existingOrders.map(o => [o.id, o]))

        // Map action types to order states for color lookup
        const ACTION_TO_STATE = {
            create:     OrderStateEnum.BOOKED,
            delete:     OrderStateEnum.CANCELLED,
            release:    OrderStateEnum.RELEASED,
            reclaim:    OrderStateEnum.BOOKED,
            claim:      'claimed' as const,
            leave:      OrderStateEnum.CANCELLED,
            requeue:    'claimed' as const,
            updateMode: OrderStateEnum.CLOSED
        } as const

        const getActionColor = (action: ActionType) => orderStateConfig[ACTION_TO_STATE[action]].color

        const toItem = (order: DesiredOrder, action: ActionType): ActionPreviewItem => {
            // For guests: "Gæst af {bookerName}", for regular: inhabitant name
            const bookerName = getInhabitantName(order.inhabitantId)
            const name = order.isGuestTicket ? formatGuestLabel(bookerName) : bookerName
            const config = ACTION_PREVIEW[action]
            return { name, action, icon: config.icon, color: getActionColor(action), text: config.template(name) }
        }

        const simpleItems = (Object.entries(BUCKET_TO_ACTION) as [BucketKey, ActionType][])
            .flatMap(([bucket, action]) => buckets[bucket].map(order => toItem(order, action)))

        const updateItems = buckets.update.map(order =>
            toItem(order, getUpdateAction(order, existingById, OrderStateSchema.enum))
        )

        return [...simpleItems, ...updateItems]
    }

    /**
     * Create chef workflow badges for a dinner event.
     * Each badge uses countdown to its specific deadline (from SeasonDeadlines time getters).
     */
    const createChefBadges = (
        dinnerEvent: DinnerEventDisplay,
        deadlines: SeasonDeadlines,
        releasedCounts?: ReleasedTicketCounts
    ): Map<number, DeadlineBadgeData> => {
        const thresholds = getCookingDeadlineThresholds()

        // Each badge counts to its specific deadline
        const menuCountdown = calculateCountdown(deadlines.getMenuDeadlineTime(dinnerEvent.date))
        const bookingCountdown = calculateCountdown(deadlines.getBookingDeadlineTime(dinnerEvent.date))
        const dinnerCountdown = calculateCountdown(deadlines.getDinnerStartTime(dinnerEvent.date))

        const menuDone = dinnerEvent.state === DinnerState.ANNOUNCED ||
            (dinnerEvent.state === DinnerState.CONSUMED && dinnerEvent.heynaboEventId !== null)

        const badge = (
            step: number,
            key: keyof typeof DEADLINE_LABELS,
            state: DinnerStepState,
            done: boolean,
            countdown: { hours: number; formatted: string }
        ): DeadlineBadgeData => {
            const labels = DEADLINE_LABELS[key]
            const result = DINNER_STEP_MAP[state].getDeadline(countdown, thresholds)
            const alarm = done ? -1 : result.alarm
            const b = ALARM_TO_BADGE[alarm]
            const text = done ? labels.closedText : labels.openText
            return {
                step, alarm,
                label: 'label' in labels ? labels.label : '',
                icon: b.icon,
                value: done ? '' : result.description,
                color: b.color as DeadlineBadgeData['color'],
                helpText: text
            }
        }

        const bookingOpen = deadlines.canModifyOrders(dinnerEvent.date)

        // Booking badge: reuse createBookingBadge (DRY) + add countdown when open
        const baseBadge = createBookingBadge(bookingOpen, releasedCounts)
        const bookingResult = DINNER_STEP_MAP[DinnerStepState.BOOKING_CLOSED].getDeadline(bookingCountdown, thresholds)
        const bookingBadge: DeadlineBadgeData = {
            ...baseBadge,
            step: 2,
            alarm: bookingOpen ? bookingResult.alarm : -1,
            value: bookingOpen ? bookingResult.description : baseBadge.value
        }

        return new Map([
            [1, badge(1, 'ANNOUNCED', DinnerStepState.ANNOUNCED, menuDone, menuCountdown)],
            [2, bookingBadge],
            [3, badge(3, 'GROCERIES_DONE', DinnerStepState.GROCERIES_DONE, dinnerEvent.totalCost > 0, dinnerCountdown)],
            [4, badge(4, 'CONSUMED', DinnerStepState.CONSUMED, dinnerEvent.state === DinnerState.CONSUMED, dinnerCountdown)]
        ])
    }

    return {
        // Deadline badges
        STEP_ICONS,
        createBookingBadge,
        createDiningModeBadge,
        createBookingBadges,
        createWaitlistBadge,
        bookingSaveLabel,
        createChefBadges,
        // Action preview
        ACTION_PREVIEW,
        formatActionPreview
    }
}
