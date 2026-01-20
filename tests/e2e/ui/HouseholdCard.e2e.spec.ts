import {test, expect} from '@playwright/test'
import {authFiles} from '~~/tests/e2e/config'
import testHelpers from '~~/tests/e2e/testHelpers'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
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
    let _activeSeason: Awaited<ReturnType<typeof SeasonFactory.createActiveSeason>>
    const testSalt = temporaryAndRandom()

    // Track all created inhabitants for cleanup
    const createdInhabitantIds: number[] = []

    test.use({storageState: memberUIFile})

    // Helper to navigate to household members page and wait for load
    const goToHouseholdMembers = async (page: import('@playwright/test').Page) => {
        await page.goto(`/household/${encodeURIComponent(shortName)}/members`)
        await pollUntil(
            async () => await page.locator('[data-testid="household-members"]').isVisible(),
            (isVisible) => isVisible
        )
    }

    test.beforeAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)

        // Use singleton to prevent parallel test conflicts with active seasons
        _activeSeason = await SeasonFactory.createActiveSeason(adminContext)

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
            (isVisible) => isVisible
        )

        // WHEN: Click pencil icon to edit Scrooge's preferences (use specific testid, not .first())
        const editButton = page.getByTestId(`inhabitant-${scroogeId}-edit-preferences`)
        await editButton.click()

        await pollUntil(
            async () => {
                const button = page.getByTestId(`inhabitant-${scroogeId}-preferences-edit-mandag-TAKEAWAY`)
                return await button.count() > 0
            },
            (count) => count
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

    // NOTE: Scaffolding tests (ADR-015) moved to tests/e2e/ui/serial/HouseholdScaffolding.e2e.spec.ts
    // They require a dedicated season with specific deadline settings (ticketIsCancellableDaysBefore)
    // which conflicts with the shared singleton season used by parallel UI tests.
})
