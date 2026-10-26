import {describe, it, expect, vi, beforeEach} from 'vitest'
import {createError} from 'h3'
import {subMinutes, subYears} from 'date-fns'
import {scaffoldPrebookings, type ScaffoldOptions} from '~~/server/utils/scaffoldPrebookings'
import {joinWaitlist, sellTicketsToWaitlist} from '~~/server/utils/waitlistAssignment'
import {fetchHouseholds, fetchHouseholdsByInhabitantIds, fetchSeason} from '~~/server/data/prismaRepository'
import {
    claimOrder, claimReleasedOrder, countReleasedTicketsByType, createOrders, deleteOrder, fetchOrders, fetchUserIntentKeys, findReleasedOrderId, recordCancellation,
    updateOrdersBatch, type OrderBatchUpdate
} from '~~/server/data/financesRepository'
import {
    createWaitlistEntries, deleteWaitlistEntries, fetchWaitlistForDinners, grabWaitlistEntry, removePlacedWaitlistEntry, updateWaitlistEntryOrders
} from '~~/server/data/waitlistRepository'
import {useBookingValidation, OrderAuditAction as AuditActions, type DesiredOrder, type DinnerMode, type OrderAuditAction, type OrderDisplay, type ScaffoldResult, type TicketType} from '~/composables/useBookingValidation'
import type {TicketWaitlistCreate, TicketWaitlistDisplay} from '~/composables/useWaitlistValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import {getHouseholdShortName, useCoreValidation} from '~/composables/useCoreValidation'
import {callsInFlight} from '~~/tests/component/data/fakePrismaClient'
import type {WeekDayMap} from '~/types/dateTypes'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {OPEN_DEADLINES} from '~/composables/useSeason'
import {dateToWeekDay} from '~/utils/season'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'

// The scaffolder reads the app config, and its error log builds errors, from the Nitro auto-import scope
await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).stubAppConfig())
vi.stubGlobal('createError', createError)

// The repositories stand for the database the unit runtime lacks; the snapshot builder runs as written, and with it the
// repository modules it is defined beside
vi.mock('~~/server/data/prismaRepository', async importOriginal => ({
    ...await importOriginal<typeof import('~~/server/data/prismaRepository')>(),
    fetchHouseholds: vi.fn(), fetchHouseholdsByInhabitantIds: vi.fn(), fetchSeason: vi.fn(), fetchActiveSeasonId: vi.fn(), fetchUser: vi.fn()
}))
vi.mock('~~/server/data/financesRepository', async importOriginal => ({
    orderSnapshotOf: (await importOriginal<typeof import('~~/server/data/financesRepository')>()).orderSnapshotOf,
    fetchOrders: vi.fn(), fetchUserIntentKeys: vi.fn(), createOrders: vi.fn(), deleteOrder: vi.fn(), updateOrdersBatch: vi.fn(),
    claimOrder: vi.fn(), countReleasedTicketsByType: vi.fn(), findReleasedOrderId: vi.fn(), claimReleasedOrder: vi.fn(), recordCancellation: vi.fn()
}))
vi.mock('~~/server/data/waitlistRepository', () => ({
    fetchWaitlistForDinners: vi.fn(), deleteWaitlistEntries: vi.fn(), updateWaitlistEntryOrders: vi.fn(), createWaitlistEntries: vi.fn(), grabWaitlistEntry: vi.fn(), removePlacedWaitlistEntry: vi.fn(), releaseWaitlistEntry: vi.fn(), recordWaitlistPlacingOrder: vi.fn(), fetchOrdersServingEntry: vi.fn()
}))
// The system account is a seeded user the unit runtime lacks
vi.mock('~~/server/utils/systemUser', () => ({getSystemUserId: vi.fn(async () => 1)}))
// The waiting-list writes run as written; the spies record whether a run reaches them
vi.mock('~~/server/utils/waitlistAssignment', async importOriginal => {
    const original = await importOriginal<typeof import('~~/server/utils/waitlistAssignment')>()
    return {...original, joinWaitlist: vi.fn(original.joinWaitlist), sellTicketsToWaitlist: vi.fn(original.sellTicketsToWaitlist)}
})

const d1Client = {} as D1Database
const {DinnerModeSchema, DinnerStateSchema, BookingActionSchema, BookingFailureSchema, TicketTypeSchema, OrderStateSchema, OrderAuditSourceSchema} = useBookingValidation()
const {createDefaultWeekdayMap} = useCoreValidation()
const Mode = DinnerModeSchema.enum
const Action = BookingActionSchema.enum
const Source = OrderAuditSourceSchema.enum
const {ADULT, CHILD} = TicketTypeSchema.enum

// The writes a run makes; a preview makes none
const writeUpdates = vi.fn(async (_d1: D1Database, updates: OrderBatchUpdate[]) => updates.length)
const writers = {createOrders, writeUpdates, deleteOrder, claimOrder, joinWaitlist, deleteWaitlistEntries, updateWaitlistEntryOrders, sellTicketsToWaitlist}
const writersCalled = () => Object.entries(writers).filter(([, writer]) => vi.mocked(writer).mock.calls.length > 0).map(([name]) => name)

// A preview's queue entries are unsaved and carry their own ids; in everything else it settles as the save
const asPreviewOf = (saved: ScaffoldResult) => ({...saved, outcomes: {...saved.outcomes, joined: saved.outcomes.joined.map(join => ({...join, entryId: expect.any(Number)}))}})

// A household of two on a dinner where Bo holds an order; the household waits for nothing until a test says so
const givenSave = () => {
    const ticketPrices = TicketFactory.defaultTicketPrices().map((price, index) => ({...price, id: index + 1}))
    const adultPrice = ticketPrices.find(price => price.ticketType === TicketTypeSchema.enum.ADULT)!
    const dinner = {...DinnerEventFactory.defaultDinnerEventDisplay(), id: 5}
    const season = {...SeasonFactory.defaultSeason(), id: 1, ticketPrices, dinnerEvents: [dinner]}
    const household = HouseholdFactory.defaultHouseholdDetail()
    const [anna, bo] = household.inhabitants
    const boOrder = OrderFactory.defaultOrder(undefined, {id: 11, inhabitantId: bo!.id, dinnerEventId: dinner.id, ticketPriceId: adultPrice.id, priceAtBooking: adultPrice.price})
    vi.mocked(fetchSeason).mockResolvedValue(season)
    vi.mocked(fetchHouseholds).mockResolvedValue([household])
    vi.mocked(fetchOrders).mockResolvedValue([boOrder])
    vi.mocked(fetchUserIntentKeys).mockResolvedValue({confirmedKeys: new Set(), cancelledKeys: new Set()})
    vi.mocked(fetchWaitlistForDinners).mockResolvedValue([])
    vi.mocked(updateOrdersBatch).mockReturnValue(async (_d1, updates) => updates.length)
    const takeaway = (inhabitantId: number, orderId: number) => OrderFactory.defaultDesiredOrder({
        inhabitantId, orderId, dinnerEventId: dinner.id, ticketPriceId: adultPrice.id, dinnerMode: DinnerModeSchema.enum.TAKEAWAY
    })
    const save = (desiredOrders: DesiredOrder[]) =>
        scaffoldPrebookings(d1Client, {seasonId: season.id, householdId: household.id, userId: 1, deadlines: OPEN_DEADLINES, desiredOrders})
    return {season, household, anna: anna!, bo: bo!, boOrder, dinner, adultPrice, takeaway, save}
}

// Anna's draft changes one dinner per weekday: past the season's cancel deadline it releases, before it it changes the
// mode, cancels and books; Bo's stored preferences want no dinner
const givenPreferenceDraft = () => {
    const {season, household, anna, bo, adultPrice} = givenSave()
    const days = [
        {daysFromToday: 1, stored: Mode.DINEIN, draft: Mode.NONE},
        {daysFromToday: 10, stored: Mode.DINEIN, draft: Mode.TAKEAWAY},
        {daysFromToday: 18, stored: Mode.DINEIN, draft: Mode.NONE},
        {daysFromToday: 26, stored: Mode.NONE, draft: Mode.DINEIN}
    ].map((day, index) => ({...day, dinner: DinnerEventFactory.dinnerEventAt(31 + index, day.daysFromToday)}))
    const preferencesOf = (pick: (day: typeof days[number]) => DinnerMode): WeekDayMap<DinnerMode> => ({
        ...createDefaultWeekdayMap(Mode.NONE),
        ...Object.fromEntries(days.map(day => [dateToWeekDay(day.dinner.date), pick(day)]))
    })
    const householdWith = (annaPreferences: WeekDayMap<DinnerMode>) => ({
        ...household,
        inhabitants: [{...anna, dinnerPreferences: annaPreferences}, {...bo, dinnerPreferences: createDefaultWeekdayMap(Mode.NONE)}]
    })
    const draft = preferencesOf(day => day.draft)
    vi.mocked(fetchSeason).mockResolvedValue({...season, dinnerEvents: days.map(day => day.dinner)})
    vi.mocked(fetchOrders).mockResolvedValue(days.filter(day => day.stored !== Mode.NONE).map((day, index) => OrderFactory.defaultOrder(undefined, {
        id: 41 + index, inhabitantId: anna.id, dinnerEventId: day.dinner.id, ticketPriceId: adultPrice.id, priceAtBooking: adultPrice.price
    })))
    writeUpdates.mockImplementation(async (_d1, updates) => updates.length)
    vi.mocked(updateOrdersBatch).mockReturnValue(writeUpdates)
    // The endpoint's runs: the preview over the stored household, the save over the household holding the draft
    const preview = () => {
        vi.mocked(fetchHouseholds).mockResolvedValue([householdWith(preferencesOf(day => day.stored))])
        return scaffoldPrebookings(d1Client, {seasonId: season.id, householdId: household.id, preferences: [{inhabitantId: anna.id, dinnerPreferences: draft}], preview: true})
    }
    const save = () => {
        vi.mocked(fetchHouseholds).mockResolvedValue([householdWith(draft)])
        return scaffoldPrebookings(d1Client, {seasonId: season.id, householdId: household.id})
    }
    return {preview, save}
}

// Household 8's inhabitant 99 sells a ticket on the closed dinner, or waits for one
const OTHER_HOUSEHOLD_ID = 8
const OTHER_INHABITANT_ID = 99

// A ticket for sale and the household that sells it
type TicketOnSale = {order: OrderDisplay, householdId: number}
const released = (order: OrderDisplay, minutesAgo: number): OrderDisplay => ({...order, state: OrderStateSchema.enum.RELEASED, releasedAt: subMinutes(new Date(), minutesAgo)})

/**
 * The closed dinners' supply as the database holds it: the tickets for sale and the waiting list. A release of a ticket
 * the households hold puts it on sale, a claim buys the oldest ticket of its type, a join appends its entries in join
 * order and the unique index refuses a second regular entry for a person on a dinner, a sale moves a ticket to the first
 * in its line
 */
const givenSupply = (ticketPrices: TicketPrice[], tickets: TicketOnSale[], entries: TicketWaitlistDisplay[], held: TicketOnSale[] = []) => {
    const ticketTypeOf = (ticketPriceId: number | null) => ticketPrices.find(price => price.id === ticketPriceId)?.ticketType
    const oldestOfType = (dinnerEventId: number, ticketType: TicketType) => tickets
        .filter(({order}) => order.dinnerEventId === dinnerEventId && ticketTypeOf(order.ticketPriceId) === ticketType)
        .sort((a, b) => a.order.releasedAt!.getTime() - b.order.releasedAt!.getTime())[0]
    const sell = (ticket: TicketOnSale) => {
        tickets.splice(tickets.indexOf(ticket), 1)
        return {order: OrderFactory.defaultOrderDetail(undefined, {id: ticket.order.id}), ticketPriceId: ticket.order.ticketPriceId!, sellerHouseholdId: ticket.householdId, sellerInhabitantId: ticket.order.inhabitantId}
    }
    let nextEntryId = 500
    const join = (requests: TicketWaitlistCreate[]): TicketWaitlistDisplay[] => {
        const joined = requests.map(request => ({...request, id: nextEntryId++, createdAt: new Date(), placingAt: null, placingOrderId: null}))
        const regulars = [...entries, ...joined].filter(entry => !entry.isGuestTicket).map(entry => `${entry.inhabitantId}-${entry.dinnerEventId}`)
        if (new Set(regulars).size < regulars.length) throw createError({statusCode: 409, message: 'One regular entry per person and dinner'})
        entries.push(...joined)
        return joined
    }

    vi.mocked(fetchHouseholdsByInhabitantIds).mockResolvedValue([{
        ...HouseholdFactory.defaultHouseholdDetail('seller'), id: OTHER_HOUSEHOLD_ID,
        inhabitants: [{...HouseholdFactory.defaultInhabitantData('seller'), id: OTHER_INHABITANT_ID, householdId: OTHER_HOUSEHOLD_ID}]
    }])
    vi.mocked(countReleasedTicketsByType).mockImplementation(async (_d1, dinnerEventId) => tickets
        .filter(({order}) => order.dinnerEventId === dinnerEventId)
        .reduce((counts, {order}) => {
            const ticketType = ticketTypeOf(order.ticketPriceId)
            return ticketType ? counts.set(ticketType, (counts.get(ticketType) ?? 0) + 1) : counts
        }, new Map<TicketType, number>()))
    vi.mocked(claimOrder).mockImplementation(async (_d1, dinnerEventId, ticketType) => {
        const ticket = oldestOfType(dinnerEventId, ticketType)
        return ticket ? sell(ticket) : null
    })
    vi.mocked(findReleasedOrderId).mockImplementation(async (_d1, dinnerEventId, ticketType) => oldestOfType(dinnerEventId, ticketType)?.order.id ?? null)
    vi.mocked(claimReleasedOrder).mockImplementation(async (_d1, orderId) => {
        const ticket = tickets.find(({order}) => order.id === orderId)
        return ticket ? sell(ticket) : null
    })
    vi.mocked(fetchWaitlistForDinners).mockImplementation(async (_d1, dinnerEventIds) => entries.filter(entry => dinnerEventIds.includes(entry.dinnerEventId)))
    vi.mocked(createWaitlistEntries).mockImplementation(async (_d1, joins) => join(joins.map(({entry}) => entry)))
    vi.mocked(grabWaitlistEntry).mockResolvedValue(true)
    vi.mocked(removePlacedWaitlistEntry).mockImplementation(async (_d1, id) => {
        entries.splice(entries.findIndex(entry => entry.id === id), 1)
        return 1
    })
    writeUpdates.mockImplementation(async (_d1, updates) => {
        for (const {orderId} of updates.filter(update => update.isNewRelease)) {
            const {order, householdId} = held.find(ticket => ticket.order.id === orderId)!
            tickets.push({order: released(order, 0), householdId})
        }
        return updates.length
    })
    vi.mocked(updateOrdersBatch).mockReturnValue(writeUpdates)
}

/**
 * The closed dinner's supply, the same input for a preview and a save: household 8's ticket for sale and its inhabitant
 * waiting. A save's claims, joins, releases and sales write it. Anna and Bo store no dinner; Anna holds a ticket on the
 * dinner when `annaHolds`, stored as her dine-in preference
 */
const givenClosedDinner = ({forSale, waiting, annaHolds}: {forSale: boolean, waiting: boolean, annaHolds: boolean}) => {
    const {season, household, anna, bo, dinner, adultPrice} = givenSave()
    const orderOn = (id: number, inhabitantId: number) => OrderFactory.defaultOrder(undefined, {id, inhabitantId, dinnerEventId: dinner.id, ticketPriceId: adultPrice.id, priceAtBooking: adultPrice.price})
    const householdOrders = annaHolds ? [orderOn(41, anna.id)] : []
    const tickets = forSale ? [{order: released(orderOn(90, OTHER_INHABITANT_ID), 60), householdId: OTHER_HOUSEHOLD_ID}] : []
    const entries: TicketWaitlistDisplay[] = waiting ? [WaitlistFactory.defaultEntry({
        id: 21, inhabitantId: OTHER_INHABITANT_ID, dinnerEventId: dinner.id, ticketPrice: adultPrice, householdId: OTHER_HOUSEHOLD_ID, createdAt: subMinutes(new Date(), 60)
    })] : []
    const storedHousehold = (preferenceOf: (inhabitantId: number) => DinnerMode) =>
        ({...household, inhabitants: household.inhabitants.map(inhabitant => ({...inhabitant, dinnerPreferences: createDefaultWeekdayMap(preferenceOf(inhabitant.id))}))})

    vi.mocked(fetchHouseholds).mockResolvedValue([storedHousehold(inhabitantId => annaHolds && inhabitantId === anna.id ? Mode.DINEIN : Mode.NONE)])
    vi.mocked(fetchOrders).mockResolvedValue([...householdOrders, ...tickets.map(({order}) => order)])
    givenSupply(season.ticketPrices, tickets, entries, householdOrders.map(order => ({order, householdId: household.id})))

    const idOf = {anna: anna.id, bo: bo.id}
    const scaffold = (options: Omit<ScaffoldOptions, 'seasonId' | 'householdId'>) => scaffoldPrebookings(d1Client, {seasonId: season.id, householdId: household.id, ...options})
    // Anna's and Bo's wishes for the dinner: as draft preferences for every weekday, or as the grid's desired orders
    const intents = {
        preferences: {
            preview: (modes: readonly DinnerMode[]) => scaffold({preview: true, preferences: [anna, bo].map((inhabitant, index) => ({inhabitantId: inhabitant.id, dinnerPreferences: createDefaultWeekdayMap(modes[index]!)}))}),
            // The endpoint stores the draft, then scaffolds the household
            save: (modes: readonly DinnerMode[]) => {
                vi.mocked(fetchHouseholds).mockResolvedValue([storedHousehold(inhabitantId => modes[inhabitantId === anna.id ? 0 : 1]!)])
                return scaffold({})
            }
        },
        desiredOrders: {
            preview: (modes: readonly DinnerMode[]) => scaffold({preview: true, userId: 1, desiredOrders: wishes(modes)}),
            save: (modes: readonly DinnerMode[]) => scaffold({userId: 1, desiredOrders: wishes(modes)})
        }
    }
    // The grid sends the cells a member changes: Ingen for a person holding nothing is no change
    const wishes = (modes: readonly DinnerMode[]): DesiredOrder[] => [anna, bo].flatMap((inhabitant, index) => {
        const orderId = householdOrders.find(order => order.inhabitantId === inhabitant.id)?.id
        return modes[index] === Mode.NONE && orderId === undefined ? [] : [OrderFactory.defaultDesiredOrder({
            inhabitantId: inhabitant.id, dinnerEventId: dinner.id, ticketPriceId: adultPrice.id, dinnerMode: modes[index], orderId
        })]
    })
    return {intents, idOf, householdId: household.id}
}

/**
 * Households claiming closed dinners by their stored preferences, in the order the run takes them: one person per ticket
 * type listed, each eating every day. Each dinner holds `forSale` adult tickets of household 8 and `waiting` of its people
 * in the adult line; with `queued` the claimers already wait in their lines. A last household of `releasing` adults holds
 * an adult ticket on each dinner and eats on no day
 */
const givenClaims = ({households: people, dinners, forSale = 0, waiting = 0, queued = false, releasing = 0}: {
    households: TicketType[][], dinners: number, forSale?: number, waiting?: number, queued?: boolean, releasing?: number
}) => {
    const {season, household} = givenSave()
    const closedDinners = Array.from({length: dinners}, (_, index) => DinnerEventFactory.dinnerEventAt(51 + index, 1 + index))
    const priceOf = (ticketType: TicketType) => season.ticketPrices.find(price => price.ticketType === ticketType)!
    const adultPrice = priceOf(ADULT)
    const personOf = (id: number, householdId: number, ticketType: TicketType, dinnerMode: DinnerMode) => ({
        ...HouseholdFactory.defaultInhabitantData(`person${id}`), id, householdId,
        birthDate: subYears(new Date(), ticketType === CHILD ? 6 : 30), dinnerPreferences: createDefaultWeekdayMap(dinnerMode)
    })
    // The first household is the one a scoped run names
    const claiming = people.map((_, index) => index === 0 ? household : HouseholdFactory.defaultHouseholdDetail(`claimers${index}`))
    const claims = people.flatMap((ticketTypes, index) => ticketTypes.map(ticketType => ({ticketType, householdId: claiming[index]!.id})))
    const claimers = claims.map(({ticketType, householdId}, index) => personOf(700 + index, householdId, ticketType, Mode.DINEIN))
    const sellers = HouseholdFactory.defaultHouseholdDetail('releasing')
    const sellerPeople = Array.from({length: releasing}, (_, index) => personOf(800 + index, sellers.id, ADULT, Mode.NONE))
    const held = closedDinners.flatMap(dinner => sellerPeople.map((seller, index) => ({
        order: OrderFactory.defaultOrder(undefined, {
            id: 2000 + 10 * dinner.id + index, inhabitantId: seller.id, dinnerEventId: dinner.id, ticketPriceId: adultPrice.id, priceAtBooking: adultPrice.price
        }),
        householdId: sellers.id
    })))
    const tickets = closedDinners.flatMap(dinner => Array.from({length: forSale}, (_, index) => ({
        order: released(OrderFactory.defaultOrder(undefined, {
            id: 900 + 10 * dinner.id + index, inhabitantId: OTHER_INHABITANT_ID, dinnerEventId: dinner.id, ticketPriceId: adultPrice.id, priceAtBooking: adultPrice.price
        }), 60),
        householdId: OTHER_HOUSEHOLD_ID
    })))
    const entryOn = (dinnerEventId: number, inhabitantId: number, ticketType: TicketType, householdId: number, minutesAgo: number) =>
        WaitlistFactory.defaultEntry({dinnerEventId, inhabitantId, ticketPrice: priceOf(ticketType), householdId, createdAt: subMinutes(new Date(), minutesAgo)})
    const entries = [
        ...closedDinners.flatMap(dinner => Array.from({length: waiting}, (_, index) => entryOn(dinner.id, OTHER_INHABITANT_ID + index, ADULT, OTHER_HOUSEHOLD_ID, 60 - index))),
        ...(queued ? closedDinners.flatMap(dinner => claimers.map((claimer, index) => entryOn(dinner.id, claimer.id, claims[index]!.ticketType, claimer.householdId, 30))) : [])
    ].map((entry, index) => ({...entry, id: 21 + index}))
    const households = [
        ...claiming.map(candidate => ({...candidate, inhabitants: claimers.filter(claimer => claimer.householdId === candidate.id)})),
        ...(releasing > 0 ? [{...sellers, inhabitants: sellerPeople}] : [])
    ]

    vi.mocked(fetchSeason).mockResolvedValue({...season, dinnerEvents: closedDinners})
    vi.mocked(fetchHouseholds).mockImplementation(async (_d1, householdId) => households.filter(candidate => householdId === undefined || candidate.id === householdId))
    vi.mocked(fetchOrders).mockResolvedValue([...held.map(({order}) => order), ...tickets.map(({order}) => order)])
    givenSupply(season.ticketPrices, tickets, entries, held)
    const scaffold = (options: Omit<ScaffoldOptions, 'seasonId'> = {}) => scaffoldPrebookings(d1Client, {seasonId: season.id, ...options})
    return {claimers, sellerPeople, dinners: closedDinners, householdId: household.id, sellerHouseholdId: sellers.id, scaffold}
}


describe('scaffoldPrebookings', () => {
    // User mode books for a household on a user's behalf: the audit names the user and the run stays in the household
    it.each([
        {missing: 'userId', options: {householdId: 1}},
        {missing: 'householdId', options: {userId: 1}}
    ])('refuses user mode without $missing', async ({options}) => {
        await expect(scaffoldPrebookings(d1Client, {...options, seasonId: 1, desiredOrders: [OrderFactory.defaultDesiredOrder()]}))
            .rejects.toThrow('User mode (desiredOrders provided) requires both householdId and userId')
    })

    it('GIVEN a save naming an order the household no longer holds WHEN scaffolding THEN that order is listed as failed and the save\'s other orders land', async () => {
        const {anna, bo, boOrder, takeaway, save} = givenSave()

        // Anna's order went to another household since the page loaded; Bo's is still the household's
        const result = await save([takeaway(anna.id, 10), takeaway(bo.id, boOrder.id)])

        expect(result.failed).toEqual([expect.objectContaining({inhabitantId: anna.id, inhabitantName: anna.name, action: BookingActionSchema.enum.CHANGE_MODE})])
        expect(result.results).toEqual([expect.objectContaining({inhabitantId: bo.id, action: BookingActionSchema.enum.CHANGE_MODE})])
        expect(result.errored).toBe(1)
    })

    // Anna waits on the dinner's waiting list for a takeaway; the save leaves her place or changes it to dine in
    describe.each([
        {change: 'leave', action: BookingActionSchema.enum.LEAVE, dinnerMode: DinnerModeSchema.enum.NONE, refuse: (error: Error) => vi.mocked(deleteWaitlistEntries).mockRejectedValue(error)},
        {change: 'change', action: BookingActionSchema.enum.REQUEUE, dinnerMode: DinnerModeSchema.enum.DINEIN, refuse: (error: Error) => vi.mocked(updateWaitlistEntryOrders).mockRejectedValue(error)}
    ])('a refused $change of a place on the waiting list', ({action, dinnerMode, refuse}) => {
        it.each([
            {refusal: 'a run placing the entry', error: () => createError({statusCode: 409, message: 'Queue entry 21 is being placed'}), reason: BookingFailureSchema.enum.CONFLICT},
            {refusal: 'a server error', error: () => createError({statusCode: 500, message: 'D1 down'}), reason: undefined}
        ])('GIVEN $refusal WHEN the household saves THEN the line is listed as failed with its reason and the rest of the save lands', async ({error, reason}) => {
            const {household, anna, bo, boOrder, dinner, adultPrice, takeaway, save} = givenSave()
            const annaQueued = WaitlistFactory.defaultEntry({
                id: 21, inhabitantId: anna.id, dinnerEventId: dinner.id, ticketPrice: adultPrice, householdId: household.id, dinnerMode: DinnerModeSchema.enum.TAKEAWAY
            })
            vi.mocked(fetchWaitlistForDinners).mockResolvedValue([annaQueued])
            refuse(error())

            const result = await save([WaitlistFactory.wishOf(annaQueued, {dinnerMode}), takeaway(bo.id, boOrder.id)])

            expect(result.failed).toEqual([expect.objectContaining({inhabitantId: anna.id, action})])
            expect(result.failed[0]!.reason).toBe(reason)
            expect(result.results).toEqual([expect.objectContaining({inhabitantId: bo.id, action: BookingActionSchema.enum.CHANGE_MODE})])
        })
    })

    describe('a preview', () => {
        beforeEach(() => {
            vi.clearAllMocks()
        })

        it('GIVEN a draft that books, changes the mode, releases and cancels WHEN the preview runs THEN no writer runs and its result is the save\'s', async () => {
            const {preview, save} = givenPreferenceDraft()

            const previewed = await preview()
            expect(writersCalled()).toEqual([])

            const saved = await save()
            expect(writersCalled()).toEqual(['createOrders', 'writeUpdates', 'deleteOrder', 'sellTicketsToWaitlist'])
            expect(previewed).toEqual(asPreviewOf(saved))
        })

        // Anna and Bo wish for the adult tickets of a dinner past its deadline; the save on the same input writes what the
        // preview read and answers the same
        const CLOSED_DINNER = [
            {
                supply: 'one ticket for sale and nobody waiting', forSale: true, waiting: false, annaHolds: false, modes: [Mode.DINEIN, Mode.DINEIN],
                lines: [['anna', Action.BUY], ['bo', Action.QUEUE]], places: [['bo', 1]], soldToLine: [], writes: ['claimOrder', 'joinWaitlist', 'sellTicketsToWaitlist']
            },
            {
                supply: 'one ticket for sale and somebody waiting', forSale: true, waiting: true, annaHolds: false, modes: [Mode.DINEIN, Mode.DINEIN],
                lines: [['anna', Action.QUEUE], ['bo', Action.QUEUE]], places: [['anna', 2], ['bo', 3]], soldToLine: ['other'], writes: ['joinWaitlist', 'sellTicketsToWaitlist']
            },
            {
                supply: 'nothing for sale', forSale: false, waiting: false, annaHolds: false, modes: [Mode.DINEIN, Mode.DINEIN],
                lines: [['anna', Action.QUEUE], ['bo', Action.QUEUE]], places: [['anna', 1], ['bo', 2]], soldToLine: [], writes: ['joinWaitlist', 'sellTicketsToWaitlist']
            },
            {
                supply: 'somebody waiting while Anna turns her ticket to Ingen', forSale: false, waiting: true, annaHolds: true, modes: [Mode.NONE, Mode.NONE],
                lines: [['anna', Action.RELEASE]], places: [], soldToLine: ['own'], writes: ['writeUpdates', 'sellTicketsToWaitlist']
            }
        ] as const

        describe.each([
            {intent: 'draft preferences', key: 'preferences'},
            {intent: 'desired orders', key: 'desiredOrders'}
        ] as const)('of $intent', ({key}) => {
            it.each(CLOSED_DINNER)('GIVEN $supply on a closed dinner WHEN previewed THEN it settles as the save, writes nothing, and the save writes', async ({forSale, waiting, annaHolds, modes, lines, places, soldToLine, writes}) => {
                const {intents, idOf, householdId} = givenClosedDinner({forSale, waiting, annaHolds})
                const sellerOf = {other: [OTHER_HOUSEHOLD_ID, OTHER_INHABITANT_ID], own: [householdId, idOf.anna]}

                const previewed = await intents[key].preview(modes)

                expect(writersCalled()).toEqual([])
                expect(previewed.results.map(line => [line.inhabitantId, line.action])).toEqual(lines.map(([who, action]) => [idOf[who], action]))
                expect(previewed.positions.map(place => [place.inhabitantId, place.position])).toEqual(places.map(([who, position]) => [idOf[who], position]))
                expect(previewed.outcomes.waitlistTicketsSold.map(sale => [sale.buyerInhabitantId, sale.sellerHouseholdId, sale.sellerInhabitantId]))
                    .toEqual(soldToLine.map(seller => [OTHER_INHABITANT_ID, ...sellerOf[seller]]))

                const saved = await intents[key].save(modes)

                expect(writersCalled()).toEqual(writes)
                expect(previewed).toEqual(asPreviewOf(saved))
            })
        })

        // The household's next run on two dinners beyond the scaffold window: Anna eats every day by preference and
        // cancelled the later dinner herself; Bo eats on no day
        it('GIVEN no wishes WHEN previewed on dinners beyond the window THEN it lists the booking the next run makes on each dinner without the member\'s cancellation, and writes nothing', async () => {
            const {season, household, anna, bo, adultPrice} = givenSave()
            const [booked, cancelled] = [DinnerEventFactory.dinnerEventAt(71, 70), DinnerEventFactory.dinnerEventAt(72, 72)]
            vi.mocked(fetchSeason).mockResolvedValue({...season, dinnerEvents: [booked, cancelled]})
            vi.mocked(fetchOrders).mockResolvedValue([])
            vi.mocked(fetchHouseholds).mockResolvedValue([{...household, inhabitants: [
                {...anna, dinnerPreferences: createDefaultWeekdayMap(Mode.DINEIN)}, {...bo, dinnerPreferences: createDefaultWeekdayMap(Mode.NONE)}
            ]}])
            vi.mocked(fetchUserIntentKeys).mockResolvedValue({confirmedKeys: new Set(), cancelledKeys: new Set([`${anna.id}-${cancelled.id}`])})

            const previewed = await scaffoldPrebookings(d1Client, {seasonId: season.id, householdId: household.id, dinnerEventIds: [booked.id, cancelled.id], preview: true})

            expect(previewed.results).toEqual([expect.objectContaining({inhabitantId: anna.id, dinnerEventId: booked.id, ticketType: adultPrice.ticketType, action: Action.BOOK})])
            expect(writersCalled()).toEqual([])
        })
    })

    // Ingen records a cancellation whatever the person holds: an order is deleted, nothing booked is recorded alone
    describe('a cancellation', () => {
        beforeEach(() => {
            vi.clearAllMocks()
        })

        it.each([
            {run: 'a save', preview: false, writes: ['deleteOrder', 'recordCancellation']},
            {run: 'a preview', preview: true, writes: []}
        ])('GIVEN Bo cancelling his booked dinner and Anna a dinner she holds nothing on WHEN $run runs THEN both land as CANCEL and only a save writes', async ({preview, writes}) => {
            const {season, household, anna, bo, boOrder, dinner, adultPrice} = givenSave()
            const ingen = (inhabitantId: number, orderId?: number) => OrderFactory.defaultDesiredOrder({inhabitantId, orderId, dinnerEventId: dinner.id, ticketPriceId: adultPrice.id, dinnerMode: Mode.NONE})

            const result = await scaffoldPrebookings(d1Client, {
                seasonId: season.id, householdId: household.id, userId: 7, deadlines: OPEN_DEADLINES, desiredOrders: [ingen(bo.id, boOrder.id), ingen(anna.id)], preview
            })

            expect(result.results.map(line => [line.inhabitantId, line.action])).toEqual([[bo.id, Action.CANCEL], [anna.id, Action.CANCEL]])
            expect(Object.entries({deleteOrder, recordCancellation}).filter(([, writer]) => vi.mocked(writer).mock.calls.length > 0).map(([name]) => name)).toEqual(writes)
            if (!preview) {
                expect(deleteOrder).toHaveBeenCalledWith(d1Client, [boOrder.id], 7, Source['user-booking'])
                expect(recordCancellation).toHaveBeenCalledWith(d1Client, [{
                    orderId: null, inhabitantId: anna.id, dinnerEventId: dinner.id, seasonId: season.id, performedByUserId: 7, source: Source['user-booking'],
                    snapshot: expect.objectContaining({
                        id: null, inhabitantId: anna.id, dinnerEventId: dinner.id, dinnerMode: Mode.NONE, isGuestTicket: false,
                        householdId: household.id, householdShortname: getHouseholdShortName(household.address)
                    })
                }])
            }
        })
    })

    // Every order row a run writes names its source: a member's save as the member's booking, an admin's correction as
    // the correction
    it.each([
        {run: 'a member\'s save', adminCorrection: undefined, source: Source['user-booking']},
        {run: 'an admin\'s correction', adminCorrection: true, source: Source['admin-correction']}
    ])('GIVEN Anna booking, Bo changing his eating mode and cancelling his guest WHEN $run lands THEN the booking, the change and the cancellation name $source', async ({adminCorrection, source}) => {
        vi.clearAllMocks()
        const {season, household, anna, bo, boOrder, dinner, adultPrice, takeaway} = givenSave()
        const boGuest = OrderFactory.defaultOrder(undefined, {
            id: 12, inhabitantId: bo.id, dinnerEventId: dinner.id, ticketPriceId: adultPrice.id, priceAtBooking: adultPrice.price, isGuestTicket: true
        })
        vi.mocked(fetchOrders).mockResolvedValue([boOrder, boGuest])
        vi.mocked(updateOrdersBatch).mockReturnValue(writeUpdates)
        const desired = (inhabitantId: number, dinnerMode: DinnerMode, overrides: Partial<DesiredOrder> = {}) =>
            OrderFactory.defaultDesiredOrder({inhabitantId, dinnerEventId: dinner.id, ticketPriceId: adultPrice.id, dinnerMode, ...overrides})

        await scaffoldPrebookings(d1Client, {
            seasonId: season.id, householdId: household.id, userId: 7, deadlines: OPEN_DEADLINES, adminCorrection,
            desiredOrders: [desired(anna.id, Mode.DINEIN), takeaway(bo.id, boOrder.id), desired(bo.id, Mode.NONE, {orderId: boGuest.id, isGuestTicket: true})]
        })

        expect(createOrders).toHaveBeenCalledWith(d1Client, household.id, [expect.objectContaining({inhabitantId: anna.id})], expect.objectContaining({source}))
        expect(writeUpdates.mock.calls.flatMap(([, updates]) => updates.map(update => [update.orderId, update.audit?.source]))).toEqual([[boOrder.id, source]])
        expect(deleteOrder).toHaveBeenCalledWith(d1Client, [boGuest.id], 7, source)
    })

    // A cancelled dinner is closed to every run; a consumed one to every run but an admin's correction, which books there
    it.each([
        {state: DinnerStateSchema.enum.CONSUMED, run: 'a member\'s save', adminCorrection: undefined, lands: false},
        {state: DinnerStateSchema.enum.CONSUMED, run: 'an admin correction', adminCorrection: true, lands: true},
        {state: DinnerStateSchema.enum.CANCELLED, run: 'a member\'s save', adminCorrection: undefined, lands: false},
        {state: DinnerStateSchema.enum.CANCELLED, run: 'an admin correction', adminCorrection: true, lands: false}
    ])('GIVEN a $state dinner WHEN $run books Anna THEN her order lands: $lands (only an admin correction books a consumed dinner)', async ({state, adminCorrection, lands}) => {
        vi.clearAllMocks()
        const {season, household, anna, dinner, adultPrice} = givenSave()
        vi.mocked(fetchSeason).mockResolvedValue({...season, dinnerEvents: [{...dinner, state}]})
        vi.mocked(createOrders).mockResolvedValue({householdId: household.id, createdIds: [77]})

        const result = await scaffoldPrebookings(d1Client, {
            seasonId: season.id, householdId: household.id, userId: 7, deadlines: OPEN_DEADLINES, adminCorrection,
            desiredOrders: [OrderFactory.defaultDesiredOrder({inhabitantId: anna.id, dinnerEventId: dinner.id, ticketPriceId: adultPrice.id, dinnerMode: Mode.DINEIN})]
        })

        // createOrders takes one order or a list, as the repository normalizes it
        expect(vi.mocked(createOrders).mock.calls.flatMap(([, , orders]) => [orders].flat().map(order => order.inhabitantId))).toEqual(lands ? [anna.id] : [])
        expect(result.results.map(line => [line.inhabitantId, line.action])).toEqual(lands ? [[anna.id, Action.BOOK]] : [])
    })

    // A member's own join outranks the preference: its booking row makes the dinner the member's
    it.each([
        {preference: Mode.NONE, would: 'leave'},
        {preference: Mode.TAKEAWAY, would: 'requeue'}
    ])('GIVEN Anna joined a dinner\'s waiting list herself WHEN her preference says $preference, which would $would the place, THEN the place stands', async ({preference}) => {
        vi.clearAllMocks()
        const {season, household, anna, bo, dinner, adultPrice} = givenSave()
        vi.mocked(fetchOrders).mockResolvedValue([])
        vi.mocked(fetchWaitlistForDinners).mockResolvedValue([
            WaitlistFactory.defaultEntry({id: 21, inhabitantId: anna.id, dinnerEventId: dinner.id, ticketPrice: adultPrice, householdId: household.id})
        ])
        vi.mocked(fetchUserIntentKeys).mockResolvedValue({confirmedKeys: new Set([`${anna.id}-${dinner.id}`]), cancelledKeys: new Set()})
        vi.mocked(fetchHouseholds).mockResolvedValue([{...household, inhabitants: [
            {...anna, dinnerPreferences: createDefaultWeekdayMap(preference)}, {...bo, dinnerPreferences: createDefaultWeekdayMap(Mode.NONE)}
        ]}])

        const result = await scaffoldPrebookings(d1Client, {seasonId: season.id, householdId: household.id})

        expect(result.results).toEqual([])
        expect(writersCalled()).toEqual(['sellTicketsToWaitlist'])
    })

    // Each write to a place on the waiting list carries its audit: a member's act as theirs, a preference run's as the system's
    describe('the audit of a place on the waiting list', () => {
        beforeEach(() => {
            vi.clearAllMocks()
        })

        // Anna and Bo wait for tomorrow's dinner; Anna leaves, Bo changes to takeaway and joins the waiting list of the day after
        const givenPlaces = () => {
            const {season, household, anna, bo, dinner, adultPrice} = givenSave()
            const dayAfter = DinnerEventFactory.dinnerEventAt(6, 2)
            vi.mocked(fetchSeason).mockResolvedValue({...season, dinnerEvents: [dinner, dayAfter]})
            vi.mocked(fetchOrders).mockResolvedValue([])
            const place = (id: number, inhabitantId: number) =>
                WaitlistFactory.defaultEntry({id, inhabitantId, dinnerEventId: dinner.id, ticketPrice: adultPrice, householdId: household.id})
            const [annaPlace, boPlace] = [place(21, anna.id), place(22, bo.id)]
            givenSupply(season.ticketPrices, [], [annaPlace, boPlace])
            vi.mocked(deleteWaitlistEntries).mockImplementation(async (_d1, leaves) => leaves.length)
            vi.mocked(updateWaitlistEntryOrders).mockImplementation(async (_d1, requeues) => requeues.length)
            const runs = {
                member: () => scaffoldPrebookings(d1Client, {seasonId: season.id, householdId: household.id, userId: 7, desiredOrders: [
                    WaitlistFactory.wishOf(annaPlace, {dinnerMode: Mode.NONE}), WaitlistFactory.wishOf(boPlace, {dinnerMode: Mode.TAKEAWAY}),
                    OrderFactory.defaultDesiredOrder({inhabitantId: bo.id, dinnerEventId: dayAfter.id, ticketPriceId: adultPrice.id, dinnerMode: Mode.TAKEAWAY})
                ]}),
                preferences: () => {
                    vi.mocked(fetchHouseholds).mockResolvedValue([{...household, inhabitants: [
                        {...anna, dinnerPreferences: createDefaultWeekdayMap(Mode.NONE)}, {...bo, dinnerPreferences: createDefaultWeekdayMap(Mode.TAKEAWAY)}
                    ]}])
                    return scaffoldPrebookings(d1Client, {seasonId: season.id, householdId: household.id})
                }
            }
            return {runs, annaPlace, boPlace, anna, bo, dayAfter, seasonId: season.id!, household}
        }

        it.each([
            {run: 'member', performedByUserId: 7, leave: AuditActions.USER_CANCELLED, requeue: AuditActions.USER_BOOKED, join: AuditActions.USER_BOOKED},
            {run: 'preferences', performedByUserId: 1, leave: AuditActions.SYSTEM_DELETED, requeue: AuditActions.SYSTEM_UPDATED, join: AuditActions.SYSTEM_CREATED}
        ] as const)('GIVEN the $run run WHEN it leaves, changes and joins THEN each write carries its audit and the snapshot of the person and the household the run holds', async ({run, performedByUserId, leave, requeue, join}) => {
            const {runs, annaPlace, boPlace, anna, bo, dayAfter, seasonId, household} = givenPlaces()
            const audit = (action: OrderAuditAction) => ({action, performedByUserId, seasonId})
            const snapshotOf = (inhabitantId: number, dinnerEventId: number, wish: {dinnerMode?: DinnerMode} = {}) => expect.objectContaining({
                id: null, inhabitantId, dinnerEventId, ...wish, householdId: household.id, householdShortname: getHouseholdShortName(household.address)
            })

            const result = await runs[run]()

            expect(result.totals).toMatchObject({[Action.LEAVE]: 1, [Action.REQUEUE]: 1, [Action.QUEUE]: 1})
            expect(deleteWaitlistEntries).toHaveBeenCalledWith(d1Client, [{id: annaPlace.id, snapshot: snapshotOf(anna.id, annaPlace.dinnerEventId)}], audit(leave))
            expect(updateWaitlistEntryOrders).toHaveBeenCalledWith(d1Client, [{
                id: boPlace.id, order: expect.objectContaining({dinnerMode: Mode.TAKEAWAY}),
                snapshot: snapshotOf(bo.id, boPlace.dinnerEventId, {dinnerMode: Mode.TAKEAWAY})
            }], audit(requeue))
            expect(createWaitlistEntries).toHaveBeenCalledWith(d1Client, [{
                entry: expect.objectContaining({inhabitantId: bo.id, dinnerEventId: dayAfter.id}), snapshot: snapshotOf(bo.id, dayAfter.id)
            }], audit(join))
        })

        // A household's leaves are one write and its changes another, whatever the number of places (ADR-014)
        it.each([
            {change: 'leave', dinnerMode: Mode.NONE, action: Action.LEAVE, written: () => vi.mocked(deleteWaitlistEntries).mock.calls.map(([, leaves]) => leaves)},
            {change: 'change', dinnerMode: Mode.TAKEAWAY, action: Action.REQUEUE, written: () => vi.mocked(updateWaitlistEntryOrders).mock.calls.map(([, requeues]) => requeues)}
        ])('GIVEN Anna and Bo waiting on two dinners WHEN the household saves a $change of all four places THEN one write carries the four, each with the snapshot of its person', async ({dinnerMode, action, written}) => {
            const {season, household, anna, bo, dinner, adultPrice} = givenSave()
            const dayAfter = DinnerEventFactory.dinnerEventAt(6, 2)
            vi.mocked(fetchSeason).mockResolvedValue({...season, dinnerEvents: [dinner, dayAfter]})
            vi.mocked(fetchOrders).mockResolvedValue([])
            const places = [dinner, dayAfter].flatMap(({id: dinnerEventId}, day) => [anna, bo].map((person, index) => WaitlistFactory.defaultEntry({
                id: 21 + 2 * day + index, inhabitantId: person.id, dinnerEventId, ticketPrice: adultPrice, householdId: household.id
            })))
            givenSupply(season.ticketPrices, [], places)
            vi.mocked(deleteWaitlistEntries).mockImplementation(async (_d1, leaves) => leaves.length)
            vi.mocked(updateWaitlistEntryOrders).mockImplementation(async (_d1, requeues) => requeues.length)

            const result = await scaffoldPrebookings(d1Client, {
                seasonId: season.id, householdId: household.id, userId: 7, desiredOrders: places.map(place => WaitlistFactory.wishOf(place, {dinnerMode}))
            })

            expect(result.totals[action]).toBe(places.length)
            expect(written().map(batch => batch.map(({id, snapshot}) => [id, snapshot.inhabitantId, snapshot.householdShortname])))
                .toEqual([places.map(place => [place.id, place.inhabitantId, getHouseholdShortName(household.address)])])
        })
    })

    // A run settles every household's claims per dinner, after the households' runs: one read of the line and of the
    // dinner's tickets for sale, one write of the joins (ADR-014)
    describe('claims on closed dinners', () => {
        beforeEach(() => {
            vi.clearAllMocks()
        })

        it.each([
            {run: 'a season-wide run', scoped: false},
            {run: 'the household\'s run', scoped: true}
        ])('GIVEN the household\'s people already waiting on the closed dinners WHEN $run scaffolds THEN nobody joins twice and each place counts unchanged', async ({scoped}) => {
            const {claimers, dinners, householdId, scaffold} = givenClaims({households: [[ADULT, ADULT, CHILD]], dinners: 2, queued: true})

            const result = await scaffold(scoped ? {householdId} : {})

            expect(writersCalled()).toEqual(['sellTicketsToWaitlist'])
            expect(result.totals[Action.QUEUE]).toBe(0)
            expect(result.unchanged).toBe(claimers.length * dinners.length)
        })

        // The waiting list is read for the run's entries, each dinner's line and the sale; a dinner whose every claimed
        // ticket type has a line reads no tickets for sale. A batch and a place name the claimer by their index across the
        // households, in run order
        const CLAIMS = [
            {
                supply: 'nothing for sale on two dinners', households: [[ADULT, ADULT, ADULT, CHILD]], run: 'the household\'s run', scoped: true, dinners: 2, forSale: 0, waiting: 0,
                calls: {waitlistReads: 4, forSaleReads: 2, buys: 0, joinBatches: [[0, 1, 2, 3], [0, 1, 2, 3]]},
                places: [[0, 1], [1, 2], [2, 3], [3, 1], [0, 1], [1, 2], [2, 3], [3, 1]]
            },
            {
                supply: 'one adult ticket for sale', households: [[ADULT, ADULT, ADULT]], run: 'the household\'s run', scoped: true, dinners: 1, forSale: 1, waiting: 0,
                calls: {waitlistReads: 3, forSaleReads: 1, buys: 1, joinBatches: [[1, 2]]},
                places: [[1, 1], [2, 2]]
            },
            {
                supply: 'two adults of household 8 waiting', households: [[ADULT, ADULT]], run: 'the household\'s run', scoped: true, dinners: 1, forSale: 0, waiting: 2,
                calls: {waitlistReads: 3, forSaleReads: 0, buys: 0, joinBatches: [[0, 1]]},
                places: [[0, 3], [1, 4]]
            },
            {
                supply: 'three adult tickets for sale claimed by three households', households: [[ADULT], [ADULT], [ADULT]], run: 'a season-wide run', scoped: false, dinners: 1, forSale: 3, waiting: 0,
                calls: {waitlistReads: 3, forSaleReads: 1, buys: 3, joinBatches: []},
                places: []
            },
            {
                supply: 'one adult ticket for sale claimed by three households', households: [[ADULT, CHILD], [ADULT], [CHILD]], run: 'a season-wide run', scoped: false, dinners: 1, forSale: 1, waiting: 0,
                calls: {waitlistReads: 3, forSaleReads: 1, buys: 1, joinBatches: [[1, 2, 3]]},
                places: [[1, 1], [2, 1], [3, 2]]
            },
            {
                supply: 'two adults of household 8 waiting and three households claiming', households: [[ADULT, CHILD], [ADULT], [CHILD]], run: 'a season-wide run', scoped: false, dinners: 1, forSale: 0, waiting: 2,
                calls: {waitlistReads: 3, forSaleReads: 1, buys: 0, joinBatches: [[0, 1, 2, 3]]},
                places: [[0, 3], [1, 1], [2, 4], [3, 2]]
            }
        ] as const

        it.each(CLAIMS)('GIVEN $supply WHEN $run settles its claims THEN it reads the line and the tickets for sale once per dinner, joins in one write per dinner behind the line, and its preview settles alike', async ({households, scoped, dinners, forSale, waiting, calls, places}) => {
            const {claimers, householdId, scaffold} = givenClaims({households: households.map(people => [...people]), dinners, forSale, waiting})
            const indexOf = (inhabitantId: number) => claimers.findIndex(claimer => claimer.id === inhabitantId)
            const scope = scoped ? {householdId} : {}

            const previewed = await scaffold({...scope, preview: true})
            expect(writersCalled()).toEqual([])
            vi.clearAllMocks()

            const saved = await scaffold(scope)

            expect({
                waitlistReads: vi.mocked(fetchWaitlistForDinners).mock.calls.length,
                forSaleReads: vi.mocked(countReleasedTicketsByType).mock.calls.length,
                buys: vi.mocked(claimOrder).mock.calls.length,
                joinBatches: vi.mocked(createWaitlistEntries).mock.calls.map(([, joins]) => joins.map(({entry}) => indexOf(entry.inhabitantId)))
            }).toEqual(calls)
            expect(saved.positions.map(place => [indexOf(place.inhabitantId), place.position])).toEqual(places)
            expect(previewed).toEqual(asPreviewOf(saved))
        })

        it('GIVEN a later household whose preferences release its ticket on a closed dinner WHEN a season-wide run settles THEN the earlier household\'s claim buys that ticket, the waiting list has nothing to sell, and its preview settles alike', async () => {
            const {claimers, sellerPeople, householdId, sellerHouseholdId, scaffold} = givenClaims({households: [[ADULT]], dinners: 1, releasing: 1})

            const previewed = await scaffold({preview: true})
            expect(writersCalled()).toEqual([])
            vi.clearAllMocks()

            const saved = await scaffold()

            expect(writersCalled()).toEqual(['writeUpdates', 'claimOrder', 'sellTicketsToWaitlist'])
            expect(saved.totals).toMatchObject({[Action.RELEASE]: 1, [Action.BUY]: 1, [Action.QUEUE]: 0})
            expect(saved.outcomes.ticketsSold.map(sale => [sale.buyerInhabitantId, sale.buyerHouseholdId, sale.sellerHouseholdId, sale.sellerInhabitantId]))
                .toEqual([[claimers[0]!.id, householdId, sellerHouseholdId, sellerPeople[0]!.id]])
            expect(saved.outcomes.waitlistTicketsSold).toEqual([])
            expect(previewed).toEqual(asPreviewOf(saved))
        })

        // A dinner's joins are written in one attempt: a refused write lists each join failed and is not retried
        it.each([
            {refusal: 'a concurrent join of the same person', error: () => createError({statusCode: 409, message: 'One regular entry per person and dinner'}), reason: BookingFailureSchema.enum.CONFLICT},
            {refusal: 'a server error', error: () => createError({statusCode: 500, message: 'D1 down'}), reason: undefined}
        ])('GIVEN $refusal WHEN the household\'s claims join a closed dinner\'s waiting list THEN the write is tried once and each join is listed failed with its reason', async ({error, reason}) => {
            const {claimers, householdId, scaffold} = givenClaims({households: [[ADULT, ADULT]], dinners: 1})
            vi.mocked(createWaitlistEntries).mockRejectedValue(error())

            const result = await scaffold({householdId})

            expect(createWaitlistEntries).toHaveBeenCalledOnce()
            expect(result.failed.map(line => [line.inhabitantId, line.action, line.reason])).toEqual(claimers.map(({id}) => [id, Action.QUEUE, reason]))
            expect(result.positions).toEqual([])
        })

        // A preference save runs on the weekdays it changes; the result names the dinners the run decides
        it('GIVEN a household of five eating on a closed dinner\'s weekday WHEN the household\'s run on that weekday settles THEN it names that dinner alone and writes five entries, one per person, each at its own place', async () => {
            const {claimers, dinners, householdId, scaffold} = givenClaims({households: [[ADULT, ADULT, ADULT, ADULT, ADULT]], dinners: 2})
            const day = dinners[0]!

            const result = await scaffold({householdId, weekdays: [dateToWeekDay(day.date)]})

            expect(result.dinners).toEqual([{id: day.id, date: day.date}])
            expect(vi.mocked(createWaitlistEntries).mock.calls.map(([, joins]) => joins.map(({entry}) => [entry.inhabitantId, entry.dinnerEventId])))
                .toEqual([claimers.map(({id}) => [id, day.id])])
            expect(result.positions.map(place => [place.inhabitantId, place.dinnerEventId, place.position])).toEqual(claimers.map(({id}, index) => [id, day.id, index + 1]))
            expect(result.outcomes.joined.map(event => event.inhabitantId)).toEqual(claimers.map(({id}) => id))
        })

        // A booker's guests each hold their own entry and place: several guests per booker wait side by side
        it('GIVEN a booker with five guest wishes on a closed dinner WHEN the save settles THEN five guest entries are written at places 1 to 5 and the result has a line for each', async () => {
            const {season, household, anna, dinner, adultPrice} = givenSave()
            vi.mocked(fetchOrders).mockResolvedValue([])
            givenSupply(season.ticketPrices, [], [])
            const guestWish = () => OrderFactory.defaultDesiredOrder({inhabitantId: anna.id, dinnerEventId: dinner.id, ticketPriceId: adultPrice.id, isGuestTicket: true})
            const guests = [1, 2, 3, 4, 5]

            const result = await scaffoldPrebookings(d1Client, {seasonId: season.id, householdId: household.id, userId: 7, desiredOrders: guests.map(guestWish)})

            expect(vi.mocked(createWaitlistEntries).mock.calls.map(([, joins]) => joins.map(({entry}) => [entry.inhabitantId, entry.isGuestTicket])))
                .toEqual([guests.map(() => [anna.id, true])])
            expect(result.positions.map(place => [place.inhabitantId, place.isGuestTicket, place.position])).toEqual(guests.map(position => [anna.id, true, position]))
            expect(result.results.map(line => [line.inhabitantId, line.isGuestTicket, line.action])).toEqual(guests.map(() => [anna.id, true, Action.QUEUE]))
        })

        // The run pairs each join with the entry written for its person, dinner and guest flag, whatever order the write
        // hands the entries back in
        it('GIVEN the joins\' entries handed back in reverse WHEN the household\'s claims join a closed dinner\'s waiting list THEN every place and every joined outcome names its own person', async () => {
            const {claimers, householdId, scaffold} = givenClaims({households: [[ADULT, ADULT, CHILD]], dinners: 1})
            const insertOrder = vi.mocked(createWaitlistEntries).getMockImplementation()!
            vi.mocked(createWaitlistEntries).mockImplementation(async (...write) => (await insertOrder(...write)).reverse())
            const indexOf = (inhabitantId: number) => claimers.findIndex(claimer => claimer.id === inhabitantId)

            const result = await scaffold({householdId})

            const places = [[0, ADULT, 1], [1, ADULT, 2], [2, CHILD, 1]]
            expect(result.positions.map(place => [indexOf(place.inhabitantId), place.ticketType, place.position])).toEqual(places)
            expect(result.outcomes.joined.map(event => [indexOf(event.inhabitantId), event.ticketType, event.position])).toEqual(places)
        })
    })

    // A ticket of 0 portions takes nothing from the kitchen: past the deadline it books and cancels as before it, never
    // joins the waiting list and never goes for sale; the hungry baby's ticket buys or queues and releases
    describe('a baby ticket on a dinner past its deadline', () => {
        beforeEach(() => {
            vi.clearAllMocks()
        })

        it.each([
            {ticket: 'the baby who tastes', price: 'tasting', wish: 'books', dinnerMode: Mode.DINEIN, holds: false, action: Action.BOOK, writes: ['createOrders', 'sellTicketsToWaitlist'], soldToLine: []},
            {ticket: 'the hungry baby', price: 'hungry', wish: 'books', dinnerMode: Mode.DINEIN, holds: false, action: Action.QUEUE, writes: ['joinWaitlist', 'sellTicketsToWaitlist'], soldToLine: []},
            {ticket: 'the baby who tastes', price: 'tasting', wish: 'cancels', dinnerMode: Mode.NONE, holds: true, action: Action.CANCEL, writes: ['deleteOrder', 'sellTicketsToWaitlist'], soldToLine: []},
            {ticket: 'the hungry baby', price: 'hungry', wish: 'cancels', dinnerMode: Mode.NONE, holds: true, action: Action.RELEASE, writes: ['writeUpdates', 'sellTicketsToWaitlist'], soldToLine: [OTHER_INHABITANT_ID]}
        ] as const)('GIVEN a baby of household 8 waiting in the baby line WHEN Anna\'s household $wish $ticket THEN it lands as $action and the waiting baby buys from it: $soldToLine', async ({price, dinnerMode, holds, action, writes, soldToLine}) => {
            const {season, household, anna, dinner} = givenSave()
            // The factory lists the baby who tastes first, the hungry baby second
            const [tasting, hungry] = season.ticketPrices.filter(ticketPrice => ticketPrice.ticketType === TicketTypeSchema.enum.BABY)
            const babyPrice = {tasting, hungry}[price]!
            const annaOrder = OrderFactory.defaultOrder(undefined, {id: 41, inhabitantId: anna.id, dinnerEventId: dinner.id, ticketPriceId: babyPrice.id, priceAtBooking: babyPrice.price})
            const babyWaiting = WaitlistFactory.defaultEntry({
                id: 21, inhabitantId: OTHER_INHABITANT_ID, dinnerEventId: dinner.id, ticketPrice: hungry!, householdId: OTHER_HOUSEHOLD_ID, createdAt: subMinutes(new Date(), 60)
            })
            const held = holds ? [annaOrder] : []
            vi.mocked(fetchOrders).mockResolvedValue(held)
            givenSupply(season.ticketPrices, [], [babyWaiting], held.map(order => ({order, householdId: household.id})))

            const result = await scaffoldPrebookings(d1Client, {seasonId: season.id, householdId: household.id, userId: 1, desiredOrders: [OrderFactory.defaultDesiredOrder({
                inhabitantId: anna.id, dinnerEventId: dinner.id, ticketPriceId: babyPrice.id, orderId: held[0]?.id, dinnerMode
            })]})

            expect(result.results.map(line => [line.inhabitantId, line.action])).toEqual([[anna.id, action]])
            expect(writersCalled()).toEqual(writes)
            expect(result.outcomes.waitlistTicketsSold.map(sale => sale.buyerInhabitantId)).toEqual(soldToLine)
        })
    })

    // A result carries its ticket's price, a booked order's frozen price else its price row's, and a place its claim's:
    // the preview and the toast name a booker's guests by type and price
    describe('the price a result and a place carry', () => {
        beforeEach(() => {
            vi.clearAllMocks()
        })

        it('GIVEN Bo\'s order booked at a price his price row no longer holds WHEN the save changes his eating mode THEN the result carries the order\'s frozen price', async () => {
            const {bo, boOrder, adultPrice, takeaway, save} = givenSave()
            const PRICE_BEFORE_THE_RISE = adultPrice.price + 1000
            vi.mocked(fetchOrders).mockResolvedValue([{...boOrder, priceAtBooking: PRICE_BEFORE_THE_RISE}])

            const result = await save([takeaway(bo.id, boOrder.id)])

            expect(result.results).toEqual([expect.objectContaining({inhabitantId: bo.id, action: Action.CHANGE_MODE, priceAtBooking: PRICE_BEFORE_THE_RISE})])
        })

        it('GIVEN Anna holding nothing WHEN the save books her THEN the result carries her price row\'s price', async () => {
            const {household, anna, dinner, adultPrice, save} = givenSave()
            vi.mocked(createOrders).mockResolvedValue({householdId: household.id, createdIds: [77]})

            const result = await save([OrderFactory.defaultDesiredOrder({inhabitantId: anna.id, dinnerEventId: dinner.id, ticketPriceId: adultPrice.id, dinnerMode: Mode.DINEIN})])

            expect(result.results).toEqual([expect.objectContaining({inhabitantId: anna.id, action: Action.BOOK, priceAtBooking: adultPrice.price})])
        })

        it('GIVEN nothing for sale on a closed dinner WHEN Anna\'s guest wish for a hungry baby joins the waiting list THEN its place carries the claim\'s price', async () => {
            const {season, household, anna, dinner} = givenSave()
            // The factory lists the baby who tastes first, the hungry baby second
            const [, hungry] = season.ticketPrices.filter(ticketPrice => ticketPrice.ticketType === TicketTypeSchema.enum.BABY)
            vi.mocked(fetchOrders).mockResolvedValue([])
            givenSupply(season.ticketPrices, [], [])

            const result = await scaffoldPrebookings(d1Client, {seasonId: season.id, householdId: household.id, userId: 7, desiredOrders: [OrderFactory.defaultDesiredOrder({
                inhabitantId: anna.id, dinnerEventId: dinner.id, ticketPriceId: hungry!.id, isGuestTicket: true
            })]})

            expect(result.positions).toEqual([expect.objectContaining({inhabitantId: anna.id, isGuestTicket: true, position: 1, priceAtBooking: hungry!.price})])
        })
    })

    // The run's first reads take every dinner of the run at once and run one after another; the repositories chunk the ids
    it('GIVEN a run over 40 dinners WHEN it reads the orders, the waiting lists and the members\' acts THEN each read names all 40 dinners, one read in flight at a time', async () => {
        vi.clearAllMocks()
        const {season, household} = givenSave()
        const dinners = Array.from({length: 40}, (_, index) => DinnerEventFactory.dinnerEventAt(100 + index, 1 + index))
        vi.mocked(fetchSeason).mockResolvedValue({...season, dinnerEvents: dinners})
        vi.mocked(fetchHouseholds).mockResolvedValue([{
            ...household, inhabitants: household.inhabitants.map(inhabitant => ({...inhabitant, dinnerPreferences: createDefaultWeekdayMap(Mode.NONE)}))
        }])
        const reads = callsInFlight()
        reads.answer(vi.mocked(fetchOrders), () => [])
        reads.answer(vi.mocked(fetchWaitlistForDinners), () => [])
        reads.answer(vi.mocked(fetchUserIntentKeys), () => ({confirmedKeys: new Set<string>(), cancelledKeys: new Set<string>()}))

        await scaffoldPrebookings(d1Client, {seasonId: season.id, householdId: household.id})

        const dinnerIds = dinners.map(({id}) => id)
        expect(vi.mocked(fetchOrders).mock.calls).toEqual([[d1Client, dinnerIds]])
        expect(vi.mocked(fetchWaitlistForDinners).mock.calls[0]).toEqual([d1Client, dinnerIds])
        expect(reads.peak).toBe(1)
    })
})
