import {test, expect} from '~~/tests/e2e/uiTest'
import {authFiles} from '~~/tests/e2e/config'
import testHelpers from '~~/tests/e2e/testHelpers'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {isBeforeDeadline, getDinnerTimeRange, dateToWeekDay} from '~/utils/season'
import {formatDate} from '~/utils/date'
import {WEEKDAYS} from '~/types/dateTypes'

// Hardcoded from app.config.ts (Nuxt auto-imports not available in Playwright)
const DEFAULT_DINNER_START_HOUR = 18

const {memberUIFile} = authFiles
const {validatedBrowserContext, memberValidatedBrowserContext, pollUntil, salt, temporaryAndRandom, getSessionUserInfo, gotoHydrated, waitForApi} = testHelpers
const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum
const OrderState = OrderStateSchema.enum

// DinnerMode WeekDayMap for inhabitant preferences
const {createDefaultWeekdayMap: createDinnerModeWeekdayMap} = useWeekDayMapValidation({
    valueSchema: DinnerModeSchema,
    defaultValue: DinnerMode.DINEIN
})

/**
 * Household Scaffolding UI Tests - SERIAL
 *
 * These tests run SERIALLY because they create and activate their own season.
 * Only one season can be active at a time, so parallel execution would conflict.
 *
 * Season setup:
 * - ALL days as cooking days (Mon-Sun) for predictable event count
 * - 10-day duration starting tomorrow
 * - 2-day deadline (ticketIsCancellableDaysBefore: 2)
 *
 * This gives us:
 * - Events 3+ days away: BEFORE deadline (can CREATE, DELETE)
 * - Events 1-2 days away: AFTER deadline (can only RELEASE, CLAIM)
 * - Tomorrow is ALWAYS after deadline (deadline was yesterday)
 */
test.describe('Household Scaffolding - Serial UI Tests', () => {
    // Cleanup tracking
    const createdSeasonIds: number[] = []
    const createdInhabitantIds: number[] = []

    // Test context
    let householdId: number
    let shortName: string
    let pbsId: number
    let testSeason: Awaited<ReturnType<typeof SeasonFactory.createSeasonWithDinnerEvents>>
    const testSalt = temporaryAndRandom()

    test.use({storageState: memberUIFile})

    // Helper to navigate to household members page
    const goToHouseholdMembers = async (page: import('@playwright/test').Page) => {
        await gotoHydrated(page, `/household/${encodeURIComponent(shortName)}/members?pbs=${pbsId}`)
        await pollUntil(
            async () => await page.locator('[data-testid="household-members"]').isVisible(),
            (isVisible) => isVisible
        )
    }

    test.beforeAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)

        // Get member's household
        const {householdId: memberHouseholdId} = await getSessionUserInfo(memberContext)
        householdId = memberHouseholdId

        const household = await HouseholdFactory.getHouseholdById(adminContext, householdId)
        shortName = household!.shortName
        pbsId = household!.pbsId

        // Create dedicated season for scaffolding tests:
        // - ALL days cooking (Mon-Sun) for predictable event count regardless of day-of-week
        // - 2-day deadline: tomorrow is always AFTER deadline (deadline was yesterday)
        testSeason = await SeasonFactory.createActiveSeasonFromTomorrow(adminContext, testSalt, {days: 10, deadline: 2, cookingDays: 'all'})
        createdSeasonIds.push(testSeason.season.id!)
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Clean up inhabitants first (they reference households); an inhabitant already gone counts as removed
        for (const inhabitantId of createdInhabitantIds) {
            await HouseholdFactory.deleteInhabitant(context, inhabitantId)
        }

        // Clean up seasons (cascade deletes dinner events and orders)
        await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
    })

    test('CREATE bucket: GIVEN inhabitant with NONE prefs WHEN changing to DINEIN THEN orders created for before-deadline events', async ({page, browser}) => {
        const adminContext = await validatedBrowserContext(browser)

        // GIVEN: Create inhabitant with NONE preferences
        const nonePrefs = createDinnerModeWeekdayMap(DinnerMode.NONE)
        const inhabitant = await HouseholdFactory.createInhabitantWithConfig(adminContext, householdId, {
            name: salt('Anders', testSalt),
            lastName: salt('Create', testSalt),
            dinnerPreferences: nonePrefs
        })
        createdInhabitantIds.push(inhabitant.id)

        // GIVEN: Get dinner events and categorize by deadline using application logic
        const dinnerEvents = testSeason.dinnerEvents
        expect(dinnerEvents.length, 'Should have dinner events').toBeGreaterThan(0)

        // Use same deadline logic as application (ADR-016) - pure utilities, no Nuxt auto-imports
        const canModifyOrders = (dinnerEventDate: Date): boolean => {
            const dinnerStartTime = getDinnerTimeRange(dinnerEventDate, DEFAULT_DINNER_START_HOUR, 0).start
            return isBeforeDeadline(testSeason.season.ticketIsCancellableDaysBefore, 0)(dinnerStartTime)
        }
        const beforeDeadlineEvents = dinnerEvents.filter(de => canModifyOrders(de.date))

        // Verify no orders initially
        const initialOrders = await OrderFactory.getOrdersForDinnerEventsViaAdmin(adminContext, dinnerEvents.map(e => e.id))
        const inhabitantInitialOrders = initialOrders.filter(o => o.inhabitantId === inhabitant.id)
        expect(inhabitantInitialOrders.length, 'Should have no orders initially').toBe(0)

        // WHEN: Navigate and edit preferences
        await goToHouseholdMembers(page)

        await pollUntil(
            async () => {
                const editButton = page.locator(`[data-testid="inhabitant-${inhabitant.id}-edit-preferences"]`)
                return await editButton.count() > 0
            },
            (count) => count,
            10
        )
        await page.locator(`[data-testid="inhabitant-${inhabitant.id}-edit-preferences"]`).click()

        // Wait for edit mode
        await pollUntil(
            async () => {
                const button = page.getByTestId(`inhabitant-${inhabitant.id}-preferences-edit-mandag-${DinnerMode.DINEIN}`)
                return await button.count() > 0
            },
            (count) => count,
            10
        )

        // Set every day of the week to DINEIN; the season cooks on all seven
        for (const day of WEEKDAYS) {
            await page.getByTestId(`inhabitant-${inhabitant.id}-preferences-edit-${day}-${DinnerMode.DINEIN}`).click()
        }

        // Save
        const saved = waitForApi(page, `/api/household/inhabitants/${inhabitant.id}/preferences`, 'POST')
        await page.getByTestId('save-preferences').click()
        await saved

        // THEN: the row collapses once the save lands (the toggle reads 'Luk' while open)
        await expect(page.getByTestId(`inhabitant-${inhabitant.id}-edit-preferences`)).toHaveAttribute('aria-label', 'Rediger præferencer')

        // THEN: Verify orders created only for before-deadline events via API
        const ordersAfter = await pollUntil(
            async () => {
                const orders = await OrderFactory.getOrdersForDinnerEventsViaAdmin(adminContext, dinnerEvents.map(e => e.id))
                return orders.filter(o => o.inhabitantId === inhabitant.id)
            },
            (orders) => orders.length === beforeDeadlineEvents.length,
            15
        )

        expect(ordersAfter.length, `Should have ${beforeDeadlineEvents.length} orders (before-deadline events only)`).toBe(beforeDeadlineEvents.length)

        // All orders should be BOOKED state
        for (const order of ordersAfter) {
            expect(order.state, 'Order should be BOOKED').toBe(OrderState.BOOKED)
        }
    })

    test('GIVEN a member holding a ticket on a dinner past its deadline WHEN the member sets that day to Ingen THEN the bookings tab\'s calendar chip shows the ticket for sale without a reload', async ({page, browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const lockedDay = new Date([...testSeason.dinnerEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]!.date)
        // The case's own dinner on the first day: the lines the earlier cases queued on that day go with the dinner it replaces,
        // so the released ticket finds nobody waiting (ADR-016 rule 11 sells it to the first in line otherwise)
        await DinnerEventFactory.createDinnerEventAloneOnDay(adminContext, testSeason.season, lockedDay, {menuTitle: salt('Frigivet', testSalt)})
        const inhabitant = await HouseholdFactory.createInhabitantWithConfig(adminContext, householdId, {
            name: salt('Anders', testSalt),
            lastName: 'Frida Frigiver'
        })
        createdInhabitantIds.push(inhabitant.id)
        // The create stores no preferences, so the household's first scaffold here runs while every dinner is open and books
        // its people, as the nightly run does; a run on the closed day would put them on its waiting list, first in line for
        // the released ticket. The season's own deadline then closes the first day
        await SeasonFactory.updateSeason(adminContext, {...testSeason.season, ticketIsCancellableDaysBefore: 0})
        await HouseholdFactory.updateInhabitantPreferences(adminContext, inhabitant.id, createDinnerModeWeekdayMap(DinnerMode.DINEIN), 200, testSeason.season.id!, undefined, true)
        await SeasonFactory.updateSeason(adminContext, testSeason.season)

        await gotoHydrated(page, `/household/${encodeURIComponent(shortName)}/bookings?pbs=${pbsId}&date=${formatDate(lockedDay)}`)
        // UChip hands its test id to the day circle; the chip's indicator sits beside the circle
        const dayChip = page.getByTestId(`calendar-dinner-date-${lockedDay.getDate()}`).locator('xpath=..').locator('[data-slot="base"]')
        await expect(dayChip, 'Closed with nothing for sale').toHaveText('')

        await page.getByRole('tab', {name: 'Præferencer'}).click()
        await page.getByTestId(`inhabitant-${inhabitant.id}-edit-preferences`).click()
        await page.getByTestId(`inhabitant-${inhabitant.id}-preferences-edit-${dateToWeekDay(lockedDay)}-${DinnerMode.NONE}`).click()
        const saved = waitForApi(page, `/api/household/inhabitants/${inhabitant.id}/preferences`, 'POST')
        await page.getByTestId('save-preferences').click()
        await saved
        await expect(page.getByTestId(`inhabitant-${inhabitant.id}-edit-preferences`)).toHaveAttribute('aria-label', 'Rediger præferencer')

        await page.getByRole('tab', {name: 'Tilmeldinger'}).click()

        // The released ticket is for sale
        await pollUntil(async () => (await dayChip.textContent())?.trim(), forSale => forSale === '1')
    })
})
