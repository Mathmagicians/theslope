import {test, expect} from '@playwright/test'
import {authFiles} from '../config'
import testHelpers from '../testHelpers'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {formatDate} from '~/utils/date'
import {addDays} from 'date-fns/addDays'

const {adminUIFile} = authFiles
const {pollUntil, waitForHydration} = testHelpers

test.use({storageState: adminUIFile})

test('picker selection looks', async ({page}) => {
    await page.goto('/admin/planning?mode=create')
    await pollUntil(async () => await page.locator('form#seasonForm').isVisible(), v => v, 10)
    await waitForHydration(page)

    const start = SeasonFactory.generateUniqueDate()
    const end = addDays(start, 7)
    await page.locator('[name="seasonDates"] input[name="start"]').fill(formatDate(start))
    await page.locator('[name="seasonDates"] input[name="end"]').fill(formatDate(end))

    // Season picker: cooking-day selection
    await page.locator('[name="seasonDates"] input[name="start"]').click()
    const seasonPopover = page.getByRole('dialog')
    await expect(seasonPopover.locator('[data-selected]').first()).toBeVisible()
    await seasonPopover.screenshot({path: 'test-results/picker-season-cookingday.png'})
    await pollUntil(async () => {
        await page.keyboard.press('Escape')
        return await seasonPopover.count()
    }, c => c === 0, 5)

    // Holiday add row: holiday selection
    await page.locator('[name="holidayRangeList"] input[name="start"]').fill(formatDate(addDays(start, 2)))
    await page.locator('[name="holidayRangeList"] input[name="end"]').fill(formatDate(addDays(start, 4)))
    await page.locator('[name="holidayRangeList"] input[name="start"]').click()
    const holidayPopover = page.getByRole('dialog')
    await expect(holidayPopover.locator('[data-selected]').first()).toBeVisible()
    await holidayPopover.screenshot({path: 'test-results/picker-holiday-selection.png'})
})
