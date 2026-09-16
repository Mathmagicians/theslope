import {test, expect} from '@playwright/test'
import {authFiles} from '~~/tests/e2e/config'
import testHelpers from '~~/tests/e2e/testHelpers'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {useCoreValidation} from '~/composables/useCoreValidation'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {formatDate} from '~/utils/date'
import type {Season} from '~/composables/useSeasonValidation'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil, temporaryAndRandom, waitForHydration} = testHelpers
const {DinnerModeSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum
const {createDefaultWeekdayMap: createDefaultDinnerModeMap} = useCoreValidation()
const {createDefaultWeekdayMap: createBooleanWeekdayMap} = useWeekDayMapValidation()

/**
 * Editing the ACTIVE season from /admin/planning - SERIAL
 *
 * Serial because the suite activates its own season (only one is active at a time).
 * Season shape follows docs/testing.md "Testing Time-Sensitive Behavior": all 7 days
 * cooking, starting tomorrow for 10 days, 2-day cancel deadline.
 */
test.describe('AdminPlanning on the live season - Serial UI', () => {
    const createdSeasonIds: number[] = []
    const createdHouseholdIds: number[] = []
    const testSalt = temporaryAndRandom()

    let season: Season
    let inhabitantId: number

    test.use({storageState: adminUIFile})

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)
        const tenDaysOn = new Date(tomorrow)
        tenDaysOn.setDate(tenDaysOn.getDate() + 10)

        const created = await SeasonFactory.createSeasonWithDinnerEvents(context, testSalt, {
            cookingDays: createBooleanWeekdayMap([true, true, true, true, true, true, true]),
            seasonDates: {start: tomorrow, end: tenDaysOn},
            holidays: [],
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

    // Saving the live season also scaffolds pre-bookings for every household
    test.setTimeout(180_000)

    test('GIVEN the active season WHEN a holiday is added in the form THEN the toast reports the change and the other bookings survive', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)

        const before = await SeasonFactory.getSeason(context, season.id!)
        const eventsByDate = [...before.dinnerEvents!].sort((a, b) => a.date.getTime() - b.date.getTime())
        const holidayEvent = eventsByDate[4]!
        const keptEvent = eventsByDate[5]!

        // GIVEN: the season open for editing
        await page.goto(`/admin/planning?season=${encodeURIComponent(season.shortName)}&mode=edit`)
        await pollUntil(
            async () => await page.locator('form#seasonForm').isVisible(),
            (isVisible) => isVisible,
            10
        )
        await waitForHydration(page)

        // WHEN: a one-day holiday is added over a booked dinner and the season saved
        await page.locator('[name="holidayRangeList"] input[name="start"]').fill(formatDate(holidayEvent.date))
        await page.locator('[name="holidayRangeList"] input[name="end"]').fill(formatDate(holidayEvent.date))
        await page.getByTestId('holiday-range-add').click()
        await expect(page.locator('[name="holidayRangeList-0"]')).toBeVisible()

        // The save reconciles and re-scaffolds every household, so wait for the response itself
        const savePromise = page.waitForResponse(
            response => response.url().includes(`/api/admin/season/${season.id}`) && response.request().method() === 'POST',
            {timeout: 90_000}
        )
        await page.getByTestId('submit-season').click()
        expect((await savePromise).status()).toBe(200)

        // THEN: the toast reports the reconciliation and the re-scaffolding.
        // Nuxt UI renders the toast text in both the live region and the visible toast,
        // so count the matches instead of asserting on a single element
        const toastMatches = await pollUntil(
            () => page.getByText(/1 fjernet. Forudbestillinger er opdateret/).count(),
            (count) => count > 0,
            10
        )
        expect(toastMatches).toBeGreaterThan(0)

        // AND: the dinner on the holiday date is gone, the next one keeps its bookings
        const ordersOnHoliday = await OrderFactory.getAllOrdersForEvents(context, holidayEvent.id)
        expect(ordersOnHoliday).toHaveLength(0)

        const ordersKept = await OrderFactory.getAllOrdersForEvents(context, keptEvent.id)
        expect(ordersKept.filter(o => o.inhabitantId === inhabitantId).length).toBeGreaterThan(0)
    })
})
