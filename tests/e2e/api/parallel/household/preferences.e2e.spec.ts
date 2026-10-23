import {test, expect, type Browser, type BrowserContext} from '@playwright/test'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {useBookingValidation, type InhabitantUpdateResponse} from '~/composables/useBookingValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {dateToWeekDay} from '~/utils/season'
import testHelpers from '~~/tests/e2e/testHelpers'
import {differenceInCalendarDays} from 'date-fns'
const Action = useBookingValidation().BookingActionSchema.enum

const {validatedBrowserContext, memberValidatedBrowserContext, getSessionUserInfo, temporaryAndRandom, salt} = testHelpers
const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum
const {createDefaultWeekdayMap} = useWeekDayMapValidation({valueSchema: DinnerModeSchema, defaultValue: DinnerMode.NONE})

// Cleanup tracking
const createdHouseholdIds: number[] = []
const createdInhabitantIds: number[] = []

test.describe('Household Preferences API', () => {
    // The member edits a test inhabitant of their own household, never their own row: other specs book for that household
    let memberHouseholdId: number
    let ownHouseholdInhabitantId: number

    const createOwnHouseholdInhabitant = async (browser: Browser) => {
        const inhabitant = await HouseholdFactory.createInhabitantWithConfig(await validatedBrowserContext(browser), memberHouseholdId, {
            name: salt('Anders', temporaryAndRandom()), lastName: 'Preferences', birthDate: null
        })
        createdInhabitantIds.push(inhabitant.id)
        return inhabitant
    }

    test.beforeAll(async ({browser}) => {
        memberHouseholdId = (await getSessionUserInfo(await memberValidatedBrowserContext(browser))).householdId
        ownHouseholdInhabitantId = (await createOwnHouseholdInhabitant(browser)).id
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        for (const id of createdInhabitantIds) await HouseholdFactory.deleteInhabitant(context, id)
        await HouseholdFactory.deleteHousehold(context, createdHouseholdIds)
    })

    test('GIVEN member WHEN updating the preferences of a person in their household THEN the reply carries the stored preferences', async ({browser}) => {
        const memberContext = await memberValidatedBrowserContext(browser)
        const preferences = createDefaultWeekdayMap(DinnerMode.TAKEAWAY)

        const result = await HouseholdFactory.updateInhabitantPreferences(memberContext, ownHouseholdInhabitantId, preferences)

        expect(result!.inhabitant.id).toBe(ownHouseholdInhabitantId)
        expect(result!.inhabitant.dinnerPreferences).toEqual(preferences)
    })

    // The write needs the draft: a body without one is refused and nothing is written. Each row edits its own person
    const draftlessBodies = [{}, {dinnerPreferences: null}]

    draftlessBodies.forEach((body) => {
        test(`GIVEN member WHEN saving the body ${JSON.stringify(body)} THEN returns 400 and the stored preferences are unchanged`, async ({browser}) => {
            const adminContext = await validatedBrowserContext(browser)
            const {id} = await createOwnHouseholdInhabitant(browser)
            const stored = (await HouseholdFactory.getInhabitantById(adminContext, id))!.dinnerPreferences

            await HouseholdFactory.postInhabitantPreferences(await memberValidatedBrowserContext(browser), id, body, 400)

            expect((await HouseholdFactory.getInhabitantById(adminContext, id))!.dinnerPreferences).toEqual(stored)
        })
    })

    test('GIVEN member WHEN updating different household inhabitant THEN returns 403', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
            adminContext, {name: salt('Other-Household', testSalt)}, 1
        )
        createdHouseholdIds.push(household.id)

        const memberContext = await memberValidatedBrowserContext(browser)
        await HouseholdFactory.updateInhabitantPreferences(
            memberContext, inhabitants[0]!.id, createDefaultWeekdayMap(DinnerMode.DINEIN), 403
        )
    })

    test('GIVEN removed inhabitant WHEN updating preferences THEN returns 404', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
            adminContext, {name: salt('Removed-Inhabitant', temporaryAndRandom())}, 1
        )
        createdHouseholdIds.push(household.id)
        await HouseholdFactory.deleteInhabitant(adminContext, inhabitants[0]!.id, 200)

        const memberContext = await memberValidatedBrowserContext(browser)
        await HouseholdFactory.updateInhabitantPreferences(
            memberContext, inhabitants[0]!.id, createDefaultWeekdayMap(DinnerMode.DINEIN), 404
        )
    })
})

/** The seasons and households a describe's cases create, removed in its afterAll */
type OwnRows = {seasonIds: number[], householdIds: number[]}

const dineIn = createDefaultWeekdayMap(DinnerMode.DINEIN)
const none = createDefaultWeekdayMap(DinnerMode.NONE)

/** A case's own season, open until each dinner; `dinner` is its first dinner from tomorrow on */
const ownSeason = async (adminContext: BrowserContext, created: OwnRows) => {
    const {season, dinnerEvents} = await SeasonFactory.createSeasonWithDinnerEvents(adminContext, temporaryAndRandom(), {ticketIsCancellableDaysBefore: 0})
    created.seasonIds.push(season.id!)
    return {season, dinnerEvents, dinner: dinnerEvents.find(de => differenceInCalendarDays(de.date, new Date()) >= 1)!}
}

/**
 * A person alone in a case's own household, booked on the season's open dinners by a DINEIN preference: a preference
 * write re-scaffolds the whole household, so the run decides the case's person only. The admin writes the preferences
 * with the override, which keeps the season's deadlines. The person stores Ingen first, so the DINEIN save changes every
 * weekday and books each dinner
 */
const personBookedOnOwnHousehold = async (adminContext: BrowserContext, seasonId: number, lastName: string, created: OwnRows) => {
    const household = await HouseholdFactory.createHousehold(adminContext)
    created.householdIds.push(household.id)
    const inhabitant = await HouseholdFactory.createInhabitantWithConfig(adminContext, household.id, {
        name: salt('Anders', temporaryAndRandom()), lastName, birthDate: null, dinnerPreferences: none
    })
    const savePreferences = (preferences: typeof dineIn) =>
        HouseholdFactory.updateInhabitantPreferences(adminContext, inhabitant.id, preferences, 200, seasonId, undefined, true)
    await savePreferences(dineIn)
    return {inhabitant, savePreferences}
}

const removeOwnRows = async (browser: Browser, {seasonIds, householdIds}: OwnRows) => {
    const context = await validatedBrowserContext(browser)
    await HouseholdFactory.deleteHousehold(context, householdIds)
    await SeasonFactory.cleanupSeasons(context, seasonIds)
}

/**
 * A preview answers the reply the save of the draft preferences would give and writes nothing; any member reads any
 * household's (ADR-004). A save runs on the weekdays its draft changes; the nightly run keeps the other weekdays in step
 * (ADR-015). The season is open until each dinner, so a weekday turned Ingen cancels the person's dinners on it
 */
test.describe('Preference preview', () => {
    const created: OwnRows = {seasonIds: [], householdIds: []}

    test.afterAll(({browser}) => removeOwnRows(browser, created))

    test('GIVEN a person booked on every weekday WHEN a member of another household previews one weekday turned Ingen THEN the reply cancels that weekday\'s dinners only and nothing changes, and the save answers the same', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const {season, dinnerEvents, dinner} = await ownSeason(adminContext, created)
        const {inhabitant, savePreferences} = await personBookedOnOwnHousehold(adminContext, season.id!, 'Preview', created)
        const weekday = dateToWeekDay(dinner.date)
        const onWeekday = dinnerEvents.filter(de => dateToWeekDay(de.date) === weekday).map(de => de.id)
        const draft = {...dineIn, [weekday]: DinnerMode.NONE}
        const ordersOf = () => OrderFactory.getOrdersForDinnerEventsViaAdmin(adminContext, dinnerEvents.map(de => de.id))
        const decisionsOf = (reply: InhabitantUpdateResponse | null) => reply!.scaffoldResult.results.map(line => [line.dinnerEventId, line.action]).sort()
        const booked = await ordersOf()

        const preview = await HouseholdFactory.previewInhabitantPreferences(await memberValidatedBrowserContext(browser), inhabitant.id, draft, season.id)

        const named = preview!.scaffoldResult.dinners.map(({id}) => id)
        expect(named).toContain(dinner.id)
        expect(onWeekday).toEqual(expect.arrayContaining(named))
        // The household's one person cancels each dinner the reply names, and nothing else
        expect(decisionsOf(preview)).toEqual(named.map(id => [id, Action.CANCEL]).sort())
        expect(await ordersOf()).toEqual(booked)
        expect((await HouseholdFactory.getInhabitantById(adminContext, inhabitant.id))!.dinnerPreferences).toEqual(dineIn)

        const saved = await savePreferences(draft)

        expect(saved!.scaffoldResult.dinners).toEqual(preview!.scaffoldResult.dinners)
        expect(decisionsOf(saved)).toEqual(decisionsOf(preview))
    })
})

/**
 * Past the deadline a preference decides as a member's booking: it buys a ticket for sale while nobody waits. The
 * season books with its deadline open, then closes it; the seller of another household releases its tickets by
 * preference
 */
test.describe('Preferences on a closed dinner', () => {
    const created: OwnRows = {seasonIds: [], householdIds: []}
    // Every dinner of the week-long season lies within it once the season closes
    const CLOSED_PERIOD = 10

    test.afterAll(({browser}) => removeOwnRows(browser, created))

    test('GIVEN a closed dinner with a ticket for sale and nobody waiting WHEN the preference turns Spisesal THEN the person buys it', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const {season, dinner} = await ownSeason(adminContext, created)
        const buyer = await personBookedOnOwnHousehold(adminContext, season.id!, 'Buyer', created)
        // While the dinners are open the buyer's are cancelled and the seller books each
        await buyer.savePreferences(none)
        const seller = await personBookedOnOwnHousehold(adminContext, season.id!, 'Seller', created)
        await SeasonFactory.updateSeason(adminContext, {...season, ticketIsCancellableDaysBefore: CLOSED_PERIOD})
        await seller.savePreferences(none)

        const saved = await buyer.savePreferences(dineIn)

        expect(saved!.scaffoldResult.results).toContainEqual(expect.objectContaining({inhabitantId: buyer.inhabitant.id, dinnerEventId: dinner.id, action: Action.BUY}))
        const held = (await OrderFactory.getOrdersForDinnerEventsViaAdmin(adminContext, [dinner.id])).filter(order => order.inhabitantId === buyer.inhabitant.id)
        expect(held.map(order => order.state)).toEqual([OrderStateSchema.enum.BOOKED])
    })
})
