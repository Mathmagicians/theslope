import {test, expect, type Browser} from '@playwright/test'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {useBookingValidation, type InhabitantUpdateResponse} from '~/composables/useBookingValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {dateToWeekDay} from '~/utils/season'
import testHelpers from '~~/tests/e2e/testHelpers'
import {differenceInCalendarDays} from 'date-fns'
const Action = useBookingValidation().BookingActionSchema.enum

const {validatedBrowserContext, memberValidatedBrowserContext, getSessionUserInfo, temporaryAndRandom, salt} = testHelpers
const {DinnerModeSchema, OrderStateSchema, TicketTypeSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum
const {createDefaultWeekdayMap} = useWeekDayMapValidation({valueSchema: DinnerModeSchema, defaultValue: DinnerMode.NONE})

// Cleanup tracking
const createdHouseholdIds: number[] = []
const createdInhabitantIds: number[] = []

test.describe('Household Preferences API', () => {
    // The member edits a test inhabitant of their own household, never their own row: other specs book for that household
    let ownHouseholdInhabitantId: number

    test.beforeAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const {householdId} = await getSessionUserInfo(await memberValidatedBrowserContext(browser))
        const inhabitant = await HouseholdFactory.createInhabitantWithConfig(adminContext, householdId, {
            name: salt('Anders', temporaryAndRandom()), lastName: 'Preferences', birthDate: null
        })
        createdInhabitantIds.push(inhabitant.id)
        ownHouseholdInhabitantId = inhabitant.id
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        for (const id of createdInhabitantIds) await HouseholdFactory.deleteInhabitant(context, id)
        await HouseholdFactory.deleteHousehold(context, createdHouseholdIds)
    })

    // Parametrized happy path tests for different DinnerMode values
    const dinnerModes = [DinnerMode.DINEIN, DinnerMode.TAKEAWAY, DinnerMode.DINEINLATE, DinnerMode.NONE] as const

    dinnerModes.forEach((mode) => {
        test(`GIVEN member WHEN updating preferences to ${mode} THEN succeeds`, async ({browser}) => {
            const memberContext = await memberValidatedBrowserContext(browser)
            const preferences = createDefaultWeekdayMap(mode)

            const result = await HouseholdFactory.updateInhabitantPreferences(memberContext, ownHouseholdInhabitantId, preferences)

            expect(result).not.toBeNull()
            expect(result!.inhabitant.id).toBe(ownHouseholdInhabitantId)
            expect(result!.inhabitant.dinnerPreferences).toEqual(preferences)
            expect(result!.scaffoldResult).toBeDefined()
        })
    })

    test('GIVEN member WHEN updating different household inhabitant THEN returns 403', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
            adminContext, {name: salt('Other-Household', testSalt)}, 1
        )
        createdHouseholdIds.push(household.id)

        const memberContext = await memberValidatedBrowserContext(browser)
        await HouseholdFactory.updateInhabitantPreferences(
            memberContext, inhabitants[0]!.id, createDefaultWeekdayMap(DinnerMode.DINEIN), 403
        )
    })

    test('GIVEN removed inhabitant WHEN updating preferences THEN returns 404', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
            adminContext, {name: salt('Removed-Inhabitant', temporaryAndRandom())}, 1
        )
        createdHouseholdIds.push(household.id)
        await HouseholdFactory.deleteInhabitant(adminContext, inhabitants[0]!.id, 200)

        const memberContext = await memberValidatedBrowserContext(browser)
        await HouseholdFactory.updateInhabitantPreferences(
            memberContext, inhabitants[0]!.id, createDefaultWeekdayMap(DinnerMode.DINEIN), 404
        )
    })
})

/**
 * Scaffold Result Count Verification Tests
 * Tests that preference transitions produce expected scaffold counts
 *
 * Uses dedicated season with SHORT deadline (0 days) so scaffold can CREATE orders.
 * Deadline constraint: events must be BEFORE deadline for scaffold to CREATE.
 */
test.describe('Preference Transition Scaffold Counts', () => {
    let testSeason: Awaited<ReturnType<typeof SeasonFactory.createSeasonWithDinnerEvents>>['season']
    let testHouseholdId: number
    let testInhabitantId: number
    const testSalt = temporaryAndRandom()
    const scaffoldSeasonIds: number[] = []
    const scaffoldHouseholdIds: number[] = []

    // Short deadline means all events are BEFORE deadline (scaffold can create)
    const SHORT_CANCEL_PERIOD = 0

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Create dedicated season with SHORT deadline so scaffold can CREATE
        const {season} = await SeasonFactory.createSeasonWithDinnerEvents(context, testSalt, {
            ticketIsCancellableDaysBefore: SHORT_CANCEL_PERIOD
        })
        testSeason = season
        scaffoldSeasonIds.push(season.id as number)

        // Create test household with 1 inhabitant starting with NONE preferences
        const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
            context,
            {name: salt('Test-Scaffold', testSalt)},
            1
        )
        testHouseholdId = household.id
        scaffoldHouseholdIds.push(testHouseholdId)
        testInhabitantId = inhabitants[0]!.id

        // Set initial preferences to NONE
        await HouseholdFactory.updateInhabitant(context, testInhabitantId, {
            dinnerPreferences: createDefaultWeekdayMap(DinnerMode.NONE)
        }, 200, testSeason.id)
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await HouseholdFactory.deleteHousehold(context, scaffoldHouseholdIds)
        await SeasonFactory.cleanupSeasons(context, scaffoldSeasonIds)
    })

    test('NONE → DINEIN creates orders (created > 0)', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Get dinner event count for season
        const dinnerEvents = await DinnerEventFactory.getDinnerEventsForSeason(context, testSeason.id!)
        const cookingDayCount = dinnerEvents.length

        // Set preferences to NONE first to ensure clean state
        await HouseholdFactory.updateInhabitant(context, testInhabitantId, {
            dinnerPreferences: createDefaultWeekdayMap(DinnerMode.NONE)
        }, 200, testSeason.id)

        // Change to DINEIN - should create orders
        const result = await HouseholdFactory.updateInhabitant(
            context,
            testInhabitantId,
            {dinnerPreferences: createDefaultWeekdayMap(DinnerMode.DINEIN)},
            200,
            testSeason.id,
            (response) => {
                expect(response.scaffoldResult.totals[Action.BOOK], 'Should create orders for each cooking day').toBe(cookingDayCount)
                expect(response.scaffoldResult.totals[Action.RELEASE], 'Should not release any orders').toBe(0)
                expect(response.scaffoldResult.totals[Action.CANCEL], 'Should not delete any orders').toBe(0)
            }
        )
        expect(result).not.toBeNull()
    })

    test('DINEIN → NONE removes orders (deleted before deadline)', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Get dinner event count for season
        const dinnerEvents = await DinnerEventFactory.getDinnerEventsForSeason(context, testSeason.id!)
        const cookingDayCount = dinnerEvents.length

        // Set preferences to DINEIN first to create orders
        await HouseholdFactory.updateInhabitant(context, testInhabitantId, {
            dinnerPreferences: createDefaultWeekdayMap(DinnerMode.DINEIN)
        }, 200, testSeason.id)

        // Change to NONE - with SHORT deadline, orders are DELETED (not released)
        await HouseholdFactory.updateInhabitant(
            context,
            testInhabitantId,
            {dinnerPreferences: createDefaultWeekdayMap(DinnerMode.NONE)},
            200,
            testSeason.id,
            (response) => {
                // Before deadline = deleted, After deadline = released
                expect(response.scaffoldResult.totals[Action.CANCEL] + response.scaffoldResult.totals[Action.RELEASE], 'Should remove all orders').toBe(cookingDayCount)
                expect(response.scaffoldResult.totals[Action.BOOK], 'Should not create any orders').toBe(0)
            }
        )

        // Verify orders are removed (no more BOOKED orders for this inhabitant)
        const dinnerEventIds = dinnerEvents.map(de => de.id)
        const orders = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEventIds)
        const bookedOrders = orders.filter(o => o.inhabitantId === testInhabitantId && o.state === OrderStateSchema.enum.BOOKED)

        expect(bookedOrders.length, 'Should have no BOOKED orders').toBe(0)
    })

    test('DINEIN → TAKEAWAY does NOT release orders (mode change only)', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Set preferences to DINEIN first
        await HouseholdFactory.updateInhabitant(context, testInhabitantId, {
            dinnerPreferences: createDefaultWeekdayMap(DinnerMode.DINEIN)
        }, 200, testSeason.id)

        // Change to TAKEAWAY - should NOT release, just update mode
        await HouseholdFactory.updateInhabitant(
            context,
            testInhabitantId,
            {dinnerPreferences: createDefaultWeekdayMap(DinnerMode.TAKEAWAY)},
            200,
            testSeason.id,
            (response) => {
                expect(response.scaffoldResult.totals[Action.RELEASE], 'Should NOT release orders for mode change').toBe(0)
                expect(response.scaffoldResult.totals[Action.BOOK], 'Should not create new orders').toBe(0)
                expect(response.scaffoldResult.totals[Action.CANCEL], 'Should not delete orders').toBe(0)
            }
        )
    })

    test('Same preference is idempotent (unchanged > 0)', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const prefs = createDefaultWeekdayMap(DinnerMode.DINEIN)

        // Set preferences to DINEIN
        await HouseholdFactory.updateInhabitant(context, testInhabitantId, {
            dinnerPreferences: prefs
        }, 200, testSeason.id)

        // Set same preferences again - should be unchanged
        await HouseholdFactory.updateInhabitant(
            context,
            testInhabitantId,
            {dinnerPreferences: prefs},
            200,
            testSeason.id,
            (response) => {
                expect(response.scaffoldResult.unchanged, 'Should report unchanged orders').toBeGreaterThan(0)
                expect(response.scaffoldResult.totals[Action.BOOK], 'Should not create orders').toBe(0)
                expect(response.scaffoldResult.totals[Action.RELEASE], 'Should not release orders').toBe(0)
                expect(response.scaffoldResult.totals[Action.CANCEL], 'Should not delete orders').toBe(0)
            }
        )
    })
})

/** The seasons and persons a describe's cases create through `personBookedOnOwnSeason`, removed in its afterAll */
type OwnSeasonIds = {seasonIds: number[], inhabitantIds: number[]}

/**
 * A case's own season, open until each dinner, with a person of the member's household booked on it by a DINEIN
 * preference; `dinner` is the season's first dinner from tomorrow on. The person stores Ingen, so the DINEIN save changes
 * every weekday and books each dinner
 */
const personBookedOnOwnSeason = async (browser: Browser, lastName: string, created: OwnSeasonIds) => {
    const adminContext = await validatedBrowserContext(browser)
    const memberContext = await memberValidatedBrowserContext(browser)
    const testSalt = temporaryAndRandom()
    const {householdId} = await getSessionUserInfo(memberContext)
    const {season, dinnerEvents} = await SeasonFactory.createSeasonWithDinnerEvents(adminContext, testSalt, {ticketIsCancellableDaysBefore: 0})
    created.seasonIds.push(season.id!)
    const inhabitant = await HouseholdFactory.createInhabitantWithConfig(adminContext, householdId, {
        name: salt('Anders', testSalt), lastName, birthDate: null, dinnerPreferences: createDefaultWeekdayMap(DinnerMode.NONE)
    })
    created.inhabitantIds.push(inhabitant.id)
    const dinner = dinnerEvents.find(de => differenceInCalendarDays(de.date, new Date()) >= 1)!
    const dineIn = createDefaultWeekdayMap(DinnerMode.DINEIN)
    await HouseholdFactory.updateInhabitantPreferences(memberContext, inhabitant.id, dineIn, 200, season.id)
    return {adminContext, memberContext, householdId, season, dinnerEvents, dinner, inhabitant, dineIn}
}

const removeOwnSeasons = async (browser: Browser, {seasonIds, inhabitantIds}: OwnSeasonIds) => {
    const context = await validatedBrowserContext(browser)
    for (const id of inhabitantIds) await HouseholdFactory.deleteInhabitant(context, id)
    await SeasonFactory.cleanupSeasons(context, seasonIds)
}

/**
 * A guest ticket booked on a person is not the person's own ticket: a preference change decides the person's own
 * order and leaves the guest ticket as it is. The spec's own season books with its deadline open, then closes it.
 */
test.describe('Preferences and guest tickets', () => {
    const created: OwnSeasonIds = {seasonIds: [], inhabitantIds: []}
    // Every dinner of the week-long season lies within it once the season closes
    const CLOSED_PERIOD = 10

    test.afterAll(({browser}) => removeOwnSeasons(browser, created))

    // The queued guests wait in the adult line; the released own ticket goes to the first of them
    const examples = [
        {queuedGuests: 1, sold: 1, outcome: 'is sold to the queued guest'},
        {queuedGuests: 2, sold: 1, outcome: 'is sold to the first queued guest while the second waits'}
    ]

    examples.forEach(({queuedGuests, sold, outcome}) => {
        test(`GIVEN a person's own ticket, a guest ticket on them and ${queuedGuests} queued guest(s) on a closed dinner WHEN the preference turns Ingen THEN the own ticket ${outcome} and the guest ticket stays`, async ({browser}) => {
            const {adminContext, memberContext, householdId, season, dinner, inhabitant} = await personBookedOnOwnSeason(browser, 'Guest-Booker', created)
            const adultPrice = season.ticketPrices.find(price => price.ticketType === TicketTypeSchema.enum.ADULT)!
            const guestOn = () => OrderFactory.defaultDesiredOrder({
                inhabitantId: inhabitant.id, dinnerEventId: dinner.id, ticketPriceId: adultPrice.id!, dinnerMode: DinnerMode.DINEIN, isGuestTicket: true
            })
            const bookGuests = (count: number) => OrderFactory.scaffoldOrders(memberContext, {
                householdId, seasonId: season.id!, dinnerEventIds: [dinner.id], orders: Array.from({length: count}, guestOn)
            })

            // While the dinner is open the member books a guest on the person
            await bookGuests(1)
            await SeasonFactory.updateSeason(adminContext, {...season, ticketIsCancellableDaysBefore: CLOSED_PERIOD})
            // Past the deadline nothing is for sale yet: the guests join the adult line
            await bookGuests(queuedGuests)

            const result = await HouseholdFactory.updateInhabitantPreferences(memberContext, inhabitant.id, createDefaultWeekdayMap(DinnerMode.NONE), 200, season.id)

            expect(result!.scaffoldResult.failed).toEqual([])
            expect(result!.scaffoldResult.outcomes.waitlistTicketsSold.map(sale => sale.buyerInhabitantId)).toEqual(Array.from({length: sold}, () => inhabitant.id))
            const orders = (await OrderFactory.getOrdersForDinnerEventsViaAdmin(adminContext, [dinner.id])).filter(order => order.inhabitantId === inhabitant.id)
            // A sold own ticket becomes the queued guest's ticket
            expect(orders.filter(order => !order.isGuestTicket)).toEqual([])
            expect(orders.filter(order => order.isGuestTicket).map(order => order.state)).toEqual(Array.from({length: 1 + sold}, () => OrderStateSchema.enum.BOOKED))
            const waiting = (await WaitlistFactory.entries(adminContext, [dinner.id])).filter(entry => entry.inhabitantId === inhabitant.id)
            expect(waiting).toHaveLength(queuedGuests - sold)
        })
    })
})

/**
 * A preview answers the reply the save of the draft preferences would give and writes nothing. The spec's own season is
 * open until each dinner, so a weekday turned Ingen cancels the person's dinners on it.
 */
test.describe('Preference preview', () => {
    const created: OwnSeasonIds = {seasonIds: [], inhabitantIds: []}

    test.afterAll(({browser}) => removeOwnSeasons(browser, created))

    test('GIVEN an inhabitant with upcoming orders WHEN a preview sets a weekday to Ingen THEN the reply lists the cancellations, the orders and the stored preferences are unchanged, and the save then lists the same actions', async ({browser}) => {
        const {adminContext, memberContext, season, dinnerEvents, dinner, inhabitant, dineIn} = await personBookedOnOwnSeason(browser, 'Preview', created)

        // The run covers the member's whole household; the case reads its own inhabitant's orders and lines
        const ordersOf = async () => (await OrderFactory.getOrdersForDinnerEventsViaAdmin(adminContext, dinnerEvents.map(de => de.id)))
            .filter(order => order.inhabitantId === inhabitant.id)
        const linesOf = (reply: InhabitantUpdateResponse | null) => reply!.scaffoldResult.results.filter(line => line.inhabitantId === inhabitant.id)
        const weekdayOf = (dinnerEventId: number) => dateToWeekDay(dinnerEvents.find(de => de.id === dinnerEventId)!.date)
        const booked = await ordersOf()
        const weekday = dateToWeekDay(dinner.date)
        const draft = {...dineIn, [weekday]: DinnerMode.NONE}
        const cancelled = booked.filter(order => weekdayOf(order.dinnerEventId) === weekday)
        expect(cancelled, 'The inhabitant holds an order on the weekday').not.toEqual([])

        const preview = await HouseholdFactory.previewInhabitantPreferences(memberContext, inhabitant.id, draft, season.id)

        expect(linesOf(preview)).toHaveLength(cancelled.length)
        expect(linesOf(preview)).toEqual(expect.arrayContaining(cancelled.map(order => expect.objectContaining({dinnerEventId: order.dinnerEventId, action: Action.CANCEL}))))
        expect(await ordersOf()).toEqual(booked)
        expect((await HouseholdFactory.getInhabitantById(adminContext, inhabitant.id))!.dinnerPreferences).toEqual(dineIn)

        const saved = await HouseholdFactory.updateInhabitantPreferences(memberContext, inhabitant.id, draft, 200, season.id)

        expect(linesOf(saved)).toEqual(linesOf(preview))
    })
})

/**
 * A save runs on the weekdays its draft changes and its preview on the same; the nightly run keeps the other weekdays in
 * step (ADR-015). The spec's own season is open until each dinner
 */
test.describe('Preference scope', () => {
    const created: OwnSeasonIds = {seasonIds: [], inhabitantIds: []}

    test.afterAll(({browser}) => removeOwnSeasons(browser, created))

    test('GIVEN a person booked on every weekday WHEN the preference turns one weekday to Ingen THEN the preview and the save decide that weekday\'s dinners only and name them', async ({browser}) => {
        const {memberContext, season, dinnerEvents, dinner, inhabitant, dineIn} = await personBookedOnOwnSeason(browser, 'Scope', created)
        const weekday = dateToWeekDay(dinner.date)
        const onWeekday = dinnerEvents.filter(de => dateToWeekDay(de.date) === weekday).map(de => de.id)
        const draft = {...dineIn, [weekday]: DinnerMode.NONE}

        const preview = await HouseholdFactory.previewInhabitantPreferences(memberContext, inhabitant.id, draft, season.id)
        const saved = await HouseholdFactory.updateInhabitantPreferences(memberContext, inhabitant.id, draft, 200, season.id)

        const {dinners, results} = saved!.scaffoldResult
        const named = dinners.map(({id}) => id)
        expect(named).toContain(dinner.id)
        expect(onWeekday).toEqual(expect.arrayContaining(named))
        expect(preview!.scaffoldResult.dinners).toEqual(dinners)
        // Every line of the household's run lies on the weekday; the person's own lines cancel each of its dinners
        expect(results.filter(line => !named.includes(line.dinnerEventId))).toEqual([])
        expect(results.filter(line => line.inhabitantId === inhabitant.id).map(line => [line.dinnerEventId, line.action]).sort())
            .toEqual(named.map(id => [id, Action.CANCEL]).sort())
    })
})

/**
 * Past the deadline a preference decides as a member's booking: it buys a ticket for sale while nobody waits, else the
 * person joins the end of the line. The spec's own season books with its deadline open, then closes it; a seller of the
 * member's household books the dinner, wants no dinner by preference, and releases the ticket or queues a guest
 */
test.describe('Preferences on a closed dinner', () => {
    const created: OwnSeasonIds = {seasonIds: [], inhabitantIds: []}
    // Every dinner of the week-long season lies within it once the season closes
    const CLOSED_PERIOD = 10

    test.afterAll(({browser}) => removeOwnSeasons(browser, created))

    // The person shares the member's household with the persons of the parallel specs, whose claims may stand in the
    // same line, so a place is read from the line rather than named
    const examples = [
        {supply: 'a ticket for sale and nobody waiting', outcome: 'buys it', action: Action.BUY, sellerReleases: true, holds: 1},
        {supply: 'a waiting line of one', outcome: 'joins at the end of the line', action: Action.QUEUE, sellerReleases: false, holds: 0}
    ]

    examples.forEach(({supply, outcome, action, sellerReleases, holds}) => {
        test(`GIVEN a closed dinner with ${supply} WHEN the preference turns Spisesal THEN the preview lists the save's actions and changes nothing, and the person ${outcome}`, async ({browser}) => {
            const {adminContext, memberContext, householdId, season, dinnerEvents, dinner, inhabitant, dineIn} = await personBookedOnOwnSeason(browser, 'Closed-Dinner', created)
            const adultPriceId = season.ticketPrices.find(price => price.ticketType === TicketTypeSchema.enum.ADULT)!.id!
            const none = createDefaultWeekdayMap(DinnerMode.NONE)
            // While the dinner is open the person's dinners are cancelled and the seller books it
            await HouseholdFactory.updateInhabitantPreferences(memberContext, inhabitant.id, none, 200, season.id)
            const seller = await HouseholdFactory.createInhabitantWithConfig(adminContext, householdId, {name: salt('Anders', temporaryAndRandom()), lastName: 'Seller', dinnerPreferences: none})
            created.inhabitantIds.push(seller.id)
            const scaffold = (orders: ReturnType<typeof OrderFactory.createBookingOrder>[]) =>
                OrderFactory.scaffoldOrders(memberContext, {householdId, seasonId: season.id!, dinnerEventIds: [dinner.id], orders})
            const booked = await scaffold([OrderFactory.createBookingOrder(seller.id, dinner.id, adultPriceId)])
            expect(booked!.scaffoldResult.totals[Action.BOOK]).toBe(1)
            await SeasonFactory.updateSeason(adminContext, {...season, ticketIsCancellableDaysBefore: CLOSED_PERIOD})
            const sellerOrder = (await OrderFactory.getOrdersForDinnerEventsViaAdmin(adminContext, [dinner.id])).find(order => order.inhabitantId === seller.id && !order.isGuestTicket)!
            if (sellerReleases) await OrderFactory.updateOrder(memberContext, sellerOrder.id, {dinnerMode: DinnerMode.NONE})
            else await scaffold([OrderFactory.createGuestOrder(seller.id, dinner.id, adultPriceId)])

            // The run covers the member's whole household and the season's dinners; the case reads its person on the dinner
            const supplyOf = async () => ({
                orders: await OrderFactory.getOrdersForDinnerEventsViaAdmin(adminContext, dinnerEvents.map(de => de.id)),
                entries: await WaitlistFactory.entries(adminContext, [dinner.id])
            })
            const linesOf = (reply: InhabitantUpdateResponse | null) => reply!.scaffoldResult.results.filter(line => line.inhabitantId === inhabitant.id)
            const placeOf = (reply: InhabitantUpdateResponse | null) => reply!.scaffoldResult.positions.find(position => position.inhabitantId === inhabitant.id && position.dinnerEventId === dinner.id)?.position ?? null
            const before = await supplyOf()

            const preview = await HouseholdFactory.previewInhabitantPreferences(memberContext, inhabitant.id, dineIn, season.id)

            expect(linesOf(preview)).toContainEqual(expect.objectContaining({dinnerEventId: dinner.id, action}))
            const previewPlace = placeOf(preview)
            if (action === Action.QUEUE) expect(previewPlace).toBeGreaterThanOrEqual(2)
            else expect(previewPlace).toBeNull()
            expect(await supplyOf()).toEqual(before)

            const saved = await HouseholdFactory.updateInhabitantPreferences(memberContext, inhabitant.id, dineIn, 200, season.id)

            expect(linesOf(saved)).toEqual(linesOf(preview))
            const savedPlace = placeOf(saved)
            const {orders, entries} = await supplyOf()
            expect(orders.filter(order => order.dinnerEventId === dinner.id && order.inhabitantId === inhabitant.id && order.state === OrderStateSchema.enum.BOOKED)).toHaveLength(holds)
            expect(entries.findIndex(entry => entry.inhabitantId === inhabitant.id && !entry.isGuestTicket) + 1 || null).toBe(savedPlace)
            // The line only grows between the preview and the save
            if (action === Action.QUEUE) expect(savedPlace).toBeGreaterThanOrEqual(previewPlace!)
            else expect(savedPlace).toBeNull()
        })
    })
})
