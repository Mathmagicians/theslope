import {test, expect, type BrowserContext} from '@playwright/test'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {SenderFactory} from '~~/tests/e2e/testDataFactories/senderFactory'
import {NotificationFactory} from '~~/tests/e2e/testDataFactories/notificationFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import {useCoreValidation, type HouseholdDetail, type InhabitantDetail} from '~/composables/useCoreValidation'
import {useBookingValidation, type DinnerMode} from '~/composables/useBookingValidation'
import {useDeliveryValidation, type Delivery} from '~/composables/useDeliveryValidation'
import type {Season} from '~/composables/useSeasonValidation'
import type {WeekDay} from '~/types/dateTypes'
import {dateToWeekDay} from '~/utils/season'

const {validatedBrowserContext, salt, temporaryAndRandom, getSessionUserInfo, daysFromNow, pollUntil} = testHelpers
const {createDefaultWeekdayMap} = useCoreValidation()
const Mode = useBookingValidation().DinnerModeSchema.enum
const {TICKET_WAITLIST, ORDER, DINNER_EVENT} = useDeliveryValidation().DeliverySubjectSchema.enum
const {Kind, mailKindOf} = NotificationFactory

/**
 * Every booking mail of the waiting list goes once and leaves its Delivery row: a join on its place, a sale to the
 * waiting list, a direct buy and an extra portion on the order, the buildup on the dinner. A mail with no one to hear
 * stays owed, and daily maintenance sends it once the household has a user. Who hears which mail is the composer's unit
 * table (`waitlist.unit.spec.ts`).
 * Serial: it books on its own active season and runs the maintenance job.
 */
test.describe.serial('Waitlist notifications', () => {
    const createdSeasonIds: number[] = []
    const createdHouseholdIds: number[] = []
    const createdUserIds: number[] = []
    let season: Season
    let dinnerId: number
    let weekday: WeekDay
    let waitingHousehold: HouseholdDetail
    let sellingHousehold: HouseholdDetail
    let householdWithoutUser: HouseholdDetail
    // Emil waits first; the three after him fill the line to the buildup threshold (app.config waitlistBuildupThreshold: 3)
    let emil: InhabitantDetail
    let line: InhabitantDetail[]
    // Karl's released ticket goes to the first in line, Karen's to Ida, who buys it while nobody waits
    let karl: InhabitantDetail
    let karen: InhabitantDetail
    let ida: InhabitantDetail
    let otto: InhabitantDetail
    let emilsPlaceId: number
    let karlsOrderId: number
    let karensOrderId: number
    let extraPortionOrderId: number

    // A person of a spec household who eats on no day, with a login when asked: the household's first user hears the
    // mails about the people without one
    const personIn = async (context: BrowserContext, household: HouseholdDetail, lastName: string, withLogin = false) => {
        const person = await HouseholdFactory.createInhabitantWithConfig(context, household.id, {
            lastName, dinnerPreferences: createDefaultWeekdayMap(Mode.NONE), user: withLogin ? UserFactory.defaultUser(temporaryAndRandom()) : undefined
        })
        if (person.userId) createdUserIds.push(person.userId)
        return person
    }
    // The person's preference on the dinner's weekday, written by the admin: the household's run books the person while
    // the dinner is open, queues the person after its deadline, and with Ingen releases the person's ticket
    const eatsOnTheDinner = (context: BrowserContext, person: InhabitantDetail, mode: DinnerMode) => HouseholdFactory.updateInhabitantPreferences(
        context, person.id, {...createDefaultWeekdayMap(Mode.NONE), [weekday]: mode}, 200, season.id, undefined, true
    )
    const orderOf = async (context: BrowserContext, person: InhabitantDetail) =>
        (await OrderFactory.getOrders(context, {dinnerEventIds: dinnerId, householdId: person.householdId})).find(order => order.inhabitantId === person.id)
    const placeOf = async (context: BrowserContext, person: InhabitantDetail) =>
        (await WaitlistFactory.entries(context, [dinnerId])).find(entry => entry.inhabitantId === person.id)
    // The Delivery rows of a subject once its mails have gone, each by the mail kind its reference leads with
    const deliveriesOf = async (context: BrowserContext, subjectType: Delivery['subjectType'], subjectId: number, count: number) =>
        (await pollUntil(() => SenderFactory.getDeliveries(context, subjectType, [subjectId]), rows => rows.length >= count))
            .map(row => ({kind: mailKindOf(row.reference), version: row.version}))
            .sort((a, b) => a.kind.localeCompare(b.kind))

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()
        // The season starts beyond its deadline; the spec's dinner lies 2 days out, inside it, with the admin as its chef
        ;({season} = await SeasonFactory.createActiveSeasonFromTomorrow(context, testSalt, {days: 10, deadline: 4, startInDays: 5}))
        createdSeasonIds.push(season.id!)
        const {inhabitantId: adminInhabitantId} = await getSessionUserInfo(context)
        const {dinner} = await SeasonFactory.createCookingTeamWithChefAndDinner(context, season, adminInhabitantId, {
            teamName: 'Postholdet', dinner: {date: daysFromNow(2), menuTitle: salt('Postmiddag', testSalt)}
        })
        dinnerId = dinner.id!
        weekday = dateToWeekDay(dinner.date)
        waitingHousehold = await HouseholdFactory.createHousehold(context)
        sellingHousehold = await HouseholdFactory.createHousehold(context)
        householdWithoutUser = await HouseholdFactory.createHousehold(context)
        createdHouseholdIds.push(waitingHousehold.id, sellingHousehold.id, householdWithoutUser.id)
        await personIn(context, waitingHousehold, 'Lene', true)
        emil = await personIn(context, waitingHousehold, 'Emil')
        ida = await personIn(context, waitingHousehold, 'Ida')
        line = [await personIn(context, waitingHousehold, 'Et'), await personIn(context, waitingHousehold, 'To'), await personIn(context, waitingHousehold, 'Tre')]
        karl = await personIn(context, sellingHousehold, 'Karl', true)
        karen = await personIn(context, sellingHousehold, 'Karen')
        otto = await personIn(context, householdWithoutUser, 'Otto')
        // The system books Karl and Karen while the dinner is open, as the nightly run does; the season's own deadline then
        // closes it
        await SeasonFactory.updateSeason(context, {...season, ticketIsCancellableDaysBefore: 0})
        for (const seller of [karl, karen]) await eatsOnTheDinner(context, seller, Mode.DINEIN)
        await SeasonFactory.updateSeason(context, season)
        const [karlsOrder, karensOrder] = [await orderOf(context, karl), await orderOf(context, karen)]
        expect([karlsOrder, karensOrder], 'the system books Karl and Karen while the dinner is open').not.toContain(undefined)
        karlsOrderId = karlsOrder!.id!
        karensOrderId = karensOrder!.id!
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        // The households take their people, orders and places; the users outlive their people
        await HouseholdFactory.deleteHousehold(context, createdHouseholdIds)
        await UserFactory.cleanupUsers(context, createdUserIds)
        await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
    })

    test('GIVEN a closed dinner WHEN a preference run queues a person THEN the join mail goes once, recorded on the place', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        await eatsOnTheDinner(context, emil, Mode.DINEIN)

        const place = await placeOf(context, emil)
        expect(place).toBeDefined()
        emilsPlaceId = place!.id
        expect(await deliveriesOf(context, TICKET_WAITLIST, emilsPlaceId, 1)).toEqual([{kind: Kind.WAITLIST_JOINED, version: 1}])
    })

    test('GIVEN that person first in line WHEN Karl releases his ticket THEN the seller\'s and the buyer\'s mails go once each, recorded on the order', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        await eatsOnTheDinner(context, karl, Mode.NONE)

        expect(await deliveriesOf(context, ORDER, karlsOrderId, 2)).toEqual([
            {kind: Kind.TICKET_SOLD, version: 1},
            {kind: Kind.WAITLIST_TICKET_ASSIGNED, version: 1}
        ])
    })

    test('GIVEN nobody in line WHEN Karen releases her ticket and Ida buys it THEN the seller\'s and the buyer\'s mails go once each, recorded on the order', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await eatsOnTheDinner(context, karen, Mode.NONE)

        await eatsOnTheDinner(context, ida, Mode.DINEIN)

        expect(await deliveriesOf(context, ORDER, karensOrderId, 2)).toEqual([
            {kind: Kind.TICKET_BOUGHT, version: 1},
            {kind: Kind.TICKET_SOLD, version: 1}
        ])
    })

    test('GIVEN an empty line WHEN it reaches the buildup threshold THEN the chef\'s mail goes once, recorded on the dinner', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        for (const person of line) await eatsOnTheDinner(context, person, Mode.DINEIN)

        expect(await deliveriesOf(context, DINNER_EVENT, dinnerId, 1)).toEqual([{kind: Kind.WAITLIST_BUILDUP, version: 1}])
    })

    test('GIVEN that line WHEN the chef adds a portion THEN the extra portion\'s mail goes once, recorded on its order', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const added = await WaitlistFactory.addExtraPortions(context, dinnerId, 1)

        const [portion] = added!.assigned
        expect(portion).toBeDefined()
        extraPortionOrderId = portion!.orderId
        expect(await deliveriesOf(context, ORDER, extraPortionOrderId, 1)).toEqual([{kind: Kind.WAITLIST_EXTRA_PORTION, version: 1}])
    })

    test('GIVEN a place in a household without a user WHEN the household gets a user and daily maintenance runs THEN the owed join mail goes once, and the mails already sent go no more', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await eatsOnTheDinner(context, otto, Mode.DINEIN)
        const place = await placeOf(context, otto)
        expect(place).toBeDefined()
        expect(await SenderFactory.getDeliveries(context, TICKET_WAITLIST, [place!.id])).toEqual([])
        await personIn(context, householdWithoutUser, 'Mor', true)

        const maintenance = await SeasonFactory.runDailyMaintenance(context)

        expect(maintenance.resendNotifications.dinners.map(dinner => dinner.dinnerEventId)).toContain(dinnerId)
        expect(await deliveriesOf(context, TICKET_WAITLIST, place!.id, 1)).toEqual([{kind: Kind.WAITLIST_JOINED, version: 1}])
        expect(await deliveriesOf(context, TICKET_WAITLIST, emilsPlaceId, 1)).toEqual([{kind: Kind.WAITLIST_JOINED, version: 1}])
        expect(await deliveriesOf(context, ORDER, karlsOrderId, 2)).toEqual([{kind: Kind.TICKET_SOLD, version: 1}, {kind: Kind.WAITLIST_TICKET_ASSIGNED, version: 1}])
        expect(await deliveriesOf(context, ORDER, karensOrderId, 2)).toEqual([{kind: Kind.TICKET_BOUGHT, version: 1}, {kind: Kind.TICKET_SOLD, version: 1}])
        expect(await deliveriesOf(context, ORDER, extraPortionOrderId, 1)).toEqual([{kind: Kind.WAITLIST_EXTRA_PORTION, version: 1}])
    })
})
