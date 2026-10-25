/**
 * Booking notifications: the waiting-list mails, the sold mail and the bought mail. The booking steps return their
 * outcomes; the caller hands them here after the action, and daily maintenance sends the mails the dinners still to
 * come owe. A mail about a person goes to the person's closest user (findClosestUser), the buildup to the chef. Each
 * mail goes once per subject, version, kind and recipient: sendOnce reads the Delivery rows, emits and records. The
 * dinners and people the mails name are read once per kind (ADR-014); the composed mails reach the queue in one emit,
 * a batch per hundred.
 */
import {channelOff, emit, notSent} from '~~/server/utils/sender/emit'
import {composeEmail, siteUrl, userDedupePrefix} from '~~/server/utils/sender/compose'
import type {EmailChannel} from '~~/server/utils/sender/config'
import type {EmailMessage, NotificationConfig, SenderEmitResult} from '~/composables/useNotificationValidation'
import {
    useBookingValidation, DinnerState, OrderState, type BookingAction, type BookingOutcomes, type DinnerEventDisplay, type DinnerMode,
    type OrderAudit, type OrderDisplay, type OrderHistoryDisplay, type ResendNotificationsResult, type TicketSale, type WaitlistJoined
} from '~/composables/useBookingValidation'
import type {TicketWaitlistDisplay, WaitlistAssignmentResult} from '~/composables/useWaitlistValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {HouseholdDisplay, InhabitantDisplay, UserDisplay} from '~/composables/useCoreValidation'
import type {Season} from '~/composables/useSeasonValidation'
import {useDeliveryValidation, type Delivery} from '~/composables/useDeliveryValidation'
import {useUserPreferenceValidation, wantsChannel} from '~/composables/useUserPreferenceValidation'
import {useWaitlist} from '~/composables/useWaitlist'
import {formatPlace, useBooking} from '~/composables/useBooking'
import {useOrder} from '~/composables/useOrder'
import {useSeason} from '~/composables/useSeason'
import {ticketTypeLabel, useTicket} from '~/composables/useTicket'
import {TICKET_COUNTS} from '~/composables/useBilling'
import {BOOKING_WORDS} from '~/config/bookingWords'
import {NotificationKind, WAITLIST_BUYER} from '~/config/notificationTemplates'
import {fetchHouseholdsByIds, fetchInhabitantsByIds, fetchSeason, fetchUsersByIds} from '~~/server/data/prismaRepository'
import {
    fetchDeliveries, fetchDinnerEvents, fetchDinnerEventsByIds, fetchFirstDeliveredAt, fetchOrderHistoryForDinners, fetchOrders, recordDeliveries
} from '~~/server/data/financesRepository'
import {fetchWaitlistForDinners} from '~~/server/data/waitlistRepository'
import {dinnerForWaitlist, type DinnerForWaitlist} from '~~/server/utils/waitlistAssignment'
import {formatDate} from '~/utils/date'
import {formatPortions} from '~/utils/utils'
import {groupBy} from '~/utils/batchUtils'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const LOG = '📮 > SENDER > [EVENT booking]'

const {BookingActionSchema, OrderAuditChangeSchema, OrderAuditSourceSchema, readOrderAudit} = useBookingValidation()
const {DeliverySubjectSchema, DeliveryKindSchema} = useDeliveryValidation()
const Action = BookingActionSchema.enum
const Change = OrderAuditChangeSchema.enum
const Source = OrderAuditSourceSchema.enum
const Subject = DeliverySubjectSchema.enum

// The booking is saved before its mails are resolved: a failed lookup is logged and sends nothing, as emit never throws
const neverThrows = <A extends unknown[], R>(operation: string, nothing: () => R, notify: (...args: A) => Promise<R>) =>
    async (...args: A): Promise<R> => {
        try {
            return await notify(...args)
        } catch (error) {
            eventHandlerHelper.logNuxtError(eventHandlerHelper.nuxtErrorFromCatch(`${LOG} ${operation}: no mails sent`, error), error)
            return nothing()
        }
    }

export interface WaitlistDinnerContext {
    dinnerEventId: number
    date: Date
    menuTitle: string
}

// The mail names the dinner by its date and menu
const dinnerLabel = ({date, menuTitle}: WaitlistDinnerContext): string => `${formatDate(date)} · ${menuTitle}`

/**
 * A booking mail resolved for its recipient: the address (null when nobody hears it), the login it goes to, the name it
 * greets, the dinner
 */
interface ResolvedMail {
    to: string | null
    userId: number | null
    name: string
    dinner: WaitlistDinnerContext
}

/** A ticket's mail: the person the ticket is for and the ticket line of the booking page */
interface TicketMail extends ResolvedMail {
    person: string
    ticket: string
}

/** The booking mails of one operation with recipients and words resolved; each mail carries what its caller tracks it by */
export interface BookingMails<Tracked = object> {
    joined: (TicketMail & {place: string} & Tracked)[]
    buildups: (ResolvedMail & {queued: string, entries: number, portions: number} & Tracked)[]
    sold: (ResolvedMail & {buyer: string, ticket: string} & Tracked)[]
    assigned: (TicketMail & Tracked)[]
    bought: (TicketMail & Tracked)[]
    extraPortions: (TicketMail & Tracked)[]
}

// A mail of its kind with the values its template reads from the channel's config
type Pending<Mail extends ResolvedMail> = Mail & {kind: NotificationKind, values: (config: NotificationConfig) => Record<string, string>}

const pending = <Mail extends ResolvedMail>(kind: NotificationKind, values: (mail: Mail, config: NotificationConfig) => Record<string, string>) =>
    <Tracked extends Mail>(mail: Tracked): Pending<Tracked> => ({...mail, kind, values: (config: NotificationConfig) => values(mail, config)})

// The composables build once per batch, not once per mail
const pendingOf = <Tracked extends object>(mails: BookingMails<Tracked>): Pending<ResolvedMail & Tracked>[] => {
    const {buildDinnerUrl} = useBooking()
    const bookingUrl = (config: NotificationConfig, {date}: WaitlistDinnerContext): string => buildDinnerUrl(siteUrl(config, ''), date)
    // The person's ticket in the words of the booking toast: "Emil: 1 købt"
    const ticketValues = (action: BookingAction) => (mail: TicketMail, config: NotificationConfig): Record<string, string> => ({
        name: mail.name, person: mail.person, dinner: dinnerLabel(mail.dinner), action: BOOKING_WORDS.actions[action].toast, ticket: mail.ticket,
        bookingUrl: bookingUrl(config, mail.dinner)
    })
    return [
        ...mails.joined.map(pending<BookingMails['joined'][number]>(NotificationKind.WAITLIST_JOINED, (mail, config) => ({
            ...ticketValues(Action.QUEUE)(mail, config), place: mail.place, helpText: BOOKING_WORDS.waitlistBadge.helpText,
            payment: BOOKING_WORDS.supply.waitlistPayment
        }))),
        ...mails.buildups.map(pending<BookingMails['buildups'][number]>(NotificationKind.WAITLIST_BUILDUP, (mail, config) => ({
            name: mail.name, dinner: dinnerLabel(mail.dinner), queued: BOOKING_WORDS.supply.queued(mail.queued), portions: formatPortions(mail.portions),
            ask: BOOKING_WORDS.supply.chefAsk(mail.entries), dinnerUrl: siteUrl(config, '/chef')
        }))),
        ...mails.sold.map(pending<BookingMails['sold'][number]>(NotificationKind.TICKET_SOLD, (mail, config) => ({
            name: mail.name, dinner: dinnerLabel(mail.dinner), tickets: BOOKING_WORDS.ticketCount(1), buyer: mail.buyer, ticket: mail.ticket,
            bookingUrl: bookingUrl(config, mail.dinner)
        }))),
        ...mails.assigned.map(pending(NotificationKind.WAITLIST_TICKET_ASSIGNED, ticketValues(Action.BUY))),
        ...mails.bought.map(pending(NotificationKind.TICKET_BOUGHT, ticketValues(Action.BUY))),
        ...mails.extraPortions.map(pending(NotificationKind.WAITLIST_EXTRA_PORTION, ticketValues(Action.BOOK)))
    ]
}

// A booking mail on its way: the message for the queue, or the result of a mail never sent (e-mail off, no address)
type OutgoingMail = {message: EmailMessage} | {unsent: SenderEmitResult}

const outgoingOf = (channel: EmailChannel, mail: Pending<ResolvedMail>): Promise<OutgoingMail> => {
    const subject = `${mail.dinner.dinnerEventId}`
    if (!channel.on) return channelOff(mail.kind, channel.missing, subject).then(unsent => ({unsent}))
    if (!mail.to) return notSent(mail.kind, 'unaddressed', subject).then(unsent => ({unsent}))
    return Promise.resolve({message: composeEmail(channel.config, {
        kind: mail.kind, to: mail.to, userId: mail.userId ?? undefined, values: mail.values(channel.config), correlationId: `dinner ${mail.dinner.dinnerEventId}`
    })})
}

// The mails of one operation reach the queue in one emit, a batch per hundred; a mail never sent keeps its result in place
const sendMails = async (channel: EmailChannel, mails: Pending<ResolvedMail>[]): Promise<SenderEmitResult[]> => {
    const outgoing = await Promise.all(mails.map(mail => outgoingOf(channel, mail)))
    const messages = outgoing.flatMap(mail => 'message' in mail ? [mail.message] : [])
    const queued = channel.on && messages.length > 0 ? await emit(channel.queue, messages) : []
    return outgoing.map(mail => 'message' in mail ? queued.shift()! : mail.unsent)
}

/** Composes the resolved mails and puts them on the channel, each result in the order of its mail */
export const bookingMails = (channel: EmailChannel, mails: BookingMails): Promise<SenderEmitResult[]> => sendMails(channel, pendingOf(mails))

/** What a mail is about, as its Delivery row names it */
interface MailSubject {
    subjectType: Delivery['subjectType']
    subjectId: number
}

type Tracked = {subject: MailSubject}

/** A mail of the run and its result */
interface SentMail {
    dinnerEventId: number
    result: SenderEmitResult
}

const isExtraPortionRow = (audit: OrderAudit): boolean => audit.change === Change.BOOK && audit.source === Source['waitlist-assignment']
// The rows that owe an order a mail: the chef's extra portion that created it, and each sale of it
const owesOrderMail = (audit: OrderAudit): boolean => audit.change === Change.BUY || isExtraPortionRow(audit)

const auditedRows = (history: OrderHistoryDisplay[]): {row: OrderHistoryDisplay, audit: OrderAudit}[] =>
    history.flatMap(row => {
        const audit = readOrderAudit(row)
        return audit ? [{row, audit}] : []
    })

/**
 * A subject's version counts up from 1, one step per history row that owes it a mail: a place its join, an order the
 * extra portion that created it and each sale, a dinner its first buildup and each extra portion after that buildup
 */
const versionsOf = (history: OrderHistoryDisplay[], deliveries: Delivery[]) => {
    const audited = auditedRows(history)
    const orderSteps = new Map<number, number>()
    for (const {row, audit} of audited) {
        const orderId = row.orderId ?? audit.orderId
        if (orderId !== null && owesOrderMail(audit)) orderSteps.set(orderId, (orderSteps.get(orderId) ?? 0) + 1)
    }
    const firstBuildup = new Map<number, number>()
    for (const row of deliveries.filter(delivery => delivery.subjectType === Subject.DINNER_EVENT)) {
        firstBuildup.set(row.subjectId, Math.min(firstBuildup.get(row.subjectId) ?? Infinity, row.deliveredAt.getTime()))
    }
    const extraPortionsSince = (dinnerEventId: number, since: number): number => audited
        .filter(({row, audit}) => row.dinnerEventId === dinnerEventId && isExtraPortionRow(audit) && row.timestamp.getTime() > since).length
    return ({subjectType, subjectId}: MailSubject): number => {
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

// The Delivery rows of the subjects, one read per subject type
const readDeliveries = async (d1Client: D1Database, subjects: MailSubject[]): Promise<Delivery[]> => {
    const rows: Delivery[] = []
    for (const [subjectType, ofType] of groupBy<MailSubject, Delivery['subjectType']>(subject => subject.subjectType)(subjects)) {
        rows.push(...await fetchDeliveries(d1Client, subjectType, idsOf(ofType.map(subject => subject.subjectId))))
    }
    return rows
}

const versionKey = ({subjectType, subjectId}: MailSubject, version: number): string => `${subjectType}:${subjectId}:${version}`

/**
 * One mail per subject, version, kind and login: a mail its Delivery row records goes no more, and the run's queued
 * mails record their rows in one write, each with its dedupe key, which leads with the kind and the login. A mail with
 * no address is reported and stays owed
 */
const sendOnce = async (
    d1Client: D1Database, channel: EmailChannel, mails: BookingMails<Tracked>, history: OrderHistoryDisplay[], jobRunId?: number
): Promise<SentMail[]> => {
    const all = pendingOf(mails)
    if (all.length === 0) return []
    const deliveries = await readDeliveries(d1Client, all.map(mail => mail.subject))
    const versionOf = versionsOf(history, deliveries)
    const delivered = groupBy<Delivery, string>(row => versionKey(row, row.version))(deliveries.filter(row => row.kind === DeliveryKindSchema.enum.EMAIL))
    const seen = new Set<string>()
    const owed = all.flatMap(mail => {
        const version = versionOf(mail.subject)
        if (mail.to === null || mail.userId === null) return [{mail, version}]
        const recipient = userDedupePrefix(mail.kind, mail.userId)
        const key = `${versionKey(mail.subject, version)}:${recipient}`
        if (seen.has(key) || (delivered.get(versionKey(mail.subject, version)) ?? []).some(row => row.reference.startsWith(recipient))) return []
        seen.add(key)
        return [{mail, version}]
    })
    const results = await sendMails(channel, owed.map(({mail}) => mail))
    await recordDeliveries(d1Client, owed.flatMap(({mail: {subject}, version}, index) => {
        const {queued, dedupeKey} = results[index]!
        return queued ? [{...subject, version, kind: DeliveryKindSchema.enum.EMAIL, reference: dedupeKey, jobRunId}] : []
    }))
    return owed.map(({mail}, index) => ({dinnerEventId: mail.dinner.dinnerEventId, result: results[index]!}))
}

/** A place on a dinner's waiting list, as its join mail reads it */
type JoinOwed = Omit<WaitlistJoined, 'bookedByUserId' | 'queueSize' | 'portionNeed' | 'queuedByType'>

/** A dinner's line at the buildup threshold: its size by ticket type and the portions it needs */
interface BuildupOwed {
    dinnerEventId: number
    entries: number
    portions: number
    queuedByType: WaitlistJoined['queuedByType']
}

/** A sale's mails name the buyer by person; the buyer's household comes with the person */
type SaleOwed = Omit<TicketSale, 'buyerHouseholdId'>

type PortionOwed = Omit<BookingOutcomes['waitlistPortionsAssigned'][number], 'entryId' | 'portions'>

/** The mails one operation owes, by the outcome each comes from */
interface OwedMails {
    joined: JoinOwed[]
    buildups: BuildupOwed[]
    ticketsSold: SaleOwed[]
    waitlistTicketsSold: SaleOwed[]
    waitlistPortionsAssigned: PortionOwed[]
}

/** Every dinner, household, person and login the mails of one operation name, by id */
interface MailRecords {
    dinners: Map<number, DinnerForWaitlist>
    households: Map<number, HouseholdDisplay>
    inhabitants: Map<number, InhabitantDisplay>
    users: Map<number, UserDisplay>
}

// The rows of the ids named, in one read; a kind no mail names is not read
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

// Every dinner, person, household and login the mails name, read before they compose: the chefs come with their
// dinners, the households of the people with their members
const load = async (d1Client: D1Database, owed: OwedMails): Promise<MailRecords> => {
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

type Recipient = Pick<ResolvedMail, 'to' | 'userId' | 'name'>

// The mails composed from the records of their operation
const composer = ({dinners, households, inhabitants, users}: MailRecords) => {
    const {NotificationChannelSchema} = useUserPreferenceValidation()
    const {formatGuestLabel} = useOrder()
    const {formatPrice} = useTicket()
    const dinnerOf = (dinnerEventId: number): DinnerForWaitlist => dinners.get(dinnerEventId)!
    const shortnameOf = (householdId: number | undefined): string => (householdId && households.get(householdId)?.shortName) || `#${householdId}`
    // A login hears while its channels hold e-mail; the mail greets its person
    const recipientOf = (member: Pick<InhabitantDisplay, 'name' | 'userId'> | undefined): Recipient => {
        const user = member?.userId ? users.get(member.userId) : undefined
        return {to: user && wantsChannel(user, NotificationChannelSchema.enum.EMAIL) ? user.email : null, userId: user?.id ?? null, name: member?.name ?? ''}
    }
    // A household's first user: its member of the lowest id with a login, whatever order the read lists them in
    const firstUserOf = (householdId: number | undefined) => householdId === undefined ? undefined : (households.get(householdId)?.inhabitants ?? [])
        .filter(member => member.userId)
        .sort((a, b) => a.id - b.id)[0]
    /** A person's closest user: the person's own login, else the first user of the person's household */
    const findClosestUser = (inhabitantId: number | null, householdId?: number): Recipient => {
        const person = inhabitantId === null ? undefined : inhabitants.get(inhabitantId)
        return recipientOf(person?.userId ? person : firstUserOf(person?.householdId ?? householdId))
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
    const orderSubject = (orderId: number): MailSubject => ({subjectType: Subject.ORDER, subjectId: orderId})

    const joinedMail = (event: JoinOwed): BookingMails<Tracked>['joined'][number] => {
        const {context, ticketPrices} = dinnerOf(event.dinnerEventId)
        return {
            ...findClosestUser(event.inhabitantId), dinner: context, person: personOf(event.inhabitantId, event.isGuestTicket),
            place: formatPlace(event.position, event.ticketType), ticket: ticketLine(ticketPrices, event.ticketPriceId, event.dinnerMode),
            subject: {subjectType: Subject.TICKET_WAITLIST, subjectId: event.entryId}
        }
    }
    // The chef hears through the chef's own login
    const buildupMails = (buildup: BuildupOwed): BookingMails<Tracked>['buildups'] => {
        const {chefId, context} = dinnerOf(buildup.dinnerEventId)
        if (!chefId) return []
        return [{
            ...recipientOf(inhabitants.get(chefId)), dinner: context, queued: TICKET_COUNTS.compact.text(buildup.queuedByType), entries: buildup.entries,
            portions: buildup.portions, subject: {subjectType: Subject.DINNER_EVENT, subjectId: buildup.dinnerEventId}
        }]
    }
    // The person whose ticket was released hears, else the selling household's first user
    const soldMail = (buyer: (sale: SaleOwed) => string) => (sale: SaleOwed): BookingMails<Tracked>['sold'][number] => {
        const {context, ticketPrices} = dinnerOf(sale.dinnerEventId)
        return {
            ...findClosestUser(sale.sellerInhabitantId, sale.sellerHouseholdId), dinner: context, buyer: buyer(sale),
            ticket: ticketLine(ticketPrices, sale.ticketPriceId), subject: orderSubject(sale.orderId)
        }
    }
    const ticketMail = (sale: SaleOwed): BookingMails<Tracked>['assigned'][number] => {
        const {context, ticketPrices} = dinnerOf(sale.dinnerEventId)
        return {
            ...findClosestUser(sale.buyerInhabitantId), dinner: context, person: personOf(sale.buyerInhabitantId, sale.isGuestTicket),
            ticket: ticketLine(ticketPrices, sale.ticketPriceId, sale.dinnerMode, shortnameOf(sale.sellerHouseholdId)), subject: orderSubject(sale.orderId)
        }
    }
    const extraPortionMail = (portion: PortionOwed): BookingMails<Tracked>['extraPortions'][number] => {
        const {context, ticketPrices} = dinnerOf(portion.dinnerEventId)
        return {
            ...findClosestUser(portion.inhabitantId), dinner: context, person: personOf(portion.inhabitantId, portion.isGuestTicket),
            ticket: ticketLine(ticketPrices, portion.ticketPriceId, portion.dinnerMode), subject: orderSubject(portion.orderId)
        }
    }
    const buyerHousehold = (sale: SaleOwed): string => shortnameOf(inhabitants.get(sale.buyerInhabitantId)?.householdId)

    return (owed: OwedMails): BookingMails<Tracked> => ({
        joined: owed.joined.map(joinedMail),
        buildups: owed.buildups.flatMap(buildupMails),
        sold: [...owed.ticketsSold.map(soldMail(buyerHousehold)), ...owed.waitlistTicketsSold.map(soldMail(() => WAITLIST_BUYER))],
        assigned: owed.waitlistTicketsSold.map(ticketMail),
        bought: owed.ticketsSold.map(ticketMail),
        extraPortions: owed.waitlistPortionsAssigned.map(extraPortionMail)
    })
}

// The mails an operation owes, resolved, sent once and recorded; an order's and a dinner's versions read their history
const deliver = async (
    d1Client: D1Database, channel: EmailChannel, owed: OwedMails, jobRunId?: number, history?: OrderHistoryDisplay[]
): Promise<SentMail[]> => {
    const mails = composer(await load(d1Client, owed))(owed)
    const versioned = idsOf([...owed.buildups, ...owed.ticketsSold, ...owed.waitlistTicketsSold, ...owed.waitlistPortionsAssigned].map(outcome => outcome.dinnerEventId))
    const rows = history ?? (versioned.length === 0 ? [] : await fetchOrderHistoryForDinners(d1Client, versioned))
    return sendOnce(d1Client, channel, mails, rows, jobRunId)
}

// A dinner's line asks its chef for portions once its queue reaches the threshold: the join that left the longest
// queue speaks for the dinner
const owedOf = (outcomes: BookingOutcomes): OwedMails => {
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

const resultsOf = (sent: SentMail[]): SenderEmitResult[] => sent.map(({result}) => result)

/**
 * The mails for what a scaffold run did: joined, the line at the buildup threshold, sold, bought, sold to the first in
 * a ticket type's line, and the extra portions it finished for a stopped run
 */
export const notifyBookingOutcomes = neverThrows('booking outcomes', (): SenderEmitResult[] => [],
    async (d1Client: D1Database, channel: EmailChannel, outcomes: BookingOutcomes, jobRunId?: number): Promise<SenderEmitResult[]> =>
        resultsOf(await deliver(d1Client, channel, owedOf(outcomes), jobRunId)))

/**
 * The mails for the chef's extra portions: each waiting entry that fit got a regular order; a stopped run's sale the
 * release finished mails as a sale to the first in a ticket type's line
 */
export const notifyExtraPortions = neverThrows('extra portions', (): SenderEmitResult[] => [],
    async (d1Client: D1Database, channel: EmailChannel, result: WaitlistAssignmentResult): Promise<SenderEmitResult[]> =>
        resultsOf(await deliver(d1Client, channel, owedOf({
            joined: [], ticketsSold: [], waitlistTicketsSold: result.waitlistTicketsSold,
            waitlistPortionsAssigned: result.assigned.map(entry => ({...entry, dinnerEventId: result.dinnerEventId}))
        }))))

// What the dinners owe as they stand, from `since` on: each place joined since, each line a join since found at the
// buildup threshold, and the latest sale or extra portion since of each order its holder still holds. The history reads
// in time order
const owedOnDinners = (
    queue: TicketWaitlistDisplay[], history: OrderHistoryDisplay[], booked: OrderDisplay[], ticketPrices: TicketPrice[], since: Date
): OwedMails => {
    const {waitingLines, ticketTypeOfEntry, portionNeed, portionsOfEntryFor} = useWaitlist()
    const threshold = useAppConfig().theslope.waitlistBuildupThreshold
    const isSince = (moment: Date): boolean => moment.getTime() >= since.getTime()
    const owed: OwedMails = {joined: [], buildups: [], ticketsSold: [], waitlistTicketsSold: [], waitlistPortionsAssigned: []}
    for (const [dinnerEventId, dinnerQueue] of groupBy<TicketWaitlistDisplay, number>(entry => entry.dinnerEventId)(queue)) {
        const lines = waitingLines(dinnerQueue, ticketTypeOfEntry(ticketPrices))
        for (const [ticketType, line] of lines) {
            owed.joined.push(...line.flatMap((entry, index) => isSince(entry.createdAt) ? [{
                dinnerEventId, inhabitantId: entry.inhabitantId, entryId: entry.id, position: index + 1, ticketType,
                isGuestTicket: entry.isGuestTicket, ticketPriceId: entry.order.ticketPriceId, dinnerMode: entry.order.dinnerMode
            }] : []))
        }
        // A line only shrinks after a join: the newest join found it at least this long
        if (dinnerQueue.length >= threshold && dinnerQueue.some(entry => isSince(entry.createdAt))) owed.buildups.push({
            dinnerEventId, entries: dinnerQueue.length, portions: portionNeed(dinnerQueue, portionsOfEntryFor(ticketPrices)),
            queuedByType: Object.fromEntries([...lines].map(([ticketType, line]) => [ticketType, line.length]))
        })
    }
    const latest = new Map<number, {row: OrderHistoryDisplay, audit: OrderAudit}>()
    for (const audited of auditedRows(history)) {
        if (audited.row.orderId !== null && owesOrderMail(audited.audit) && isSince(audited.row.timestamp)) latest.set(audited.row.orderId, audited)
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

const NO_RESENDS: ResendNotificationsResult = {resent: 0, dinners: []}

// The mails queued, per dinner by date
const resendsOf = (sent: SentMail[], dinners: DinnerEventDisplay[]): ResendNotificationsResult => {
    const queued = new Map<number, number>()
    for (const {dinnerEventId, result} of sent) if (result.queued) queued.set(dinnerEventId, (queued.get(dinnerEventId) ?? 0) + 1)
    const perDinner = dinners.flatMap(({id, date}) => queued.has(id) ? [{dinnerEventId: id, date, resent: queued.get(id)!}] : [])
    return {resent: perDinner.reduce((total, dinner) => total + dinner.resent, 0), dinners: perDinner}
}

const BOOKING_SUBJECTS = [Subject.TICKET_WAITLIST, Subject.ORDER, Subject.DINNER_EVENT]

/**
 * The booking mails the season's dinners still to come owe past their booking deadline, where the waiting list and the
 * sales live, sent where no Delivery row records them: a join, a buildup, the latest sale or extra portion of an order.
 * They count from the first booking Delivery row: what was written before it was mailed by the release that wrote it
 */
export const resendBookingMails = neverThrows('owed booking mails', () => NO_RESENDS,
    async (d1Client: D1Database, channel: EmailChannel, seasonId: number, jobRunId?: number): Promise<ResendNotificationsResult> => {
        const since = await fetchFirstDeliveredAt(d1Client, BOOKING_SUBJECTS)
        if (!since) return NO_RESENDS
        const season = await fetchSeason(d1Client, seasonId)
        if (!season) return NO_RESENDS
        const {canModifyOrders} = useSeason().deadlinesForSeason(season)
        const dinners = (await fetchDinnerEvents(d1Client, {seasonId, excludeStates: [DinnerState.CONSUMED, DinnerState.CANCELLED]}))
            .filter(dinner => !canModifyOrders(dinner.date))
        if (dinners.length === 0) return NO_RESENDS
        const dinnerEventIds = dinners.map(dinner => dinner.id)
        const queue = await fetchWaitlistForDinners(d1Client, dinnerEventIds)
        const history = await fetchOrderHistoryForDinners(d1Client, dinnerEventIds)
        const booked = await fetchOrders(d1Client, dinnerEventIds, undefined, OrderState.BOOKED)
        const sent = await deliver(d1Client, channel, owedOnDinners(queue, history, booked, season.ticketPrices, since), jobRunId, history)
        return resendsOf(sent, dinners)
    })
