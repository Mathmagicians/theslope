/**
 * Booking notifications: the waiting-list mails and the sold mail. The booking steps return their outcomes; the caller
 * hands them here after the action. notifyBookingOutcomes and notifyExtraPortions resolve recipients and household
 * shortnames from the database, each kind the mails name in one read (ADR-014); bookingMails composes the resolved mails
 * and puts them on the channel in one emit, a batch per hundred.
 */
import {channelOff, emit, notSent} from '~~/server/utils/sender/emit'
import {composeEmail, siteUrl} from '~~/server/utils/sender/compose'
import type {EmailChannel} from '~~/server/utils/sender/config'
import type {EmailMessage, NotificationConfig, SenderEmitResult} from '~/composables/useNotificationValidation'
import type {BookingOutcomes, TicketSale, WaitlistJoined} from '~/composables/useBookingValidation'
import type {WaitlistAssignmentResult} from '~/composables/useWaitlistValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {HouseholdDisplay, InhabitantDisplay, UserDisplay} from '~/composables/useCoreValidation'
import type {Season} from '~/composables/useSeasonValidation'
import {useUserPreferenceValidation, wantsChannel} from '~/composables/useUserPreferenceValidation'
import {fetchHouseholdsByIds, fetchInhabitantsByIds, fetchSeason, fetchUsersByIds} from '~~/server/data/prismaRepository'
import {fetchDinnerEventsByIds} from '~~/server/data/financesRepository'
import {dinnerForWaitlist, type DinnerForWaitlist} from '~~/server/utils/waitlistAssignment'
import {formatDate} from '~/utils/date'
import {ticketTypeLabel} from '~/composables/useTicket'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const LOG = '📮 > SENDER > [EVENT booking]'

// The booking is saved before its mails are resolved: a failed lookup is logged and sends nothing, as emit never throws
const neverThrows = <A extends unknown[]>(operation: string, notify: (...args: A) => Promise<SenderEmitResult[]>) =>
    async (...args: A): Promise<SenderEmitResult[]> => {
        try {
            return await notify(...args)
        } catch (error) {
            eventHandlerHelper.logNuxtError(eventHandlerHelper.nuxtErrorFromCatch(`${LOG} ${operation}: no mails sent`, error), error)
            return []
        }
    }

export interface WaitlistDinnerContext {
    dinnerEventId: number
    date: Date
    menuTitle: string
}

// The mail names the dinner by its date and menu
const dinnerLabel = ({date, menuTitle}: WaitlistDinnerContext): string => `${formatDate(date)} · ${menuTitle}`

// A booking mail on its way: the message for the queue, or the result of a mail never sent (e-mail off, no address)
type OutgoingMail = {message: EmailMessage} | {unsent: SenderEmitResult}

// A booking mail of its kind on the dinner, composed for its address; the values read the config of a channel that is on
const bookingMail = (
    channel: EmailChannel, kind: string, to: string | null, dinner: WaitlistDinnerContext, values: (config: NotificationConfig) => Record<string, string>
): Promise<OutgoingMail> => {
    const subject = `${dinner.dinnerEventId}`
    if (!channel.on) return channelOff(kind, channel.missing, subject).then(unsent => ({unsent}))
    if (!to) return notSent(kind, 'unaddressed', subject).then(unsent => ({unsent}))
    return Promise.resolve({message: composeEmail(channel.config, {kind, to, values: values(channel.config), correlationId: `dinner ${dinner.dinnerEventId}`})})
}

// The mails of one operation reach the queue in one emit, a batch per hundred; a mail never sent keeps its result in place
const sendMails = async (channel: EmailChannel, mails: Promise<OutgoingMail>[]): Promise<SenderEmitResult[]> => {
    const outgoing = await Promise.all(mails)
    const messages = outgoing.flatMap(mail => 'message' in mail ? [mail.message] : [])
    const queued = channel.on && messages.length > 0 ? await emit(channel.queue, messages) : []
    return outgoing.map(mail => 'message' in mail ? queued.shift()! : mail.unsent)
}

// A booking mail sent on its own
const alone = <A extends [EmailChannel, ...unknown[]]>(mail: (...args: A) => Promise<OutgoingMail>) =>
    (...args: A): Promise<SenderEmitResult> => sendMails(args[0], [mail(...args)]).then(([result]) => result!)

const waitlistJoinedMail = (
    channel: EmailChannel, to: string | null, name: string, dinner: WaitlistDinnerContext, position: number, ticketType: string
): Promise<OutgoingMail> =>
    bookingMail(channel, 'WAITLIST_JOINED', to, dinner, () => ({name, dinner: dinnerLabel(dinner), position: String(position), ticketType}))

const waitlistTicketAssignedMail = (
    channel: EmailChannel, to: string | null, name: string, dinner: WaitlistDinnerContext, ticket: string, seller: string, buyer: string
): Promise<OutgoingMail> =>
    bookingMail(channel, 'WAITLIST_TICKET_ASSIGNED', to, dinner, () => ({name, dinner: dinnerLabel(dinner), ticket, seller, buyer}))

const waitlistExtraPortionMail = (
    channel: EmailChannel, to: string | null, name: string, dinner: WaitlistDinnerContext, ticket: string, buyer: string
): Promise<OutgoingMail> =>
    bookingMail(channel, 'WAITLIST_EXTRA_PORTION', to, dinner, () => ({name, dinner: dinnerLabel(dinner), ticket, buyer}))

const waitlistBuildupMail = (
    channel: EmailChannel, to: string | null, name: string, dinner: WaitlistDinnerContext, entries: number, portions: number
): Promise<OutgoingMail> => {
    if (channel.on && !to) console.warn(`${LOG} the chef of dinner ${dinner.dinnerEventId} has no address — buildup mail not sent`)
    return bookingMail(channel, 'WAITLIST_BUILDUP', to, dinner, config => ({
        name,
        dinner: dinnerLabel(dinner),
        entries: String(entries),
        portions: portions.toLocaleString('da-DK'),
        dinnerUrl: siteUrl(config, '/chef')
    }))
}

const ticketSoldMail = (
    channel: EmailChannel, to: string, name: string, dinner: WaitlistDinnerContext, seller: string, buyer: string
): Promise<OutgoingMail> =>
    bookingMail(channel, 'TICKET_SOLD', to, dinner, () => ({name, dinner: dinnerLabel(dinner), seller, buyer}))

export const emitWaitlistJoined = alone(waitlistJoinedMail)
export const emitWaitlistTicketAssigned = alone(waitlistTicketAssignedMail)
export const emitWaitlistExtraPortion = alone(waitlistExtraPortionMail)
export const emitWaitlistBuildup = alone(waitlistBuildupMail)
export const emitTicketSold = alone(ticketSoldMail)

/** The booking mails of one operation, with recipients, names and household shortnames resolved */
export interface BookingMails {
    joined: {to: string | null, name: string, dinner: WaitlistDinnerContext, position: number, ticketType: string}[]
    buildups: {to: string | null, name: string, dinner: WaitlistDinnerContext, entries: number, portions: number}[]
    sold: {to: string, name: string, dinner: WaitlistDinnerContext, seller: string, buyer: string}[]
    assigned: {to: string | null, name: string, dinner: WaitlistDinnerContext, ticket: string, seller: string, buyer: string}[]
    extraPortions: {to: string | null, name: string, dinner: WaitlistDinnerContext, ticket: string, buyer: string}[]
}

export const NO_BOOKING_MAILS: BookingMails = {joined: [], buildups: [], sold: [], assigned: [], extraPortions: []}

export const bookingMails = (channel: EmailChannel, mails: BookingMails): Promise<SenderEmitResult[]> => sendMails(channel, [
    ...mails.joined.map(mail => waitlistJoinedMail(channel, mail.to, mail.name, mail.dinner, mail.position, mail.ticketType)),
    ...mails.buildups.map(mail => waitlistBuildupMail(channel, mail.to, mail.name, mail.dinner, mail.entries, mail.portions)),
    ...mails.sold.map(mail => ticketSoldMail(channel, mail.to, mail.name, mail.dinner, mail.seller, mail.buyer)),
    ...mails.assigned.map(mail => waitlistTicketAssignedMail(channel, mail.to, mail.name, mail.dinner, mail.ticket, mail.seller, mail.buyer)),
    ...mails.extraPortions.map(mail => waitlistExtraPortionMail(channel, mail.to, mail.name, mail.dinner, mail.ticket, mail.buyer))
])

const ticketLabel = (ticketPrices: TicketPrice[], ticketPriceId: number): string =>
    ticketPrices.find(price => price.id === ticketPriceId)?.description ?? 'billet'

// The ids named, once each
const idsOf = (ids: (number | null | undefined)[]): number[] => [...new Set(ids.filter((id): id is number => !!id))]

// The chef hears when a dinner's line reaches the threshold
const reachesBuildup = (event: WaitlistJoined): boolean => event.queueSize === useAppConfig().theslope.waitlistBuildupThreshold

type PortionAssigned = BookingOutcomes['waitlistPortionsAssigned'][number]

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

// Every dinner, household and person the mails name, read before they compose; the chefs come with their dinners, the
// selling households' members with their households
const load = async (d1Client: D1Database, {joined, ticketsSold, waitlistTicketsSold, waitlistPortionsAssigned}: BookingOutcomes): Promise<MailRecords> => {
    const sales = [...ticketsSold, ...waitlistTicketsSold]
    const dinners = await loadDinners(d1Client, [...joined, ...sales, ...waitlistPortionsAssigned].map(outcome => outcome.dinnerEventId))
    const inhabitants = await readNamed(d1Client, [
        ...joined.map(event => event.inhabitantId),
        ...waitlistTicketsSold.map(sale => sale.buyerInhabitantId),
        ...waitlistPortionsAssigned.map(entry => entry.inhabitantId),
        ...joined.filter(reachesBuildup).map(event => dinners.get(event.dinnerEventId)?.chefId)
    ], fetchInhabitantsByIds)
    const households = await readNamed(d1Client, [
        ...sales.flatMap(sale => [sale.sellerHouseholdId, sale.buyerHouseholdId]),
        ...waitlistPortionsAssigned.map(entry => inhabitants.get(entry.inhabitantId)?.householdId)
    ], fetchHouseholdsByIds)
    const members = idsOf(sales.map(sale => sale.sellerHouseholdId)).flatMap(householdId => households.get(householdId)?.inhabitants ?? [])
    const users = await readNamed(d1Client, [
        ...joined.map(event => event.bookedByUserId),
        ...[...inhabitants.values(), ...members].map(inhabitant => inhabitant.userId)
    ], fetchUsersByIds)
    return {dinners, households, inhabitants, users}
}

// The mails composed from the records of their operation
const composer = ({dinners, households, inhabitants, users}: MailRecords) => {
    const {NotificationChannelSchema} = useUserPreferenceValidation()
    const dinnerOf = (dinnerEventId: number): DinnerForWaitlist => dinners.get(dinnerEventId)!
    const shortnameOf = (householdId: number): string => households.get(householdId)?.shortName ?? `#${householdId}`
    // A login whose channels leave e-mail out has no address for the mails
    const emailOf = (userId: number | null | undefined): string | null => {
        const user = userId ? users.get(userId) : undefined
        return user && wantsChannel(user, NotificationChannelSchema.enum.EMAIL) ? user.email : null
    }
    // The user behind an inhabitant, when the inhabitant has one
    const addressOf = (inhabitantId: number): {email: string | null, name: string} => {
        const inhabitant = inhabitants.get(inhabitantId)
        return {email: emailOf(inhabitant?.userId), name: inhabitant?.name ?? ''}
    }
    // The booker hears of the place; the mail greets the one who joined
    const joinedMail = (event: WaitlistJoined): BookingMails['joined'][number] => ({
        to: emailOf(event.bookedByUserId), name: addressOf(event.inhabitantId).name, dinner: dinnerOf(event.dinnerEventId).context, position: event.position,
        ticketType: event.ticketType ? ticketTypeLabel(event.ticketType) : '-'
    })
    const buildupMails = (event: WaitlistJoined): BookingMails['buildups'] => {
        const dinner = dinnerOf(event.dinnerEventId)
        if (!dinner.chefId) return []
        const chef = addressOf(dinner.chefId)
        return [{to: chef.email, name: chef.name, dinner: dinner.context, entries: event.queueSize, portions: event.portionNeed}]
    }
    // The selling household hears through every member with an address
    const soldMails = (sale: TicketSale): BookingMails['sold'] => {
        const [seller, buyer] = [shortnameOf(sale.sellerHouseholdId), shortnameOf(sale.buyerHouseholdId)]
        return (households.get(sale.sellerHouseholdId)?.inhabitants ?? []).flatMap(member => {
            const to = emailOf(member.userId)
            return to ? [{to, name: member.name, dinner: dinnerOf(sale.dinnerEventId).context, seller, buyer}] : []
        })
    }
    // The first in a ticket type's line hears that the ticket is theirs
    const assignedMail = (sale: TicketSale): BookingMails['assigned'][number] => {
        const dinner = dinnerOf(sale.dinnerEventId)
        const {email, name} = addressOf(sale.buyerInhabitantId)
        return {
            to: email, name, dinner: dinner.context, ticket: ticketLabel(dinner.ticketPrices, sale.ticketPriceId),
            seller: shortnameOf(sale.sellerHouseholdId), buyer: shortnameOf(sale.buyerHouseholdId)
        }
    }
    const extraPortionMail = (entry: PortionAssigned): BookingMails['extraPortions'][number] => {
        const dinner = dinnerOf(entry.dinnerEventId)
        const inhabitant = inhabitants.get(entry.inhabitantId)
        return {
            to: emailOf(inhabitant?.userId), name: inhabitant?.name ?? '', dinner: dinner.context, ticket: ticketLabel(dinner.ticketPrices, entry.ticketPriceId),
            buyer: inhabitant ? shortnameOf(inhabitant.householdId) : ''
        }
    }
    return {joinedMail, buildupMails, soldMails, assignedMail, extraPortionMail}
}

// The mails of one operation, composed once its records are read
const mailsOf = async (d1Client: D1Database, outcomes: BookingOutcomes): Promise<BookingMails> => {
    const {joinedMail, buildupMails, soldMails, assignedMail, extraPortionMail} = composer(await load(d1Client, outcomes))
    return {
        joined: outcomes.joined.map(joinedMail),
        buildups: outcomes.joined.filter(reachesBuildup).flatMap(buildupMails),
        sold: [...outcomes.ticketsSold, ...outcomes.waitlistTicketsSold].flatMap(soldMails),
        assigned: outcomes.waitlistTicketsSold.map(assignedMail),
        extraPortions: outcomes.waitlistPortionsAssigned.map(extraPortionMail)
    }
}

/**
 * The mails for what a scaffold run did: joined, sold, sold to the first in a ticket type's line, and the extra portions
 * it finished for a stopped run
 */
export const notifyBookingOutcomes = neverThrows('booking outcomes', async (d1Client: D1Database, channel: EmailChannel, outcomes: BookingOutcomes): Promise<SenderEmitResult[]> =>
    bookingMails(channel, await mailsOf(d1Client, outcomes)))

/**
 * The mails for the chef's extra portions: each waiting entry that fit got a regular order; a stopped run's sale the
 * release finished mails as a sale to the first in a ticket type's line
 */
export const notifyExtraPortions = neverThrows('extra portions', async (d1Client: D1Database, channel: EmailChannel, result: WaitlistAssignmentResult): Promise<SenderEmitResult[]> =>
    bookingMails(channel, await mailsOf(d1Client, {
        joined: [], ticketsSold: [], waitlistTicketsSold: result.waitlistTicketsSold,
        waitlistPortionsAssigned: result.assigned.map(entry => ({...entry, dinnerEventId: result.dinnerEventId}))
    })))
