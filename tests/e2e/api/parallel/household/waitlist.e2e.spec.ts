import {test, expect} from '@playwright/test'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import {useTicketPriceValidation} from '~/composables/useTicketPriceValidation'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {InhabitantDisplay} from '~/composables/useCoreValidation'

const {validatedBrowserContext, memberValidatedBrowserContext, salt, temporaryAndRandom, getSessionUserInfo} = testHelpers
const {TicketTypeSchema} = useTicketPriceValidation()
const TicketType = TicketTypeSchema.enum
const {TeamRoleSchema} = useCookingTeamValidation()

/**
 * The waiting list of a dinner: a household joins, reads its positions, leaves; one regular entry per inhabitant.
 * The chef reads the queue size and portion need; a member who is not the chef does not.
 */
test.describe('Waiting list API', () => {
    let seasonId: number
    let teamId: number
    let dinnerEventId: number
    let householdId: number
    let inhabitants: InhabitantDisplay[]
    let adultPrice: TicketPrice
    let childPrice: TicketPrice
    const entryIds: number[] = []
    // The admin acts for the test household, which is not its own
    const join = (context: Parameters<typeof WaitlistFactory.join>[0], request: Parameters<typeof WaitlistFactory.join>[1], expectedStatus = 201) =>
        WaitlistFactory.join(context, request, expectedStatus, true)
    const householdEntries = (context: Parameters<typeof WaitlistFactory.entriesForHousehold>[0]) =>
        WaitlistFactory.entriesForHousehold(context, householdId, [dinnerEventId], true)

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()
        const season = await SeasonFactory.createSeason(context)
        seasonId = season.id!
        adultPrice = season.ticketPrices.find(price => price.ticketType === TicketType.ADULT)!
        childPrice = season.ticketPrices.find(price => price.ticketType === TicketType.CHILD)!
        // The chef guard wants a cooking team on the dinner with the user as its chef
        const {inhabitantId: adminInhabitantId} = await getSessionUserInfo(context)
        const team = await SeasonFactory.createCookingTeamForSeason(context, seasonId, salt('Ventelistehold', testSalt))
        teamId = team.id!
        await SeasonFactory.assignMemberToTeam(context, teamId, adminInhabitantId, TeamRoleSchema.enum.CHEF)
        const generated = await SeasonFactory.generateDinnerEventsForSeason(context, seasonId)
        const dinner = await DinnerEventFactory.createDinnerEvent(context, {
            date: new Date(generated.events[0]!.date), menuTitle: salt('Ventelistemiddag', testSalt), seasonId, cookingTeamId: teamId, chefId: adminInhabitantId
        })
        dinnerEventId = dinner.id!
        const created = await HouseholdFactory.createHouseholdWithInhabitants(context, {address: salt('Ventelistevej 1', testSalt)}, 2)
        householdId = created.household.id
        inhabitants = created.inhabitants
    })

    test.afterEach(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await WaitlistFactory.cleanupEntries(context, entryIds.splice(0))
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await HouseholdFactory.deleteHousehold(context, householdId).catch(() => undefined)
        await SeasonFactory.deleteCookingTeam(context, teamId).catch(() => undefined)
        await SeasonFactory.deleteSeason(context, seasonId).catch(() => undefined)
    })

    test('GIVEN a sold-out dinner WHEN an inhabitant joins THEN the entry holds the order at the frozen price and is first in line', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const joined = await join(context, WaitlistFactory.defaultJoinRequest({
            householdId, dinnerEventId, inhabitantId: inhabitants[0]!.id!, ticketPriceId: adultPrice.id!
        }))
        entryIds.push(joined!.id)

        expect(joined!.position).toBe(1)
        expect(joined!.isGuestTicket).toBe(false)
        expect(joined!.order.priceAtBooking).toBe(adultPrice.price)
        expect(joined!.order.householdId).toBe(householdId)
        expect(joined!.notification.dedupeKey).toContain('WAITLIST_JOINED')
    })

    test('GIVEN an inhabitant in the queue WHEN the same inhabitant joins again THEN 409 and the queue holds one entry', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const request = WaitlistFactory.defaultJoinRequest({householdId, dinnerEventId, inhabitantId: inhabitants[0]!.id!, ticketPriceId: adultPrice.id!})
        const first = await join(context, request)
        entryIds.push(first!.id)

        await join(context, request, 409)

        const entries = await householdEntries(context)
        expect(entries.map(entry => entry.id)).toEqual([first!.id])
    })

    test('GIVEN an inhabitant in the queue WHEN a guest ticket is added for the same inhabitant THEN both entries queue in join order', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const regular = await join(context, WaitlistFactory.defaultJoinRequest({
            householdId, dinnerEventId, inhabitantId: inhabitants[0]!.id!, ticketPriceId: adultPrice.id!
        }))
        const guest = await join(context, WaitlistFactory.defaultJoinRequest({
            householdId, dinnerEventId, inhabitantId: inhabitants[0]!.id!, ticketPriceId: childPrice.id!, isGuestTicket: true
        }))
        entryIds.push(regular!.id, guest!.id)

        expect(guest!.position).toBe(2)
        const entries = await householdEntries(context)
        expect(entries.map(entry => [entry.id, entry.position, entry.isGuestTicket])).toEqual([[regular!.id, 1, false], [guest!.id, 2, true]])
    })

    test('GIVEN two inhabitants in the queue WHEN the first leaves THEN the second is first in line', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const first = await join(context, WaitlistFactory.defaultJoinRequest({householdId, dinnerEventId, inhabitantId: inhabitants[0]!.id!, ticketPriceId: adultPrice.id!}))
        const second = await join(context, WaitlistFactory.defaultJoinRequest({householdId, dinnerEventId, inhabitantId: inhabitants[1]!.id!, ticketPriceId: adultPrice.id!}))
        entryIds.push(second!.id)

        const left = await WaitlistFactory.leave(context, first!.id, 200, true)
        expect(left!.id).toBe(first!.id)

        const entries = await householdEntries(context)
        expect(entries.map(entry => [entry.id, entry.position])).toEqual([[second!.id, 1]])
    })

    test('GIVEN a queue WHEN the chef reads it THEN the summary counts entries and portions', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const first = await join(context, WaitlistFactory.defaultJoinRequest({householdId, dinnerEventId, inhabitantId: inhabitants[0]!.id!, ticketPriceId: adultPrice.id!}))
        const second = await join(context, WaitlistFactory.defaultJoinRequest({householdId, dinnerEventId, inhabitantId: inhabitants[1]!.id!, ticketPriceId: childPrice.id!}))
        entryIds.push(first!.id, second!.id)

        const summary = await WaitlistFactory.chefSummary(context, dinnerEventId)
        expect(summary!.entries).toBe(2)
        expect(summary!.portions).toBe(1.5)
    })

    test('GIVEN a member who is not the chef WHEN reading the chef queue THEN 403', async ({browser}) => {
        const memberContext = await memberValidatedBrowserContext(browser)
        await WaitlistFactory.chefSummary(memberContext, dinnerEventId, 403)
    })

    test('GIVEN an inhabitant of another household WHEN joining on its behalf THEN 400', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const {householdId: otherHouseholdId} = await testHelpers.getSessionUserInfo(context)
        await join(context, WaitlistFactory.defaultJoinRequest({
            householdId: otherHouseholdId, dinnerEventId, inhabitantId: inhabitants[0]!.id!, ticketPriceId: adultPrice.id!
        }), 400)
    })
})
