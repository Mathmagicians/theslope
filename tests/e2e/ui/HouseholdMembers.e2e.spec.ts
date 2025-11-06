import {test, expect} from '@playwright/test'
import {authFiles} from '../config'
import testHelpers from '../testHelpers'
import {HouseholdFactory} from '../testDataFactories/householdFactory'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {useHouseholdValidation} from '~/composables/useHouseholdValidation'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil, doScreenshot} = testHelpers
const {deserializeWeekDayMap} = useHouseholdValidation()

test.describe('Household members display', () => {
    let householdId: number
    let seasonId: number
    let shortName: string
    let babyId: number
    let donaldId: number
    let daisyId: number

    test.use({storageState: adminUIFile})

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const season = await SeasonFactory.createSeason(context, {
            isActive: true
        })
        seasonId = season.id!

        const household = await HouseholdFactory.createHousehold(context, 'MembersTest')
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
        if (seasonId) {
            await SeasonFactory.cleanupSeasons(context, [seasonId]).catch(() => {})
        }
    })

    test('GIVEN household with members of different ages WHEN viewing members tab THEN each member displays correct ticket type', async ({page}) => {
        await page.goto(`/household/${encodeURIComponent(shortName)}/members`)

        await page.waitForResponse(
            (response) => response.url().includes('/api/admin/household/') && response.status() === 200,
            {timeout: 10000}
        )

        await pollUntil(
            async () => await page.locator('[data-test-id="household-members"]').isVisible(),
            (isVisible) => isVisible,
            10
        )

        const babyTicket = page.locator(`[data-test-id="ticket-type-${babyId}"]`)
        await expect(babyTicket).toContainText('Baby')

        const donaldTicket = page.locator(`[data-test-id="ticket-type-${donaldId}"]`)
        await expect(donaldTicket).toContainText('Barn')

        const daisyTicket = page.locator(`[data-test-id="ticket-type-${daisyId}"]`)
        await expect(daisyTicket).toContainText('Voksen')

        // Documentation screenshot showing ticket types in VIEW mode
        await doScreenshot(page, 'household/household-members-view-mode', true)
    })

    test('GIVEN household member WHEN editing weekday preference THEN change is persisted to database', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)

        await page.goto(`/household/${encodeURIComponent(shortName)}/members`)

        await page.waitForResponse(
            (response) => response.url().includes('/api/admin/household/') && response.status() === 200,
            {timeout: 10000}
        )

        await pollUntil(
            async () => await page.locator('[data-test-id="household-members"]').isVisible(),
            (isVisible) => isVisible,
            10
        )

        const editButton = page.locator('[data-test-id="household-members-edit-toggle"]')
        await editButton.click()

        await pollUntil(
            async () => {
                const button = page.locator(`button[name="inhabitant-${donaldId}-preferences-mandag-TAKEAWAY"]`)
                return await button.count() > 0
            },
            (count) => count,
            10
        )

        const mondayTakeawayButton = page.locator(`button[name="inhabitant-${donaldId}-preferences-mandag-TAKEAWAY"]`)
        await mondayTakeawayButton.click()

        // Poll until preferences are updated in database
        const household = await pollUntil(
            async () => await HouseholdFactory.getHouseholdById(context, householdId),
            (h) => {
                const donald = h.inhabitants.find((i: any) => i.id === donaldId)
                return donald?.dinnerPreferences !== null
            },
            10
        )

        const donald = household.inhabitants.find((i: any) => i.id === donaldId)
        expect(donald.dinnerPreferences).toBeDefined()

        const preferences = typeof donald.dinnerPreferences === 'string'
            ? deserializeWeekDayMap(donald.dinnerPreferences)
            : donald.dinnerPreferences

        const changedDays = Object.entries(preferences).filter(([_, mode]) => mode === 'TAKEAWAY')
        expect(changedDays).toHaveLength(1)
    })
})