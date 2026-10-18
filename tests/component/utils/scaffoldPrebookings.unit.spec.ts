import {describe, it, expect, vi, beforeEach} from 'vitest'
import {createError} from 'h3'
import {subMinutes} from 'date-fns'
import {scaffoldPrebookings, type ScaffoldOptions} from '~~/server/utils/scaffoldPrebookings'
import {joinWaitlist, sellTicketsToWaitlist} from '~~/server/utils/waitlistAssignment'
import {fetchHouseholds, fetchHouseholdsByInhabitantIds, fetchSeason} from '~~/server/data/prismaRepository'
import {
    claimOrder, claimReleasedOrder, countReleasedTickets, createOrders, deleteOrder, fetchOrders, fetchUserIntentKeys, findReleasedOrderId, recordCancellation,
    updateOrdersBatch, type OrderBatchUpdate
} from '~~/server/data/financesRepository'
import {
    createWaitlistEntry, deleteWaitlistEntry, fetchWaitlistForHousehold, fetchWaitlistForDinners, grabWaitlistEntry, removePlacedWaitlistEntry, updateWaitlistEntryOrder
} from '~~/server/data/waitlistRepository'
import {useBookingValidation, OrderAuditAction as AuditActions, type DesiredOrder, type DinnerMode, type OrderAuditAction, type OrderDisplay, type TicketType} from '~/composables/useBookingValidation'
import type {TicketWaitlistDisplay} from '~/composables/useWaitlistValidation'
import {useCoreValidation} from '~/composables/useCoreValidation'
import type {WeekDayMap} from '~/types/dateTypes'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {OPEN_DEADLINES} from '~/composables/useSeason'
import {dateToWeekDay} from '~/utils/season'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'

// The scaffolder reads the app config, and its error log builds errors, from the Nitro auto-import scope; the config
// module calls Nuxt's defineAppConfig, which the unit runtime lacks
const appConfig = await vi.hoisted(async () => {
    vi.stubGlobal('defineAppConfig', <T>(config: T) => config)
    return (await import('~/app.config')).default
})
vi.stubGlobal('useAppConfig', () => appConfig)
vi.stubGlobal('createError', createError)

// The repositories stand for the database the unit runtime lacks
vi.mock('~~/server/data/prismaRepository', () => ({
    fetchHouseholds: vi.fn(), fetchHouseholdsByInhabitantIds: vi.fn(), fetchSeason: vi.fn(), fetchActiveSeasonId: vi.fn(), fetchUser: vi.fn()
}))
vi.mock('~~/server/data/financesRepository', () => ({
    fetchOrders: vi.fn(), fetchUserIntentKeys: vi.fn(), createOrders: vi.fn(), deleteOrder: vi.fn(), updateOrdersBatch: vi.fn(),
    claimOrder: vi.fn(), countReleasedTickets: vi.fn(), fetchDinnerEvent: vi.fn(), findReleasedOrderId: vi.fn(), claimReleasedOrder: vi.fn(), recordCancellation: vi.fn()
}))
vi.mock('~~/server/data/waitlistRepository', () => ({
    fetchWaitlistForHousehold: vi.fn(), fetchWaitlistForDinners: vi.fn(), deleteWaitlistEntry: vi.fn(), updateWaitlistEntryOrder: vi.fn(), createWaitlistEntry: vi.fn(),
    grabWaitlistEntry: vi.fn(), removePlacedWaitlistEntry: vi.fn(), releaseWaitlistEntry: vi.fn(), recordWaitlistPlacingOrder: vi.fn(), fetchOrdersServingEntry: vi.fn()
}))
// The system account is a seeded user the unit runtime lacks
vi.mock('~~/server/utils/systemUser', () => ({getSystemUserId: vi.fn(async () => 1)}))
// The waiting-list writes run as written; the spies record whether a run reaches them
vi.mock('~~/server/utils/waitlistAssignment', async importOriginal => {
    const original = await importOriginal<typeof import('~~/server/utils/waitlistAssignment')>()
    return {...original, joinWaitlist: vi.fn(original.joinWaitlist), sellTicketsToWaitlist: vi.fn(original.sellTicketsToWaitlist)}
})

const d1Client = {} as D1Database
const {DinnerModeSchema, BookingActionSchema, BookingFailureSchema, TicketTypeSchema, OrderStateSchema} = useBookingValidation()
const {createDefaultWeekdayMap} = useCoreValidation()
const Mode = DinnerModeSchema.enum
const Action = BookingActionSchema.enum

// The writes a run makes; a preview makes none
const writeUpdates = vi.fn(async (_d1: D1Database, updates: OrderBatchUpdate[]) => updates.length)
const writers = {createOrders, writeUpdates, deleteOrder, claimOrder, joinWaitlist, deleteWaitlistEntry, updateWaitlistEntryOrder, sellTicketsToWaitlist}
const writersCalled = () => Object.entries(writers).filter(([, writer]) => vi.mocked(writer).mock.calls.length > 0).map(([name]) => name)

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
    vi.mocked(fetchWaitlistForHousehold).mockResolvedValue([])
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

/**
 * The closed dinner's supply as the database holds it, the same input for a preview and a save: the tickets for sale with
 * the household selling each, and the waiting list. A save's claims, joins, releases and sales write it. Anna and Bo
 * store no dinner; Anna holds a ticket on the dinner when `annaHolds`, stored as her dine-in preference
 */
const givenClosedDinner = ({forSale, waiting, annaHolds}: {forSale: boolean, waiting: boolean, annaHolds: boolean}) => {
    const {season, household, anna, bo, dinner, adultPrice} = givenSave()
    const ticketTypeOf = (ticketPriceId: number | null) => season.ticketPrices.find(price => price.id === ticketPriceId)?.ticketType
    const orderOn = (id: number, inhabitantId: number) => OrderFactory.defaultOrder(undefined, {id, inhabitantId, dinnerEventId: dinner.id, ticketPriceId: adultPrice.id, priceAtBooking: adultPrice.price})
    const released = (order: OrderDisplay, minutesAgo: number): OrderDisplay => ({...order, state: OrderStateSchema.enum.RELEASED, releasedAt: subMinutes(new Date(), minutesAgo)})
    const householdOrders = annaHolds ? [orderOn(41, anna.id)] : []
    const tickets = forSale ? [{order: released(orderOn(90, OTHER_INHABITANT_ID), 60), householdId: OTHER_HOUSEHOLD_ID}] : []
    const entries: TicketWaitlistDisplay[] = waiting ? [WaitlistFactory.defaultEntry({
        id: 21, inhabitantId: OTHER_INHABITANT_ID, dinnerEventId: dinner.id, ticketPriceId: adultPrice.id, householdId: OTHER_HOUSEHOLD_ID, createdAt: subMinutes(new Date(), 60)
    })] : []
    let nextEntryId = 500
    const oldestOfType = (dinnerEventId: number, ticketType: TicketType) => tickets
        .filter(({order}) => order.dinnerEventId === dinnerEventId && ticketTypeOf(order.ticketPriceId) === ticketType)
        .sort((a, b) => a.order.releasedAt!.getTime() - b.order.releasedAt!.getTime())[0]
    const sell = (ticket: typeof tickets[number]) => {
        tickets.splice(tickets.indexOf(ticket), 1)
        return {order: OrderFactory.defaultOrderDetail(undefined, {id: ticket.order.id}), ticketPriceId: ticket.order.ticketPriceId!, sellerHouseholdId: ticket.householdId}
    }
    const storedHousehold = (preferenceOf: (inhabitantId: number) => DinnerMode) =>
        ({...household, inhabitants: household.inhabitants.map(inhabitant => ({...inhabitant, dinnerPreferences: createDefaultWeekdayMap(preferenceOf(inhabitant.id))}))})

    vi.mocked(fetchHouseholds).mockResolvedValue([storedHousehold(inhabitantId => annaHolds && inhabitantId === anna.id ? Mode.DINEIN : Mode.NONE)])
    vi.mocked(fetchOrders).mockResolvedValue([...householdOrders, ...tickets.map(({order}) => order)])
    vi.mocked(fetchHouseholdsByInhabitantIds).mockResolvedValue([{
        ...HouseholdFactory.defaultHouseholdDetail('seller'), id: OTHER_HOUSEHOLD_ID,
        inhabitants: [{...HouseholdFactory.defaultInhabitantData('seller'), id: OTHER_INHABITANT_ID, householdId: OTHER_HOUSEHOLD_ID}]
    }])
    vi.mocked(countReleasedTickets).mockImplementation(async (_d1, dinnerEventId, ticketType) =>
        tickets.filter(({order}) => order.dinnerEventId === dinnerEventId && ticketTypeOf(order.ticketPriceId) === ticketType).length)
    vi.mocked(claimOrder).mockImplementation(async (_d1, dinnerEventId, ticketType) => {
        const ticket = oldestOfType(dinnerEventId, ticketType)
        return ticket ? sell(ticket) : null
    })
    vi.mocked(findReleasedOrderId).mockImplementation(async (_d1, dinnerEventId, ticketType) => oldestOfType(dinnerEventId, ticketType)?.order.id ?? null)
    vi.mocked(claimReleasedOrder).mockImplementation(async (_d1, orderId) => {
        const ticket = tickets.find(({order}) => order.id === orderId)
        return ticket ? sell(ticket) : null
    })
    writeUpdates.mockImplementation(async (_d1, updates) => {
        for (const {orderId} of updates.filter(update => update.isNewRelease)) {
            tickets.push({order: released(householdOrders.find(order => order.id === orderId)!, 0), householdId: household.id})
        }
        return updates.length
    })
    vi.mocked(updateOrdersBatch).mockReturnValue(writeUpdates)
    vi.mocked(fetchWaitlistForDinners).mockImplementation(async (_d1, dinnerEventIds) => entries.filter(entry => dinnerEventIds.includes(entry.dinnerEventId)))
    vi.mocked(createWaitlistEntry).mockImplementation(async (_d1, request) => {
        const entry = {...request, id: nextEntryId++, createdAt: new Date(), placingAt: null, placingOrderId: null}
        entries.push(entry)
        return entry
    })
    vi.mocked(grabWaitlistEntry).mockResolvedValue(true)
    vi.mocked(removePlacedWaitlistEntry).mockImplementation(async (_d1, id) => {
        entries.splice(entries.findIndex(entry => entry.id === id), 1)
        return 1
    })

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
        {change: 'leave', action: BookingActionSchema.enum.LEAVE, dinnerMode: DinnerModeSchema.enum.NONE, refuse: (error: Error) => vi.mocked(deleteWaitlistEntry).mockRejectedValue(error)},
        {change: 'change', action: BookingActionSchema.enum.REQUEUE, dinnerMode: DinnerModeSchema.enum.DINEIN, refuse: (error: Error) => vi.mocked(updateWaitlistEntryOrder).mockRejectedValue(error)}
    ])('a refused $change of a place on the waiting list', ({action, dinnerMode, refuse}) => {
        it.each([
            {refusal: 'a run placing the entry', error: () => createError({statusCode: 409, message: 'Queue entry 21 is being placed'}), reason: BookingFailureSchema.enum.CONFLICT},
            {refusal: 'a server error', error: () => createError({statusCode: 500, message: 'D1 down'}), reason: undefined}
        ])('GIVEN $refusal WHEN the household saves THEN the line is listed as failed with its reason and the rest of the save lands', async ({error, reason}) => {
            const {household, anna, bo, boOrder, dinner, adultPrice, takeaway, save} = givenSave()
            const annaQueued = WaitlistFactory.defaultEntry({
                id: 21, inhabitantId: anna.id, dinnerEventId: dinner.id, ticketPriceId: adultPrice.id, householdId: household.id, dinnerMode: DinnerModeSchema.enum.TAKEAWAY
            })
            vi.mocked(fetchWaitlistForHousehold).mockResolvedValue([annaQueued])
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
            expect(previewed).toEqual(saved)
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
                const sellerOf = {other: OTHER_HOUSEHOLD_ID, own: householdId}

                const previewed = await intents[key].preview(modes)

                expect(writersCalled()).toEqual([])
                expect(previewed.results.map(line => [line.inhabitantId, line.action])).toEqual(lines.map(([who, action]) => [idOf[who], action]))
                expect(previewed.positions.map(place => [place.inhabitantId, place.position])).toEqual(places.map(([who, position]) => [idOf[who], position]))
                expect(previewed.outcomes.waitlistTicketsSold.map(sale => [sale.buyerInhabitantId, sale.sellerHouseholdId]))
                    .toEqual(soldToLine.map(seller => [OTHER_INHABITANT_ID, sellerOf[seller]]))

                const saved = await intents[key].save(modes)

                expect(writersCalled()).toEqual(writes)
                expect(previewed).toEqual(saved)
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
                expect(deleteOrder).toHaveBeenCalledWith(d1Client, [boOrder.id], 7)
                expect(recordCancellation).toHaveBeenCalledWith(d1Client, [{
                    orderId: null, inhabitantId: anna.id, dinnerEventId: dinner.id, seasonId: season.id, performedByUserId: 7,
                    snapshot: expect.objectContaining({id: null, inhabitantId: anna.id, dinnerEventId: dinner.id, dinnerMode: Mode.NONE, isGuestTicket: false, householdId: household.id})
                }])
            }
        })
    })

    // A member's own join outranks the preference: its booking row makes the dinner the member's
    it.each([
        {preference: Mode.NONE, would: 'leave'},
        {preference: Mode.TAKEAWAY, would: 'requeue'}
    ])('GIVEN Anna joined a dinner\'s waiting list herself WHEN her preference says $preference, which would $would the place, THEN the place stands', async ({preference}) => {
        vi.clearAllMocks()
        const {season, household, anna, bo, dinner, adultPrice} = givenSave()
        vi.mocked(fetchOrders).mockResolvedValue([])
        vi.mocked(fetchWaitlistForHousehold).mockResolvedValue([
            WaitlistFactory.defaultEntry({id: 21, inhabitantId: anna.id, dinnerEventId: dinner.id, ticketPriceId: adultPrice.id, householdId: household.id})
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
                WaitlistFactory.defaultEntry({id, inhabitantId, dinnerEventId: dinner.id, ticketPriceId: adultPrice.id, householdId: household.id})
            const [annaPlace, boPlace] = [place(21, anna.id), place(22, bo.id)]
            vi.mocked(fetchWaitlistForHousehold).mockResolvedValue([annaPlace, boPlace])
            const queue: TicketWaitlistDisplay[] = []
            vi.mocked(fetchWaitlistForDinners).mockImplementation(async (_d1, dinnerEventIds) => queue.filter(entry => dinnerEventIds.includes(entry.dinnerEventId)))
            vi.mocked(createWaitlistEntry).mockImplementation(async (_d1, request) => {
                const entry = {...request, id: 500, createdAt: new Date(), placingAt: null, placingOrderId: null}
                queue.push(entry)
                return entry
            })
            vi.mocked(countReleasedTickets).mockResolvedValue(0)
            vi.mocked(deleteWaitlistEntry).mockResolvedValue(annaPlace.id)
            vi.mocked(updateWaitlistEntryOrder).mockImplementation(async (_d1, _id, order) => ({...boPlace, order}))
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
            return {runs, annaPlace, boPlace, bo, dayAfter, seasonId: season.id!}
        }

        it.each([
            {run: 'member', performedByUserId: 7, leave: AuditActions.USER_CANCELLED, requeue: AuditActions.USER_BOOKED, join: AuditActions.USER_BOOKED},
            {run: 'preferences', performedByUserId: 1, leave: AuditActions.SYSTEM_DELETED, requeue: AuditActions.SYSTEM_UPDATED, join: AuditActions.SYSTEM_CREATED}
        ] as const)('GIVEN the $run run WHEN it leaves, changes and joins THEN each write carries its audit', async ({run, performedByUserId, leave, requeue, join}) => {
            const {runs, annaPlace, boPlace, bo, dayAfter, seasonId} = givenPlaces()
            const audit = (action: OrderAuditAction) => ({action, performedByUserId, seasonId})

            const result = await runs[run]()

            expect(result.totals).toMatchObject({[Action.LEAVE]: 1, [Action.REQUEUE]: 1, [Action.QUEUE]: 1})
            expect(deleteWaitlistEntry).toHaveBeenCalledWith(d1Client, annaPlace.id, audit(leave))
            expect(updateWaitlistEntryOrder).toHaveBeenCalledWith(d1Client, boPlace.id, expect.objectContaining({dinnerMode: Mode.TAKEAWAY}), audit(requeue))
            expect(createWaitlistEntry).toHaveBeenCalledWith(d1Client, expect.objectContaining({inhabitantId: bo.id, dinnerEventId: dayAfter.id}), audit(join))
        })
    })
})
