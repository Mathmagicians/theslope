import {test, expect, type Response} from '@playwright/test'
import {authFiles} from '../config'
import testHelpers from '../testHelpers'
import {HouseholdFactory} from '../testDataFactories/householdFactory'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil, doScreenshot, salt, temporaryAndRandom} = testHelpers
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

    test.use({storageState: adminUIFile})

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Use singleton to prevent parallel test conflicts with active seasons
        // NOTE: Singleton is cleaned up by global teardown, not by this test
        await SeasonFactory.createActiveSeason(context)

        const household = await HouseholdFactory.createHousehold(context, {name: salt('MembersTest', testSalt)})
        householdId = household.id
        shortName = household.shortName

        const today = new Date()

        const baby = await HouseholdFactory.createInhabitantForHousehold(
            context,
            householdId,
            'Baby Duck',
            new Date(today.getFullYear(), today.getMonth(), 1)
        )
        babyId = baby.id

        const donald = await HouseholdFactory.createInhabitantForHousehold(
            context,
            householdId,
            'Donald Duck',
            new Date(today.getFullYear() - 8, today.getMonth(), 1)
        )
        donaldId = donald.id

        const daisy = await HouseholdFactory.createInhabitantForHousehold(
            context,
            householdId,
            'Daisy Duck',
            new Date(today.getFullYear() - 30, today.getMonth(), 1)
        )
        daisyId = daisy.id
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        if (householdId) {
            await HouseholdFactory.deleteHousehold(context, householdId).catch(() => {})
        }
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

        // Click the edit button (pencil icon) for Donald's row to expand it
        const donaldRow = page.getByRole('row').filter({hasText: 'Donald'}).first()
        const editButton = donaldRow.getByRole('button', {name: 'Rediger præferencer'})
        await editButton.click()

        // Wait for edit panel to be visible
        const editPanel = page.getByRole('heading', {name: /Opdater fællesspisning præferencer for Donald/})
        await pollUntil(
            async () => await editPanel.isVisible(),
            (isVisible) => isVisible,
            10
        )

        // Click TAKEAWAY button directly using its testid
        const takeawayButton = page.getByTestId(`inhabitant-${donaldId}-preferences-edit-mandag-TAKEAWAY`)
        await expect(takeawayButton, `TAKEAWAY button for inhabitant ${donaldId} should be visible`).toBeVisible({timeout: 5000})
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
