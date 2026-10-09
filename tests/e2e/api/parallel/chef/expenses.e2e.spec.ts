import {test, expect} from '@playwright/test'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {ExpenseFactory} from '~~/tests/e2e/testDataFactories/expenseFactory'
import {useBillingValidation} from '~/composables/useBillingValidation'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import type {DinnerEventCreate} from '~/composables/useBookingValidation'
import testHelpers from '~~/tests/e2e/testHelpers'

/**
 * `/api/chef/dinner/[id]/expenses`: the chef's grocery lines on a dinner. The dinner's cost is the sum of its lines
 * on every read: Display carries the sum, Detail the sum and the lines; the stored column takes no writes.
 * Setup: season + team + member as CHEF. The admin is not on the team and stands in for a non-chef. A test that
 * writes owns its dinner (the file runs fully parallel); the tests that are refused share one.
 */
const {validatedBrowserContext, memberValidatedBrowserContext, salt, temporaryAndRandom, getSessionUserInfo} = testHelpers
const {LedgerEntryTypeSchema} = useBillingValidation()
const {TeamRoleSchema} = useCookingTeamValidation()

type Context = Awaited<ReturnType<typeof validatedBrowserContext>>
type DinnerLines = {dinnerEventId: number, expenseIds: number[]}

const UNKNOWN_ID = 999999999

test.describe('Chef dinner expenses', () => {
    let seasonId: number
    let teamId: number
    let sharedDinnerId: number
    let chef: {userId: number, userEmail: string}
    const cleanup: DinnerLines[] = []

    test.beforeAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const season = await SeasonFactory.createSeason(adminContext)
        seasonId = season.id!
        const team = await SeasonFactory.createCookingTeamForSeason(adminContext, seasonId, salt('Udgiftshold', temporaryAndRandom()))
        teamId = team.id!
        const member = await getSessionUserInfo(memberContext)
        chef = {userId: member.userId, userEmail: member.userEmail}
        await SeasonFactory.assignMemberToTeam(adminContext, teamId, member.inhabitantId, TeamRoleSchema.enum.CHEF)
        sharedDinnerId = (await createDinner(adminContext)).dinnerEventId
    })

    test.afterAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        // An expense row outlives its dinner (SetNull), so the lines go before the season cascade
        for (const {dinnerEventId, expenseIds} of cleanup) await ExpenseFactory.cleanupExpenses(memberContext, dinnerEventId, expenseIds)
        await SeasonFactory.cleanupSeasons(adminContext, [seasonId])
    })

    // A dinner of the chef's team; the lines a test adds to it are registered for cleanup
    const createDinner = async (adminContext: Context): Promise<DinnerLines> => {
        const dinner = await DinnerEventFactory.createDinnerEvent(adminContext, {
            ...DinnerEventFactory.defaultDinnerEvent(temporaryAndRandom()), seasonId, cookingTeamId: teamId
        })
        const lines = {dinnerEventId: dinner.id!, expenseIds: []}
        cleanup.push(lines)
        return lines
    }

    const addLine = async (memberContext: Context, dinner: DinnerLines, data: Record<string, unknown>) => {
        const expense = (await ExpenseFactory.add(memberContext, dinner.dinnerEventId, data))!
        dinner.expenseIds.push(expense.id)
        return expense
    }

    const addTwoLines = async (memberContext: Context, dinner: DinnerLines) => [
        await addLine(memberContext, dinner, ExpenseFactory.defaultExpenseCreate()),
        await addLine(memberContext, dinner, ExpenseFactory.defaultExpenseCreate({amount: 29800, description: 'Mejeri', paidByUserId: null}))
    ]

    test('GIVEN a chef WHEN adding two lines THEN the list carries both in entry order, the chef as payer unless told otherwise', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const dinner = await createDinner(adminContext)

        const [first, second] = await addTwoLines(memberContext, dinner)

        const lines = await ExpenseFactory.list(memberContext, dinner.dinnerEventId)
        expect(lines.map(line => line.id)).toEqual([first!.id, second!.id])
        expect(first).toMatchObject({
            type: LedgerEntryTypeSchema.enum.REGULAR, dinnerEventId: dinner.dinnerEventId,
            paidByUserId: chef.userId, paidBy: {id: chef.userId, email: chef.userEmail}
        })
        expect(second).toMatchObject({paidByUserId: null, paidBy: {id: null, email: ''}, amount: 29800})
    })

    test('GIVEN two lines WHEN reading the dinner THEN Display carries the sum alone and Detail the sum with the lines', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const dinner = await createDinner(adminContext)
        await addTwoLines(memberContext, dinner)

        const display = (await DinnerEventFactory.getDinnerEventsForSeason(adminContext, seasonId)).find(event => event.id === dinner.dinnerEventId)!
        expect(display.totalCost).toBe(131000)
        expect(display).not.toHaveProperty('expenses')

        const detail = (await DinnerEventFactory.getDinnerEvent(adminContext, dinner.dinnerEventId))!
        expect(detail.totalCost).toBe(131000)
        expect(detail.expenses.map(expense => expense.amount)).toEqual([101200, 29800])
    })

    test('GIVEN two lines WHEN the chef removes one THEN the cost drops and a second removal is 404', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const dinner = await createDinner(adminContext)
        const [first] = await addTwoLines(memberContext, dinner)

        const removed = await ExpenseFactory.remove(memberContext, dinner.dinnerEventId, first!.id)
        expect(removed!.id).toBe(first!.id)
        expect((await DinnerEventFactory.getDinnerEvent(adminContext, dinner.dinnerEventId))!.totalCost).toBe(29800)

        await ExpenseFactory.remove(memberContext, dinner.dinnerEventId, first!.id, 404)
    })

    test('GIVEN a menu update carrying totalCost WHEN posted THEN 400 and the cost stands', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const dinner = await createDinner(adminContext)
        await addLine(memberContext, dinner, ExpenseFactory.defaultExpenseCreate())

        await DinnerEventFactory.updateDinnerEvent(memberContext, dinner.dinnerEventId, {menuTitle: 'Ny ret', totalCost: 1} as Partial<DinnerEventCreate>, 400)

        expect((await DinnerEventFactory.getDinnerEvent(adminContext, dinner.dinnerEventId))!.totalCost).toBe(101200)
    })

    for (const {desc, body} of [
        {desc: 'an amount of zero', body: {amount: 0}},
        {desc: 'a negative amount', body: {amount: -100}},
        {desc: 'a fractional amount', body: {amount: 10.5}},
        {desc: 'an empty description', body: {description: ''}},
        {desc: 'a blank description', body: {description: '   '}},
        {desc: 'a totalCost key', body: {totalCost: 100}},
        {desc: 'a payer id of zero', body: {paidByUserId: 0}}
    ]) {
        test(`GIVEN ${desc} WHEN adding THEN 400`, async ({browser}) => {
            const memberContext = await memberValidatedBrowserContext(browser)
            await ExpenseFactory.add(memberContext, sharedDinnerId, {...ExpenseFactory.defaultExpenseCreate(), ...body}, 400)
        })
    }

    test('GIVEN the admin, who is not on the team WHEN adding or listing THEN 403', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        await ExpenseFactory.add(adminContext, sharedDinnerId, ExpenseFactory.defaultExpenseCreate(), 403)
        await ExpenseFactory.list(adminContext, sharedDinnerId, 403)
    })

    test('GIVEN an unknown dinner WHEN listing THEN 404', async ({browser}) => {
        const memberContext = await memberValidatedBrowserContext(browser)
        await ExpenseFactory.list(memberContext, UNKNOWN_ID, 404)
    })

    test('GIVEN a payer who is not a user WHEN adding THEN 404', async ({browser}) => {
        const memberContext = await memberValidatedBrowserContext(browser)
        await ExpenseFactory.add(memberContext, sharedDinnerId, ExpenseFactory.defaultExpenseCreate({paidByUserId: UNKNOWN_ID}), 404)
    })
})
