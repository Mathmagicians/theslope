/**
 * The booking status sender event: the waiting-list notifications, ticket sold and ticket bought. The booking steps
 * return their outcomes and the caller hands them here after the action; the nightly run reads what the dinners past
 * their booking deadline owe as they stand. A notification about an inhabitant goes to the inhabitant's closest user
 * (findClosestUserInHousehold), the waitlist buildup to the chef's. The dinners and people the notifications name are
 * read once per kind (ADR-014); the delivery step (deliveries.ts) sends each once per subject, version, notification,
 * channel and user. The booking emails flag (SHOULD_SEND_BOOKING_EMAILS_FLAG) off, a run sends and records nothing.
 */
import {siteUrl} from '~~/server/utils/sender/compose'
import {shouldSendBookingEmails, type EmailChannel} from '~~/server/utils/sender/config'
import {deliverDesired, type DeliveryOptions, type DeliveryResult, type DesiredOutgoing} from '~~/server/utils/sender/deliveries'
import type {NotificationConfig} from '~/composables/useNotificationValidation'
import {
    useBookingValidation, DinnerState, OrderState, type BookingAction, type BookingOutcomes, type DinnerMode,
    type OrderAudit, type OrderDisplay, type OrderHistoryDisplay, type TicketSale, type WaitlistJoined
} from '~/composables/useBookingValidation'
import type {TicketWaitlistDisplay, WaitlistAssignmentResult} from '~/composables/useWaitlistValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {HouseholdDisplay, InhabitantDisplay, UserDisplay} from '~/composables/useCoreValidation'
import type {Season} from '~/composables/useSeasonValidation'
import {useDeliveryValidation, type Delivery} from '~/composables/useDeliveryValidation'
import type {NotificationChannel} from '~/composables/useUserPreferenceValidation'
import {useWaitlist} from '~/composables/useWaitlist'
import {formatPlace, useBooking} from '~/composables/useBooking'
import {useOrder} from '~/composables/useOrder'
import {useSeason} from '~/composables/useSeason'
import {ticketTypeLabel, useTicket} from '~/composables/useTicket'
import {TICKET_COUNTS} from '~/composables/useBilling'
import {BOOKING_WORDS} from '~/config/bookingWords'
import {NotificationKind, WAITLIST_BUYER} from '~/config/notificationTemplates'
import {fetchHouseholdsByIds, fetchInhabitantsByIds, fetchSeason, fetchUsersByIds} from '~~/server/data/prismaRepository'
import {fetchDeliveries, fetchDinnerEvents, fetchDinnerEventsByIds, fetchOrderHistoryForDinners, fetchOrders} from '~~/server/data/financesRepository'
import {fetchWaitlistForDinners} from '~~/server/data/waitlistRepository'
import {dinnerForWaitlist, type DinnerForWaitlist} from '~~/server/utils/waitlistAssignment'
import {formatDate} from '~/utils/date'
import {formatPortions} from '~/utils/utils'
import {groupBy} from '~/utils/batchUtils'

const {BookingActionSchema, OrderAuditChangeSchema, OrderAuditSourceSchema, readOrderAudit} = useBookingValidation()
const {DeliverySubjectSchema, SenderEventSchema} = useDeliveryValidation()
const Action = BookingActionSchema.enum
const Change = OrderAuditChangeSchema.enum
const Source = OrderAuditSourceSchema.enum
const Subject = DeliverySubjectSchema.enum
const {BOOKING_STATUS} = SenderEventSchema.enum

const LOG = `📮 > SENDER > [EVENT ${BOOKING_STATUS}]`

const nothingSent = (): DeliveryResult => ({counts: {sent: 0}})

// The booking is saved before its notifications go: the delivery step logs a failure, and the caller gets nothing sent
const neverThrows = <A extends unknown[]>(notify: (...args: A) => Promise<DeliveryResult>) =>
    (...args: A): Promise<DeliveryResult> => notify(...args).catch(nothingSent)

// The booking emails flag off, a run sends and records nothing; a delivery dry run counts on
const bookingEmailsOff = (dryRun?: boolean): boolean => {
    if (dryRun || shouldSendBookingEmails()) return false
    console.info(`${LOG} SHOULD_SEND_BOOKING_EMAILS_FLAG is off: no booking notifications sent`)
    return true
}

export interface WaitlistDinnerContext {
    dinnerEventId: number
    date: Date
    menuTitle: string
}

// The notification names the dinner by its date and menu
const dinnerLabel = ({date, menuTitle}: WaitlistDinnerContext): string => `${formatDate(date)} · ${menuTitle}`

/**
 * A booking notification resolved for its user: the address and the user it goes to (null where the records name
 * none), the name it greets, the dinner
 */
interface ResolvedNotification {
    to: string | null
    userId: number | null
    name: string
    dinner: WaitlistDinnerContext
}

/** A ticket's notification: the inhabitant the ticket is for and the ticket line of the booking page */
interface TicketNotification extends ResolvedNotification {
    person: string
    ticket: string
}

/** The booking notifications of one operation with users and words resolved; each carries what its caller tracks it by */
interface BookingNotifications<Tracked = object> {
    joined: (TicketNotification & {place: string} & Tracked)[]
    buildups: (ResolvedNotification & {queued: string, entries: number, portions: number} & Tracked)[]
    sold: (ResolvedNotification & {buyer: string, ticket: string} & Tracked)[]
    assigned: (TicketNotification & Tracked)[]
    bought: (TicketNotification & Tracked)[]
    extraPortions: (TicketNotification & Tracked)[]
}

// A notification of its kind with the values its template reads from the channel's config
type Pending<Notification extends ResolvedNotification> = Notification & {kind: NotificationKind, values: (config: NotificationConfig) => Record<string, string>}

const pending = <Notification extends ResolvedNotification>(kind: NotificationKind, values: (notification: Notification, config: NotificationConfig) => Record<string, string>) =>
    <Tracked extends Notification>(notification: Tracked): Pending<Tracked> => ({...notification, kind, values: (config: NotificationConfig) => values(notification, config)})

// The composables build once per batch, not once per notification
const pendingOf = <Tracked extends object>(notifications: BookingNotifications<Tracked>): Pending<ResolvedNotification & Tracked>[] => {
    const {buildDinnerUrl} = useBooking()
    const bookingUrl = (config: NotificationConfig, {date}: WaitlistDinnerContext): string => buildDinnerUrl(siteUrl(config, ''), date)
    // The inhabitant's ticket in the words of the booking toast: "Emil: 1 købt"
    const ticketValues = (action: BookingAction) => (notification: TicketNotification, config: NotificationConfig): Record<string, string> => ({
        name: notification.name, person: notification.person, dinner: dinnerLabel(notification.dinner), action: BOOKING_WORDS.actions[action].toast,
        ticket: notification.ticket, bookingUrl: bookingUrl(config, notification.dinner)
    })
    return [
        ...notifications.joined.map(pending<BookingNotifications['joined'][number]>(NotificationKind.WAITLIST_JOINED, (notification, config) => ({
            ...ticketValues(Action.QUEUE)(notification, config), place: notification.place, helpText: BOOKING_WORDS.waitlistBadge.helpText,
            payment: BOOKING_WORDS.supply.waitlistPayment
        }))),
        ...notifications.buildups.map(pending<BookingNotifications['buildups'][number]>(NotificationKind.WAITLIST_BUILDUP, (notification, config) => ({
            name: notification.name, dinner: dinnerLabel(notification.dinner), queued: BOOKING_WORDS.supply.queued(notification.queued),
            portions: formatPortions(notification.portions), ask: BOOKING_WORDS.supply.chefAsk(notification.entries), dinnerUrl: siteUrl(config, '/chef')
        }))),
        ...notifications.sold.map(pending<BookingNotifications['sold'][number]>(NotificationKind.TICKET_SOLD, (notification, config) => ({
            name: notification.name, dinner: dinnerLabel(notification.dinner), tickets: BOOKING_WORDS.ticketCount(1), buyer: notification.buyer,
            ticket: notification.ticket, bookingUrl: bookingUrl(config, notification.dinner)
        }))),
        ...notifications.assigned.map(pending(NotificationKind.WAITLIST_TICKET_ASSIGNED, ticketValues(Action.BUY))),
        ...notifications.bought.map(pending(NotificationKind.TICKET_BOUGHT, ticketValues(Action.BUY))),
        ...notifications.extraPortions.map(pending(NotificationKind.WAITLIST_EXTRA_PORTION, ticketValues(Action.BOOK)))
    ]
}

/** What a notification is about, as its Delivery row names it */
interface NotificationSubject {
    subjectType: Delivery['subjectType']
    subjectId: number
}

type Tracked = {subject: NotificationSubject, notificationChannels: NotificationChannel[]}

const isExtraPortionRow = (audit: OrderAudit): boolean => audit.change === Change.BOOK && audit.source === Source['waitlist-assignment']
// The rows that owe an order a notification: the chef's extra portion that created it, and each sale of it
const owesOrderNotification = (audit: OrderAudit): boolean => audit.change === Change.BUY || isExtraPortionRow(audit)

const auditedRows = (history: OrderHistoryDisplay[]): {row: OrderHistoryDisplay, audit: OrderAudit}[] =>
    history.flatMap(row => {
        const audit = readOrderAudit(row)
        return audit ? [{row, audit}] : []
    })

/**
 * A subject's version counts up from 1, one step per history row that owes it a notification: a place its join, an
 * order the extra portion that created it and each sale, a dinner its first buildup and each extra portion after that
 * buildup
 */
const versionsOf = (history: OrderHistoryDisplay[], deliveries: Delivery[]) => {
    const audited = auditedRows(history)
    const orderSteps = new Map<number, number>()
    for (const {row, audit} of audited) {
        const orderId = row.orderId ?? audit.orderId
        if (orderId !== null && owesOrderNotification(audit)) orderSteps.set(orderId, (orderSteps.get(orderId) ?? 0) + 1)
    }
    const firstBuildup = new Map<number, number>()
    for (const row of deliveries.filter(delivery => delivery.subjectType === Subject.DINNER_EVENT)) {
        firstBuildup.set(row.subjectId, Math.min(firstBuildup.get(row.subjectId) ?? Infinity, row.deliveredAt.getTime()))
    }
    const extraPortionsSince = (dinnerEventId: number, since: number): number => audited
        .filter(({row, audit}) => row.dinnerEventId === dinnerEventId && isExtraPortionRow(audit) && row.timestamp.getTime() > since).length
    return ({subjectType, subjectId}: NotificationSubject): number => {
        switch (subjectType) {
            case Subject.ORDER:
                return Math.max(1, orderSteps.get(subjectId) ?? 0)
            case Subject.DINNER_EVENT: {
                const since = firstBuildup.get(subjectId)
                return since === undefined ? 1 : 1 + extraPortionsSince(subjectId, since)
            }
            default:
                return 1
        }
    }
}

// The ids named, once each
const idsOf = (ids: (number | null | undefined)[]): number[] => [...new Set(ids.filter((id): id is number => !!id))]

/** A place on a dinner's waiting list, as its join notification reads it */
type JoinOwed = Omit<WaitlistJoined, 'bookedByUserId' | 'queueSize' | 'portionNeed' | 'queuedByType'>

/** A dinner's line at the buildup threshold: its size by ticket type and the portions it needs */
interface BuildupOwed {
    dinnerEventId: number
    entries: number
    portions: number
    queuedByType: WaitlistJoined['queuedByType']
}

/** A sale's notifications name the buyer by inhabitant; the buyer's household comes with the inhabitant */
type SaleOwed = Omit<TicketSale, 'buyerHouseholdId'>

type PortionOwed = Omit<BookingOutcomes['waitlistPortionsAssigned'][number], 'entryId' | 'portions'>

/** The notifications one operation owes, by the outcome each comes from */
interface OwedNotifications {
    joined: JoinOwed[]
    buildups: BuildupOwed[]
    ticketsSold: SaleOwed[]
    waitlistTicketsSold: SaleOwed[]
    waitlistPortionsAssigned: PortionOwed[]
}

/** Every dinner, household, inhabitant and user the notifications of one operation name, by id */
interface NotificationRecords {
    dinners: Map<number, DinnerForWaitlist>
    households: Map<number, HouseholdDisplay>
    inhabitants: Map<number, InhabitantDisplay>
    users: Map<number, UserDisplay>
}

// The rows of the ids named, in one read; a kind no notification names is not read
const readNamed = async <T extends {id: number}>(
    d1Client: D1Database, ids: (number | null | undefined)[], read: (d1Client: D1Database, ids: number[]) => Promise<T[]>
): Promise<Map<number, T>> => {
    const named = idsOf(ids)
    return new Map((named.length === 0 ? [] : await read(d1Client, named)).map(row => [row.id, row]))
}

// The dinners in one read and the ticket prices of their seasons, one season read after another
const loadDinners = async (d1Client: D1Database, dinnerEventIds: number[]): Promise<Map<number, DinnerForWaitlist>> => {
    const dinners = await readNamed(d1Client, dinnerEventIds, fetchDinnerEventsByIds)
    const seasons = new Map<number, Season | null>()
    for (const seasonId of idsOf([...dinners.values()].map(dinner => dinner.seasonId))) seasons.set(seasonId, await fetchSeason(d1Client, seasonId))
    return new Map(idsOf(dinnerEventIds).map(id => {
        const dinner = dinners.get(id)
        if (!dinner) throw new Error(`${LOG} Dinner ${id} not found`)
        return [id, dinnerForWaitlist(dinner, dinner.seasonId ? seasons.get(dinner.seasonId) : null)]
    }))
}

// Every dinner, inhabitant, household and user the notifications name, read before they compose: the chefs come with
// their dinners, the households of the inhabitants with their members
const load = async (d1Client: D1Database, owed: OwedNotifications): Promise<NotificationRecords> => {
    const sales = [...owed.ticketsSold, ...owed.waitlistTicketsSold]
    const dinners = await loadDinners(d1Client, [...owed.joined, ...owed.buildups, ...sales, ...owed.waitlistPortionsAssigned].map(outcome => outcome.dinnerEventId))
    const inhabitants = await readNamed(d1Client, [
        ...owed.joined.map(event => event.inhabitantId),
        ...sales.flatMap(sale => [sale.buyerInhabitantId, sale.sellerInhabitantId]),
        ...owed.waitlistPortionsAssigned.map(portion => portion.inhabitantId),
        ...owed.buildups.map(buildup => dinners.get(buildup.dinnerEventId)?.chefId)
    ], fetchInhabitantsByIds)
    const households = await readNamed(d1Client, [
        ...[...inhabitants.values()].map(inhabitant => inhabitant.householdId),
        ...sales.map(sale => sale.sellerHouseholdId)
    ], fetchHouseholdsByIds)
    const users = await readNamed(d1Client, [
        ...[...inhabitants.values(), ...[...households.values()].flatMap(household => household.inhabitants)].map(inhabitant => inhabitant.userId)
    ], fetchUsersByIds)
    return {dinners, households, inhabitants, users}
}

type Recipient = Pick<ResolvedNotification, 'to' | 'userId' | 'name'> & Pick<Tracked, 'notificationChannels'>

// The notifications composed from the records of their operation
const composer = ({dinners, households, inhabitants, users}: NotificationRecords) => {
    const {formatGuestLabel} = useOrder()
    const {formatPrice} = useTicket()
    const dinnerOf = (dinnerEventId: number): DinnerForWaitlist => dinners.get(dinnerEventId)!
    const shortnameOf = (householdId: number | undefined): string => (householdId && households.get(householdId)?.shortName) || `#${householdId}`
    // The member's user hears on its own channels; the notification greets the member
    const recipientOf = (member: Pick<InhabitantDisplay, 'name' | 'userId'> | undefined): Recipient => {
        const user = member?.userId ? users.get(member.userId) : undefined
        return {to: user?.email ?? null, userId: user?.id ?? null, name: member?.name ?? '', notificationChannels: user?.notificationChannels ?? []}
    }
    // A household's first user: its member of the lowest id with a user, whatever order the read lists them in
    const firstUserOf = (householdId: number | undefined) => householdId === undefined ? undefined : (households.get(householdId)?.inhabitants ?? [])
        .filter(member => member.userId)
        .sort((a, b) => a.id - b.id)[0]
    /** An inhabitant's closest user: the inhabitant's own user, else the first user of the inhabitant's household */
    const findClosestUserInHousehold = (inhabitantId: number | null, householdId?: number): Recipient => {
        const inhabitant = inhabitantId === null ? undefined : inhabitants.get(inhabitantId)
        return recipientOf(inhabitant?.userId ? inhabitant : firstUserOf(inhabitant?.householdId ?? householdId))
    }
    const personOf = (inhabitantId: number, isGuestTicket: boolean): string => {
        const name = inhabitants.get(inhabitantId)?.name ?? ''
        return isGuestTicket ? formatGuestLabel(name) : name
    }
    // The ticket line of the booking page: "Barn · 35 kr · Spisesal · fra AR_1"
    const ticketLine = (ticketPrices: TicketPrice[], ticketPriceId: number | null, dinnerMode?: DinnerMode, seller?: string): string => {
        const price = ticketPrices.find(candidate => candidate.id === ticketPriceId)
        return [
            price && BOOKING_WORDS.ticketPrice.label(ticketTypeLabel(price.ticketType), formatPrice(price.price)),
            dinnerMode && BOOKING_WORDS.modes[dinnerMode],
            seller && BOOKING_WORDS.ticketChange.seller(seller)
        ].filter(Boolean).join(' · ')
    }
    const orderSubject = (orderId: number): NotificationSubject => ({subjectType: Subject.ORDER, subjectId: orderId})

    const joinedNotification = (event: JoinOwed): BookingNotifications<Tracked>['joined'][number] => {
        const {context, ticketPrices} = dinnerOf(event.dinnerEventId)
        return {
            ...findClosestUserInHousehold(event.inhabitantId), dinner: context, person: personOf(event.inhabitantId, event.isGuestTicket),
            place: formatPlace(event.position, event.ticketType), ticket: ticketLine(ticketPrices, event.ticketPriceId, event.dinnerMode),
            subject: {subjectType: Subject.TICKET_WAITLIST, subjectId: event.entryId}
        }
    }
    const buildupNotifications = (buildup: BuildupOwed): BookingNotifications<Tracked>['buildups'] => {
        const {chefId, context} = dinnerOf(buildup.dinnerEventId)
        if (!chefId) return []
        return [{
            ...findClosestUserInHousehold(chefId), dinner: context, queued: TICKET_COUNTS.compact.text(buildup.queuedByType), entries: buildup.entries,
            portions: buildup.portions, subject: {subjectType: Subject.DINNER_EVENT, subjectId: buildup.dinnerEventId}
        }]
    }
    // The seller's closest user hears, the selling household's first user when the history names no seller
    const soldNotification = (buyer: (sale: SaleOwed) => string) => (sale: SaleOwed): BookingNotifications<Tracked>['sold'][number] => {
        const {context, ticketPrices} = dinnerOf(sale.dinnerEventId)
        return {
            ...findClosestUserInHousehold(sale.sellerInhabitantId, sale.sellerHouseholdId), dinner: context, buyer: buyer(sale),
            ticket: ticketLine(ticketPrices, sale.ticketPriceId), subject: orderSubject(sale.orderId)
        }
    }
    const ticketNotification = (sale: SaleOwed): BookingNotifications<Tracked>['assigned'][number] => {
        const {context, ticketPrices} = dinnerOf(sale.dinnerEventId)
        return {
            ...findClosestUserInHousehold(sale.buyerInhabitantId), dinner: context, person: personOf(sale.buyerInhabitantId, sale.isGuestTicket),
            ticket: ticketLine(ticketPrices, sale.ticketPriceId, sale.dinnerMode, shortnameOf(sale.sellerHouseholdId)), subject: orderSubject(sale.orderId)
        }
    }
    const extraPortionNotification = (portion: PortionOwed): BookingNotifications<Tracked>['extraPortions'][number] => {
        const {context, ticketPrices} = dinnerOf(portion.dinnerEventId)
        return {
            ...findClosestUserInHousehold(portion.inhabitantId), dinner: context, person: personOf(portion.inhabitantId, portion.isGuestTicket),
            ticket: ticketLine(ticketPrices, portion.ticketPriceId, portion.dinnerMode), subject: orderSubject(portion.orderId)
        }
    }
    const buyerHousehold = (sale: SaleOwed): string => shortnameOf(inhabitants.get(sale.buyerInhabitantId)?.householdId)

    return (owed: OwedNotifications): BookingNotifications<Tracked> => ({
        joined: owed.joined.map(joinedNotification),
        buildups: owed.buildups.flatMap(buildupNotifications),
        sold: [...owed.ticketsSold.map(soldNotification(buyerHousehold)), ...owed.waitlistTicketsSold.map(soldNotification(() => WAITLIST_BUYER))],
        assigned: owed.waitlistTicketsSold.map(ticketNotification),
        bought: owed.ticketsSold.map(ticketNotification),
        extraPortions: owed.waitlistPortionsAssigned.map(extraPortionNotification)
    })
}

// A dinner's version counts from the delivery record of its first buildup
const buildupDeliveries = async (d1Client: D1Database, notifications: Pending<ResolvedNotification & Tracked>[]): Promise<Delivery[]> => {
    const dinnerEventIds = idsOf(notifications.map(({subject}) => subject.subjectType === Subject.DINNER_EVENT ? subject.subjectId : null))
    return dinnerEventIds.length === 0 ? [] : fetchDeliveries(d1Client, Subject.DINNER_EVENT, dinnerEventIds)
}

// The notifications an operation owes, resolved and versioned for the delivery step; an order's and a dinner's versions
// read their history
const desiredOf = async (d1Client: D1Database, owed: OwedNotifications, history?: OrderHistoryDisplay[]): Promise<DesiredOutgoing[]> => {
    const notifications = pendingOf(composer(await load(d1Client, owed))(owed))
    const versioned = idsOf([...owed.buildups, ...owed.ticketsSold, ...owed.waitlistTicketsSold, ...owed.waitlistPortionsAssigned].map(outcome => outcome.dinnerEventId))
    const rows = history ?? (versioned.length === 0 ? [] : await fetchOrderHistoryForDinners(d1Client, versioned))
    const versionOf = versionsOf(rows, await buildupDeliveries(d1Client, notifications))
    return notifications.flatMap(notification => {
        const {to, userId} = notification
        if (to === null || userId === null) return []
        return [{
            ...notification.subject, version: versionOf(notification.subject), notification: notification.kind, userId, to,
            notificationChannels: notification.notificationChannels, values: notification.values,
            correlationId: `dinner ${notification.dinner.dinnerEventId}`
        }]
    })
}

// A dinner's line asks its chef for portions once its queue reaches the threshold: the join that left the longest
// queue speaks for the dinner
const owedOf = (outcomes: BookingOutcomes): OwedNotifications => {
    const threshold = useAppConfig().theslope.waitlistBuildupThreshold
    const longest = new Map<number, WaitlistJoined>()
    for (const event of outcomes.joined) {
        if (event.queueSize >= threshold && event.queueSize > (longest.get(event.dinnerEventId)?.queueSize ?? 0)) longest.set(event.dinnerEventId, event)
    }
    return {
        ...outcomes,
        buildups: [...longest.values()].map(({dinnerEventId, queueSize, portionNeed, queuedByType}) => ({dinnerEventId, entries: queueSize, portions: portionNeed, queuedByType}))
    }
}

/**
 * The notifications for what a scaffold run did: joined, the line at the buildup threshold, sold, bought, sold to the
 * first in a ticket type's line, and the extra portions it finished for a stopped run
 */
export const notifyBookingOutcomes = neverThrows(
    async (d1Client: D1Database, channel: EmailChannel, outcomes: BookingOutcomes, jobRunId?: number): Promise<DeliveryResult> =>
        bookingEmailsOff() ? nothingSent() : deliverDesired(d1Client, channel, BOOKING_STATUS, () => desiredOf(d1Client, owedOf(outcomes)), {jobRunId}))

/**
 * The notifications for the chef's extra portions: each waiting entry that fit got a regular order; a stopped run's
 * sale the release finished notifies as a sale to the first in a ticket type's line
 */
export const notifyExtraPortions = neverThrows(
    async (d1Client: D1Database, channel: EmailChannel, result: WaitlistAssignmentResult): Promise<DeliveryResult> =>
        bookingEmailsOff() ? nothingSent() : deliverDesired(d1Client, channel, BOOKING_STATUS, () => desiredOf(d1Client, owedOf({
            joined: [], ticketsSold: [], waitlistTicketsSold: result.waitlistTicketsSold,
            waitlistPortionsAssigned: result.assigned.map(entry => ({...entry, dinnerEventId: result.dinnerEventId}))
        }))))

// What the dinners owe as they stand: each place on a waiting list its join, each line at the buildup threshold its
// buildup, and the latest sale or extra portion of each order its holder still holds. The history reads in time order
const owedOnDinners = (queue: TicketWaitlistDisplay[], history: OrderHistoryDisplay[], booked: OrderDisplay[], ticketPrices: TicketPrice[]): OwedNotifications => {
    const {waitingLines, ticketTypeOfEntry, portionNeed, portionsOfEntryFor} = useWaitlist()
    const threshold = useAppConfig().theslope.waitlistBuildupThreshold
    const owed: OwedNotifications = {joined: [], buildups: [], ticketsSold: [], waitlistTicketsSold: [], waitlistPortionsAssigned: []}
    for (const [dinnerEventId, dinnerQueue] of groupBy<TicketWaitlistDisplay, number>(entry => entry.dinnerEventId)(queue)) {
        const lines = waitingLines(dinnerQueue, ticketTypeOfEntry(ticketPrices))
        for (const [ticketType, line] of lines) {
            owed.joined.push(...line.map((entry, index) => ({
                dinnerEventId, inhabitantId: entry.inhabitantId, entryId: entry.id, position: index + 1, ticketType,
                isGuestTicket: entry.isGuestTicket, ticketPriceId: entry.order.ticketPriceId, dinnerMode: entry.order.dinnerMode
            })))
        }
        if (dinnerQueue.length >= threshold) owed.buildups.push({
            dinnerEventId, entries: dinnerQueue.length, portions: portionNeed(dinnerQueue, portionsOfEntryFor(ticketPrices)),
            queuedByType: Object.fromEntries([...lines].map(([ticketType, line]) => [ticketType, line.length]))
        })
    }
    const latest = new Map<number, {row: OrderHistoryDisplay, audit: OrderAudit}>()
    for (const audited of auditedRows(history)) {
        if (audited.row.orderId !== null && owesOrderNotification(audited.audit)) latest.set(audited.row.orderId, audited)
    }
    const held = new Map(booked.map(order => [order.id, order]))
    for (const [orderId, {row, audit}] of latest) {
        const order = held.get(orderId)
        if (!order?.ticketPriceId) continue
        const ticket = {dinnerEventId: order.dinnerEventId, ticketPriceId: order.ticketPriceId, orderId, dinnerMode: order.dinnerMode, isGuestTicket: order.isGuestTicket}
        // A sale's row names its buyer, its snapshot the seller's order as it stood before the sale
        if (audit.change === Change.BUY && order.inhabitantId === row.inhabitantId && audit.householdId !== null) {
            const sale = {...ticket, buyerInhabitantId: order.inhabitantId, sellerHouseholdId: audit.householdId, sellerInhabitantId: audit.inhabitantId}
            if (audit.source === Source['waitlist-assignment']) owed.waitlistTicketsSold.push(sale)
            else owed.ticketsSold.push(sale)
        }
        if (isExtraPortionRow(audit) && order.inhabitantId === audit.inhabitantId) owed.waitlistPortionsAssigned.push({...ticket, inhabitantId: order.inhabitantId})
    }
    return owed
}

// The season's dinners still to come and past their booking deadline, where the waiting list and the sales live
const desiredOnSeason = async (d1Client: D1Database, seasonId: number | null): Promise<DesiredOutgoing[]> => {
    if (seasonId === null) return []
    const season = await fetchSeason(d1Client, seasonId)
    if (!season) return []
    const {canModifyOrders} = useSeason().deadlinesForSeason(season)
    const dinners = (await fetchDinnerEvents(d1Client, {seasonId, excludeStates: [DinnerState.CONSUMED, DinnerState.CANCELLED]}))
        .filter(dinner => !canModifyOrders(dinner.date))
    if (dinners.length === 0) return []
    const dinnerEventIds = dinners.map(dinner => dinner.id)
    const queue = await fetchWaitlistForDinners(d1Client, dinnerEventIds)
    const history = await fetchOrderHistoryForDinners(d1Client, dinnerEventIds)
    const booked = await fetchOrders(d1Client, dinnerEventIds, undefined, OrderState.BOOKED)
    return desiredOf(d1Client, owedOnDinners(queue, history, booked, season.ticketPrices), history)
}

/**
 * The booking notifications the season's dinners past their booking deadline owe as they stand: each place's join,
 * each line at the buildup threshold, the latest sale or extra portion of each order its holder still holds. The
 * delivery records keep each from going twice; no season owes nothing.
 *
 * The delivery dry run shows the admin what the nightly run would send before SHOULD_SEND_BOOKING_EMAILS_FLAG goes on
 * in an environment. It ignores the flag, reads the same dinners and their delivery records, and sends and records
 * nothing: per user how many of each notification would go and how many are already recorded.
 */
export const sendNotifications = neverThrows(
    async (
        d1Client: D1Database, channel: EmailChannel, seasonId: number | null, options: Pick<DeliveryOptions, 'jobRunId' | 'dryRun'> = {}
    ): Promise<DeliveryResult> =>
        bookingEmailsOff(options.dryRun) ? nothingSent() : deliverDesired(d1Client, channel, BOOKING_STATUS, () => desiredOnSeason(d1Client, seasonId), options))
