import {describe, it, expect, vi, beforeEach} from 'vitest'
import {createError} from 'h3'
import {scaffoldPrebookings} from '~~/server/utils/scaffoldPrebookings'
import {joinWaitlist, sellTicketsToWaitlist} from '~~/server/utils/waitlistAssignment'
import {fetchHouseholds, fetchSeason} from '~~/server/data/prismaRepository'
import {claimOrder, createOrders, deleteOrder, fetchOrders, fetchUserIntentKeys, updateOrdersBatch, type OrderBatchUpdate} from '~~/server/data/financesRepository'
import {deleteWaitlistEntry, fetchWaitlistForHousehold, fetchWaitlistForDinners, updateWaitlistEntryOrder} from '~~/server/data/waitlistRepository'
import {useBookingValidation, type DesiredOrder, type DinnerMode} from '~/composables/useBookingValidation'
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
    fetchHouseholds: vi.fn(), fetchSeason: vi.fn(), fetchActiveSeasonId: vi.fn(), fetchUser: vi.fn()
}))
vi.mock('~~/server/data/financesRepository', () => ({
    fetchOrders: vi.fn(), fetchUserIntentKeys: vi.fn(), createOrders: vi.fn(), deleteOrder: vi.fn(), updateOrdersBatch: vi.fn(),
    claimOrder: vi.fn(), countReleasedTickets: vi.fn(), fetchDinnerEvent: vi.fn()
}))
vi.mock('~~/server/data/waitlistRepository', () => ({
    fetchWaitlistForHousehold: vi.fn(), fetchWaitlistForDinners: vi.fn(), deleteWaitlistEntry: vi.fn(), updateWaitlistEntryOrder: vi.fn(), createWaitlistEntry: vi.fn()
}))
// The system account is a seeded user the unit runtime lacks
vi.mock('~~/server/utils/systemUser', () => ({getSystemUserId: vi.fn(async () => 1)}))
// The waiting-list writes run as written; the spies record whether a run reaches them
vi.mock('~~/server/utils/waitlistAssignment', async importOriginal => {
    const original = await importOriginal<typeof import('~~/server/utils/waitlistAssignment')>()
    return {...original, joinWaitlist: vi.fn(original.joinWaitlist), sellTicketsToWaitlist: vi.fn(original.sellTicketsToWaitlist)}
})

const d1Client = {} as D1Database
const {DinnerModeSchema, BookingActionSchema, BookingFailureSchema, TicketTypeSchema} = useBookingValidation()
const {createDefaultWeekdayMap} = useCoreValidation()

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
    const Mode = DinnerModeSchema.enum
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
    const writeUpdates = vi.fn(async (_d1: D1Database, updates: OrderBatchUpdate[]) => updates.length)
    vi.mocked(updateOrdersBatch).mockReturnValue(writeUpdates)
    const writers = {createOrders, writeUpdates, deleteOrder, claimOrder, joinWaitlist, deleteWaitlistEntry, updateWaitlistEntryOrder, sellTicketsToWaitlist}
    const writersCalled = () => Object.entries(writers).filter(([, writer]) => vi.mocked(writer).mock.calls.length > 0).map(([name]) => name)
    // The endpoint's runs: the preview over the stored household, the save over the household holding the draft
    const preview = () => {
        vi.mocked(fetchHouseholds).mockResolvedValue([householdWith(preferencesOf(day => day.stored))])
        return scaffoldPrebookings(d1Client, {seasonId: season.id, householdId: household.id, dryRun: {inhabitantId: anna.id, dinnerPreferences: draft}})
    }
    const save = () => {
        vi.mocked(fetchHouseholds).mockResolvedValue([householdWith(draft)])
        return scaffoldPrebookings(d1Client, {seasonId: season.id, householdId: household.id})
    }
    return {preview, save, writersCalled}
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

    describe('a dry run of draft preferences', () => {
        beforeEach(() => {
            vi.clearAllMocks()
        })

        it('GIVEN a draft that books, changes the mode, releases and cancels WHEN the dry run runs THEN no writer runs and its result is the save\'s', async () => {
            const {preview, save, writersCalled} = givenPreferenceDraft()

            const previewed = await preview()
            expect(writersCalled()).toEqual([])

            const saved = await save()
            expect(writersCalled()).toEqual(['createOrders', 'writeUpdates', 'deleteOrder', 'sellTicketsToWaitlist'])
            expect(previewed).toEqual(saved)
        })

        it('refuses a dry run in user mode', async () => {
            const {anna} = givenSave()

            await expect(scaffoldPrebookings(d1Client, {
                seasonId: 1, householdId: 1, userId: 1, desiredOrders: [OrderFactory.defaultDesiredOrder()],
                dryRun: {inhabitantId: anna.id, dinnerPreferences: createDefaultWeekdayMap(DinnerModeSchema.enum.NONE)}
            })).rejects.toThrow('A dry run decides from preferences')
        })
    })
})
