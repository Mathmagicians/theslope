/**
 * Booking notifications: the waiting-list mails and the sold mail. The booking steps return their outcomes; the caller
 * hands them here after the action. notifyBookingOutcomes and notifyExtraPortions resolve recipients and household
 * shortnames from the database; bookingMails turns the resolved mails into messages on the channel.
 */
import {channelOff, emit, notSent} from '~~/server/utils/sender/emit'
import {composeEmail, siteUrl} from '~~/server/utils/sender/compose'
import type {EmailChannel} from '~~/server/utils/sender/config'
import type {SenderEmitResult} from '~/composables/useNotificationValidation'
import type {BookingOutcomes, TicketSale} from '~/composables/useBookingValidation'
import type {WaitlistAssignmentResult} from '~/composables/useWaitlistValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import {fetchHousehold, fetchInhabitant, fetchUser} from '~~/server/data/prismaRepository'
import {loadDinner, type DinnerForWaitlist} from '~~/server/utils/waitlistAssignment'
import {formatDate} from '~/utils/date'
import {useTicket} from '~/composables/useTicket'
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

export const emitWaitlistJoined = (
    channel: EmailChannel, to: string | null, name: string, dinner: WaitlistDinnerContext, position: number, ticketType: string
): Promise<SenderEmitResult> => {
    if (!channel.on) return channelOff('WAITLIST_JOINED', channel.missing, `${dinner.dinnerEventId}`)
    if (!to) return notSent('WAITLIST_JOINED', 'unaddressed', `${dinner.dinnerEventId}`)
    return emit(channel.queue, composeEmail(channel.config, {
        kind: 'WAITLIST_JOINED',
        to,
        values: {name, dinner: dinnerLabel(dinner), position: String(position), ticketType},
        correlationId: `dinner ${dinner.dinnerEventId}`
    }))
}

export const emitWaitlistTicketAssigned = (
    channel: EmailChannel, to: string | null, name: string, dinner: WaitlistDinnerContext, ticket: string, seller: string, buyer: string
): Promise<SenderEmitResult> => {
    if (!channel.on) return channelOff('WAITLIST_TICKET_ASSIGNED', channel.missing, `${dinner.dinnerEventId}`)
    if (!to) return notSent('WAITLIST_TICKET_ASSIGNED', 'unaddressed', `${dinner.dinnerEventId}`)
    return emit(channel.queue, composeEmail(channel.config, {
        kind: 'WAITLIST_TICKET_ASSIGNED',
        to,
        values: {name, dinner: dinnerLabel(dinner), ticket, seller, buyer},
        correlationId: `dinner ${dinner.dinnerEventId}`
    }))
}

export const emitWaitlistExtraPortion = (
    channel: EmailChannel, to: string | null, name: string, dinner: WaitlistDinnerContext, ticket: string, buyer: string
): Promise<SenderEmitResult> => {
    if (!channel.on) return channelOff('WAITLIST_EXTRA_PORTION', channel.missing, `${dinner.dinnerEventId}`)
    if (!to) return notSent('WAITLIST_EXTRA_PORTION', 'unaddressed', `${dinner.dinnerEventId}`)
    return emit(channel.queue, composeEmail(channel.config, {
        kind: 'WAITLIST_EXTRA_PORTION',
        to,
        values: {name, dinner: dinnerLabel(dinner), ticket, buyer},
        correlationId: `dinner ${dinner.dinnerEventId}`
    }))
}

export const emitWaitlistBuildup = (
    channel: EmailChannel, to: string | null, name: string, dinner: WaitlistDinnerContext, entries: number, portions: number
): Promise<SenderEmitResult> => {
    if (!channel.on) return channelOff('WAITLIST_BUILDUP', channel.missing, `${dinner.dinnerEventId}`)
    if (!to) {
        console.warn(`${LOG} the chef of dinner ${dinner.dinnerEventId} has no address — buildup mail not sent`)
        return notSent('WAITLIST_BUILDUP', 'unaddressed', `${dinner.dinnerEventId}`)
    }
    return emit(channel.queue, composeEmail(channel.config, {
        kind: 'WAITLIST_BUILDUP',
        to,
        values: {
            name,
            dinner: dinnerLabel(dinner),
            entries: String(entries),
            portions: portions.toLocaleString('da-DK'),
            dinnerUrl: siteUrl(channel.config, '/chef')
        },
        correlationId: `dinner ${dinner.dinnerEventId}`
    }))
}

export const emitTicketSold = (
    channel: EmailChannel, to: string, name: string, dinner: WaitlistDinnerContext, seller: string, buyer: string
): Promise<SenderEmitResult> => {
    if (!channel.on) return channelOff('TICKET_SOLD', channel.missing, `${dinner.dinnerEventId}`)
    return emit(channel.queue, composeEmail(channel.config, {
        kind: 'TICKET_SOLD',
        to,
        values: {name, dinner: dinnerLabel(dinner), seller, buyer},
        correlationId: `dinner ${dinner.dinnerEventId}`
    }))
}

/** The booking mails of one operation, with recipients, names and household shortnames resolved */
export interface BookingMails {
    joined: {to: string | null, name: string, dinner: WaitlistDinnerContext, position: number, ticketType: string}[]
    buildups: {to: string | null, name: string, dinner: WaitlistDinnerContext, entries: number, portions: number}[]
    sold: {to: string, name: string, dinner: WaitlistDinnerContext, seller: string, buyer: string}[]
    assigned: {to: string | null, name: string, dinner: WaitlistDinnerContext, ticket: string, seller: string, buyer: string}[]
    extraPortions: {to: string | null, name: string, dinner: WaitlistDinnerContext, ticket: string, buyer: string}[]
}

export const NO_BOOKING_MAILS: BookingMails = {joined: [], buildups: [], sold: [], assigned: [], extraPortions: []}

export const bookingMails = (channel: EmailChannel, mails: BookingMails): Promise<SenderEmitResult[]> => Promise.all([
    ...mails.joined.map(mail => emitWaitlistJoined(channel, mail.to, mail.name, mail.dinner, mail.position, mail.ticketType)),
    ...mails.buildups.map(mail => emitWaitlistBuildup(channel, mail.to, mail.name, mail.dinner, mail.entries, mail.portions)),
    ...mails.sold.map(mail => emitTicketSold(channel, mail.to, mail.name, mail.dinner, mail.seller, mail.buyer)),
    ...mails.assigned.map(mail => emitWaitlistTicketAssigned(channel, mail.to, mail.name, mail.dinner, mail.ticket, mail.seller, mail.buyer)),
    ...mails.extraPortions.map(mail => emitWaitlistExtraPortion(channel, mail.to, mail.name, mail.dinner, mail.ticket, mail.buyer))
])

const ticketLabel = (ticketPrices: TicketPrice[], ticketPriceId: number): string =>
    ticketPrices.find(price => price.id === ticketPriceId)?.description ?? 'billet'

const emailOf = async (d1Client: D1Database, userId: number | null | undefined): Promise<string | null> =>
    userId ? (await fetchUser(d1Client, {id: userId}))?.email ?? null : null

// The user behind an inhabitant, when the inhabitant has one
const addressOf = async (d1Client: D1Database, inhabitantId: number): Promise<{email: string | null, name: string}> => {
    const inhabitant = await fetchInhabitant(d1Client, inhabitantId)
    return {email: await emailOf(d1Client, inhabitant?.userId), name: inhabitant?.name ?? ''}
}

// Each dinner and household is read once per operation
const memo = <T>(load: (id: number) => Promise<T>) => {
    const loaded = new Map<number, Promise<T>>()
    return (id: number): Promise<T> => loaded.get(id) ?? loaded.set(id, load(id)).get(id)!
}

const resolver = (d1Client: D1Database) => {
    const dinnerOf = memo((id: number): Promise<DinnerForWaitlist> => loadDinner(d1Client, id))
    const householdOf = memo((id: number) => fetchHousehold(d1Client, id))
    const shortnameOf = async (householdId: number): Promise<string> => (await householdOf(householdId))?.shortName ?? `#${householdId}`
    // The selling household hears through every member with an address
    const soldMails = async (sale: TicketSale): Promise<BookingMails['sold']> => {
        const [dinner, household, seller, buyer] = await Promise.all([
            dinnerOf(sale.dinnerEventId), householdOf(sale.sellerHouseholdId), shortnameOf(sale.sellerHouseholdId), shortnameOf(sale.buyerHouseholdId)
        ])
        const members = await Promise.all((household?.inhabitants ?? []).map(async inhabitant => ({to: await emailOf(d1Client, inhabitant.userId), name: inhabitant.name})))
        return members.flatMap(({to, name}) => to ? [{to, name, dinner: dinner.context, seller, buyer}] : [])
    }
    return {dinnerOf, shortnameOf, soldMails}
}

/** The mails for what a scaffold run did: joined, sold, and sold to the first in a ticket type's line */
export const notifyBookingOutcomes = neverThrows('booking outcomes', async (d1Client: D1Database, channel: EmailChannel, outcomes: BookingOutcomes): Promise<SenderEmitResult[]> => {
    const {dinnerOf, shortnameOf, soldMails} = resolver(d1Client)
    const threshold = useAppConfig().theslope.waitlistBuildupThreshold

    const joined = await Promise.all(outcomes.joined.map(async event => {
        const [dinner, to, {name}] = await Promise.all([dinnerOf(event.dinnerEventId), emailOf(d1Client, event.bookedByUserId), addressOf(d1Client, event.inhabitantId)])
        return {to, name, dinner: dinner.context, position: event.position, ticketType: event.ticketType ? useTicket().ticketTypeWords[event.ticketType].label : '-'}
    }))
    const buildups = await Promise.all(outcomes.joined.filter(event => event.queueSize === threshold).map(async event => {
        const dinner = await dinnerOf(event.dinnerEventId)
        if (!dinner.chefId) return []
        const chef = await addressOf(d1Client, dinner.chefId)
        return [{to: chef.email, name: chef.name, dinner: dinner.context, entries: event.queueSize, portions: event.portionNeed}]
    }))
    const allSales = [...outcomes.ticketsSold, ...outcomes.waitlistTicketsSold]
    const sold = await Promise.all(allSales.map(soldMails))
    const assigned = await Promise.all(outcomes.waitlistTicketsSold.map(async sale => {
        const [dinner, {email, name}, seller, buyer] = await Promise.all([
            dinnerOf(sale.dinnerEventId), addressOf(d1Client, sale.buyerInhabitantId), shortnameOf(sale.sellerHouseholdId), shortnameOf(sale.buyerHouseholdId)
        ])
        return {to: email, name, dinner: dinner.context, ticket: ticketLabel(dinner.ticketPrices, sale.ticketPriceId), seller, buyer}
    }))
    return bookingMails(channel, {...NO_BOOKING_MAILS, joined, buildups: buildups.flat(), sold: sold.flat(), assigned})
})

/** The mails for the chef's extra portions: each waiting entry that fit got a regular order */
export const notifyExtraPortions = neverThrows('extra portions', async (d1Client: D1Database, channel: EmailChannel, result: WaitlistAssignmentResult): Promise<SenderEmitResult[]> => {
    const {dinnerOf, shortnameOf} = resolver(d1Client)
    const dinner = await dinnerOf(result.dinnerEventId)
    const extraPortions = await Promise.all(result.assigned.map(async entry => {
        const inhabitant = await fetchInhabitant(d1Client, entry.inhabitantId)
        const [to, buyer] = await Promise.all([emailOf(d1Client, inhabitant?.userId), inhabitant ? shortnameOf(inhabitant.householdId) : Promise.resolve('')])
        return {to, name: inhabitant?.name ?? '', dinner: dinner.context, ticket: ticketLabel(dinner.ticketPrices, entry.ticketPriceId), buyer}
    }))
    return bookingMails(channel, {...NO_BOOKING_MAILS, extraPortions})
})
