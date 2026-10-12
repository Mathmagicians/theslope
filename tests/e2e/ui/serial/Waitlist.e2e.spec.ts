import {test, expect, type BrowserContext} from '@playwright/test'
import {addDays, isSameDay, startOfDay} from 'date-fns'
import {authFiles} from '~~/tests/e2e/config'
import testHelpers from '~~/tests/e2e/testHelpers'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {formatDate} from '~/utils/date'

const {memberUIFile, adminUIFile} = authFiles
const {validatedBrowserContext, memberValidatedBrowserContext, getSessionUserInfo, gotoHydrated, pollUntil, salt, temporaryAndRandom} = testHelpers
const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
const {TeamRoleSchema} = useCookingTeamValidation()
const {createDefaultWeekdayMap: createBooleanWeekdayMap} = useWeekDayMapValidation()
const DinnerMode = DinnerModeSchema.enum

/**
 * The waiting list through the one booking path: a member saves a mode on a closed, sold-out dinner and lands in the
 * queue; the chef releases portions and the member holds a ticket.
 *
 * SERIAL: activates its own season. A two-day booking deadline closes tomorrow's dinner; no ticket is released, so the
 * dinner is sold out. The admin is the chef of the dinner's team.
 */
test.describe.serial('Waiting list - join through the save, served by the chef\'s release', () => {
    const testSalt = temporaryAndRandom()
    let adminContext: BrowserContext
    let seasonId: number
    let teamId: number
    let dinnerEventId: number
    let dinnerDate: Date
    let inhabitantId: number

    test.beforeAll(async ({browser}) => {
        adminContext = await validatedBrowserContext(browser)
        const member = await getSessionUserInfo(await memberValidatedBrowserContext(browser))
        inhabitantId = member.inhabitantId
        const chefInhabitantId = (await getSessionUserInfo(adminContext)).inhabitantId

        const tomorrow = startOfDay(addDays(new Date(), 1))
        const {season} = await SeasonFactory.createSeasonWithDinnerEvents(adminContext, testSalt, {
            cookingDays: createBooleanWeekdayMap([true, true, true, true, true, true, true]),
            seasonDates: {start: tomorrow, end: addDays(tomorrow, 3)},
            ticketIsCancellableDaysBefore: 2
        })
        seasonId = season.id!
        await SeasonFactory.activateSeason(adminContext, seasonId)

        const team = await SeasonFactory.createCookingTeamForSeason(adminContext, seasonId, salt('Ventelistehold', testSalt))
        teamId = team.id!
        await SeasonFactory.assignMemberToTeam(adminContext, teamId, chefInhabitantId, TeamRoleSchema.enum.CHEF)

        // The dinner of tomorrow, one per day: the generated one gives way to the team's
        const generated = await DinnerEventFactory.getDinnerEventsForSeason(adminContext, seasonId)
        for (const dinner of generated.filter(dinner => isSameDay(new Date(dinner.date), tomorrow))) {
            await DinnerEventFactory.deleteDinnerEvent(adminContext, dinner.id!)
        }
        const dinner = await DinnerEventFactory.createDinnerEvent(adminContext, {
            date: tomorrow, seasonId, cookingTeamId: teamId, chefId: chefInhabitantId, menuTitle: salt('Ventelistemiddag', testSalt)
        })
        dinnerEventId = dinner.id!
        dinnerDate = tomorrow
    })

    test.afterAll(async () => {
        await DinnerEventFactory.deleteDinnerEvent(adminContext, dinnerEventId).catch(() => undefined)
        await SeasonFactory.deleteCookingTeam(adminContext, teamId).catch(() => undefined)
        await SeasonFactory.deleteSeason(adminContext, seasonId).catch(() => undefined)
    })

    test('GIVEN a closed, sold-out dinner WHEN a member saves Spisesal THEN the row shows the ghosted wish at position 1 and the chef\'s card shows the queue', async ({browser}) => {
        const memberPage = await (await browser.newContext({storageState: memberUIFile})).newPage()
        await gotoHydrated(memberPage, `/dinner?date=${formatDate(dinnerDate)}`)

        await memberPage.getByTestId(`inhabitant-${inhabitantId}-toggle`).click()
        await memberPage.getByTestId(`inhabitant-${inhabitantId}-mode-edit-${DinnerMode.DINEIN}`).click()
        await memberPage.getByTestId(`inhabitant-${inhabitantId}-save`).click()

        await expect(memberPage.getByTestId(`waitlist-position-${inhabitantId}`)).toContainText('#1 i køen', {timeout: 15000})

        const chefPage = await (await browser.newContext({storageState: adminUIFile})).newPage()
        await gotoHydrated(chefPage, `/chef?team=${teamId}&date=${formatDate(dinnerDate)}`)
        await expect(chefPage.getByTestId('chef-waitlist-alert')).toBeVisible({timeout: 15000})
    })

    test('GIVEN the member in the queue WHEN the chef releases a portion THEN the member holds a ticket and the queue is empty', async ({browser}) => {
        const chefPage = await (await browser.newContext({storageState: adminUIFile})).newPage()
        await gotoHydrated(chefPage, `/chef?team=${teamId}&date=${formatDate(dinnerDate)}`)

        await chefPage.getByTestId('chef-release-portions-cta').click()
        await chefPage.getByTestId('chef-release-portions-form').locator('input').fill('1')
        await chefPage.getByTestId('chef-release-portions-submit').click()

        const orders = await pollUntil(
            () => OrderFactory.getOrdersForDinnerEventsViaAdmin(adminContext, dinnerEventId),
            found => found.some(order => order.inhabitantId === inhabitantId)
        )
        expect(orders.find(order => order.inhabitantId === inhabitantId)).toMatchObject({dinnerMode: DinnerMode.DINEIN, state: OrderStateSchema.enum.BOOKED})
        await expect(chefPage.getByTestId('chef-waitlist-alert')).toBeHidden({timeout: 15000})

        const memberPage = await (await browser.newContext({storageState: memberUIFile})).newPage()
        await gotoHydrated(memberPage, `/dinner?date=${formatDate(dinnerDate)}`)
        await expect(memberPage.getByTestId(`waitlist-position-${inhabitantId}`)).toBeHidden({timeout: 15000})
    })
})
