/**
 * Pure UI composable for the Bookings domain (ADR-017)
 *
 * Client-only presentation of booking/dinner state: deadline badges, chef step
 * icons, order state badges and the action preview shown before a booking is
 * saved. Never imported by server code — it depends on the design system, which
 * is client-only.
 *
 * Domain logic (step machine, deadlines, bucket resolution) stays in useBooking.
 */
import {
    DINNER_STEP_MAP,
    DinnerStepState,
    DEADLINE_LABELS,
    type AlarmLevel,
    bookingOutcomes,
    plannedActions,
    OUTCOME_BUCKETS,
    NOTHING_FOR_SALE,
    EMPTY_RELEASED_TICKET_COUNTS,
    type PreviewSupply,
    type OrderBucketResult,
    type ReleasedTicketCounts
} from '~/composables/useBooking'
import {useSeason, type SeasonDeadlines} from '~/composables/useSeason'
import {useOrder, type SpendingFigures} from '~/composables/useOrder'
import type {Expense} from '~/composables/useBillingValidation'
import {useBookingValidation, DinnerMode as DinnerModeEnum, OrderState as OrderStateEnum, type OrderState, type DinnerMode, type DinnerEventDisplay, type OrderDisplay, type DesiredOrder, type OrderAuditAction, type BookingAction, type BookingOutcome, type ScaffoldResult, type TicketType} from '~/composables/useBookingValidation'
import {useTicket, type TicketTypeWords} from '~/composables/useTicket'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import {ICONS, COLOR, ALARM_TO_BADGE, BOOKING_LOCK_STATUS, ORDER_STATE_COLORS, TICKET_TYPE_COLORS, TICKET_TYPE_ICONS, type NuxtUIColor, type TicketState, type TicketTypeColor} from '~/composables/useTheSlopeDesignSystem'
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

// One label, icon and colour per order state (CostLine, the action preview); a booked ticket claimed from another
// household shows as bought, a place on the waiting list as queued. A state a ticket shows wears the ticket's colour
export interface OrderDisplayConfig {
    label: string
    color: typeof ORDER_STATE_COLORS[TicketState]
    icon: string
}
export const ORDER_STATE_LABELS = {
    [OrderStateEnum.BOOKED]: {label: 'Bestilt', color: ORDER_STATE_COLORS.normal, icon: ICONS.clipboard},
    [OrderStateEnum.RELEASED]: {label: 'Frigivet', color: ORDER_STATE_COLORS.released, icon: ICONS.released},
    [OrderStateEnum.CLOSED]: {label: 'Lukket', color: COLOR.neutral, icon: ICONS.archive},
    [OrderStateEnum.CANCELLED]: {label: 'Annulleret', color: COLOR.error, icon: ICONS.xMark},
    claimed: {label: 'Købt fra anden', color: ORDER_STATE_COLORS.claimed, icon: ICONS.claim},
    queued: {label: 'På venteliste', color: ORDER_STATE_COLORS.queued, icon: ICONS.waitlist}
} as const satisfies Record<OrderState | 'claimed' | 'queued', OrderDisplayConfig>

// An order's state badge and, on a guest ticket, its guest badge (formatOrder)
export interface FormattedOrder {
    guest: OrderDisplayConfig | null
    stateText: string
    stateColor: OrderDisplayConfig['color']
    stateIcon: string
    isClaimed: boolean
}

// How a ticket shows: its label, a colour and a glyph (a ticket type's from the design system, or power mode's own)
export interface TicketPresentation {
    label: string
    color: NuxtUIColor
    icon: string
}

// A ticket type's words with the design system's colour and glyph for it
export type TicketTypePresentation = TicketTypeWords & TicketPresentation & {color: TicketTypeColor}
export const ticketTypePresentation = (ticketType: TicketType): TicketTypePresentation => ({
    ...useTicket().ticketTypeWords[ticketType],
    color: TICKET_TYPE_COLORS[ticketType],
    icon: TICKET_TYPE_ICONS[ticketType]
})

// The presentation of the ticket type a person or an order resolves to (useTicket.resolveTicketType)
export const resolveTicketTypePresentation = (...args: Parameters<ReturnType<typeof useTicket>['resolveTicketType']>) =>
    ticketTypePresentation(useTicket().resolveTicketType(...args))

// A ticket price as a select menu item: the type's presentation for its badge, the price, and the age limit with the description
export interface TicketPriceSelectItem {
    id: number | undefined
    ticketType: TicketType
    price: number
    presentation: TicketPresentation
    label: string
    description?: string
}
export const ticketPriceSelectItems = (ticketPrices: TicketPrice[], compact = false): TicketPriceSelectItem[] =>
    ticketPrices.map(ticketPrice => {
        const presentation = ticketTypePresentation(ticketPrice.ticketType)
        const ageLimit = ticketPrice.maximumAgeLimit ? `Under ${ticketPrice.maximumAgeLimit} år` : undefined
        const description = compact ? undefined : [ageLimit, ticketPrice.description].filter(Boolean).join(' · ') || undefined
        return {
            id: ticketPrice.id,
            ticketType: ticketPrice.ticketType,
            price: ticketPrice.price,
            presentation,
            label: `${presentation.label} · ${useTicket().formatPrice(ticketPrice.price)} kr`,
            description
        }
    })

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

/**
 * The figures under a block of lines, as the rows a table adds in its body-bottom slot: the allowance, what was spent
 * and what is left with its balance icon; without an allowance, what was spent alone. `rule` marks the row a rule sits above
 */
export interface AllowanceRow { label: string; gross: number; balance?: boolean; pending?: boolean; rule?: boolean }
export const allowanceRows = ({budgetGross, spentGross}: {budgetGross: number | null, spentGross: number}): AllowanceRow[] => {
    if (budgetGross === null) return [{label: 'Brugt', gross: spentGross, rule: true}]
    const figures = {budgetGross, spentGross}
    const {spendingLeft, spendingAwaitsTickets} = useOrder()
    return [
        {label: 'Rådighedsbeløb', gross: figures.budgetGross},
        {label: 'Brugt', gross: figures.spentGross},
        {label: 'Tilbage', gross: spendingLeft(figures), balance: true, pending: spendingAwaitsTickets(figures), rule: true}
    ]
}

export const STEP_ICONS: Record<DinnerStepState, string> = {
    [DinnerStepState.SCHEDULED]: ICONS.calendar,
    [DinnerStepState.ANNOUNCED]: ICONS.megaphone,
    [DinnerStepState.BOOKING_CLOSED]: ICONS.ticket,
    [DinnerStepState.GROCERIES_DONE]: ICONS.shoppingCart,
    [DinnerStepState.CONSUMED]: ICONS.checkCircle
}

const ticketCount = (count: number) => `${count} billet${count === 1 ? '' : 'ter'}`

/**
 * The words of a closed dinner's supply, once: the booking form's bar (the tickets for sale, then the waiting list),
 * the Framelding tooltip (the same waiting list sentence) and the household's notes on the tickets it released and its
 * places on the waiting list. The first line of the bar names the closure. A queue entry is booked at its frozen price
 * when a ticket is assigned, so the household pays then
 */
export const SUPPLY_WORDS = {
    forSale: ({total, formatted}: ReleasedTicketCounts): string | null => total > 0
        ? `Lukket for ændringer, men der er ${ticketCount(total)} til salg (${formatted}).`
        : null,
    forSaleCount: ({formatted}: ReleasedTicketCounts) => `${formatted} til salg`,
    queuedCount: ({queuedFormatted}: ReleasedTicketCounts) => `${queuedFormatted} på venteliste`,
    // A place in the line of its ticket type; the type is named where nothing beside the place shows it
    place: (position: number, ticketType?: TicketType) =>
        `${ticketType ? `${useTicket().ticketTypeWords[ticketType].label}: ` : ''}#${position} i kø`,
    waitlist: ({total, queued, queuedFormatted}: ReleasedTicketCounts): string | null => queued > 0
        ? `${total > 0 ? 'Du kan også få' : 'Lukket for ændringer, men du kan få'} en plads på ventelisten. Pt står ${queuedFormatted} på ventelisten.`
        : null,
    householdReleased: (count: number) =>
        ({title: `Husstanden har frigivet ${ticketCount(count)}`, description: 'Du betaler, medmindre andre køber'}),
    householdQueued: (count: number) =>
        ({title: `Husstanden står på ventelisten med ${ticketCount(count)}`, description: 'Du betaler, når du får en billet fra ventelisten.'})
}

/**
 * The Framelding badge: open while bookings can change; once closed, the tickets for sale lead with the waiting list
 * after them, a waiting list alone wears the queued order state, and a dinner with neither reads closed
 * @param isOpen - Whether booking is still open (canModifyOrders)
 * @param releasedCounts - The locked dinner's supply with its formatted breakdowns
 */
export const createBookingBadge = (isOpen: boolean, releasedCounts: ReleasedTicketCounts = EMPTY_RELEASED_TICKET_COUNTS): DeadlineBadgeData => {
    const {label, openText, closedText, availableText} = DEADLINE_LABELS.BOOKING_CLOSED
    if (isOpen) return {label, icon: ICONS.lockOpen, color: COLOR.success, value: 'Åben', helpText: openText}

    const {total} = releasedCounts
    const waitlist = SUPPLY_WORDS.waitlist(releasedCounts)
    const waiting = SUPPLY_WORDS.queuedCount(releasedCounts)
    if (total > 0) {
        const forSale = SUPPLY_WORDS.forSaleCount(releasedCounts)
        return {
            label,
            icon: ICONS.released,
            color: COLOR.warning,
            value: waitlist ? `${forSale}, ${waiting}` : forSale,
            helpText: waitlist ? `${availableText(total)}. ${waitlist}` : availableText(total)
        }
    }
    if (waitlist) {
        const {icon, color} = ORDER_STATE_LABELS.queued
        return {label, icon, color, value: waiting, helpText: waitlist}
    }
    return {label, icon: ICONS.lockClosed, color: COLOR.error, value: 'Lukket', helpText: closedText}
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
 * The lock chip of a dinner past its booking deadline: the tickets for sale as a number, else the waiting list's
 * hourglass, else the closed chip alone. A released ticket goes to the first waiting for its ticket type, so a dinner
 * can hold both; the chip then shows the tickets for sale.
 * Null without supply: the dinner is open for booking.
 */
export const lockChip = (supply: ReleasedTicketCounts | null | undefined): {color: NuxtUIColor, text?: string, icon?: string} | null => {
    if (!supply) return null
    if (supply.total > 0) return {color: BOOKING_LOCK_STATUS.lockedWithTickets.color, text: String(supply.total)}
    if (supply.queued > 0) return {...BOOKING_LOCK_STATUS.lockedWithQueue}
    return {...BOOKING_LOCK_STATUS.locked}
}

/** The words of a dinner mode, once: DinnerModeSelector's glyph and label, and the mode a preview line names */
export const MODE_WORDS: Record<DinnerMode, {label: string, icon: string}> = {
    [DinnerModeEnum.DINEIN]: {label: 'Spisesal', icon: ICONS.dinner},
    [DinnerModeEnum.DINEINLATE]: {label: 'Sen', icon: ICONS.lateDinner},
    [DinnerModeEnum.TAKEAWAY]: {label: 'Takeaway', icon: ICONS.takeaway},
    [DinnerModeEnum.NONE]: {label: 'Ingen', icon: ICONS.noDinner}
}

/** What a preview line names beside the person: the mode's word, and the queue place a requeue keeps in its ticket type's line */
export type PreviewWords = {mode: string, position?: number, ticketType?: TicketType}
type PreviewTemplate = (name: string, words: PreviewWords) => string

const {BookingActionSchema} = useBookingValidation()
const Action = BookingActionSchema.enum

/** The words of each booking action, once: the preview line's glyph and sentence */
export const ACTION_WORDS: Record<BookingAction, {icon: string, template: PreviewTemplate}> = {
    [Action.BOOK]: {icon: ICONS.plusCircle, template: name => `${name} tilmeldes`},
    [Action.BUY]: {icon: ICONS.claim, template: name => `${name} køber en billet til salg`},
    [Action.QUEUE]: {icon: ICONS.waitlist, template: name => `${name} skrives på ventelisten`},
    [Action.LEAVE]: {icon: ICONS.xMark, template: name => `${name} forlader ventelisten`},
    [Action.REQUEUE]: {
        icon: ICONS.waitlist,
        template: (name, {mode, position, ticketType}) =>
            `${name} ændrer ønsket tilmelding til ${mode}${position ? `, beholder pladsen ${SUPPLY_WORDS.place(position, ticketType)}` : ''}`
    },
    [Action.CANCEL]: {icon: ICONS.xMark, template: name => `${name} frameldes`},
    [Action.RELEASE]: {icon: ICONS.released, template: name => `${name}s billet frigives`},
    [Action.RECLAIM]: {icon: ICONS.undo, template: name => `${name} tilmeldes igen`},
    [Action.CHANGE_MODE]: {icon: ICONS.edit, template: name => `${name} opdaterer spisning`},
    [Action.CHANGE_PRICE]: {icon: ICONS.edit, template: name => `${name} opdaterer spisning`}
}

/** The booking form's save button words for each outcome */
export const OUTCOME_WORDS: Record<BookingOutcome, {save: string}> = {
    [Action.BOOK]: {save: 'Book'},
    [Action.BUY]: {save: 'Køb billet'},
    [Action.QUEUE]: {save: 'Skriv på venteliste'},
    [Action.LEAVE]: {save: 'Forlad ventelisten'},
    [Action.REQUEUE]: {save: 'Opdater'},
    [Action.CHANGE_MODE]: {save: 'Opdater'}
}

/** The queue place lookup a preview takes: the place of the household entry a desired order names */
export const waitlistPositionOf = (entries: {id: number, position: number}[]) =>
    (order: DesiredOrder): number | undefined => entries.find(entry => entry.id === order.waitlistEntryId)?.position

/** What saving the previewed buckets does: the plan's first supply outcome; else a mode change */
export const previewOutcome = (buckets: OrderBucketResult<DesiredOrder>, supply: PreviewSupply = NOTHING_FOR_SALE): BookingOutcome =>
    OUTCOME_BUCKETS.flatMap(bucket => bookingOutcomes(bucket, buckets[bucket], supply))[0]?.outcome ?? Action.CHANGE_MODE

/** The save button's label for an outcome */
export const bookingSaveLabel = (outcome: BookingOutcome): string => OUTCOME_WORDS[outcome].save

/** The guest form's button names the guests; its preview lines name each guest's outcome */
export const guestSaveLabel = (count: number): string => count === 1 ? 'Tilmeld gæst' : 'Tilmeld gæster'

/** The look of a toast that reports a booking result: the ticket, red as soon as one order failed, green otherwise */
export const scaffoldToastLook = (result: Pick<ScaffoldResult, 'errored'>) => ({
    color: result.errored > 0 ? COLOR.error : COLOR.success,
    icon: ICONS.ticket
})

/** A member's place in the queue of a sold-out dinner, rendered compact beside the name */
export const createWaitlistBadge = (position: number): DeadlineBadgeData => ({
    label: 'Venteliste',
    icon: ORDER_STATE_LABELS.queued.icon,
    color: ORDER_STATE_LABELS.queued.color,
    value: SUPPLY_WORDS.place(position),
    helpText: 'Du får en billet, når en kommer til salg, eller kokken frigiver portioner'
})

// ============================================================================
// Action Preview - Show users what will happen before they save
// ============================================================================

export interface ActionPreviewItem {
    name: string
    action: BookingAction
    icon: string
    color: OrderDisplayConfig['color']
    text: string
}

export const useBookingUi = () => {
    const {DinnerStateSchema, OrderStateSchema} = useBookingValidation()
    const DinnerState = DinnerStateSchema.enum
    const {formatGuestLabel} = useOrder()
    const {getCookingDeadlineThresholds} = useSeason()

    const formatOrder = (order: Pick<OrderDisplay, 'state' | 'provenanceHousehold' | 'isGuestTicket'>, bookerName?: string): FormattedOrder => {
        const isClaimed = !!order.provenanceHousehold
        const shown = order.state === OrderStateEnum.BOOKED && isClaimed ? ORDER_STATE_LABELS.claimed : ORDER_STATE_LABELS[order.state]
        return {
            guest: order.isGuestTicket ? {label: formatGuestLabel(bookerName), color: COLOR.info, icon: ICONS.userPlus} : null,
            stateText: shown.label,
            stateColor: shown.color,
            stateIcon: shown.icon,
            isClaimed
        }
    }

    const formatActionPreview = (
        buckets: OrderBucketResult<DesiredOrder>,
        existingOrders: OrderDisplay[],
        getInhabitantName: (id: number) => string,
        supply: PreviewSupply = NOTHING_FOR_SALE,
        positionOf: (order: DesiredOrder) => number | undefined = () => undefined
    ): ActionPreviewItem[] => {
        const OrderStateEnum = OrderStateSchema.enum
        const existingById = new Map(existingOrders.map(o => [o.id, o]))

        // Each action's colour is the colour of the order state it leads to
        const ACTION_TO_STATE = {
            [Action.BOOK]: OrderStateEnum.BOOKED,
            [Action.BUY]: 'claimed' as const,
            [Action.QUEUE]: 'claimed' as const,
            [Action.LEAVE]: OrderStateEnum.CANCELLED,
            [Action.REQUEUE]: 'claimed' as const,
            [Action.CANCEL]: OrderStateEnum.CANCELLED,
            [Action.RELEASE]: OrderStateEnum.RELEASED,
            [Action.RECLAIM]: OrderStateEnum.BOOKED,
            [Action.CHANGE_MODE]: OrderStateEnum.CLOSED,
            [Action.CHANGE_PRICE]: OrderStateEnum.CLOSED
        } as const

        const getActionColor = (action: BookingAction) => ORDER_STATE_LABELS[ACTION_TO_STATE[action]].color

        const toItem = (order: DesiredOrder, action: BookingAction): ActionPreviewItem => {
            // For guests: "Gæst af {bookerName}", for regular: inhabitant name
            const bookerName = getInhabitantName(order.inhabitantId)
            const name = order.isGuestTicket ? formatGuestLabel(bookerName) : bookerName
            const config = ACTION_WORDS[action]
            // Only a requeue keeps a queue place to name, in its ticket type's line
            const isRequeue = action === Action.REQUEUE
            const words = {mode: MODE_WORDS[order.dinnerMode].label, position: isRequeue ? positionOf(order) : undefined, ticketType: isRequeue ? supply(order).ticketType : undefined}
            return { name, action, icon: config.icon, color: getActionColor(action), text: config.template(name, words) }
        }

        return plannedActions(buckets, existingById, supply).map(({order, action}) => toItem(order, action))
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
        lockChip,
        bookingSaveLabel,
        waitlistPositionOf,
        guestSaveLabel,
        previewOutcome,
        createChefBadges,
        // Order badges
        formatOrder,
        // Action preview
        formatActionPreview
    }
}
