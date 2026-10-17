import {describe, it, expect, vi, beforeEach} from 'vitest'
import {createError} from 'h3'
import {createOrders, claimOrder, fetchDinnerEvent} from '~~/server/data/financesRepository'
import {fetchSeason} from '~~/server/data/prismaRepository'
import {createWaitlistEntry, deleteWaitlistEntry, fetchWaitlistForDinners} from '~~/server/data/waitlistRepository'
import {assignWaitlistPortions, joinWaitlist, sellTicketsToWaitlist} from '~~/server/utils/waitlistAssignment'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useWaitlistValidation} from '~/composables/useWaitlistValidation'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'

// The unit runtime has no D1: the repositories answer from the test
vi.mock('~~/server/data/financesRepository', () => ({
    createOrders: vi.fn(),
    claimOrder: vi.fn(),
    fetchDinnerEvent: vi.fn()
}))
vi.mock('~~/server/data/prismaRepository', () => ({
    fetchSeason: vi.fn()
}))
vi.mock('~~/server/data/waitlistRepository', () => ({
    createWaitlistEntry: vi.fn(),
    deleteWaitlistEntry: vi.fn(),
    fetchWaitlistForDinners: vi.fn()
}))

const {DinnerStateSchema, TicketTypeSchema} = useBookingValidation()
const {TicketWaitlistCreateSchema} = useWaitlistValidation()
const DinnerState = DinnerStateSchema.enum

const d1Client = {} as D1Database
const DINNER_ID = 100
const SEASON_ID = 9
const ticketPrices = TicketFactory.defaultTicketPrices({seasonId: SEASON_ID})
const ADULT_PRICE_ID = ticketPrices.find(price => price.ticketType === TicketTypeSchema.enum.ADULT)!.id!

// Two regular entries in the dinner's adult line, first joined first
const [first, second] = [41, 42].map((inhabitantId, index) => WaitlistFactory.defaultEntry({
    id: index + 1, dinnerEventId: DINNER_ID, inhabitantId, ticketPriceId: ADULT_PRICE_ID,
    createdAt: new Date(2026, 9, 1, 12, index)
}))
// The Order unique index answers a second regular order for an inhabitant on a dinner
const uniqueViolation = () => createError({statusCode: 409, statusMessage: 'Conflict'})

beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.mocked(fetchWaitlistForDinners).mockResolvedValue([first!, second!])
    vi.mocked(fetchSeason).mockResolvedValue({...SeasonFactory.defaultSeason(), id: SEASON_ID, ticketPrices})
})

describe('joinWaitlist', () => {
    const {position: _position, ...request} = second!
    const wish = TicketWaitlistCreateSchema.parse(request)

    it('decides by the dinner it is handed and reads neither the dinner nor its season', async () => {
        vi.mocked(createWaitlistEntry).mockResolvedValue(second!)

        const {position, joined} = await joinWaitlist(d1Client, wish, {state: DinnerState.SCHEDULED, ticketPrices})

        expect(position).toBe(2)
        expect(joined).toMatchObject({position: 2, ticketType: TicketTypeSchema.enum.ADULT, queueSize: 2})
        expect(fetchDinnerEvent).not.toHaveBeenCalled()
        expect(fetchSeason).not.toHaveBeenCalled()
    })

    it.each([DinnerState.CONSUMED, DinnerState.CANCELLED])('refuses a %s dinner', async (state) => {
        await expect(joinWaitlist(d1Client, wish, {state, ticketPrices})).rejects.toMatchObject({statusCode: 400})
        expect(createWaitlistEntry).not.toHaveBeenCalled()
    })
})

// A run that wrote the order and stopped before removing the entry leaves the entry behind: the next run finds the
// order in place, the entry leaves the queue and the line moves on
describe('an entry whose regular order is already placed', () => {
    it('sellTicketsToWaitlist: the entry leaves its line and the next in line buys the ticket', async () => {
        vi.mocked(claimOrder)
            .mockRejectedValueOnce(uniqueViolation())
            .mockResolvedValueOnce({order: {} as never, ticketPriceId: ADULT_PRICE_ID, sellerHouseholdId: 3})

        const sales = await sellTicketsToWaitlist(d1Client, [DINNER_ID], ticketPrices)

        expect(sales).toEqual([{
            dinnerEventId: DINNER_ID, ticketPriceId: ADULT_PRICE_ID,
            buyerInhabitantId: second!.inhabitantId, buyerHouseholdId: second!.order.householdId, sellerHouseholdId: 3
        }])
        expect(vi.mocked(deleteWaitlistEntry).mock.calls.map(([, id]) => id)).toEqual([first!.id, second!.id])
    })

    it('assignWaitlistPortions: the entry leaves the queue and is not assigned again; the next entry gets its order', async () => {
        vi.mocked(createOrders)
            .mockRejectedValueOnce(uniqueViolation())
            .mockResolvedValueOnce({householdId: second!.order.householdId, createdIds: [77]})
        const dinner = {...DinnerEventFactory.defaultDinnerEventDetail(), id: DINNER_ID, seasonId: SEASON_ID}

        const result = await assignWaitlistPortions(d1Client, dinner, 2, null)

        expect(result.assigned.map(assigned => ({entryId: assigned.entryId, orderId: assigned.orderId}))).toEqual([{entryId: second!.id, orderId: 77}])
        expect(vi.mocked(deleteWaitlistEntry).mock.calls.map(([, id]) => id)).toEqual([first!.id, second!.id])
    })

    it.each([
        {step: 'sellTicketsToWaitlist', fail: () => vi.mocked(claimOrder).mockRejectedValueOnce(new Error('D1 down')),
            run: () => sellTicketsToWaitlist(d1Client, [DINNER_ID], ticketPrices)},
        {step: 'assignWaitlistPortions', fail: () => vi.mocked(createOrders).mockRejectedValueOnce(new Error('D1 down')),
            run: () => assignWaitlistPortions(d1Client, {...DinnerEventFactory.defaultDinnerEventDetail(), id: DINNER_ID, seasonId: SEASON_ID}, 2, null)}
    ])('$step: any other failure stops the step and keeps the entry', async ({fail, run}) => {
        fail()

        await expect(run()).rejects.toThrow('D1 down')
        expect(deleteWaitlistEntry).not.toHaveBeenCalled()
    })
})
