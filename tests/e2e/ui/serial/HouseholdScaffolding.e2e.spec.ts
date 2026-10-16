import {test, expect} from '@playwright/test'
import {authFiles} from '~~/tests/e2e/config'
import testHelpers from '~~/tests/e2e/testHelpers'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {isBeforeDeadline, getDinnerTimeRange} from '~/utils/season'

// Hardcoded from app.config.ts (Nuxt auto-imports not available in Playwright)
const DEFAULT_DINNER_START_HOUR = 18

const {memberUIFile} = authFiles
const {validatedBrowserContext, memberValidatedBrowserContext, pollUntil, salt, temporaryAndRandom, getSessionUserInfo, gotoHydrated} = testHelpers
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
                const button = page.getByTestId(`inhabitant-${inhabitant.id}-preferences-edit-mandag-DINEIN`)
                return await button.count() > 0
            },
            (count) => count,
            10
        )

        // Set all weekdays to DINEIN
        await page.getByTestId(`inhabitant-${inhabitant.id}-preferences-edit-mandag-DINEIN`).click()
        await page.getByTestId(`inhabitant-${inhabitant.id}-preferences-edit-tirsdag-DINEIN`).click()
        await page.getByTestId(`inhabitant-${inhabitant.id}-preferences-edit-onsdag-DINEIN`).click()
        await page.getByTestId(`inhabitant-${inhabitant.id}-preferences-edit-torsdag-DINEIN`).click()
        await page.getByTestId(`inhabitant-${inhabitant.id}-preferences-edit-fredag-DINEIN`).click()

        // Save
        await page.getByTestId('save-preferences').click()

        // THEN: Wait for edit mode to collapse (indicates save completed)
        await pollUntil(
            async () => await page.locator(`[data-testid="inhabitant-${inhabitant.id}-edit-preferences"]`).isVisible(),
            (isVisible) => isVisible,
            15,
            500
        )

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
})
