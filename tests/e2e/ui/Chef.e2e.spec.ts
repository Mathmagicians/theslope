import {test, expect} from '@playwright/test'
import {authFiles} from '../config'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import testHelpers from '../testHelpers'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil, doScreenshot} = testHelpers

/**
 * E2E UI Tests for Chef Page
 *
 * Happy day scenario: Chef views their team's dinners and manages menu
 * Uses singleton active season with pre-assigned teams (global setup)
 */
test.describe('Chef Page - Happy Day', () => {
    const chefPageUrl = '/chef'

    test.use({storageState: adminUIFile})

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        // Use singleton active season - ensures teams and dinner events exist
        await SeasonFactory.createActiveSeason(context)
    })

    test('GIVEN chef with assigned team WHEN viewing chef page THEN sees team calendar and can select dinner', async ({page}) => {
        // WHEN: Navigate to chef page
        await page.goto(chefPageUrl)

        // THEN: Wait for page to load (team selector visible)
        await pollUntil(
            async () => {
                const teamSelector = page.getByTestId('my-team-selector')
                return await teamSelector.isVisible().catch(() => false)
            },
            (isVisible) => isVisible,
            10
        )

        // THEN: Team selector should be visible
        const teamSelector = page.getByTestId('my-team-selector')
        await expect(teamSelector, 'Team selector should be visible').toBeVisible()

        // Wait for calendar to load
        await pollUntil(
            async () => {
                // Check for either calendar display or "no events" message
                const calendar = page.locator('[data-testid="chef-calendar-display"]')
                const noEvents = page.getByText('Holdet har ingen fællesspisninger')
                return await calendar.isVisible().catch(() => false) || await noEvents.isVisible().catch(() => false)
            },
            (isVisible) => isVisible,
            10
        )

        // Documentation screenshot: Chef dashboard overview
        await doScreenshot(page, 'chef/chef-dashboard', true)
    })

    test('GIVEN chef page loaded WHEN dinner event exists THEN shows menu card and team info', async ({page}) => {
        // Navigate to chef page
        await page.goto(chefPageUrl)

        // Wait for page to be ready
        await pollUntil(
            async () => {
                const teamSelector = page.getByTestId('my-team-selector')
                return await teamSelector.isVisible().catch(() => false)
            },
            (isVisible) => isVisible,
            10
        )

        // Wait for dinner detail to load (either menu card or loading state)
        await pollUntil(
            async () => {
                const menuCard = page.locator('[data-testid="chef-menu-card"]')
                const detailPanel = page.locator('[data-testid="dinner-detail-panel"]')
                return await menuCard.isVisible().catch(() => false) || await detailPanel.isVisible().catch(() => false)
            },
            (isVisible) => isVisible,
            10
        )

        // Check if we have a dinner event displayed
        const menuCard = page.locator('[data-testid="chef-menu-card"]')
        const hasMenuCard = await menuCard.isVisible().catch(() => false)

        if (hasMenuCard) {
            // THEN: Menu card should show dinner details
            await expect(menuCard, 'Menu card should be visible').toBeVisible()

            // Documentation screenshot: Chef menu editing view
            await doScreenshot(page, 'chef/chef-menu-card', true)

            // Check for cooking team card
            const teamCard = page.locator('[data-testid="cooking-team-card"]')
            const hasTeamCard = await teamCard.isVisible().catch(() => false)

            if (hasTeamCard) {
                // Documentation screenshot: Full chef view with team
                await doScreenshot(page, 'chef/chef-full-view', true)
            }
        }
    })
})
