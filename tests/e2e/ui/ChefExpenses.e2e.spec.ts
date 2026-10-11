import {test, expect} from '@playwright/test'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {DinnerEventFactory} from '../testDataFactories/dinnerEventFactory'
import {ExpenseFactory} from '../testDataFactories/expenseFactory'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import {useTicket} from '~/composables/useTicket'
import {formatDate} from '~/utils/date'
import testHelpers from '../testHelpers'

const {validatedBrowserContext, memberValidatedBrowserContext, getSessionUserInfo, temporaryAndRandom, gotoHydrated} = testHelpers
const {TeamRoleSchema} = useCookingTeamValidation()
const {formatPrice} = useTicket()

/**
 * The chef enters grocery lines in the budget pane: the line appears with the ex moms amount typed, Brugt follows,
 * slet removes it, and the API holds the same lines. The member is the team's CHEF; the admin sets the data up.
 */
test.describe('Chef expense lines', () => {
    let teamId: number
    let dinnerEventId: number
    let dinnerDate: Date
    let menuTitle: string
    const expenseIds: number[] = []

    test.beforeAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()
        const activeSeason = await SeasonFactory.createActiveSeason(adminContext)
        const {inhabitantId} = await getSessionUserInfo(memberContext)

        const team = await SeasonFactory.createCookingTeamForSeason(adminContext, activeSeason.id!, `Indkøbshold-${testSalt}`)
        teamId = team.id!
        await SeasonFactory.assignMemberToTeam(adminContext, teamId, inhabitantId, TeamRoleSchema.enum.CHEF)
        menuTitle = `Indkøbsmiddag-${testSalt}`
        // The page selects a dinner by date, and the new team also holds the season's generated dinners: the spec's dinner
        // is alone on its day and the URL names that day
        const dinner = await DinnerEventFactory.createDinnerEventOnFreeDay(adminContext, activeSeason, {
            menuTitle, cookingTeamId: teamId, chefId: inhabitantId
        })
        dinnerEventId = dinner.id!
        dinnerDate = new Date(dinner.date)
    })

    test.afterAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        // An expense row outlives its dinner (SetNull): the lines go first
        await ExpenseFactory.cleanupExpenses(memberContext, dinnerEventId, expenseIds)
        await DinnerEventFactory.deleteDinnerEvent(adminContext, dinnerEventId).catch(() => undefined)
        await SeasonFactory.deleteCookingTeam(adminContext, teamId).catch(() => undefined)
    })

    test('GIVEN the chef on the dinner WHEN adding a line and removing it THEN the pane and the API follow', async ({browser}) => {
        const memberContext = await memberValidatedBrowserContext(browser)
        const page = await memberContext.newPage()
        await gotoHydrated(page, `/chef?team=${teamId}&date=${formatDate(dinnerDate)}`)
        await expect(page.getByTestId('chef-menu-title'), `dinner ${dinnerEventId} on view`).toHaveText(menuTitle)

        // The lines sit beside the menu and allergen edits, outside the Budget chevron
        const pane = page.getByTestId('expense-lines')
        await expect(pane).toBeVisible()
        await expect(pane.getByTestId('expense-spent')).toContainText(`/ ${formatPrice(0)} kr`)

        await page.locator('input[name="expense-amount-input"]').fill('1012')
        await page.getByTestId('expense-add').click()

        const line = pane.getByTestId('expense-line')
        await expect(line).toHaveCount(1)
        // Typed ex moms, stored gross, read in both units
        await expect(line.first().getByTestId('vat-amount-ex')).toHaveText(formatPrice(101200))
        await expect(line.first().getByTestId('vat-amount-incl')).toHaveText(`/ ${formatPrice(126500)} kr`)
        await expect(pane.getByTestId('expense-spent')).toContainText(`/ ${formatPrice(126500)} kr`)

        const stored = await ExpenseFactory.list(memberContext, dinnerEventId)
        expenseIds.push(...stored.map(expense => expense.id))
        expect(stored, `the API lines of dinner ${dinnerEventId}`).toHaveLength(1)

        await line.first().getByTestId('expense-remove').click()
        await expect(pane.getByTestId('expense-line')).toHaveCount(0)
        await expect(pane.getByTestId('expense-spent')).toContainText(`/ ${formatPrice(0)} kr`)
        expect(await ExpenseFactory.list(memberContext, dinnerEventId)).toEqual([])
    })
})
