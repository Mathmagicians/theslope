import {test, expect, type Browser, type BrowserContext} from '~~/tests/e2e/uiTest'
import {addDays, startOfDay} from 'date-fns'
import {authFiles} from '~~/tests/e2e/config'
import testHelpers from '~~/tests/e2e/testHelpers'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {ticketTypeLabel} from '~/composables/useTicket'
import {formatDate} from '~/utils/date'
import {WAITLIST_TEST_IDS} from '~~/tests/component/components/dinner/waitlistTestIds'

const {memberUIFile, adminUIFile} = authFiles
const {openContext, validatedBrowserContext, memberValidatedBrowserContext, getSessionUserInfo, gotoHydrated, pollUntil, salt, temporaryAndRandom, waitForApi} = testHelpers
const {DinnerModeSchema, OrderStateSchema, TicketTypeSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum
const {createDefaultWeekdayMap: createBooleanWeekdayMap} = useWeekDayMapValidation()
const {createDefaultWeekdayMap: createDinnerModeWeekdayMap} = useWeekDayMapValidation({valueSchema: DinnerModeSchema, defaultValue: DinnerMode.NONE})

/**
 * The waiting list through the one booking path: a member saves a mode on a closed, sold-out dinner and lands in the
 * queue; the chef releases portions and the member holds a ticket.
 *
 * SERIAL: activates its own season. A two-day booking deadline closes tomorrow's dinner; no ticket is released, so the
 * dinner is sold out. The admin is the chef of the dinner's team. The member books for a test person of the member's
 * household who eats nothing by preference, written before the team's dinner exists, so only the save queues the person.
 */
test.describe.serial('Waiting list - join through the save, served by the chef\'s release', () => {
    const testSalt = temporaryAndRandom()
    let adminContext: BrowserContext
    const createdSeasonIds: number[] = []
    const createdInhabitantIds: number[] = []
    let teamId: number
    let dinnerEventId: number
    let dinnerDate: Date
    let inhabitantId: number

    // The member and the chef each on a page of their own session
    const pageAs = async (browser: Browser, storageState: string) => (await openContext(browser, {storageState})).newPage()

    test.beforeAll(async ({browser}) => {
        adminContext = await validatedBrowserContext(browser)
        const {householdId} = await getSessionUserInfo(await memberValidatedBrowserContext(browser))
        const chefInhabitantId = (await getSessionUserInfo(adminContext)).inhabitantId

        const tomorrow = startOfDay(addDays(new Date(), 1))
        const {season} = await SeasonFactory.createSeasonWithDinnerEvents(adminContext, testSalt, {
            cookingDays: createBooleanWeekdayMap([true, true, true, true, true, true, true]),
            seasonDates: {start: tomorrow, end: addDays(tomorrow, 3)},
            ticketIsCancellableDaysBefore: 2
        })
        createdSeasonIds.push(season.id!)
        await SeasonFactory.activateSeason(adminContext, season.id!)

        const inhabitant = await HouseholdFactory.createInhabitantWithConfig(adminContext, householdId, {
            name: salt('Anders', testSalt), lastName: 'Venteliste', dinnerPreferences: createDinnerModeWeekdayMap(DinnerMode.NONE)
        })
        inhabitantId = inhabitant.id
        createdInhabitantIds.push(inhabitantId)

        // The dinner of tomorrow, one per day: the generated one gives way to the team's
        const {team, dinner} = await SeasonFactory.createCookingTeamWithChefAndDinner(adminContext, season, chefInhabitantId, {
            teamName: salt('Ventelistehold', testSalt), dinner: {menuTitle: salt('Ventelistemiddag', testSalt)}, day: tomorrow
        })
        teamId = team.id!
        dinnerEventId = dinner.id!
        dinnerDate = tomorrow
    })

    // The season takes its team and its dinners; cleanup accepts a person or a season already gone
    test.afterAll(async () => {
        await Promise.all(createdInhabitantIds.map(id => HouseholdFactory.deleteInhabitant(adminContext, id)))
        await SeasonFactory.cleanupSeasons(adminContext, createdSeasonIds)
    })

    test('GIVEN a closed, sold-out dinner WHEN a member saves Spisesal THEN the row shows the ghosted wish at position 1 and the chef\'s card shows the queue', async ({browser}) => {
        const memberPage = await pageAs(browser, memberUIFile)
        await gotoHydrated(memberPage, `/dinner?date=${formatDate(dinnerDate)}`)

        await memberPage.getByTestId(`inhabitant-${inhabitantId}-toggle`).click()
        await memberPage.getByTestId(`inhabitant-${inhabitantId}-mode-edit-${DinnerMode.DINEIN}`).click()
        const saved = waitForApi(memberPage, '/api/household/order/scaffold', 'POST')
        await memberPage.getByTestId(`inhabitant-${inhabitantId}-save`).click()
        await saved

        await expect(memberPage.getByTestId(WAITLIST_TEST_IDS.position(inhabitantId))).toContainText(`${ticketTypeLabel(TicketTypeSchema.enum.ADULT)} #1`)

        const chefPage = await pageAs(browser, adminUIFile)
        await gotoHydrated(chefPage, `/chef?team=${teamId}&date=${formatDate(dinnerDate)}`)
        await expect(chefPage.getByTestId('chef-waitlist-alert')).toBeVisible()
    })

    test('GIVEN the member in the queue WHEN the chef releases a portion THEN the member holds a ticket and the queue is empty', async ({browser}) => {
        const chefPage = await pageAs(browser, adminUIFile)
        await gotoHydrated(chefPage, `/chef?team=${teamId}&date=${formatDate(dinnerDate)}`)

        await chefPage.getByTestId('chef-extra-portions-cta').click()
        await chefPage.getByTestId('chef-extra-portions-form').locator('input').fill('1')
        const released = waitForApi(chefPage, `/api/chef/dinner/${dinnerEventId}/extra-portions`, 'POST')
        await chefPage.getByTestId('chef-extra-portions-submit').click()

        const orders = await pollUntil(
            () => OrderFactory.getOrdersForDinnerEventsViaAdmin(adminContext, dinnerEventId),
            found => found.some(order => order.inhabitantId === inhabitantId)
        )
        expect(orders.find(order => order.inhabitantId === inhabitantId)).toMatchObject({dinnerMode: DinnerMode.DINEIN, state: OrderStateSchema.enum.BOOKED})
        await released
        await expect(chefPage.getByTestId('chef-waitlist-alert')).toBeHidden()

        const memberPage = await pageAs(browser, memberUIFile)
        await gotoHydrated(memberPage, `/dinner?date=${formatDate(dinnerDate)}`)
        await expect(memberPage.getByTestId(WAITLIST_TEST_IDS.position(inhabitantId))).toBeHidden()
    })
})
