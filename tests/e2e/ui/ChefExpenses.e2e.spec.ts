import {test, expect} from '~~/tests/e2e/uiTest'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {DinnerEventFactory} from '../testDataFactories/dinnerEventFactory'
import {ExpenseFactory} from '../testDataFactories/expenseFactory'
import {useBillingValidation} from '~/composables/useBillingValidation'
import {useTicket} from '~/composables/useTicket'
import {formatDate} from '~/utils/date'
import testHelpers from '../testHelpers'

const {validatedBrowserContext, memberValidatedBrowserContext, getSessionUserInfo, temporaryAndRandom, gotoHydrated, waitForApi} = testHelpers
const {ExpenseSchema} = useBillingValidation()
const {formatPrice} = useTicket()

/**
 * The chef opens the Madbestilling row, enters a grocery line: it appears with the ex moms amount typed, Brugt in the
 * hint follows, slet removes it, Luk folds the row, and the API holds the same lines. The member is the team's CHEF;
 * the admin sets the data up.
 */
test.describe('Chef expense lines', () => {
    let teamId: number
    let dinnerEventId: number
    let dinnerDate: Date
    let menuTitle: string
    const createdTeamIds: number[] = []
    const createdDinnerIds: number[] = []
    const expenseIds: number[] = []

    test.beforeAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()
        const activeSeason = await SeasonFactory.createActiveSeason(adminContext)
        const {inhabitantId} = await getSessionUserInfo(memberContext)

        menuTitle = `Indkøbsmiddag-${testSalt}`
        // The page selects a dinner by date, and the new team also holds the season's generated dinners: the spec's dinner
        // is alone on its day and the URL names that day
        const {team, dinner} = await SeasonFactory.createCookingTeamWithChefAndDinner(adminContext, activeSeason, inhabitantId, {
            teamName: `Indkøbshold-${testSalt}`, dinner: {menuTitle}, day: 'free'
        })
        teamId = team.id!
        createdTeamIds.push(teamId)
        dinnerEventId = dinner.id!
        createdDinnerIds.push(dinnerEventId)
        dinnerDate = new Date(dinner.date)
    })

    test.afterAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        // An expense row outlives its dinner (SetNull): the lines go first; the dinner and the team accept a 404
        await ExpenseFactory.cleanupExpenses(memberContext, dinnerEventId, expenseIds)
        for (const id of createdDinnerIds) await DinnerEventFactory.deleteDinnerEvent(adminContext, id)
        for (const id of createdTeamIds) await SeasonFactory.deleteCookingTeam(adminContext, id)
    })

    test('GIVEN the chef on the dinner WHEN adding a line and removing it THEN the pane and the API follow', async ({browser}) => {
        const memberContext = await memberValidatedBrowserContext(browser)
        const page = await memberContext.newPage()
        await gotoHydrated(page, `/chef?team=${teamId}&date=${formatDate(dinnerDate)}`)
        await expect(page.getByTestId('chef-menu-title'), `dinner ${dinnerEventId} on view`).toHaveText(menuTitle)

        // The row sits beside the menu and allergen edits, folded to its total; the editor opens behind its button
        const pane = page.getByTestId('expense-lines')
        await expect(pane.getByTestId('expense-empty')).toHaveText('Madbestilling mangler')
        await pane.getByTestId('expense-edit').click()

        await page.locator('input[name="expense-amount-input"]').fill('1012')
        const saved = waitForApi(page, `/api/chef/dinner/${dinnerEventId}/expenses`, 'PUT')
        await page.getByTestId('expense-add').click()
        const response = await saved
        expenseIds.push(ExpenseSchema.parse(await response.json()).id)
        expect(response.status()).toBe(201)

        // The line is the table's one plain row; its slet button counts it
        await expect(pane.getByTestId('expense-remove')).toHaveCount(1)
        const line = pane.getByTestId('expense-table').locator('tbody tr').first()
        // Typed ex moms, stored gross, read in both units; Brugt in the sums follows
        await expect(line.getByTestId('vat-amount-ex')).toHaveText(formatPrice(101200))
        await expect(line.getByTestId('vat-amount-incl')).toHaveText(`/ ${formatPrice(126500)} kr`)
        // This dinner's Brugt is the first of the two sum blocks
        await expect(pane.getByTestId('expense-hint-row').filter({hasText: 'Brugt'}).first()).toContainText(`/ ${formatPrice(126500)} kr`)

        const stored = await ExpenseFactory.list(memberContext, dinnerEventId)
        expect(stored, `the API lines of dinner ${dinnerEventId}`).toHaveLength(1)

        await pane.getByTestId('expense-remove').first().click()
        await expect(pane.getByTestId('expense-remove')).toHaveCount(0)
        // The table's own empty state, one of the noReceipts messages
        await expect(pane.getByTestId('expense-table-empty')).toBeVisible()
        await pane.getByTestId('expense-back').click()
        await expect(pane.getByTestId('expense-empty')).toHaveText('Madbestilling mangler')
        expect(await ExpenseFactory.list(memberContext, dinnerEventId)).toEqual([])
    })
})
