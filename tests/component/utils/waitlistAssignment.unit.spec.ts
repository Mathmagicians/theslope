import {describe, it, expect, vi, beforeEach} from 'vitest'
import {createError} from 'h3'
import {subMinutes} from 'date-fns'
import {createOrders, claimReleasedOrder, findReleasedOrderId, fetchDinnerEvent} from '~~/server/data/financesRepository'
import {fetchSeason} from '~~/server/data/prismaRepository'
import {
    createWaitlistEntry, fetchOrdersServingEntry, fetchWaitlistForDinners, grabWaitlistEntry, recordWaitlistPlacingOrder,
    releaseWaitlistEntry, removePlacedWaitlistEntry
} from '~~/server/data/waitlistRepository'
import {assignWaitlistPortions, joinWaitlist, sellTicketsToWaitlist} from '~~/server/utils/waitlistAssignment'
import {useBookingValidation, OrderAuditAction} from '~/composables/useBookingValidation'
import {useWaitlistValidation, type PlacementOrder} from '~/composables/useWaitlistValidation'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'

const LEASE_MINUTES = 10
// The server reads the placing lease from the app config, an auto-import of the Nitro scope the unit runtime lacks
vi.stubGlobal('useAppConfig', () => ({theslope: {waitlistPlacingLeaseMinutes: LEASE_MINUTES}}))

// The unit runtime has no D1: the repositories answer from the test
vi.mock('~~/server/data/financesRepository', () => ({
    createOrders: vi.fn(),
    findReleasedOrderId: vi.fn(),
    claimReleasedOrder: vi.fn(),
    fetchDinnerEvent: vi.fn()
}))
vi.mock('~~/server/data/prismaRepository', () => ({
    fetchSeason: vi.fn()
}))
vi.mock('~~/server/data/waitlistRepository', () => ({
    createWaitlistEntry: vi.fn(),
    fetchWaitlistForDinners: vi.fn(),
    grabWaitlistEntry: vi.fn(),
    releaseWaitlistEntry: vi.fn(),
    recordWaitlistPlacingOrder: vi.fn(),
    removePlacedWaitlistEntry: vi.fn(),
    fetchOrdersServingEntry: vi.fn()
}))

const {DinnerStateSchema, TicketTypeSchema} = useBookingValidation()
const {TicketWaitlistCreateSchema} = useWaitlistValidation()
const DinnerState = DinnerStateSchema.enum

const d1Client = {} as D1Database
const DINNER_ID = 100
const SEASON_ID = 9
const RELEASED_ORDER_ID = 501
const CREATED_ORDER_ID = 77
const ticketPrices = TicketFactory.defaultTicketPrices({seasonId: SEASON_ID})
const priceIdOf = (ticketType: keyof typeof TicketTypeSchema.enum) => ticketPrices.find(price => price.ticketType === ticketType)!.id!
const ADULT_PRICE_ID = priceIdOf(TicketTypeSchema.enum.ADULT)
const portionDinner = {...DinnerEventFactory.defaultDinnerEventDetail(), id: DINNER_ID, seasonId: SEASON_ID}

// Two regular entries in the dinner's adult line, first joined first, and one in its child line
const [first, second, child] = [41, 42, 43].map((inhabitantId, index) => WaitlistFactory.defaultEntry({
    id: index + 1, dinnerEventId: DINNER_ID, inhabitantId, ticketPriceId: index < 2 ? ADULT_PRICE_ID : priceIdOf(TicketTypeSchema.enum.CHILD),
    createdAt: new Date(2026, 9, 1, 12, index)
}))
// A grab older than the lease is the trace of a run that stopped midway; a younger grab belongs to a run at work
const STALE = subMinutes(new Date(), 3 * LEASE_MINUTES)
const HELD = subMinutes(new Date(), 1)
// The Order unique index answers a second regular order for an inhabitant on a dinner
const uniqueViolation = () => createError({statusCode: 409, statusMessage: 'Conflict'})
const sold = {order: {} as never, ticketPriceId: ADULT_PRICE_ID, sellerHouseholdId: 3}

// The protocol's writes in the order the run makes them
const PROTOCOL = {
    grab: grabWaitlistEntry, claim: claimReleasedOrder, create: createOrders,
    record: recordWaitlistPlacingOrder, remove: removePlacedWaitlistEntry, release: releaseWaitlistEntry
}
const protocolSteps = () => Object.entries(PROTOCOL)
    .flatMap(([step, write]) => vi.mocked(write).mock.invocationCallOrder.map(order => ({step, order})))
    .sort((a, b) => a.order - b.order)
    .map(({step}) => step)
const removedIds = () => vi.mocked(removePlacedWaitlistEntry).mock.calls.map(([, id]) => id)

const sell = () => sellTicketsToWaitlist(d1Client, [DINNER_ID], ticketPrices)
const assign = (portions: number) => assignWaitlistPortions(d1Client, portionDinner, portions, null)

beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.mocked(fetchWaitlistForDinners).mockResolvedValue([first!, second!])
    vi.mocked(fetchSeason).mockResolvedValue({...SeasonFactory.defaultSeason(), id: SEASON_ID, ticketPrices})
    vi.mocked(findReleasedOrderId).mockResolvedValue(null)
    vi.mocked(grabWaitlistEntry).mockResolvedValue(true)
    vi.mocked(fetchOrdersServingEntry).mockResolvedValue([])
})

describe('joinWaitlist', () => {
    const {position: _position, ...request} = second!
    const wish = TicketWaitlistCreateSchema.parse(request)
    // The member who joins, as the join's history row names them
    const audit = {action: OrderAuditAction.USER_BOOKED, performedByUserId: 7, seasonId: SEASON_ID}

    it('decides by the dinner it is handed, reads neither the dinner nor its season, and writes the entry with its audit', async () => {
        vi.mocked(createWaitlistEntry).mockResolvedValue(second!)

        const {position, joined} = await joinWaitlist(d1Client, wish, {state: DinnerState.SCHEDULED, ticketPrices}, audit)

        expect(createWaitlistEntry).toHaveBeenCalledWith(d1Client, wish, audit)
        expect(position).toBe(2)
        expect(joined).toMatchObject({position: 2, ticketType: TicketTypeSchema.enum.ADULT, queueSize: 2})
        expect(fetchDinnerEvent).not.toHaveBeenCalled()
        expect(fetchSeason).not.toHaveBeenCalled()
    })

    it.each([DinnerState.CONSUMED, DinnerState.CANCELLED])('refuses a %s dinner', async (state) => {
        await expect(joinWaitlist(d1Client, wish, {state, ticketPrices}, audit)).rejects.toMatchObject({statusCode: 400})
        expect(createWaitlistEntry).not.toHaveBeenCalled()
    })
})

describe('sellTicketsToWaitlist', () => {
    it('grabs the first in line with the oldest released ticket, claims that ticket, then removes the entry; the line stops at its first miss', async () => {
        vi.mocked(findReleasedOrderId).mockResolvedValueOnce(RELEASED_ORDER_ID)
        vi.mocked(claimReleasedOrder).mockResolvedValue(sold)

        const {waitlistTicketsSold: sales} = await sell()

        expect(sales).toEqual([{
            dinnerEventId: DINNER_ID, ticketPriceId: ADULT_PRICE_ID,
            buyerInhabitantId: first!.inhabitantId, buyerHouseholdId: first!.order.householdId, sellerHouseholdId: 3
        }])
        expect(protocolSteps()).toEqual(['grab', 'claim', 'remove'])
        expect(grabWaitlistEntry).toHaveBeenCalledWith(d1Client, first!.id, expect.any(Date), RELEASED_ORDER_ID)
        expect(claimReleasedOrder).toHaveBeenCalledWith(d1Client, RELEASED_ORDER_ID, first!.inhabitantId, first!.order.bookedByUserId, first!.order.dinnerMode, first!.isGuestTicket)
        expect(removedIds()).toEqual([first!.id])
    })

    it('hands the entry back to its place when another buyer takes the ticket first, then grabs it with the next ticket for sale', async () => {
        vi.mocked(findReleasedOrderId).mockResolvedValueOnce(RELEASED_ORDER_ID).mockResolvedValueOnce(RELEASED_ORDER_ID + 1)
        vi.mocked(claimReleasedOrder).mockResolvedValueOnce(null).mockResolvedValue(sold)

        await sell()

        expect(protocolSteps()).toEqual(['grab', 'claim', 'release', 'grab', 'claim', 'remove'])
        expect(vi.mocked(grabWaitlistEntry).mock.calls.map(([, , , orderId]) => orderId)).toEqual([RELEASED_ORDER_ID, RELEASED_ORDER_ID + 1])
    })

    it('stops a line at an entry another run grabbed since the read; the other ticket types sell on', async () => {
        vi.mocked(fetchWaitlistForDinners).mockResolvedValue([first!, second!, child!])
        vi.mocked(findReleasedOrderId).mockResolvedValue(RELEASED_ORDER_ID)
        vi.mocked(grabWaitlistEntry).mockResolvedValueOnce(false).mockResolvedValue(true)
        vi.mocked(claimReleasedOrder).mockResolvedValue(sold)

        const {waitlistTicketsSold: sales} = await sell()

        expect(sales.map(sale => sale.buyerInhabitantId)).toEqual([child!.inhabitantId])
        expect(vi.mocked(grabWaitlistEntry).mock.calls.map(([, id]) => id)).toEqual([first!.id, child!.id])
    })
})

describe('assignWaitlistPortions', () => {
    it('grabs each entry that fits, writes its order, records the order on the entry, then removes the entry', async () => {
        vi.mocked(createOrders)
            .mockResolvedValueOnce({householdId: first!.order.householdId, createdIds: [CREATED_ORDER_ID]})
            .mockResolvedValueOnce({householdId: second!.order.householdId, createdIds: [CREATED_ORDER_ID + 1]})

        const result = await assign(2)

        expect(result.assigned.map(({entryId, orderId}) => ({entryId, orderId}))).toEqual([
            {entryId: first!.id, orderId: CREATED_ORDER_ID}, {entryId: second!.id, orderId: CREATED_ORDER_ID + 1}
        ])
        expect(protocolSteps()).toEqual(['grab', 'create', 'record', 'remove', 'grab', 'create', 'record', 'remove'])
        expect(grabWaitlistEntry).toHaveBeenCalledWith(d1Client, first!.id, expect.any(Date))
        expect(vi.mocked(recordWaitlistPlacingOrder).mock.calls.map(([, id, orderId]) => ({id, orderId}))).toEqual([
            {id: first!.id, orderId: CREATED_ORDER_ID}, {id: second!.id, orderId: CREATED_ORDER_ID + 1}
        ])
    })

    it('stops the walk at an entry another run grabbed since the read; the entries from there on wait', async () => {
        vi.mocked(grabWaitlistEntry).mockResolvedValueOnce(false)

        const result = await assign(2)

        expect(result).toMatchObject({assigned: [], portionsUsed: 0, waiting: 2})
        expect(createOrders).not.toHaveBeenCalled()
    })
})

// An entry whose inhabitant already holds a regular order: the unique index answers the write with a conflict, the
// entry leaves the queue and the line moves on
describe('an entry whose regular order is already placed', () => {
    it('sellTicketsToWaitlist: the entry leaves its line and the next in line buys the ticket', async () => {
        vi.mocked(findReleasedOrderId).mockResolvedValue(RELEASED_ORDER_ID)
        vi.mocked(claimReleasedOrder)
            .mockRejectedValueOnce(uniqueViolation())
            .mockResolvedValueOnce(sold)

        const {waitlistTicketsSold: sales} = await sell()

        expect(sales).toEqual([{
            dinnerEventId: DINNER_ID, ticketPriceId: ADULT_PRICE_ID,
            buyerInhabitantId: second!.inhabitantId, buyerHouseholdId: second!.order.householdId, sellerHouseholdId: 3
        }])
        expect(removedIds()).toEqual([first!.id, second!.id])
    })

    it('assignWaitlistPortions: the entry leaves the queue and is not assigned again; the next entry gets its order', async () => {
        vi.mocked(createOrders)
            .mockRejectedValueOnce(uniqueViolation())
            .mockResolvedValueOnce({householdId: second!.order.householdId, createdIds: [CREATED_ORDER_ID]})

        const result = await assign(2)

        expect(result.assigned.map(assigned => ({entryId: assigned.entryId, orderId: assigned.orderId}))).toEqual([{entryId: second!.id, orderId: CREATED_ORDER_ID}])
        expect(removedIds()).toEqual([first!.id, second!.id])
    })

    it.each([
        {step: 'sellTicketsToWaitlist', fail: () => {
            vi.mocked(findReleasedOrderId).mockResolvedValue(RELEASED_ORDER_ID)
            vi.mocked(claimReleasedOrder).mockRejectedValueOnce(new Error('D1 down'))
        }, run: sell},
        {step: 'assignWaitlistPortions', fail: () => vi.mocked(createOrders).mockRejectedValueOnce(new Error('D1 down')),
            run: () => assign(2)}
    ])('$step: any other failure stops the step and leaves the entry grabbed for the recovery', async ({fail, run}) => {
        fail()

        await expect(run()).rejects.toThrow('D1 down')
        expect(removePlacedWaitlistEntry).not.toHaveBeenCalled()
        expect(releaseWaitlistEntry).not.toHaveBeenCalled()
    })
})

// The orders a stopped run left: an extra portion's own is written after the grab, a released ticket before it
const writtenAfterGrab = subMinutes(new Date(), 2 * LEASE_MINUTES)
const releasedBeforeGrab = subMinutes(new Date(), 6 * LEASE_MINUTES)
const servingOrder = (createdAt: Date, overrides: Partial<PlacementOrder> = {}): PlacementOrder => ({
    ...OrderFactory.defaultOrder(undefined, {id: CREATED_ORDER_ID, inhabitantId: first!.inhabitantId, ticketPriceId: ADULT_PRICE_ID, createdAt}),
    sellerHouseholdId: null,
    ...overrides
})

// Recovery runs before the walk: without supply the run's writes and outcomes are the recovery's own; with supply the
// walk follows. Each path reports the tickets sold and the extra portions assigned
describe.each([
    {path: 'sellTicketsToWaitlist', place: async (withSupply: boolean) => {
        if (withSupply) vi.mocked(findReleasedOrderId).mockResolvedValue(RELEASED_ORDER_ID)
        const {waitlistTicketsSold, waitlistPortionsAssigned} = await sell()
        return {sold: waitlistTicketsSold, assigned: waitlistPortionsAssigned}
    }},
    {path: 'assignWaitlistPortions', place: async (withSupply: boolean) => {
        const {waitlistTicketsSold, assigned} = await assign(withSupply ? 2 : 0)
        return {sold: waitlistTicketsSold, assigned}
    }}
])('$path', ({place}) => {
    const stopped = (placingOrderId: number | null) => ({...first!, placingAt: STALE, placingOrderId})

    it.each([
        {evidence: 'the recorded order is the stopped extra portion\'s', placingOrderId: CREATED_ORDER_ID, found: [servingOrder(writtenAfterGrab)],
            steps: ['remove'], reported: {sold: [], assigned: [first!.id]}},
        {evidence: 'the search finds the order the stopped extra portion wrote', placingOrderId: null, found: [servingOrder(writtenAfterGrab)],
            steps: ['record', 'remove'], reported: {sold: [], assigned: [first!.id]}},
        {evidence: 'the recorded released ticket went to the entry', placingOrderId: RELEASED_ORDER_ID,
            found: [servingOrder(releasedBeforeGrab, {id: RELEASED_ORDER_ID, sellerHouseholdId: 3})],
            steps: ['remove'], reported: {sold: [first!.inhabitantId], assigned: []}},
        {evidence: 'nothing serves the entry', placingOrderId: null, found: [], steps: ['release'], reported: {sold: [], assigned: []}}
    ])('recovers a grab older than the lease before it places, and reports what it finished: $evidence', async ({placingOrderId, found, steps, reported}) => {
        vi.mocked(fetchWaitlistForDinners).mockResolvedValue([stopped(placingOrderId), second!])
        vi.mocked(fetchOrdersServingEntry).mockResolvedValue(found)

        const outcomes = await place(false)

        expect(protocolSteps()).toEqual(steps)
        expect({sold: outcomes.sold.map(sale => sale.buyerInhabitantId), assigned: outcomes.assigned.map(placed => placed.entryId)}).toEqual(reported)
        expect(vi.mocked(fetchOrdersServingEntry).mock.calls.map(([, entry]) => entry.id)).toEqual([first!.id])
        expect(vi.mocked(recordWaitlistPlacingOrder).mock.calls.map(([, id, orderId]) => ({id, orderId})))
            .toEqual(steps.includes('record') ? [{id: first!.id, orderId: CREATED_ORDER_ID}] : [])
    })

    it('leaves a grab younger than the lease to its run, and the walk stops at it', async () => {
        vi.mocked(fetchWaitlistForDinners).mockResolvedValue([{...first!, placingAt: HELD, placingOrderId: null}, second!])

        await place(true)

        expect(fetchOrdersServingEntry).not.toHaveBeenCalled()
        expect(protocolSteps()).toEqual([])
    })
})

describe('the recovery\'s search for an order no entry records', () => {
    it('passes over the orders recorded on other entries and the orders it matched earlier in the pass', async () => {
        const guestEntry = (id: number) => WaitlistFactory.defaultEntry({
            id, dinnerEventId: DINNER_ID, inhabitantId: first!.inhabitantId, isGuestTicket: true, ticketPriceId: ADULT_PRICE_ID, createdAt: new Date(2026, 9, 1, 13, id)
        })
        const [guest, secondGuest] = [5, 6].map(id => ({...guestEntry(id), placingAt: STALE}))
        const servedElsewhere = {...guestEntry(7), placingAt: HELD, placingOrderId: CREATED_ORDER_ID}
        // The inhabitant's guest orders written since the grabs, the first of them recorded on the held entry
        const written = [CREATED_ORDER_ID, CREATED_ORDER_ID + 1, CREATED_ORDER_ID + 2].map(id => servingOrder(writtenAfterGrab, {id, isGuestTicket: true}))
        vi.mocked(fetchWaitlistForDinners).mockResolvedValue([guest!, secondGuest!, servedElsewhere])
        vi.mocked(fetchOrdersServingEntry).mockResolvedValue(written)

        await sell()

        expect(vi.mocked(recordWaitlistPlacingOrder).mock.calls.map(([, id, orderId]) => ({id, orderId}))).toEqual([
            {id: guest!.id, orderId: CREATED_ORDER_ID + 1}, {id: secondGuest!.id, orderId: CREATED_ORDER_ID + 2}
        ])
        expect(protocolSteps()).toEqual(['record', 'remove', 'record', 'remove'])
    })
})
