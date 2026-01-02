import {test, expect} from '@playwright/test'
import {authFiles} from '~~/tests/e2e/config'
import testHelpers from '~~/tests/e2e/testHelpers'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil, doScreenshot, salt, temporaryAndRandom} = testHelpers
const {DinnerModeSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum

// Helper to create valid WeekDayMap with all 7 days
const {createDefaultWeekdayMap, deserializeWeekDayMap} = useWeekDayMapValidation({
    valueSchema: DinnerModeSchema,
    defaultValue: DinnerMode.DINEIN
})

test.describe('HouseholdCard - Weekday Preferences', () => {
    let householdId: number
    let shortName: string
    let scroogeId: number
    let activeSeason: Awaited<ReturnType<typeof SeasonFactory.createActiveSeason>>
    const testSalt = temporaryAndRandom()

    test.use({storageState: adminUIFile})

    // Helper to navigate to household members page and wait for load
    const goToHouseholdMembers = async (page: import('@playwright/test').Page) => {
        await page.goto(`/household/${encodeURIComponent(shortName)}/members`)
        await page.waitForResponse(
            (response) => response.url().includes('/api/admin/household/') && response.status() === 200,
            {timeout: 10000}
        )
        await pollUntil(
            async () => await page.locator('[data-testid="household-members"]').isVisible(),
            (isVisible) => isVisible,
            10
        )
    }

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Use singleton to prevent parallel test conflicts with active seasons
        // NOTE: Singleton is cleaned up by global teardown, not by this test
        activeSeason = await SeasonFactory.createActiveSeason(context)

        const household = await HouseholdFactory.createHousehold(context, {
            name: salt('Duckburg', testSalt)
        })
        householdId = household.id
        shortName = household.shortName

        const today = new Date()

        const scrooge = await HouseholdFactory.createInhabitantForHousehold(
            context,
            householdId,
            'Scrooge McDuck',
            new Date(today.getFullYear() - 30, today.getMonth(), 1)
        )
        scroogeId = scrooge.id
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        if (householdId) {
            await HouseholdFactory.deleteHousehold(context, householdId).catch(() => {})
        }
        // NOTE: Singleton active season is cleaned up by global teardown, not here
    })

    test('GIVEN inhabitant with preferences WHEN editing via UI THEN changes persist and display correctly', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Set initial preferences via API - all days DINEIN
        const initialPreferences = createDefaultWeekdayMap(DinnerMode.DINEIN)
        await HouseholdFactory.updateInhabitant(context, scroogeId, {
            dinnerPreferences: initialPreferences
        })

        // WHEN: Navigate to members page
        await goToHouseholdMembers(page)

        // THEN: Verify VIEW mode shows initial preferences (all DINEIN badges visible)
        await pollUntil(
            async () => {
                const viewPreferences = page.locator(`[name="inhabitant-${scroogeId}-preferences-view"]`)
                return await viewPreferences.isVisible()
            },
            (isVisible) => isVisible,
            10
        )

        // THEN: Verify VIEW mode displays preferences
        const viewPreferences = page.getByTestId(`inhabitant-${scroogeId}-preferences-view`)
        await expect(viewPreferences).toBeVisible()

        // WHEN: Click pencil icon to edit
        const editButton = page.locator('[aria-label="Rediger præferencer"]').first()
        await editButton.click()

        await pollUntil(
            async () => {
                const button = page.getByTestId(`inhabitant-${scroogeId}-preferences-edit-mandag-TAKEAWAY`)
                return await button.count() > 0
            },
            (count) => count,
            10
        )

        // WHEN: Change Monday to TAKEAWAY
        const mondayTakeawayButton = page.getByTestId(`inhabitant-${scroogeId}-preferences-edit-mandag-TAKEAWAY`)
        await mondayTakeawayButton.click()

        // WHEN: Change Wednesday to DINEINLATE
        const wednesdayLateButton = page.getByTestId(`inhabitant-${scroogeId}-preferences-edit-onsdag-DINEINLATE`)
        await wednesdayLateButton.click()

        // WHEN: Change Friday to NONE
        const fridayNoneButton = page.getByTestId(`inhabitant-${scroogeId}-preferences-edit-fredag-NONE`)
        await fridayNoneButton.click()

        // Documentation screenshot showing edit mode with changes
        await doScreenshot(page, 'household/household-card-preferences-editing', true)

        // WHEN: Save preferences
        const saveButton = page.getByTestId('save-preferences')
        await saveButton.click()

        // THEN: Poll until preferences are updated in database
        const household = await pollUntil(
            async () => await HouseholdFactory.getHouseholdById(context, householdId),
            (h) => {
                if (!h) return false
                const scrooge = h.inhabitants.find((i: {id: number}) => i.id === scroogeId)
                if (!scrooge?.dinnerPreferences) return false

                const preferences = typeof scrooge.dinnerPreferences === 'string'
                    ? deserializeWeekDayMap(scrooge.dinnerPreferences)
                    : scrooge.dinnerPreferences

                if (!preferences) return false
                return preferences.mandag === DinnerMode.TAKEAWAY &&
                    preferences.onsdag === DinnerMode.DINEINLATE &&
                    preferences.fredag === DinnerMode.NONE
            },
            10,
            500
        )
        expect(household).not.toBeNull()

        // THEN: Verify preferences persisted correctly via API
        const scrooge = household!.inhabitants.find((i: {id: number}) => i.id === scroogeId)
        expect(scrooge).toBeDefined()
        expect(scrooge!.dinnerPreferences).toBeDefined()

        const preferences = typeof scrooge!.dinnerPreferences === 'string'
            ? deserializeWeekDayMap(scrooge!.dinnerPreferences)
            : scrooge!.dinnerPreferences

        expect(preferences).not.toBeNull()
        expect(preferences!.mandag).toBe(DinnerMode.TAKEAWAY)
        expect(preferences!.tirsdag).toBe(DinnerMode.DINEIN)
        expect(preferences!.onsdag).toBe(DinnerMode.DINEINLATE)
        expect(preferences!.torsdag).toBe(DinnerMode.DINEIN)
        expect(preferences!.fredag).toBe(DinnerMode.NONE)

        // THEN: Verify UI collapsed back to VIEW mode
        await pollUntil(
            async () => await page.locator('[aria-label="Rediger præferencer"]').first().isVisible(),
            (isVisible) => isVisible,
            10
        )

        // THEN: Verify VIEW mode shows updated preferences correctly
        const updatedViewPreferences = page.getByTestId(`inhabitant-${scroogeId}-preferences-view`)
        await expect(updatedViewPreferences).toBeVisible()
    })

    test('ADR-015: GIVEN inhabitant with NONE prefs WHEN changing to DINEIN via UI THEN bookings are scaffolded', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create inhabitant with NONE preferences (no bookings)
        const nonePrefs = createDefaultWeekdayMap(DinnerMode.NONE)
        const donald = await HouseholdFactory.createInhabitantWithConfig(context, householdId, {
            name: salt('Donald', testSalt),
            lastName: salt('Duck', testSalt),
            dinnerPreferences: nonePrefs
        })

        // GIVEN: Get dinner events for the singleton active season
        // Default season has Mon/Wed/Fri cooking days over 7 days = 3 dinner events
        const dinnerEvents = await DinnerEventFactory.getDinnerEventsForSeason(context, activeSeason.id!)
        expect(dinnerEvents.length, 'Season should have 3 dinner events (Mon/Wed/Fri over 7 days)').toBe(3)

        // Verify no orders exist for Donald initially
        const initialOrders = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEvents.map(e => e.id!))
        const donaldInitialOrders = initialOrders.filter(o => o.inhabitantId === donald.id)
        expect(donaldInitialOrders.length, 'Donald should have no orders initially').toBe(0)

        // WHEN: Navigate to members page
        await goToHouseholdMembers(page)

        // WHEN: Click pencil icon to edit Donald's preferences
        await pollUntil(
            async () => {
                const editButton = page.locator(`[data-testid="inhabitant-${donald.id}-edit-preferences"]`)
                return await editButton.count() > 0
            },
            (count) => count,
            10
        )
        await page.locator(`[data-testid="inhabitant-${donald.id}-edit-preferences"]`).click()

        // WHEN: Wait for edit mode buttons to appear (Mon/Wed/Fri buttons visible)
        await pollUntil(
            async () => {
                const button = page.getByTestId(`inhabitant-${donald.id}-preferences-edit-mandag-DINEIN`)
                return await button.count() > 0
            },
            (count) => count,
            10
        )

        // WHEN: Change all cooking days to DINEIN (Mon, Wed, Fri)
        await page.getByTestId(`inhabitant-${donald.id}-preferences-edit-mandag-DINEIN`).click()
        await page.getByTestId(`inhabitant-${donald.id}-preferences-edit-onsdag-DINEIN`).click()
        await page.getByTestId(`inhabitant-${donald.id}-preferences-edit-fredag-DINEIN`).click()

        // WHEN: Save preferences (triggers scaffolding)
        await page.getByTestId('save-preferences').click()

        // THEN: Wait for save to complete and verify 3 orders were scaffolded (one per cooking day)
        const ordersAfter = await pollUntil(
            async () => {
                const orders = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEvents.map(e => e.id!))
                return orders.filter(o => o.inhabitantId === donald.id)
            },
            (orders) => orders.length === 3
        )

        expect(ordersAfter.length, 'Donald should have 3 scaffolded orders (Mon/Wed/Fri)').toBe(3)
    })
})
