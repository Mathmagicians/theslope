import {test, expect} from '@playwright/test'
import {authFiles} from '~~/tests/e2e/config'
import testHelpers from '~~/tests/e2e/testHelpers'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil, salt, temporaryAndRandom, getSessionUserInfo} = testHelpers
const {DinnerModeSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum

const {createDefaultWeekdayMap: createBooleanWeekdayMap} = useWeekDayMapValidation()
const {createDefaultWeekdayMap: createDinnerModeWeekdayMap} = useWeekDayMapValidation({
    valueSchema: DinnerModeSchema,
    defaultValue: DinnerMode.DINEIN
})

test.describe('Cross-Household Bookings - Serial UI Tests', () => {
    const createdSeasonIds: number[] = []
    const createdHouseholdIds: number[] = []

    let _adminHouseholdId: number
    let adminInhabitantId: number
    let targetHouseholdId: number
    let targetShortName: string
    let targetInhabitantId: number
    let testSeason: Awaited<ReturnType<typeof SeasonFactory.createSeasonWithDinnerEvents>>
    const testSalt = temporaryAndRandom()

    test.use({storageState: adminUIFile})

    test.beforeAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const sessionInfo = await getSessionUserInfo(adminContext)
        _adminHouseholdId = sessionInfo.householdId
        adminInhabitantId = sessionInfo.inhabitantId

        const targetHousehold = await HouseholdFactory.createHousehold(adminContext, {name: salt('CrossTest', testSalt)})
        targetHouseholdId = targetHousehold.id
        targetShortName = targetHousehold.shortName
        createdHouseholdIds.push(targetHouseholdId)

        const targetInhabitant = await HouseholdFactory.createInhabitantWithConfig(adminContext, targetHouseholdId, {
            name: salt('TargetUser', testSalt),
            lastName: salt('Last', testSalt),
            dinnerPreferences: createDinnerModeWeekdayMap(DinnerMode.DINEINLATE)
        })
        targetInhabitantId = targetInhabitant.id

        const allDaysCooking = createBooleanWeekdayMap([true, true, true, true, true, true, true])
        const fiveDaysFromNow = new Date()
        fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5)
        fiveDaysFromNow.setHours(0, 0, 0, 0)
        const fifteenDaysFromNow = new Date(fiveDaysFromNow)
        fifteenDaysFromNow.setDate(fifteenDaysFromNow.getDate() + 10)

        testSeason = await SeasonFactory.createSeasonWithDinnerEvents(adminContext, testSalt, {
            cookingDays: allDaysCooking,
            seasonDates: {start: fiveDaysFromNow, end: fifteenDaysFromNow},
            ticketIsCancellableDaysBefore: 2
        })
        createdSeasonIds.push(testSeason.season.id!)
        await SeasonFactory.activateSeason(adminContext, testSeason.season.id!)

        // Trigger scaffold via admin endpoint to create orders based on preferences
        await HouseholdFactory.updateInhabitant(
            adminContext, adminInhabitantId,
            {dinnerPreferences: createDinnerModeWeekdayMap(DinnerMode.DINEIN)},
            200, testSeason.season.id!
        )
        await HouseholdFactory.updateInhabitant(
            adminContext, targetInhabitantId,
            {dinnerPreferences: createDinnerModeWeekdayMap(DinnerMode.DINEINLATE)},
            200, testSeason.season.id!
        )
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        for (const householdId of createdHouseholdIds) {
            await HouseholdFactory.deleteHousehold(context, householdId).catch(() => {})
        }
        await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
    })

    test('Admin viewing target household bookings sees target orders not own orders', async ({page, browser}) => {
        const adminContext = await validatedBrowserContext(browser)

        const firstEventId = testSeason.dinnerEvents[0]!.id
        const allOrders = await OrderFactory.getOrdersForDinnerEventsViaAdmin(adminContext, firstEventId)
        const adminOrder = allOrders.find(o => o.inhabitantId === adminInhabitantId)
        const targetOrder = allOrders.find(o => o.inhabitantId === targetInhabitantId)
        expect(adminOrder?.dinnerMode).toBe(DinnerMode.DINEIN)
        expect(targetOrder?.dinnerMode).toBe(DinnerMode.DINEINLATE)

        await page.goto(`/household/${encodeURIComponent(targetShortName)}/bookings`)
        await pollUntil(
            async () => await page.locator('[data-testid="household-bookings"]').isVisible(),
            (isVisible) => isVisible, 10
        )
        await pollUntil(
            async () => await page.locator('[data-testid="booking-table"]').isVisible(),
            (isVisible) => isVisible, 10
        )

        // Target inhabitant name should be visible in booking table
        const bookingTable = page.locator('[data-testid="booking-table"]')
        const targetNameCount = await bookingTable.locator('text=TargetUser').count()
        expect(targetNameCount, 'Target inhabitant should be visible').toBeGreaterThan(0)

        // DINEINLATE shows as "Sen" in Danish UI - should be visible for target orders
        const senCount = await bookingTable.locator('text=Sen').count()
        expect(senCount, 'Should show Sen (DINEINLATE) for target inhabitant').toBeGreaterThan(0)

        // Admin's inhabitant name should NOT appear in booking table
        const adminNameCount = await bookingTable.locator('text=Agata').count()
        expect(adminNameCount, 'Admin inhabitant should not appear in booking table').toBe(0)
    })
})
