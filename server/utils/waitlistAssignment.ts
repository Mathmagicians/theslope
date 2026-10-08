import {useWaitlist} from '~/composables/useWaitlist'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {getPortionsForTicketType} from '~/utils/portions'
import type {TicketWaitlistDisplay, WaitlistAssigned, WaitlistAssignmentResult, WaitlistQueueSummary, NotificationOutcome} from '~/composables/useWaitlistValidation'
import type {NotificationConfig} from '~/composables/useNotificationValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import {createOrders, claimOrder, fetchDinnerEvent} from '~~/server/data/financesRepository'
import {fetchSeason, fetchInhabitant, fetchUser, fetchHousehold} from '~~/server/data/prismaRepository'
import {fetchWaitlistForDinner, deleteWaitlistEntry} from '~~/server/data/waitlistRepository'
import {emitWaitlistTicketAssigned, emitWaitlistTicketSold, type WaitlistDinnerContext} from '~~/server/utils/sender/events/waitlist'

const LOG = '⏳ > WAITLIST > [ASSIGN]'

export interface WaitlistSender {
    queue: Queue | undefined
    config: NotificationConfig
}

interface DinnerForWaitlist {
    context: WaitlistDinnerContext
    seasonId: number
    ticketPrices: TicketPrice[]
}

// The dinner, its season's ticket prices and the label the mails use
const loadDinner = async (d1Client: D1Database, dinnerEventId: number): Promise<DinnerForWaitlist> => {
    const dinner = await fetchDinnerEvent(d1Client, dinnerEventId)
    if (!dinner?.seasonId) throw new Error(`${LOG} Dinner ${dinnerEventId} not found in a season`)
    const season = await fetchSeason(d1Client, dinner.seasonId)
    if (!season) throw new Error(`${LOG} Season ${dinner.seasonId} of dinner ${dinnerEventId} not found`)
    return {
        context: {dinnerEventId, date: dinner.date, menuTitle: dinner.menuTitle},
        seasonId: season.id!,
        ticketPrices: season.ticketPrices
    }
}

// An entry weighs what its ticket type weighs on the kitchen's count
export const portionsOfEntryFor = (ticketPrices: TicketPrice[]) => {
    return (entry: TicketWaitlistDisplay): number => {
        const ticketPrice = ticketPrices.find(price => price.id === entry.order.ticketPriceId)
        return ticketPrice ? getPortionsForTicketType(ticketPrice.ticketType) : 0
    }
}

const ticketLabel = (ticketPrices: TicketPrice[], ticketPriceId: number): string =>
    ticketPrices.find(price => price.id === ticketPriceId)?.description ?? 'billet'

// The user behind an inhabitant, when the inhabitant has one
const addressOf = async (d1Client: D1Database, inhabitantId: number): Promise<{email: string | null, name: string}> => {
    const inhabitant = await fetchInhabitant(d1Client, inhabitantId)
    if (!inhabitant?.userId) return {email: null, name: inhabitant?.name ?? ''}
    const user = await fetchUser(d1Client, {id: inhabitant.userId})
    return {email: user?.email ?? null, name: inhabitant.name}
}

const outcome = ({queued, dedupeKey}: {queued: boolean, dedupeKey: string}): NotificationOutcome => ({queued, dedupeKey})

export async function summarizeWaitlist(d1Client: D1Database, dinnerEventId: number): Promise<WaitlistQueueSummary> {
    const {portionNeed} = useWaitlist()
    const [dinner, entries] = await Promise.all([loadDinner(d1Client, dinnerEventId), fetchWaitlistForDinner(d1Client, dinnerEventId)])
    return {dinnerEventId, entries: entries.length, portions: portionNeed(entries, portionsOfEntryFor(dinner.ticketPrices))}
}

// Places one entry's order, removes the entry and tells the inhabitant
const placeEntry = async (
    d1Client: D1Database, dinner: DinnerForWaitlist, entry: TicketWaitlistDisplay, portions: number,
    performedByUserId: number | null, sender: WaitlistSender
): Promise<WaitlistAssigned> => {
    const {OrderAuditActionSchema} = useBookingValidation()
    const {allergyTypeIds: _allergies, ...order} = entry.order
    const created = await createOrders(d1Client, order.householdId, [order], {
        action: OrderAuditActionSchema.enum.SYSTEM_CREATED,
        performedByUserId,
        source: 'waitlist-assignment',
        seasonId: dinner.seasonId
    })
    await deleteWaitlistEntry(d1Client, entry.id)
    const {email, name} = await addressOf(d1Client, entry.inhabitantId)
    const notification = await emitWaitlistTicketAssigned(sender.queue, sender.config, email, name, dinner.context, ticketLabel(dinner.ticketPrices, entry.order.ticketPriceId))
    return {entryId: entry.id, inhabitantId: entry.inhabitantId, isGuestTicket: entry.isGuestTicket, portions, orderId: created.createdIds[0]!, notification: outcome(notification)}
}

/**
 * The chef releases N portions: the resolver walks the queue in strict FIFO and the entries that fit get their
 * orders at the price written at join. Idempotent: an entry placed once is gone from the queue, and the Order
 * unique index refuses a second regular order for the same inhabitant and dinner (ADR-015).
 */
export async function assignWaitlistPortions(
    d1Client: D1Database, dinnerEventId: number, supplyPortions: number, performedByUserId: number | null, sender: WaitlistSender
): Promise<WaitlistAssignmentResult> {
    const {resolveWaitlistAssignment} = useWaitlist()
    const dinner = await loadDinner(d1Client, dinnerEventId)
    const entries = await fetchWaitlistForDinner(d1Client, dinnerEventId)
    const plan = resolveWaitlistAssignment(entries, supplyPortions, portionsOfEntryFor(dinner.ticketPrices))
    console.info(`${LOG} Dinner ${dinnerEventId}: ${supplyPortions} portions released, ${plan.take.length} of ${entries.length} entries fit`)
    const assigned: WaitlistAssigned[] = []
    for (const {entry, portions} of plan.take) {
        assigned.push(await placeEntry(d1Client, dinner, entry, portions, performedByUserId, sender))
    }
    return {dinnerEventId, supplyPortions, assigned, portionsUsed: plan.portionsUsed, waiting: plan.waiting.length}
}

/**
 * A ticket released after the deadline goes to the head of the queue when the head waits for that ticket type:
 * the existing conditional claim moves the order to the waiting inhabitant, the entry leaves the queue, and the
 * releasing household hears that its ticket is sold. A head waiting for another type keeps the ticket on the
 * marketplace; nobody overtakes.
 */
export async function assignReleasedTicket(
    d1Client: D1Database, dinnerEventId: number, ticketPriceId: number, releasedByHouseholdId: number, sender: WaitlistSender
): Promise<WaitlistAssigned | null> {
    const {inQueueOrder} = useWaitlist()
    const entries = inQueueOrder(await fetchWaitlistForDinner(d1Client, dinnerEventId))
    const head = entries[0]
    if (!head || head.order.ticketPriceId !== ticketPriceId) return null
    const dinner = await loadDinner(d1Client, dinnerEventId)
    const claimed = await claimOrder(d1Client, dinnerEventId, ticketPriceId, head.inhabitantId, head.order.bookedByUserId ?? null, head.order.dinnerMode, head.isGuestTicket)
    if (!claimed) return null
    await deleteWaitlistEntry(d1Client, head.id)
    const {email, name} = await addressOf(d1Client, head.inhabitantId)
    const notification = await emitWaitlistTicketAssigned(sender.queue, sender.config, email, name, dinner.context, ticketLabel(dinner.ticketPrices, ticketPriceId))
    const household = await fetchHousehold(d1Client, releasedByHouseholdId)
    for (const inhabitant of household?.inhabitants ?? []) {
        if (!inhabitant.userId) continue
        const user = await fetchUser(d1Client, {id: inhabitant.userId})
        if (user?.email) await emitWaitlistTicketSold(sender.queue, sender.config, user.email, dinner.context)
    }
    console.info(`${LOG} Dinner ${dinnerEventId}: released ticket ${ticketPriceId} went to the head of the queue (inhabitant ${head.inhabitantId})`)
    const portions = portionsOfEntryFor(dinner.ticketPrices)(head)
    return {entryId: head.id, inhabitantId: head.inhabitantId, isGuestTicket: head.isGuestTicket, portions, orderId: claimed.id, notification: outcome(notification)}
}
