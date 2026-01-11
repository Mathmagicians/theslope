import {test, expect} from '@playwright/test'
import {authFiles} from '~~/tests/e2e/config'
import testHelpers from '~~/tests/e2e/testHelpers'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'

const {memberUIFile} = authFiles
const {validatedBrowserContext, memberValidatedBrowserContext, pollUntil, doScreenshot, salt, temporaryAndRandom, getSessionUserInfo} = testHelpers
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

    // Track all created inhabitants for cleanup
    const createdInhabitantIds: number[] = []

    test.use({storageState: memberUIFile})

    // Helper to navigate to household members page and wait for load
    const goToHouseholdMembers = async (page: import('@playwright/test').Page) => {
        await page.goto(`/household/${encodeURIComponent(shortName)}/members`)
        await pollUntil(
            async () => await page.locator('[data-testid="household-members"]').isVisible(),
            (isVisible) => isVisible,
            10
        )
    }

    test.beforeAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)

        // Use singleton to prevent parallel test conflicts with active seasons
        activeSeason = await SeasonFactory.createActiveSeason(adminContext)

        // Get member's household (member must access their own household)
        const {householdId: memberHouseholdId} = await getSessionUserInfo(memberContext)
        householdId = memberHouseholdId

        // Get household details to get shortName
        const household = await HouseholdFactory.getHouseholdById(adminContext, householdId)
        shortName = household!.shortName

        // Create test inhabitant in member's household (using admin for setup)
        // Use Anders- pattern for d1-nuke-all cleanup
        const today = new Date()
        const scrooge = await HouseholdFactory.createInhabitantForHousehold(
            adminContext,
            householdId,
            salt('Anders', testSalt),
            new Date(today.getFullYear() - 30, today.getMonth(), 1)
        )
        scroogeId = scrooge.id
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        // Clean up ALL test inhabitants (not the household - it's the member's own)
        const allInhabitantIds = [scroogeId, ...createdInhabitantIds].filter(Boolean)
        await Promise.all(
            allInhabitantIds.map(id => HouseholdFactory.deleteInhabitant(context, id).catch(() => {}))
        )
        // NOTE: Singleton active season is cleaned up by global teardown, not here
    })

    test('GIVEN inhabitant with preferences WHEN editing via UI THEN changes persist and display correctly', async ({page, browser}) => {
        const memberContext = await memberValidatedBrowserContext(browser)
        const adminContext = await validatedBrowserContext(browser)

        // GIVEN: Set initial preferences via API using member context (tests authorization)
        const initialPreferences = createDefaultWeekdayMap(DinnerMode.DINEIN)
        await HouseholdFactory.updateInhabitantPreferences(memberContext, scroogeId, initialPreferences)

        // WHEN: Navigate to members page
        await goToHouseholdMembers(page)

        // THEN: Verify VIEW mode shows initial preferences
        await pollUntil(
            async () => await page.getByTestId(`inhabitant-${scroogeId}-preferences-view`).isVisible(),
            (isVisible) => isVisible,
            10
        )

        // WHEN: Click pencil icon to edit Scrooge's preferences (use specific testid, not .first())
        const editButton = page.getByTestId(`inhabitant-${scroogeId}-edit-preferences`)
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

        // THEN: Poll until preferences are updated in database (use admin for verification)
        const household = await pollUntil(
            async () => await HouseholdFactory.getHouseholdById(adminContext, householdId),
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
        const adminContext = await validatedBrowserContext(browser)

        // GIVEN: Create inhabitant with NONE preferences (using admin for setup)
        const nonePrefs = createDefaultWeekdayMap(DinnerMode.NONE)
        const donald = await HouseholdFactory.createInhabitantWithConfig(adminContext, householdId, {
            name: salt('Anders', testSalt),  // Use Anders- pattern for d1-nuke-all cleanup
            lastName: salt('Duck', testSalt),
            dinnerPreferences: nonePrefs
        })
        createdInhabitantIds.push(donald.id)

        // GIVEN: Get dinner events for the singleton active season
        const dinnerEvents = await DinnerEventFactory.getDinnerEventsForSeason(adminContext, activeSeason.id!)
        expect(dinnerEvents.length, 'Season should have at least 3 dinner events').toBeGreaterThanOrEqual(3)

        // Verify no orders exist for Donald initially
        const initialOrders = await OrderFactory.getOrdersForDinnerEventsViaAdmin(adminContext, dinnerEvents.map(e => e.id!))
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

        // THEN: Wait for result alert to appear (confirms save completed)
        await pollUntil(
            async () => await page.getByTestId('last-result-alert').isVisible(),
            (isVisible) => isVisible,
            10
        )

        // THEN: Wait for save to complete and verify orders were scaffolded (one per cooking day)
        const expectedOrderCount = dinnerEvents.length
        const ordersAfter = await pollUntil(
            async () => {
                const orders = await OrderFactory.getOrdersForDinnerEventsViaAdmin(adminContext, dinnerEvents.map(e => e.id!))
                return orders.filter(o => o.inhabitantId === donald.id)
            },
            (orders) => orders.length === expectedOrderCount
        )

        expect(ordersAfter.length, `Donald should have ${expectedOrderCount} scaffolded orders`).toBe(expectedOrderCount)
    })

    test('ADR-015: GIVEN household with 2+ inhabitants with NONE prefs WHEN using power mode to set DINEIN THEN all inhabitants get orders scaffolded', async ({page, browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const powerModeTestSalt = temporaryAndRandom()

        // GIVEN: Create 2 inhabitants with NONE preferences in member's household
        const today = new Date()
        const nonePrefs = createDefaultWeekdayMap(DinnerMode.NONE)

        // Use Anders- pattern for d1-nuke-all cleanup
        const [daisy, dewey] = await Promise.all([
            HouseholdFactory.createInhabitantWithConfig(adminContext, householdId, {
                name: salt('Anders', powerModeTestSalt),
                lastName: 'Adult',
                birthDate: new Date(today.getFullYear() - 25, today.getMonth(), 1),
                dinnerPreferences: nonePrefs
            }),
            HouseholdFactory.createInhabitantWithConfig(adminContext, householdId, {
                name: salt('Anders', `${powerModeTestSalt}-2`),
                lastName: 'Child',
                birthDate: new Date(today.getFullYear() - 10, today.getMonth(), 1),
                dinnerPreferences: nonePrefs
            })
        ])
        createdInhabitantIds.push(daisy.id, dewey.id)

        // GIVEN: Get dinner events
        const dinnerEvents = await DinnerEventFactory.getDinnerEventsForSeason(adminContext, activeSeason.id!)
        expect(dinnerEvents.length, 'Season should have at least 3 dinner events').toBeGreaterThanOrEqual(3)

        // Verify no orders exist initially for both inhabitants
        const allDinnerEventIds = dinnerEvents.map(e => e.id!)
        const initialOrders = await OrderFactory.getOrdersForDinnerEventsViaAdmin(adminContext, allDinnerEventIds)
        const daisyInitialOrders = initialOrders.filter(o => o.inhabitantId === daisy.id)
        const deweyInitialOrders = initialOrders.filter(o => o.inhabitantId === dewey.id)
        expect(daisyInitialOrders.length, 'Daisy should have no orders initially').toBe(0)
        expect(deweyInitialOrders.length, 'Dewey should have no orders initially').toBe(0)

        // WHEN: Navigate to member's household
        await goToHouseholdMembers(page)

        // WHEN: Click power mode toggle (bolt icon)
        const powerModeToggle = page.getByTestId('power-mode-toggle')
        await pollUntil(
            async () => await powerModeToggle.isVisible(),
            (isVisible) => isVisible,
            10
        )
        await powerModeToggle.click()

        // WHEN: Wait for power mode edit buttons to appear
        await pollUntil(
            async () => {
                const button = page.getByTestId('power-mode-preferences-edit-mandag-DINEIN')
                return await button.count() > 0
            },
            (count) => count
        )

        // WHEN: Change all cooking days to DINEIN via power mode (Mon, Wed, Fri)
        await page.getByTestId('power-mode-preferences-edit-mandag-DINEIN').click()
        await page.getByTestId('power-mode-preferences-edit-onsdag-DINEIN').click()
        await page.getByTestId('power-mode-preferences-edit-fredag-DINEIN').click()

        // Documentation screenshot showing power mode editing
        await doScreenshot(page, 'household/household-card-power-mode-editing', true)

        // WHEN: Save preferences (triggers scaffolding for ALL inhabitants)
        await page.getByTestId('save-preferences').click()

        // THEN: Wait for result alert to appear (confirms save completed)
        await pollUntil(
            async () => await page.getByTestId('last-result-alert').isVisible(),
            (isVisible) => isVisible,
            15
        )

        // THEN: Verify orders scaffolded for both test inhabitants
        const expectedOrdersPerInhabitant = dinnerEvents.length
        const expectedTotalOrders = 2 * expectedOrdersPerInhabitant
        const ordersAfter = await pollUntil(
            async () => {
                const orders = await OrderFactory.getOrdersForDinnerEventsViaAdmin(adminContext, allDinnerEventIds)
                return orders.filter(o => o.inhabitantId === daisy.id || o.inhabitantId === dewey.id)
            },
            (orders) => orders.length === expectedTotalOrders,
            15,
            500
        )

        const daisyOrders = ordersAfter.filter(o => o.inhabitantId === daisy.id)
        const deweyOrders = ordersAfter.filter(o => o.inhabitantId === dewey.id)
        expect(daisyOrders.length, `Inhabitant 1 should have ${expectedOrdersPerInhabitant} orders`).toBe(expectedOrdersPerInhabitant)
        expect(deweyOrders.length, `Inhabitant 2 should have ${expectedOrdersPerInhabitant} orders`).toBe(expectedOrdersPerInhabitant)

        // THEN: Verify last result alert appears with scaffold information
        // Note: Power mode affects ALL household inhabitants, not just test ones
        // So we verify the alert exists and shows "oprettet" (created) rather than exact count
        const lastResultAlert = page.getByTestId('last-result-alert')
        await expect(lastResultAlert).toContainText('oprettet')
        // NOTE: Cleanup handled by afterAll
    })
})
