import {describe, it, expect, vi} from 'vitest'
import {createError} from 'h3'
import {scaffoldPrebookings} from '~~/server/utils/scaffoldPrebookings'
import {fetchHouseholds, fetchSeason} from '~~/server/data/prismaRepository'
import {fetchOrders, fetchUserIntentKeys, updateOrdersBatch} from '~~/server/data/financesRepository'
import {deleteWaitlistEntry, fetchWaitlistForHousehold, fetchWaitlistForDinners, updateWaitlistEntryOrder} from '~~/server/data/waitlistRepository'
import {useBookingValidation, type DesiredOrder} from '~/composables/useBookingValidation'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {OPEN_DEADLINES} from '~/composables/useSeason'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'

// The scaffolder reads the app config, and its error log builds errors, from the Nitro auto-import scope
vi.stubGlobal('useAppConfig', () => ({theslope: {}}))
vi.stubGlobal('createError', createError)

// The repositories stand for the database the unit runtime lacks
vi.mock('~~/server/data/prismaRepository', () => ({
    fetchHouseholds: vi.fn(), fetchSeason: vi.fn(), fetchActiveSeasonId: vi.fn(), fetchUser: vi.fn()
}))
vi.mock('~~/server/data/financesRepository', () => ({
    fetchOrders: vi.fn(), fetchUserIntentKeys: vi.fn(), createOrders: vi.fn(), deleteOrder: vi.fn(), updateOrdersBatch: vi.fn(),
    claimOrder: vi.fn(), countReleasedTickets: vi.fn(), fetchDinnerEvent: vi.fn()
}))
vi.mock('~~/server/data/waitlistRepository', () => ({
    fetchWaitlistForHousehold: vi.fn(), fetchWaitlistForDinners: vi.fn(), deleteWaitlistEntry: vi.fn(), updateWaitlistEntryOrder: vi.fn(), createWaitlistEntry: vi.fn()
}))

const d1Client = {} as D1Database
const {DinnerModeSchema, BookingActionSchema, BookingFailureSchema, TicketTypeSchema} = useBookingValidation()

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
    return {household, anna: anna!, bo: bo!, boOrder, dinner, adultPrice, takeaway, save}
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
})
