/**
 * Pure UI composable for the Bookings domain (ADR-017)
 *
 * Client-only presentation of booking/dinner state: deadline badges, chef step
 * icons, order state badges, the action preview shown before a booking is saved
 * and the booking result reported after it. Never imported by server code — it
 * depends on the design system, which is client-only.
 *
 * Domain logic (step machine, deadlines, bucket resolution) stays in useBooking.
 */
import {
    formatPlace,
    formatDinnerName,
    DINNER_STEP_MAP,
    DinnerStepState,
    DEADLINE_LABELS,
    type AlarmLevel,
    EMPTY_RELEASED_TICKET_COUNTS,
    ticketStateOf,
    supplyStateOf,
    type ReleasedTicketCounts
} from '~/composables/useBooking'
import {useSeason, type SeasonDeadlines} from '~/composables/useSeason'
import {useOrder, type SpendingFigures} from '~/composables/useOrder'
import {TICKET_COUNTS} from '~/composables/useBilling'
import type {Expense} from '~/composables/useBillingValidation'
import {useBookingValidation, DinnerMode as DinnerModeEnum, OrderState as OrderStateEnum, OrderAuditAction as OrderAuditActionEnum, TicketState as TicketStateEnum, SupplyState as SupplyStateEnum, BookingFailure as BookingFailureEnum, type OrderState, type SupplyState, type TicketState, type DinnerMode, type DinnerEventDisplay, type OrderDisplay, type OrderAuditAction, type BookingAction, type BookingOutcome, type BookingResult, type QueuePosition, type ScaffoldResult, type TicketChange, type TicketChangeKind, type TicketCounts, type TicketEvent, type TicketSale, type TicketType} from '~/composables/useBookingValidation'
import {useTicket, ticketTypeLabel} from '~/composables/useTicket'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import {ICONS, COLOR, COMPONENTS, ALARM_TO_BADGE, BOOKING_LOCK_STATUS, ORDER_STATE_COLORS, TICKET_TYPE_COLORS, TICKET_TYPE_ICONS, type NuxtUIColor, type TicketTypeColor} from '~/composables/useTheSlopeDesignSystem'
import {calculateCountdown, formatDate, formatDateRange} from '~/utils/date'
import {BOOKING_WORDS} from '~/config/bookingWords'
import {groupBy, linesBy} from '~/utils/batchUtils'
import {compareAsc} from 'date-fns'
import type {WatchSource} from 'vue'

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

// One label, icon and colour per order history action (OrderHistoryDisplay)
export interface OrderActionLabel { icon: string; color: NuxtUIColor; label: string }
const HISTORY_WORDS = BOOKING_WORDS.orderActions
export const ORDER_ACTION_LABELS: Record<OrderAuditAction, OrderActionLabel> = {
    [OrderAuditActionEnum.USER_BOOKED]: {icon: ICONS.check, color: COLOR.success, label: HISTORY_WORDS[OrderAuditActionEnum.USER_BOOKED]},
    [OrderAuditActionEnum.USER_CANCELLED]: {icon: ICONS.xMark, color: COLOR.warning, label: HISTORY_WORDS[OrderAuditActionEnum.USER_CANCELLED]},
    [OrderAuditActionEnum.USER_CLAIMED]: {icon: ICONS.claim, color: COLOR.info, label: HISTORY_WORDS[OrderAuditActionEnum.USER_CLAIMED]},
    [OrderAuditActionEnum.SYSTEM_CREATED]: {icon: ICONS.calendar, color: COLOR.neutral, label: HISTORY_WORDS[OrderAuditActionEnum.SYSTEM_CREATED]},
    [OrderAuditActionEnum.SYSTEM_DELETED]: {icon: ICONS.xMark, color: COLOR.error, label: HISTORY_WORDS[OrderAuditActionEnum.SYSTEM_DELETED]},
    [OrderAuditActionEnum.SYSTEM_UPDATED]: {icon: ICONS.edit, color: COLOR.neutral, label: HISTORY_WORDS[OrderAuditActionEnum.SYSTEM_UPDATED]}
}

// One label, icon and colour per order state (CostLine, the action preview); a booked ticket claimed from another
// household shows as bought, a place on the waiting list as queued. A state a ticket shows wears the ticket's colour
export interface OrderDisplayConfig {
    label: string
    color: typeof ORDER_STATE_COLORS[TicketState]
    icon: string
}
const STATE_WORDS = BOOKING_WORDS.orderStates
export const ORDER_STATE_LABELS = {
    [OrderStateEnum.BOOKED]: {label: STATE_WORDS[OrderStateEnum.BOOKED], color: ORDER_STATE_COLORS.normal, icon: ICONS.clipboard},
    [OrderStateEnum.RELEASED]: {label: STATE_WORDS[OrderStateEnum.RELEASED], color: ORDER_STATE_COLORS.released, icon: ICONS.released},
    [OrderStateEnum.CLOSED]: {label: STATE_WORDS[OrderStateEnum.CLOSED], color: COLOR.neutral, icon: ICONS.archive},
    [OrderStateEnum.CANCELLED]: {label: STATE_WORDS[OrderStateEnum.CANCELLED], color: COLOR.error, icon: ICONS.xMark},
    [TicketStateEnum.claimed]: {label: STATE_WORDS[TicketStateEnum.claimed], color: ORDER_STATE_COLORS.claimed, icon: ICONS.claim},
    [TicketStateEnum.queued]: {label: STATE_WORDS[TicketStateEnum.queued], color: ORDER_STATE_COLORS.queued, icon: ICONS.waitlist}
} as const satisfies Record<OrderState | typeof TicketStateEnum.claimed | typeof TicketStateEnum.queued, OrderDisplayConfig>

// An order's state badge and, on a guest ticket, its guest badge (formatOrder)
export interface FormattedOrder {
    guest: OrderDisplayConfig | null
    stateText: string
    stateColor: OrderDisplayConfig['color']
    stateIcon: string
}

/** The order of a cost line: a live order carries its state; a billed line carries none, and the eating mode its order closed with */
export type CostLineOrder = {state?: OrderState, dinnerMode?: DinnerMode | null, provenanceHousehold?: string | null, isGuestTicket?: boolean}

/** A billed line carries no order state: the close settled its order */
const isBilledLine = (line: Pick<CostLineOrder, 'state'>): boolean => line.state === undefined

/** The eating mode a cost line shows beside the name: a live order's; on a billed line the mode only reads into its badge */
export const costLineMode = (line: CostLineOrder): DinnerMode | undefined =>
    isBilledLine(line) ? undefined : line.dinnerMode ?? undefined

// How a ticket shows: its label, a colour and a glyph (a ticket type's from the design system, or power mode's own)
export interface TicketPresentation {
    label: string
    color: NuxtUIColor
    icon: string
}

// A ticket type's label with the design system's colour and glyph for it
export type TicketTypePresentation = TicketPresentation & {color: TicketTypeColor}
export const ticketTypePresentation = (ticketType: TicketType): TicketTypePresentation => ({
    label: ticketTypeLabel(ticketType),
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
        const ageLimit = ticketPrice.maximumAgeLimit ? BOOKING_WORDS.ticketPrice.ageLimit(ticketPrice.maximumAgeLimit) : undefined
        const description = compact ? undefined : [ageLimit, ticketPrice.description].filter(Boolean).join(' · ') || undefined
        return {
            id: ticketPrice.id,
            ticketType: ticketPrice.ticketType,
            price: ticketPrice.price,
            presentation,
            label: BOOKING_WORDS.ticketPrice.label(presentation.label, useTicket().formatPrice(ticketPrice.price)),
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
    const team = BOOKING_WORDS.wholeTeam(teamShortName)
    return {team, heading: BOOKING_WORDS.roundHeading(team, formatDateRange({start: first, end: last}))}
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
    heading: `${formatDinnerName(dinner)}, ${formatDate(dinner.date)}`,
    rows: receipts.map(receipt => ({kind: 'receipt', id: `receipt-${receipt.id}`, date: receipt.createdAt, label: receipt.description, amount: receipt.amount})),
    total: {label: formatDinnerName(dinner), figures: {budgetGross: dinner.budgetGross, spentGross: dinner.spentGross}}
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
    const {budget, spent, left} = BOOKING_WORDS.allowance
    if (budgetGross === null) return [{label: spent, gross: spentGross, rule: true}]
    const figures = {budgetGross, spentGross}
    const {spendingLeft, spendingAwaitsTickets} = useOrder()
    return [
        {label: budget, gross: figures.budgetGross},
        {label: spent, gross: figures.spentGross},
        {label: left, gross: spendingLeft(figures), balance: true, pending: spendingAwaitsTickets(figures), rule: true}
    ]
}

/** Icon per chef workflow step (DINNER_STEP_MAP is icon-free so the server can import it) */
export const STEP_ICONS: Record<DinnerStepState, string> = {
    [DinnerStepState.SCHEDULED]: ICONS.calendar,
    [DinnerStepState.ANNOUNCED]: ICONS.megaphone,
    [DinnerStepState.BOOKING_CLOSED]: ICONS.ticket,
    [DinnerStepState.GROCERIES_DONE]: ICONS.shoppingCart,
    [DinnerStepState.CONSUMED]: ICONS.checkCircle
}

/**
 * The words of a closed dinner's supply, once: the Framelding badge's value line, the chef's waiting-list box and its
 * ask for portions, and the household's notes on the tickets it released and its places on the waiting list. A queue
 * entry is booked at its frozen price when a ticket is assigned, so the household pays then
 */
export const SUPPLY_WORDS = {
    forSaleCount: ({formatted}: Pick<ReleasedTicketCounts, 'formatted'>) => BOOKING_WORDS.supply.forSale(formatted),
    queuedCount: ({queuedFormatted}: Pick<ReleasedTicketCounts, 'queuedFormatted'>) => BOOKING_WORDS.supply.queued(queuedFormatted),
    chefAsk: BOOKING_WORDS.supply.chefAsk,
    householdReleased: BOOKING_WORDS.supply.householdReleased,
    householdQueued: BOOKING_WORDS.supply.householdQueued
}

/** A closed dinner's supply as the Framelding badge's value line: "1B til salg, 8V på venteliste"; null with neither */
export const lockedSupply = (counts: ReleasedTicketCounts): string | null => {
    switch (supplyStateOf(counts)) {
        case SupplyStateEnum.FOR_SALE_AND_WAITLIST: return `${SUPPLY_WORDS.forSaleCount(counts)}, ${SUPPLY_WORDS.queuedCount(counts)}`
        case SupplyStateEnum.FOR_SALE: return SUPPLY_WORDS.forSaleCount(counts)
        case SupplyStateEnum.WAITLIST: return SUPPLY_WORDS.queuedCount(counts)
        case SupplyStateEnum.NONE: return null
    }
}

/** A closed dinner's tickets for sale as the guest rows' badge reads them: "1B til salg"; null with none for sale */
export const ticketsForSale = (counts: ReleasedTicketCounts): string | null => {
    switch (supplyStateOf(counts)) {
        case SupplyStateEnum.FOR_SALE_AND_WAITLIST:
        case SupplyStateEnum.FOR_SALE: return SUPPLY_WORDS.forSaleCount(counts)
        case SupplyStateEnum.WAITLIST:
        case SupplyStateEnum.NONE: return null
    }
}

/**
 * A closed dinner's supply in a sentence, the Framelding badge's help text and the booking form's alert:
 * "Lukket for framelding: 1 barn til salg, 8 voksne på ventelisten"; the closure alone with neither
 */
export const closedForCancellation = (counts: ReleasedTicketCounts): string => {
    const {closedText} = DEADLINE_LABELS.BOOKING_CLOSED
    const forSaleWords = BOOKING_WORDS.supply.forSale(TICKET_COUNTS.sentence.text(counts.byType))
    const queuedWords = BOOKING_WORDS.supply.onWaitlist(TICKET_COUNTS.sentence.text(counts.queuedByType))
    switch (supplyStateOf(counts)) {
        case SupplyStateEnum.FOR_SALE_AND_WAITLIST: return `${closedText}: ${forSaleWords}, ${queuedWords}`
        case SupplyStateEnum.FOR_SALE: return `${closedText}: ${forSaleWords}`
        case SupplyStateEnum.WAITLIST: return `${closedText}: ${queuedWords}`
        case SupplyStateEnum.NONE: return closedText
    }
}

/** The booking form's alert on a closed dinner: buy a ticket for sale, else join the waiting list; null with neither */
export const moreTicketsAlert = (counts: ReleasedTicketCounts): {icon: string, title: string, description: string} | null => {
    const title = BOOKING_WORDS.supply.moreTickets
    switch (supplyStateOf(counts)) {
        case SupplyStateEnum.FOR_SALE_AND_WAITLIST:
        case SupplyStateEnum.FOR_SALE: return {icon: ICONS.claim, title, description: closedForCancellation(counts)}
        case SupplyStateEnum.WAITLIST: return {icon: ICONS.waitlist, title, description: closedForCancellation(counts)}
        case SupplyStateEnum.NONE: return null
    }
}

// The closed Framelding badge's glyph and colour by the dinner's supply: the tickets for sale lead, a waiting list alone
// wears the queued order state, a dinner with neither reads closed
const FOR_SALE_BADGE = {icon: ICONS.released, color: COLOR.warning}
const CLOSED_BOOKING_BADGE: Record<SupplyState, Pick<DeadlineBadgeData, 'icon' | 'color'>> = {
    [SupplyStateEnum.FOR_SALE_AND_WAITLIST]: FOR_SALE_BADGE,
    [SupplyStateEnum.FOR_SALE]: FOR_SALE_BADGE,
    [SupplyStateEnum.WAITLIST]: {icon: ORDER_STATE_LABELS[TicketStateEnum.queued].icon, color: ORDER_STATE_LABELS[TicketStateEnum.queued].color},
    [SupplyStateEnum.NONE]: {icon: ICONS.lockClosed, color: COLOR.error}
}

/**
 * The Framelding badge: open while bookings can change; once closed, its look follows the dinner's supply
 * (`CLOSED_BOOKING_BADGE`), its value line the supply's words, else Lukket
 * @param isOpen - Whether booking is still open (canModifyOrders)
 * @param releasedCounts - The locked dinner's supply with its formatted breakdowns
 */
export const createBookingBadge = (isOpen: boolean, releasedCounts: ReleasedTicketCounts = EMPTY_RELEASED_TICKET_COUNTS): DeadlineBadgeData => {
    const {label, openText} = DEADLINE_LABELS.BOOKING_CLOSED
    if (isOpen) return {label, icon: ICONS.lockOpen, color: COLOR.success, value: BOOKING_WORDS.badge.open, helpText: openText}
    return {
        label,
        ...CLOSED_BOOKING_BADGE[supplyStateOf(releasedCounts)],
        value: lockedSupply(releasedCounts) ?? BOOKING_WORDS.badge.closed,
        helpText: closedForCancellation(releasedCounts)
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
            value: BOOKING_WORDS.badge.closesIn(countdown.formatted.toLowerCase()),
            helpText: DEADLINE_LABELS.DINING_MODE.openText
        }
    }
    return {
        label: DEADLINE_LABELS.DINING_MODE.label,
        icon: isOpen ? ICONS.lockOpen : ICONS.lockClosed,
        color: isOpen ? COLOR.success : COLOR.error,
        value: isOpen ? BOOKING_WORDS.badge.open : BOOKING_WORDS.badge.closed,
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

type LockChip = {color: NuxtUIColor, text?: string, icon?: string}
const forSaleChip = (supply: ReleasedTicketCounts): LockChip => ({color: BOOKING_LOCK_STATUS.lockedWithTickets.color, text: String(supply.total)})
const LOCK_CHIPS: Record<SupplyState, (supply: ReleasedTicketCounts) => LockChip> = {
    [SupplyStateEnum.FOR_SALE_AND_WAITLIST]: forSaleChip,
    [SupplyStateEnum.FOR_SALE]: forSaleChip,
    [SupplyStateEnum.WAITLIST]: () => ({...BOOKING_LOCK_STATUS.lockedWithQueue}),
    [SupplyStateEnum.NONE]: () => ({...BOOKING_LOCK_STATUS.locked})
}

/**
 * The lock chip of a dinner past its booking deadline: the tickets for sale as a number, else the waiting list's
 * hourglass, else the closed chip alone. A released ticket goes to the first waiting for its ticket type, so a dinner
 * can hold both; the chip then shows the tickets for sale.
 * Null without supply: the dinner is open for booking.
 */
export const lockChip = (supply: ReleasedTicketCounts | null | undefined): LockChip | null =>
    supply ? LOCK_CHIPS[supplyStateOf(supply)](supply) : null

const MODE_LABELS = BOOKING_WORDS.modes
/** The words of a dinner mode, once: DinnerModeSelector's glyph and label, and the mode a preview line names */
export const MODE_WORDS: Record<DinnerMode, {label: string, icon: string}> = {
    [DinnerModeEnum.DINEIN]: {label: MODE_LABELS[DinnerModeEnum.DINEIN], icon: ICONS.dinner},
    [DinnerModeEnum.DINEINLATE]: {label: MODE_LABELS[DinnerModeEnum.DINEINLATE], icon: ICONS.lateDinner},
    [DinnerModeEnum.TAKEAWAY]: {label: MODE_LABELS[DinnerModeEnum.TAKEAWAY], icon: ICONS.takeaway},
    [DinnerModeEnum.NONE]: {label: MODE_LABELS[DinnerModeEnum.NONE], icon: ICONS.noDinner}
}

/** What a preview line names after the person: the mode's word */
export type PreviewWords = {mode: string}

const {BookingActionSchema, BookingOutcomeSchema, TicketChangeKindSchema, TicketTypeSchema} = useBookingValidation()
const Action = BookingActionSchema.enum

const ACTION_TEXTS = BOOKING_WORDS.actions
/** The words of each booking action, once: the preview line's glyph and its words after the name, the toast's words after the count */
export const ACTION_WORDS: Record<BookingAction, {icon: string, preview: (words: PreviewWords) => string, toast: string}> = {
    [Action.BOOK]: {icon: ICONS.plusCircle, ...ACTION_TEXTS[Action.BOOK]},
    [Action.CANCEL]: {icon: ICONS.xMark, ...ACTION_TEXTS[Action.CANCEL]},
    [Action.RELEASE]: {icon: ICONS.released, ...ACTION_TEXTS[Action.RELEASE]},
    [Action.RECLAIM]: {icon: ICONS.undo, ...ACTION_TEXTS[Action.RECLAIM]},
    [Action.BUY]: {icon: ICONS.claim, ...ACTION_TEXTS[Action.BUY]},
    [Action.QUEUE]: {icon: ICONS.waitlist, ...ACTION_TEXTS[Action.QUEUE]},
    [Action.LEAVE]: {icon: ICONS.xMark, ...ACTION_TEXTS[Action.LEAVE]},
    [Action.REQUEUE]: {icon: ICONS.waitlist, ...ACTION_TEXTS[Action.REQUEUE]},
    [Action.CHANGE_PRICE]: {icon: ICONS.edit, ...ACTION_TEXTS[Action.CHANGE_PRICE]},
    [Action.CHANGE_MODE]: {icon: ICONS.edit, ...ACTION_TEXTS[Action.CHANGE_MODE]}
}

/**
 * The word of a ticket event in Billetændringer: the toast's word of its action; the admin's cancellation and the chef's
 * extra portions build on the cancellation's and the booking's; the close has its own
 */
export const ticketChangeWord = (change: TicketChangeKind): string => {
    const Kind = TicketChangeKindSchema.enum
    const {kinds} = BOOKING_WORDS.ticketChange
    switch (change) {
        case Kind.CLOSE: return kinds[Kind.CLOSE]
        case Kind.ADMIN_CANCEL: return kinds[Kind.ADMIN_CANCEL](ACTION_WORDS[Action.CANCEL].toast)
        case Kind.EXTRA_PORTIONS: return kinds[Kind.EXTRA_PORTIONS](ACTION_WORDS[Action.BOOK].toast)
        default: return ACTION_WORDS[change].toast
    }
}

/** The household a sale in Billetændringer bought from, after its tickets: "fra S_32" */
export const ticketChangeSeller = (seller: string): string => BOOKING_WORDS.ticketChange.seller(seller)

/** A chip per ticket type in a count, in the type's colour, written as the compact ticket counts write it ("1V") */
export const ticketChips = (counts: TicketCounts) => TicketTypeSchema.options
    .filter(type => counts[type] > 0)
    .map(type => ({type, color: ticketTypePresentation(type).color, text: TICKET_COUNTS.compact.text({[type]: counts[type]})}))

/** The chips of a ticket event: a ticket type change shows the tickets before it first, the close shows its word alone */
export const ticketEventChipRuns = (event: TicketEvent) => event.change === TicketChangeKindSchema.enum.CLOSE
    ? []
    : [...(event.from ? [ticketChips(event.from)] : []), ticketChips(event.tickets)]

/** Billetændringer's household: one by its short name; the system's line over several reads System, a user's the short names */
export const ticketChangeHouseholds = ({households, bySystem}: Pick<TicketChange, 'households' | 'bySystem'>): string =>
    households.length !== 1 && bySystem ? BOOKING_WORDS.ticketChange.bySystem : households.join(', ')

const SAVE_WORDS = BOOKING_WORDS.save
/** The booking form's save button words for each outcome */
export const OUTCOME_WORDS: Record<BookingOutcome, {save: string}> = {
    [Action.BOOK]: {save: SAVE_WORDS[Action.BOOK]},
    [Action.BUY]: {save: SAVE_WORDS[Action.BUY]},
    [Action.QUEUE]: {save: SAVE_WORDS[Action.QUEUE]},
    [Action.LEAVE]: {save: SAVE_WORDS[Action.LEAVE]},
    [Action.REQUEUE]: {save: SAVE_WORDS[Action.REQUEUE]},
    [Action.CHANGE_MODE]: {save: SAVE_WORDS[Action.CHANGE_MODE]}
}

/** An action that names a save by its effect on the supply; a mode change names none */
const supplyOutcomeOf = (action: BookingAction): BookingOutcome | undefined => {
    const parsed = BookingOutcomeSchema.safeParse(action)
    return parsed.success && parsed.data !== Action.CHANGE_MODE ? parsed.data : undefined
}

/** What the save does, read from its preview: the reply's first supply outcome; else a mode change */
export const previewSaveOutcome = (result: Pick<ScaffoldResult, 'results'>): BookingOutcome =>
    result.results.map(({action}) => supplyOutcomeOf(action)).find(outcome => outcome !== undefined) ?? Action.CHANGE_MODE

/** The save button's label for an outcome */
export const bookingSaveLabel = (outcome: BookingOutcome): string => OUTCOME_WORDS[outcome].save

/** The guest form's button names the guests; its preview lines name the guests per outcome */
export const guestSaveLabel = (count: number): string => BOOKING_WORDS.guests.save(count)

/** The look of a toast that reports a booking result: the ticket, red as soon as one order failed, green otherwise; a line per person */
export const scaffoldToastLook = (result: Pick<ScaffoldResult, 'errored'>) => ({
    color: result.errored > 0 ? COLOR.error : COLOR.success,
    icon: ICONS.ticket,
    ui: {description: COMPONENTS.bookingResult.lines}
})

/** A booker's guest tickets of one type, as the guest row badges them: "Barn", "Barn ×2"; the count alone when the type is gone */
export const guestTicketsLabel = (label: string | undefined, count: number): string =>
    [label, count > 1 ? BOOKING_WORDS.guests.count(count) : undefined].filter(Boolean).join(' ')

/** A booker's guests of one ticket type in a preview line or a toast line: "Gæst af Anna (Barn ×2)" */
const guestGroupName = (bookerName: string, ticketType: TicketType | null | undefined, count: number): string => {
    const tickets = guestTicketsLabel(ticketType ? ticketTypeLabel(ticketType) : undefined, count)
    const guests = useOrder().formatGuestLabel(bookerName)
    return tickets ? `${guests} (${tickets})` : guests
}

/** The person a result names: the inhabitant, or a booker's guests of one ticket type */
const personOf = ({inhabitantId, isGuestTicket, ticketType}: Pick<BookingResult, 'inhabitantId' | 'isGuestTicket' | 'ticketType'>): string =>
    isGuestTicket ? `${inhabitantId}:guest:${ticketType}` : `${inhabitantId}`

/** Places on the waiting list ascending, each in the line of its ticket type: "Voksen #3" */
const queuePlaces = (positions: QueuePosition[]): string[] =>
    [...positions].sort((a, b) => a.position - b.position).map(place => formatPlace(place.position, place.ticketType))

/** A line's queue places after its words: "2 på ventelisten (Voksen #3, Voksen #5)" */
const withPlaces = (text: string, places: string[]): string => places.length > 0 ? `${text} (${places.join(', ')})` : text

/** The order a result first names its people in: the sort is stable, so equal lines keep the order of their rows */
const asFirstNamed = (): number => 0

const CONFLICT_WORDS: Partial<Record<BookingAction, string>> = BOOKING_WORDS.result.conflict
const conflictWordsOf = ({reason, action}: Pick<BookingResult, 'reason' | 'action'>): string | undefined =>
    reason === BookingFailureEnum.CONFLICT ? CONFLICT_WORDS[action] : undefined

/**
 * A booking result in lines, for the toast and the "Sidste ændring" alerts: each person, and a booker's guests of one
 * ticket type with the most of them at one dinner, in the order the result first names them; the counts in the order
 * of the actions with the queue places ascending, then a refused leave or change of a place being assigned, and the
 * failed orders last. Then the tickets sold to the waiting list, the unchanged orders, and a household whose run failed
 * as a whole, which the result counts without a person
 */
export const formatBookingResult = (result: ScaffoldResult): string => {
    const byGroup = groupBy<BookingResult, string>(personOf)
    const landedBy = byGroup(result.results)
    const failedBy = byGroup(result.failed)
    const placesBy = groupBy<QueuePosition, string>(personOf)(result.positions)
    const {failed: failedWords, unchanged, householdFailed, nothingChanged} = BOOKING_WORDS.result

    const groupLines = linesBy<BookingResult, string, string>(personOf, (items, group) => {
        const {inhabitantName, isGuestTicket, ticketType} = items[0]!
        const guestsAtOneDinner = Math.max(...Array.from(groupBy<BookingResult, number>(item => item.dinnerEventId)(items).values(), orders => orders.length))
        const landed = landedBy.get(group) ?? []
        const places = queuePlaces(placesBy.get(group) ?? [])
        const counts = BookingActionSchema.options
            .map(action => ({action, count: landed.filter(item => item.action === action).length}))
            .filter(({count}) => count > 0)
            .map(({action, count}) => withPlaces(`${count} ${ACTION_WORDS[action].toast}`, action === Action.QUEUE ? places : []))
        const failedItems = failedBy.get(group) ?? []
        const conflicts = [...new Set(failedItems.map(conflictWordsOf).filter((words): words is string => words !== undefined))]
        const failed = failedItems.filter(item => conflictWordsOf(item) === undefined).length
        const parts = [...counts, ...conflicts, ...(failed > 0 ? [failedWords(failed)] : [])]
        return `${isGuestTicket ? guestGroupName(inhabitantName, ticketType, guestsAtOneDinner) : inhabitantName}: ${parts.join(', ')}`
    }, asFirstNamed)([...result.results, ...result.failed])
    const sold = result.outcomes.waitlistTicketsSold.length
    const householdLines = [
        {count: sold, line: `${BOOKING_WORDS.ticketCount(sold)} ${BOOKING_WORDS.waitlistSale.toast}`},
        {count: result.unchanged, line: unchanged(result.unchanged)},
        {count: result.errored - result.failed.length, line: householdFailed}
    ].filter(({count}) => count > 0).map(({line}) => line)

    const lines = [...groupLines, ...householdLines]
    return lines.length > 0 ? lines.join('\n') : nothingChanged
}

/** A place on the waiting list of a sold-out dinner, in the line of its ticket type, rendered compact beside the name */
export const createWaitlistBadge = (position: number, ticketType?: TicketType | null): DeadlineBadgeData => ({
    label: BOOKING_WORDS.waitlistBadge.label,
    icon: ORDER_STATE_LABELS.queued.icon,
    color: ORDER_STATE_LABELS.queued.color,
    value: formatPlace(position, ticketType),
    helpText: BOOKING_WORDS.waitlistBadge.helpText
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

/** A dinner's lines in the preview, under the separator that names its weekday and date ("to 22/10/2026") */
export interface ActionPreviewDay {
    dinnerEventId: number
    date: Date
    label: string
    lines: ActionPreviewItem[]
}

const previewDayLabel = (date: Date): string => `${formatDate(date, 'EEEEEE')} ${formatDate(date)}`

// Each action's colour is the colour of the order state it leads to
const ACTION_TO_STATE = {
    [Action.BOOK]: OrderStateEnum.BOOKED,
    [Action.BUY]: TicketStateEnum.claimed,
    [Action.QUEUE]: TicketStateEnum.claimed,
    [Action.LEAVE]: OrderStateEnum.CANCELLED,
    [Action.REQUEUE]: TicketStateEnum.claimed,
    [Action.CANCEL]: OrderStateEnum.CANCELLED,
    [Action.RELEASE]: OrderStateEnum.RELEASED,
    [Action.RECLAIM]: OrderStateEnum.BOOKED,
    [Action.CHANGE_MODE]: OrderStateEnum.CLOSED,
    [Action.CHANGE_PRICE]: OrderStateEnum.CLOSED
} as const

const previewItem = (name: string, action: BookingAction, words: string, places: string[] = []): ActionPreviewItem => ({
    name,
    action,
    icon: ACTION_WORDS[action].icon,
    color: ORDER_STATE_LABELS[ACTION_TO_STATE[action]].color,
    text: withPlaces(`${name} ${words}`, places)
})

/** A row of a preview day: one order's result, or one ticket sold to the waiting list */
type PreviewRow = {dinnerEventId: number} & ({result: BookingResult} | {sale: TicketSale})

/**
 * The preview's days: a day per dinner, ascending. Within a day a line per action in the word table's order, then per
 * person in the household's order, a booker's guests after the booker; a person outside that order keeps the place the
 * results first give them. A booker's guests of one ticket type are one group, counted as the guest row counts them.
 * A queue line carries its places on the dinner; the tickets sold to the waiting list close their day in one line
 */
const previewLines = (
    rows: BookingResult[],
    dinnerEvents: Pick<DinnerEventDisplay, 'id' | 'date'>[],
    positions: QueuePosition[] = [],
    waitlistTicketsSold: TicketSale[] = [],
    householdOrder: number[] = []
): ActionPreviewDay[] => {
    const dateById = new Map(dinnerEvents.map(({id, date}) => [id, date]))
    const wordsOf = (row: BookingResult) => ACTION_WORDS[row.action].preview({mode: MODE_WORDS[row.dinnerMode].label})
    const placeKey = (place: Pick<QueuePosition, 'inhabitantId' | 'isGuestTicket' | 'ticketType' | 'dinnerEventId'>) => `${personOf(place)}:${place.dinnerEventId}`
    const placesBy = groupBy<QueuePosition, string>(placeKey)(positions)
    const personRank = ({inhabitantId}: BookingResult) => {
        const rank = householdOrder.indexOf(inhabitantId)
        return rank === -1 ? householdOrder.length : rank
    }

    type RankedLine = {row: BookingResult, item: ActionPreviewItem}
    const linesOfDay = linesBy<BookingResult, RankedLine, string>(
        row => `${row.action}:${personOf(row)}`,
        (results) => {
            const row = results[0]!
            const name = row.isGuestTicket ? guestGroupName(row.inhabitantName, row.ticketType, results.length) : row.inhabitantName
            const places = row.action === Action.QUEUE ? queuePlaces(placesBy.get(placeKey(row)) ?? []) : []
            return {row, item: previewItem(name, row.action, wordsOf(row), places)}
        },
        (a, b) => BookingActionSchema.options.indexOf(a.row.action) - BookingActionSchema.options.indexOf(b.row.action)
            || personRank(a.row) - personRank(b.row)
            || Number(a.row.isGuestTicket) - Number(b.row.isGuestTicket)
    )

    const saleLine = (sold: number): ActionPreviewItem[] =>
        sold > 0 ? [previewItem(BOOKING_WORDS.ticketCount(sold), Action.BUY, BOOKING_WORDS.waitlistSale.preview)] : []

    const days = linesBy<PreviewRow, ActionPreviewDay, number>(
        row => row.dinnerEventId,
        (dayRows, dinnerEventId) => {
            const date = dateById.get(dinnerEventId)!
            const results = dayRows.flatMap(row => 'result' in row ? [row.result] : [])
            return {
                dinnerEventId,
                date,
                label: previewDayLabel(date),
                lines: [...linesOfDay(results).map(({item}) => item), ...saleLine(dayRows.length - results.length)]
            }
        },
        (a, b) => compareAsc(a.date, b.date)
    )
    // A day shows under its dinner's date: a dinner outside the dinners given has none
    return days([
        ...rows.map(result => ({dinnerEventId: result.dinnerEventId, result})),
        ...waitlistTicketsSold.map(sale => ({dinnerEventId: sale.dinnerEventId, sale}))
    ].filter(row => dateById.has(row.dinnerEventId)))
}

/**
 * A booking's result as the preview reads it, a day per dinner; `householdOrder` (inhabitant ids) orders the people
 * within a day
 */
export const formatPreviewLines = (
    result: Pick<ScaffoldResult, 'results' | 'positions' | 'outcomes'>,
    dinnerEvents: Pick<DinnerEventDisplay, 'id' | 'date'>[],
    householdOrder: number[] = []
): ActionPreviewDay[] => previewLines(result.results, dinnerEvents, result.positions, result.outcomes.waitlistTicketsSold, householdOrder)

/** A person's own cell on a dinner: the key of a grid cell's draft and of its expected booking */
export const expectedBookingKey = (inhabitantId: number, dinnerEventId: number): string => `${inhabitantId}-${dinnerEventId}`

/**
 * The bookings a dry run with no orders expects for the people's own cells: the eating mode the scaffold will book;
 * a person it leaves out, or books Ingen, has none
 */
export const expectedBookings = (result: Pick<ScaffoldResult, 'results'> | null): Map<string, DinnerMode> => new Map(
    (result?.results ?? [])
        .filter(({isGuestTicket, dinnerMode}) => !isGuestTicket && dinnerMode !== DinnerModeEnum.NONE)
        .map(({inhabitantId, dinnerEventId, dinnerMode}) => [expectedBookingKey(inhabitantId, dinnerEventId), dinnerMode])
)

// A grid draft changes cell by cell; its preview reads once the clicks rest
const PREVIEW_DEBOUNCE_MS = 400

/**
 * The server's dry run of a request, read component-local (ADR-007): on mount and on every change of the request while
 * one stands, after the last change when `debounced`, and again on a change of `refreshOn`. `result` answers the request
 * standing now, `pending` holds from the change until its reply lands; a null request reads nothing
 */
export const useScaffoldPreview = <Request>(
    request: () => Request | null,
    read: (request: Request) => Promise<ScaffoldResult>,
    {debounced = false, refreshOn = []}: {debounced?: boolean, refreshOn?: WatchSource[]} = {}
) => {
    const keyOf = (value: Request | null): string | null => value === null ? null : JSON.stringify(value)
    const requested = computed(() => keyOf(request()))
    const sent = shallowRef<Request | null>(request())
    const sentKey = computed(() => keyOf(sent.value))

    watch(requested, (_key, _previous, onCleanup) => {
        const next = request()
        if (!debounced || next === null) {
            sent.value = next
            return
        }
        const timer = setTimeout(() => {
            sent.value = next
        }, PREVIEW_DEBOUNCE_MS)
        onCleanup(() => clearTimeout(timer))
    })

    const {data, status, execute} = useAsyncData(
        `scaffold-preview-${useId()}`,
        () => sent.value === null ? Promise.resolve(null) : read(sent.value),
        {server: false, immediate: false, default: () => null, watch: [sentKey, ...refreshOn], enabled: () => sent.value !== null}
    )
    onMounted(() => {
        if (sent.value !== null) execute()
    })

    const isAnswered = computed(() => requested.value !== null && requested.value === sentKey.value)
    return {
        result: computed(() => isAnswered.value && status.value === 'success' ? data.value : null),
        pending: computed(() => requested.value !== null && (!isAnswered.value || status.value === 'pending'))
    }
}

export const useBookingUi = () => {
    const {DinnerStateSchema} = useBookingValidation()
    const DinnerState = DinnerStateSchema.enum
    const {formatGuestLabel} = useOrder()
    const {getCookingDeadlineThresholds} = useSeason()

    type FormattableOrder = Pick<OrderDisplay, 'state' | 'dinnerMode' | 'provenanceHousehold' | 'isGuestTicket'>
    // A ticket that is neither released nor bought reads its order's own state
    const orderLabel = (order: FormattableOrder): OrderDisplayConfig => {
        switch (ticketStateOf(order)) {
            case TicketStateEnum.released: return ORDER_STATE_LABELS[OrderStateEnum.RELEASED]
            case TicketStateEnum.claimed: return ORDER_STATE_LABELS[TicketStateEnum.claimed]
            case TicketStateEnum.queued: return ORDER_STATE_LABELS[TicketStateEnum.queued]
            case TicketStateEnum.normal: return ORDER_STATE_LABELS[order.state]
        }
    }

    const formatOrder = (order: FormattableOrder, bookerName?: string): FormattedOrder => {
        const shown = orderLabel(order)
        return {
            guest: order.isGuestTicket ? {label: formatGuestLabel(bookerName), color: COLOR.info, icon: ICONS.userPlus} : null,
            stateText: shown.label,
            stateColor: shown.color,
            stateIcon: shown.icon
        }
    }

    // A billed line reads closed, or released when its order closed with Ingen; a snapshot without the mode reads closed
    const formatCostLine = (line: CostLineOrder): FormattedOrder => formatOrder({
        state: line.state ?? OrderStateEnum.CLOSED,
        dinnerMode: line.dinnerMode ?? DinnerModeEnum.DINEIN,
        provenanceHousehold: line.provenanceHousehold ?? undefined,
        isGuestTicket: line.isGuestTicket ?? false
    })

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
        guestSaveLabel,
        createChefBadges,
        // Order badges
        formatOrder,
        formatCostLine
    }
}
