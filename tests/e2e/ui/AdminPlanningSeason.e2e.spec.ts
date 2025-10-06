import {test, expect, BrowserContext} from '@playwright/test'
import {authFiles} from '../config'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import testHelpers from '../testHelpers'
import {formatDate} from '~/utils/date'
import {useSeasonValidation} from '~/composables/useSeasonValidation'

const {adminUIFile} = authFiles
const {validatedBrowserContext} = testHelpers
const {deserializeSeason} = useSeasonValidation()

/**
 * UI TEST STRATEGY:
 * - Focus on UI interaction (clicking, filling forms, navigation)
 * - Use API (SeasonFactory) for setup and verification
 * - Keep tests simple and focused on user workflow
 * - Data integrity verification belongs in API tests (season.e2e.spec.ts)
 */
test.describe('AdminPlanningSeason Form UI', () => {
    const adminPlanningUrl = '/admin/planning'
    let createdSeasonIds: number[] = []

    test.use({storageState: adminUIFile})

    test.afterAll(async ({browser}) => {
        // Cleanup using SeasonFactory
        if (createdSeasonIds.length > 0) {
            const context = await validatedBrowserContext(browser)
            for (const id of createdSeasonIds) {
                try {
                    await SeasonFactory.deleteSeason(context, id)
                } catch (error) {
                    console.error(`Failed to delete test season with ID ${id}:`, error)
                }
            }
        }
    })

    test('Can load admin planning page', async ({page}) => {
        await page.goto(adminPlanningUrl)
        await page.waitForLoadState('networkidle')

        // Verify form mode buttons are visible
        await expect(page.locator('button[name="form-mode-view"]')).toBeVisible()
        await expect(page.locator('button[name="form-mode-edit"]')).toBeVisible()
        await expect(page.locator('button[name="form-mode-create"]')).toBeVisible()
    })

    test('GIVEN user in create mode WHEN filling and submitting form THEN season is created', async ({
                                                                                                         page,
                                                                                                         browser
                                                                                                     }) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Navigate to create mode
        await page.goto(`${adminPlanningUrl}?mode=create`)
        await page.waitForLoadState('networkidle')

        // Verify we're in create mode
        await expect(page.locator('button[name="form-mode-create"]')).toHaveClass(/ring-2/)

        // Wait for form to be visible
        await expect(page.locator('form#seasonForm')).toBeVisible()

        // WHEN: Fill basic form fields
        const testSalt = Date.now() % 100  // Keep year in reasonable range (2025-2124)
        const year = 2025 + testSalt
        const yearLastTwoDigits = String(year).slice(-2)  // Get last 2 digits for shortName match
        const startDate = formatDate(new Date(year, 0, 1))
        const endDate = formatDate(new Date(year, 5, 30))

        // Use scoped selectors - season dates picker has name="seasonDates"
        await page.locator('[name="seasonDates"] input[name="start"]').fill(startDate)
        await page.locator('[name="seasonDates"] input[name="end"]').fill(endDate)

        // Submit form
        const submitButton = page.locator('button[name="submit-season"]')
        await expect(submitButton).toBeVisible()
        await submitButton.click()
        await page.waitForLoadState('networkidle')

        // THEN: Form should switch to view mode (indicating success)
        await expect(page.locator('button[name="form-mode-view"]')).toHaveClass(/ring-2/)

        // Verify season was created via API (shortName format is MM/yy, so match last 2 digits of year)
        const seasons = await SeasonFactory.getAllSeasons(context)
        const createdSeason = seasons.find(s => s.shortName?.includes(yearLastTwoDigits))

        expect(createdSeason).toBeDefined()
        if (createdSeason) {
            createdSeasonIds.push(createdSeason.id)
        }
    })

    test('GIVEN season exists WHEN user switches to edit mode THEN form shows season data', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create season via API
        const season = await SeasonFactory.createSeason(context, {
            ...SeasonFactory.defaultSeason().season,
            holidays: []
        })
        createdSeasonIds.push(season.id)

        // Navigate to planning page
        await page.goto(adminPlanningUrl)
        await page.waitForLoadState('networkidle')

        // USelect: Click button to open dropdown, then click option
        await page.getByTestId('season-selector').click()
        await page.locator(`text=${season.shortName}`).click()

        // WHEN: Switch to edit mode
        await page.locator('button[name="form-mode-edit"]').click()
        await page.waitForLoadState('networkidle')

        // THEN: Form should be in edit mode with season data
        await expect(page.locator('button[name="form-mode-edit"]')).toHaveClass(/ring-2/)
        await expect(page.locator('form#seasonForm')).toBeVisible()

        // Verify submit button is available
        await expect(page.locator('button[name="submit-season"]')).toBeVisible()
    })

    test('GIVEN user in create mode WHEN adding holiday period THEN holiday is added to list', async ({
                                                                                                          page,
                                                                                                          browser
                                                                                                      }) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Navigate to create mode
        await page.goto(`${adminPlanningUrl}?mode=create`)
        await page.waitForLoadState('networkidle')
        await expect(page.locator('form#seasonForm')).toBeVisible()

        // Fill basic fields with unique year - use scoped selectors
        const testSalt = Date.now() % 100  // Keep year in reasonable range
        const year = 2025 + testSalt
        const yearLastTwoDigits = String(year).slice(-2)
        const startDate = formatDate(new Date(year, 0, 1))
        const endDate = formatDate(new Date(year, 5, 30))
        await page.locator('[name="seasonDates"] input[name="start"]').fill(startDate)
        await page.locator('[name="seasonDates"] input[name="end"]').fill(endDate)

        // WHEN: Add holiday period via UI - fill holiday dates WITHIN season range
        const holidayStart = formatDate(new Date(year, 3, 1))   // Apr 1 (within season)
        const holidayEnd = formatDate(new Date(year, 3, 5))     // Apr 5 (within season)
        await page.locator('[name="holidayRangeList"] input[name="start"]').fill(holidayStart)
        await page.locator('[name="holidayRangeList"] input[name="end"]').fill(holidayEnd)

        const addHolidayButton = page.locator('button[name="holidayRangeAddToList"]')
        await expect(addHolidayButton).toBeVisible()
        await addHolidayButton.click()

        // THEN: Holiday item should appear in list
        const holidayItem = page.locator('[name^="holidayRangeList-0"]')
        await expect(holidayItem).toBeVisible()

        // Remove button should be visible for the holiday
        const removeButton = page.locator('button[name="holidayRangeRemoveFromList-0"]')
        await expect(removeButton).toBeVisible()

        // Submit and verify via API
        await page.locator('button[name="submit-season"]').click()
        await page.waitForLoadState('networkidle')

        // Verify season was created with holiday via API (shortName format is MM/yy, match last 2 digits)
        const serializedSeasons = await SeasonFactory.getAllSeasons(context)
        const serializedSeason = serializedSeasons.find(s => s.shortName?.includes(yearLastTwoDigits))

        expect(serializedSeason).toBeDefined()
        const createdSeason = deserializeSeason(serializedSeason)
        expect(createdSeason.holidays.length).toBeGreaterThan(0)
        createdSeasonIds.push(createdSeason.id)
    })

    test('GIVEN season with holiday WHEN removing holiday via UI THEN holiday is removed from list', async ({
                                                                                                                page,
                                                                                                                browser
                                                                                                            }) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create season with one holiday via API
        const holidayPeriod = {start: new Date(2025, 11, 24), end: new Date(2026, 0, 2)}
        const season = await SeasonFactory.createSeason(context, {
            ...SeasonFactory.defaultSeason().season,
            holidays: [holidayPeriod]
        })
        createdSeasonIds.push(season.id)

        // Navigate and select season
        await page.goto(adminPlanningUrl)
        await page.waitForLoadState('networkidle')

        // USelect: Click button to open dropdown, then click option
        await page.getByTestId('season-selector').click()
        await page.locator(`text=${season.shortName}`).click()

        // Switch to edit mode
        await page.locator('button[name="form-mode-edit"]').click()
        await page.waitForLoadState('networkidle')

        // Verify holiday is shown
        const holidayItem = page.locator('[name^="holidayRangeList-0"]')
        await expect(holidayItem).toBeVisible()

        // WHEN: Remove holiday
        const removeButton = page.locator('button[name="holidayRangeRemoveFromList-0"]')
        await expect(removeButton).toBeVisible()
        await removeButton.click()

        // THEN: Holiday item should be removed from UI
        await expect(holidayItem).not.toBeVisible()

        // Submit and verify via API
        await page.locator('button[name="submit-season"]').click()
        await page.waitForLoadState('networkidle')

        // Verify holiday was removed via API
        const serializedSeason = await SeasonFactory.getSeason(context, season.id)
        const updatedSeason = deserializeSeason(serializedSeason)
        expect(updatedSeason.holidays).toHaveLength(0)
    })
})

/**
 * NOTE: Tests for dinner events and cooking teams creation belong in API tests
 * See: tests/e2e/api/admin/season.e2e.spec.ts
 * - PUT should create season with cooking teams (currently skipped)
 * - PUT should create season with dinner events (currently skipped)
 * - DELETE should cascade delete cooking teams (currently skipped)
 * - DELETE should cascade delete dinner events (currently skipped)
 */