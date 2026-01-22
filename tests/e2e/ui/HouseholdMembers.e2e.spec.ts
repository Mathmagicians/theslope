import {test, expect, type Response} from '@playwright/test'
import {authFiles} from '../config'
import testHelpers from '../testHelpers'
import {HouseholdFactory} from '../testDataFactories/householdFactory'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'

const {memberUIFile} = authFiles
const {validatedBrowserContext, memberValidatedBrowserContext, pollUntil, doScreenshot, salt, temporaryAndRandom, getSessionUserInfo} = testHelpers
const {DinnerModeSchema} = useBookingValidation()
const {deserializeWeekDayMap} = useWeekDayMapValidation({
    valueSchema: DinnerModeSchema,
    defaultValue: DinnerModeSchema.enum.DINEIN
})

test.describe('Household members display', () => {
    // Generate unique test salt per worker to avoid parallel test conflicts
    const testSalt = temporaryAndRandom()
    let householdId: number
    let shortName: string
    let babyId: number
    let donaldId: number
    let daisyId: number

    test.use({storageState: memberUIFile})

    test.beforeAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)

        // Use singleton to prevent parallel test conflicts with active seasons
        // NOTE: Singleton is cleaned up by global teardown, not by this test
        await SeasonFactory.createActiveSeason(adminContext)

        // Get member's household (member must access their own household for store to load correctly)
        const {householdId: memberHouseholdId} = await getSessionUserInfo(memberContext)
        householdId = memberHouseholdId

        // Get household details to get shortName
        const household = await HouseholdFactory.getHouseholdById(adminContext, householdId)
        shortName = household!.shortName

        const today = new Date()

        // Create test inhabitants in member's household (using admin for setup)
        // Use Anders- pattern for d1-nuke-all cleanup
        const baby = await HouseholdFactory.createInhabitantForHousehold(
            adminContext,
            householdId,
            salt('Anders', testSalt) + '-Baby',
            new Date(today.getFullYear(), today.getMonth(), 1)
        )
        babyId = baby.id

        const donald = await HouseholdFactory.createInhabitantForHousehold(
            adminContext,
            householdId,
            salt('Anders', testSalt) + '-Donald',
            new Date(today.getFullYear() - 8, today.getMonth(), 1)
        )
        donaldId = donald.id

        const daisy = await HouseholdFactory.createInhabitantForHousehold(
            adminContext,
            householdId,
            salt('Anders', testSalt) + '-Daisy',
            new Date(today.getFullYear() - 30, today.getMonth(), 1)
        )
        daisyId = daisy.id
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        // Clean up test inhabitants (not the household - it's the member's own)
        await Promise.all([
            HouseholdFactory.deleteInhabitant(context, babyId).catch(() => {}),
            HouseholdFactory.deleteInhabitant(context, donaldId).catch(() => {}),
            HouseholdFactory.deleteInhabitant(context, daisyId).catch(() => {})
        ])
        // NOTE: Singleton active season is cleaned up by global teardown, not here
    })

    test('GIVEN household with members of different ages WHEN viewing members tab THEN each member displays correct ticket type', async ({page}) => {
        // Setup response wait BEFORE navigation to catch the API call
        const responsePromise = page.waitForResponse(
            (response: Response) => response.url().includes('/api/admin/household/'),
            {timeout: 10000}
        )

        await page.goto(`/household/${encodeURIComponent(shortName)}/members`)
        const response = await responsePromise
        expect(response.status()).toBe(200)

        await pollUntil(
            async () => await page.locator('[data-testid="household-members"]').isVisible(),
            (isVisible) => isVisible,
            10
        )

        const babyTicket = page.locator(`[data-testid="ticket-type-${babyId}"]`)
        await expect(babyTicket).toContainText('Baby')

        const donaldTicket = page.locator(`[data-testid="ticket-type-${donaldId}"]`)
        await expect(donaldTicket).toContainText('Barn')

        const daisyTicket = page.locator(`[data-testid="ticket-type-${daisyId}"]`)
        await expect(daisyTicket).toContainText('Voksen')

        // Documentation screenshot showing ticket types in VIEW mode
        await doScreenshot(page, 'household/household-members-view-mode', true)
    })

    test('GIVEN household member WHEN editing weekday preference THEN change is persisted to database', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)

        // Setup response wait BEFORE navigation to catch the API call
        const responsePromise = page.waitForResponse(
            (response: Response) => response.url().includes('/api/admin/household/'),
            {timeout: 10000}
        )

        await page.goto(`/household/${encodeURIComponent(shortName)}/members`)
        const response = await responsePromise
        expect(response.status()).toBe(200)

        await pollUntil(
            async () => await page.locator('[data-testid="household-members"]').isVisible(),
            (isVisible) => isVisible,
            10
        )

        // Click the edit button (pencil icon) for Donald's row using testid
        // More reliable than row text filtering which can match wrong row
        const editButton = page.getByTestId(`inhabitant-${donaldId}-edit-preferences`)
        await editButton.click()

        // Wait for edit panel to be visible (UFormField renders label as generic element, not heading)
        const editPanel = page.getByText(/Opdater fællesspisning præferencer for Anders.*-Donald/)
        await expect(editPanel, 'Edit panel should be visible after clicking edit button').toBeVisible({timeout: 5000})

        // Poll for TAKEAWAY button - if it fails, we'll see debug info below
        const expectedTestId = `inhabitant-${donaldId}-preferences-edit-mandag-TAKEAWAY`
        const buttonFound = await pollUntil(
            async () => {
                const button = page.getByTestId(expectedTestId)
                return await button.count() > 0
            },
            (count) => count,
            5  // Reduced to 5 retries to stay within test timeout
        ).catch(() => false)

        // If button not found, get debug info and fail with helpful message
        if (!buttonFound) {
            const allTestIds = await page.locator('[data-testid]').evaluateAll(
                els => els.map(el => el.getAttribute('data-testid'))
            )
            const relevantTestIds = allTestIds.filter(id => id?.includes('preferences-edit') || id?.includes('inhabitant'))
            throw new Error(`Expected data-testid="${expectedTestId}" but found: [${relevantTestIds.join(', ')}]. donaldId=${donaldId}`)
        }

        const takeawayButton = page.getByTestId(expectedTestId)
        await takeawayButton.click()

        // Click the Save button to persist changes
        const saveButton = page.getByRole('button', {name: 'Gem'})
        await saveButton.click()

        // Poll until preferences are updated in database
        const household = await pollUntil(
            async () => await HouseholdFactory.getHouseholdById(context, householdId),
            (h) => {
                if (!h) return false
                const donald = h.inhabitants.find((i: {id: number}) => i.id === donaldId)
                return donald?.dinnerPreferences !== null
            },
            10
        )
        expect(household).not.toBeNull()

        const donald = household!.inhabitants.find((i: {id: number}) => i.id === donaldId)
        expect(donald).toBeDefined()
        expect(donald!.dinnerPreferences).toBeDefined()

        const preferences = typeof donald!.dinnerPreferences === 'string'
            ? deserializeWeekDayMap(donald!.dinnerPreferences)
            : donald!.dinnerPreferences

        expect(preferences).not.toBeNull()
        const changedDays = Object.entries(preferences!).filter(([_, mode]) => mode === 'TAKEAWAY')
        expect(changedDays).toHaveLength(1)
    })
})
