import {test, expect} from '@playwright/test'
import {useCoreValidation} from '~~/app/composables/useCoreValidation'
import {useBookingValidation} from '~~/app/composables/useBookingValidation'
import {useWeekDayMapValidation} from '~~/app/composables/useWeekDayMapValidation'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import type {Season} from '~/composables/useSeasonValidation'

const {DinnerModeSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum
const {createDefaultWeekdayMap: createDefaultDinnerModeMap} = useCoreValidation()
const {createDefaultWeekdayMap: createBooleanWeekdayMap} = useWeekDayMapValidation()
const {validatedBrowserContext, temporaryAndRandom} = testHelpers

/**
 * Editing the ACTIVE season - SERIAL
 *
 * Serial because the suite activates its own season (only one season is active at a time)
 * and because the save scaffolds pre-bookings for every household.
 *
 * Season shape (docs/testing.md "Testing Time-Sensitive Behavior"):
 * - all 7 days cooking, so a one-day holiday always removes exactly one dinner
 * - starts tomorrow, runs 10 days, inside the 60-day pre-booking window (ADR-015)
 * - 2-day cancel deadline, so dinners 3+ days out are scaffolded
 */
test.describe('POST /api/admin/season/[id] on the active season', () => {
    const createdSeasonIds: number[] = []
    const createdHouseholdIds: number[] = []
    const testSalt = temporaryAndRandom()

    let season: Season
    let inhabitantId: number

    const dayAfter = (date: Date, days: number) => {
        const next = new Date(date)
        next.setDate(next.getDate() + days)
        return next
    }

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)

        const created = await SeasonFactory.createSeasonWithDinnerEvents(context, testSalt, {
            cookingDays: createBooleanWeekdayMap([true, true, true, true, true, true, true]),
            seasonDates: {start: tomorrow, end: dayAfter(tomorrow, 10)},
            ticketIsCancellableDaysBefore: 2
        })
        season = created.season
        createdSeasonIds.push(season.id!)
        await SeasonFactory.activateSeason(context, season.id!)

        const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
            context, HouseholdFactory.defaultHouseholdData(testSalt), 1
        )
        createdHouseholdIds.push(household.id)
        inhabitantId = inhabitants[0]!.id

        // Pre-book every dinner the deadline allows
        await HouseholdFactory.updateInhabitant(
            context, inhabitantId, {dinnerPreferences: createDefaultDinnerModeMap(DinnerMode.DINEIN)}, 200, season.id!
        )
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        for (const householdId of createdHouseholdIds) {
            await HouseholdFactory.deleteHousehold(context, householdId)
        }
        await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
        // Hand the singleton active season back to the suites that follow
        await SeasonFactory.createActiveSeason(context)
    })

    test('GIVEN the active season WHEN a holiday is added and the season extended THEN orders are reconciled and re-scaffolded', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: a scaffolded dinner far enough out to be removable, and the event count before the save
        const before = await SeasonFactory.getSeason(context, season.id!)
        const eventsByDate = [...before.dinnerEvents!].sort((a, b) => a.date.getTime() - b.date.getTime())
        const holidayEvent = eventsByDate[4]!
        const ordersBefore = await OrderFactory.getAllOrdersForEvents(context, holidayEvent.id)
        expect(ordersBefore.filter(o => o.inhabitantId === inhabitantId).length,
            'Scaffolding should have booked the inhabitant on the holiday date').toBeGreaterThan(0)

        const newEnd = dayAfter(before.seasonDates.end, 1)

        // WHEN: the live season gets a holiday on that date and one extra cooking date
        const result = await SeasonFactory.updateSeasonWithResult(context, {
            ...before,
            seasonDates: {start: before.seasonDates.start, end: newEnd},
            holidays: [{start: holidayEvent.date, end: holidayEvent.date}]
        })

        // THEN: reconciliation removed the holiday dinner and created the new one
        expect(result.reconciliation.deleted).toBe(1)
        expect(result.reconciliation.created).toBe(1)

        // AND: the orders on the removed dinner are gone (CASCADE, ADR-011)
        const ordersAfter = await OrderFactory.getAllOrdersForEvents(context, holidayEvent.id)
        expect(ordersAfter).toHaveLength(0)

        // AND: the same request scaffolded pre-bookings for the new dinner (ADR-015)
        expect(result.scaffold).not.toBeNull()
        expect(result.scaffold!.created).toBeGreaterThan(0)

        const newEvent = result.season.dinnerEvents!.find(e => e.date.getTime() === newEnd.getTime())
        expect(newEvent, 'The extended season should have a dinner on the new end date').toBeDefined()
        const ordersOnNewEvent = await OrderFactory.getAllOrdersForEvents(context, newEvent!.id)
        expect(ordersOnNewEvent.filter(o => o.inhabitantId === inhabitantId).length).toBeGreaterThan(0)
    })
})
