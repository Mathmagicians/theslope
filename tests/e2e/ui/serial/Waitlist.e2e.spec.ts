import {test, expect, type BrowserContext} from '@playwright/test'
import {addDays, startOfDay} from 'date-fns'
import {authFiles} from '~~/tests/e2e/config'
import testHelpers from '~~/tests/e2e/testHelpers'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {ticketTypeLabel, ticketTypeCount} from '~/composables/useTicket'
import {formatDate} from '~/utils/date'
import {WAITLIST_TEST_IDS} from '~~/tests/component/components/dinner/waitlistTestIds'

const {memberUIFile, adminUIFile} = authFiles
const {validatedBrowserContext, memberValidatedBrowserContext, getSessionUserInfo, gotoHydrated, pollUntil, salt, temporaryAndRandom, waitForApi} = testHelpers
const {DinnerModeSchema, OrderStateSchema, TicketTypeSchema} = useBookingValidation()
const {createDefaultWeekdayMap: createBooleanWeekdayMap} = useWeekDayMapValidation()
const DinnerMode = DinnerModeSchema.enum

/**
 * The waiting list through the one booking path: a member saves a mode on a closed, sold-out dinner and lands in the
 * queue, the dinner calendar marks the dinner's day with the hourglass and the booking form's bar names the queue by ticket type; the
 * chef releases portions and the member holds a ticket.
 *
 * SERIAL: activates its own season. A two-day booking deadline closes tomorrow's dinner; no ticket is released, so the
 * dinner is sold out. The admin is the chef of the dinner's team.
 */
test.describe.serial('Waiting list - join through the save, served by the chef\'s release', () => {
    const testSalt = temporaryAndRandom()
    let adminContext: BrowserContext
    const createdSeasonIds: number[] = []
    const createdTeamIds: number[] = []
    const createdDinnerIds: number[] = []
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
        createdSeasonIds.push(seasonId)
        await SeasonFactory.activateSeason(adminContext, seasonId)

        // The dinner of tomorrow, one per day: the generated one gives way to the team's
        const {team, dinner} = await SeasonFactory.createCookingTeamWithChefAndDinner(adminContext, season, chefInhabitantId, {
            teamName: salt('Ventelistehold', testSalt), dinner: {menuTitle: salt('Ventelistemiddag', testSalt)}, day: tomorrow
        })
        teamId = team.id!
        createdTeamIds.push(teamId)
        dinnerEventId = dinner.id!
        createdDinnerIds.push(dinnerEventId)
        dinnerDate = tomorrow
    })

    // Cleanup accepts a dinner, team or season already gone
    test.afterAll(async () => {
        for (const id of createdDinnerIds) await DinnerEventFactory.deleteDinnerEvent(adminContext, id)
        for (const id of createdTeamIds) await SeasonFactory.deleteCookingTeam(adminContext, id)
        await SeasonFactory.cleanupSeasons(adminContext, createdSeasonIds)
    })

    test('GIVEN a closed, sold-out dinner WHEN a member saves Spisesal THEN the row shows the ghosted wish at position 1 and the chef\'s card shows the queue', async ({browser}) => {
        const memberPage = await (await browser.newContext({storageState: memberUIFile})).newPage()
        await gotoHydrated(memberPage, `/dinner?date=${formatDate(dinnerDate)}`)

        await memberPage.getByTestId(`inhabitant-${inhabitantId}-toggle`).click()
        await memberPage.getByTestId(`inhabitant-${inhabitantId}-mode-edit-${DinnerMode.DINEIN}`).click()
        const saved = waitForApi(memberPage, '/api/household/order/scaffold', 'POST')
        await memberPage.getByTestId(`inhabitant-${inhabitantId}-save`).click()
        await saved

        await expect(memberPage.getByTestId(WAITLIST_TEST_IDS.position(inhabitantId))).toContainText(`${ticketTypeLabel(TicketTypeSchema.enum.ADULT)} #1`)

        const chefPage = await (await browser.newContext({storageState: adminUIFile})).newPage()
        await gotoHydrated(chefPage, `/chef?team=${teamId}&date=${formatDate(dinnerDate)}`)
        await expect(chefPage.getByTestId('chef-waitlist-alert')).toBeVisible()
    })

    test('GIVEN a locked dinner with no tickets for sale and one entry on its waiting list WHEN a member opens /dinner THEN the dinner\'s calendar day chip carries the hourglass and the booking form\'s info bar reads the waiting list with the entry\'s ticket type', async ({browser}) => {
        const entries = await WaitlistFactory.entries(adminContext, [dinnerEventId])
        expect(entries).toHaveLength(1)
        const {ticketPrices} = await SeasonFactory.getSeason(adminContext, seasonId)
        const ticketType = ticketPrices.find(price => price.id === entries[0]!.order.ticketPriceId)!.ticketType

        const memberPage = await (await browser.newContext({storageState: memberUIFile})).newPage()
        await memberPage.goto(`/dinner?date=${formatDate(dinnerDate)}`)

        // UChip hands its test id to the day circle; the chip's indicator sits beside the circle and holds the hourglass
        const dayChip = memberPage.getByTestId(`calendar-dinner-date-${dinnerDate.getDate()}`).locator('xpath=..').locator('[data-slot="base"]')
        await pollUntil(() => dayChip.getByTestId(WAITLIST_TEST_IDS.calendarHourglass(dinnerDate.getDate())).isVisible(), visible => visible)
        await expect(dayChip).toHaveText('')

        await pollUntil(() => memberPage.getByTestId(WAITLIST_TEST_IDS.moreTickets).textContent(),
            text => !!text?.includes(`Lukket for framelding: ${ticketTypeCount(ticketType, 1)} på ventelisten`))
    })

    test('GIVEN the member in the queue WHEN the chef releases a portion THEN the member holds a ticket and the queue is empty', async ({browser}) => {
        const chefPage = await (await browser.newContext({storageState: adminUIFile})).newPage()
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

        const memberPage = await (await browser.newContext({storageState: memberUIFile})).newPage()
        await gotoHydrated(memberPage, `/dinner?date=${formatDate(dinnerDate)}`)
        await expect(memberPage.getByTestId(WAITLIST_TEST_IDS.position(inhabitantId))).toBeHidden()
    })
})
