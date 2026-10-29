import {expect, type BrowserContext} from '@playwright/test'
import {defineParameterType} from 'playwright-bdd'
import {differenceInCalendarDays} from 'date-fns'
import {
    Given, When, Then, fromScene, contextOfActor, personOf, createSceneHousehold, createScenePerson,
    ticketPriceIdOf, createDinnerInThePastMonth, ACTOR, HOUSEHOLD, type Actor, type HouseholdKind, type Scene
} from '~~/tests/e2e/fixtures'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {ExpenseFactory} from '~~/tests/e2e/testDataFactories/expenseFactory'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import {DinnerStepState} from '~/composables/useBooking'
import {useBookingValidation, type DinnerEventDisplay, type DinnerMode, type DinnerState, type OrderState} from '~/composables/useBookingValidation'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import {useCoreValidation, type HouseholdDetail, type InhabitantDetail} from '~/composables/useCoreValidation'
import {WEEKDAYS} from '~/types/dateTypes'

const {temporaryAndRandom, getSessionUserInfo, daysFromNow, MENU_DEADLINE_DAYS} = testHelpers
const {DinnerModeSchema, DinnerStateSchema, OrderStateSchema, TicketTypeSchema} = useBookingValidation()
const {createDefaultWeekdayMap} = useCoreValidation()
const {TeamRoleSchema} = useCookingTeamValidation()
const Mode = DinnerModeSchema.enum

type DeadlineSide = typeof SeasonFactory.DEADLINE_SIDES[number]
type DinnerStepName = keyof typeof DinnerStepState

defineParameterType({name: 'deadline', regexp: [...SeasonFactory.DEADLINE_SIDES]})
// The numeric enum maps its values back to its names: the names alone are the words
defineParameterType({
    name: 'dinnerStep',
    regexp: Object.keys(DinnerStepState).filter(step => Number.isNaN(Number(step))),
    transformer: (step: string) => DinnerStepState[step as DinnerStepName]
})
defineParameterType({name: 'mode', regexp: [...DinnerModeSchema.options]})
defineParameterType({name: 'dinnerState', regexp: [...DinnerStateSchema.options]})
defineParameterType({name: 'orderState', regexp: [...OrderStateSchema.options]})

/** The days before the dinner's start a step's deadline falls: the menu's, the booking's, the dinner's own for the groceries */
const deadlineDaysOf = (step: DinnerStepState): number => {
    switch (step) {
        case DinnerStepState.ANNOUNCED:
            return MENU_DEADLINE_DAYS
        case DinnerStepState.BOOKING_CLOSED:
            return SeasonFactory.DEFAULT_BOOKING_DEADLINE_DAYS
        case DinnerStepState.GROCERIES_DONE:
            return 0
        case DinnerStepState.SCHEDULED:
        case DinnerStepState.CONSUMED:
            throw new Error(`The dinner step ${DinnerStepState[step]} has no deadline`)
    }
}

/** A person's last name: the actor's part */
const partOf = (actor: Actor): string => actor.replace(/^the /, '')

/** The household of a part, created on first use: the waiting household's first user hears about its people without a login */
const householdOf = async (admin: BrowserContext, scene: Scene, kind: HouseholdKind): Promise<HouseholdDetail> => {
    const known = scene.households[kind]
    if (known) return known
    const household = await createSceneHousehold(admin, scene)
    if (kind === HOUSEHOLD.WAITING) await createScenePerson(admin, scene, household.id, 'first user', true)
    scene.households[kind] = household
    return household
}

/**
 * The person's preference on the scenario dinner's weekday, written by the admin's override on the season's deadlines:
 * the household's run books the person while the dinner is open, queues the person past its deadline, and with NONE
 * releases the ticket or leaves the place
 */
const wish = (admin: BrowserContext, scene: Scene, person: InhabitantDetail, mode: DinnerMode) => {
    const {season, event} = fromScene(scene, 'dinner')
    return HouseholdFactory.updatePreferenceOnDinnerDay(admin, person.id, season.id!, event.date, mode)
}

/** The person's place on the scenario dinner's waiting list, kept in the scene: a sale removes the place, its delivery records stay */
const placeOf = async (admin: BrowserContext, scene: Scene, person: InhabitantDetail): Promise<number | undefined> => {
    const place = await WaitlistFactory.entryOf(admin, fromScene(scene, 'dinner').event.id, person.id)
    if (place) scene.places.push(place.id)
    return place?.id
}

/**
 * Books the people while the dinner is open, as the DAILY_MAINTENANCE job does: the season's deadline lifts for the preference
 * writes and returns after them (a deadline change re-scaffolds no household)
 */
const bookWhileOpen = async (admin: BrowserContext, scene: Scene, people: InhabitantDetail[], mode: DinnerMode = Mode.DINEIN): Promise<void> => {
    const {season, event} = fromScene(scene, 'dinner')
    await SeasonFactory.updateSeason(admin, {...season, ticketIsCancellableDaysBefore: 0})
    try {
        for (const person of people) await wish(admin, scene, person, mode)
    } finally {
        await SeasonFactory.updateSeason(admin, season)
    }
    for (const person of people) {
        expect(await OrderFactory.getOrderOf(admin, event.id, person), `the system books inhabitant ${person.id} while the dinner is open`).toBeDefined()
    }
}

/** The chef endpoints admit the team's chefs alone (requireChefForDinner, no admin bypass): the admin joins them to act for the chef */
const joinChefPool = async (admin: BrowserContext, {cookingTeamId}: DinnerEventDisplay): Promise<void> => {
    if (!cookingTeamId) throw new Error('The scenario dinner has no cooking team')
    const {inhabitantId} = await getSessionUserInfo(admin)
    const team = await SeasonFactory.getCookingTeamById(admin, cookingTeamId)
    const isChef = (team?.assignments ?? []).some(assignment => assignment.inhabitantId === inhabitantId && assignment.role === TeamRoleSchema.enum.CHEF)
    if (!isChef) await SeasonFactory.assignMemberToTeam(admin, cookingTeamId, inhabitantId, TeamRoleSchema.enum.CHEF)
}

Given('a dinner {deadline} its {dinnerStep} deadline', async ({adminContext: admin, scene}, side: DeadlineSide, step: DinnerStepState) => {
    const day = SeasonFactory.dinnerDayBy(deadlineDaysOf(step), side)
    const isActive = fromScene(scene, 'ownSeasonIsActive')
    // A season of the dinner's day alone with every day a cooking day: the DAILY_MAINTENANCE job's clip to the cooking days keeps
    // the scenario people's preference on the dinner's weekday
    const createSeason = isActive ? SeasonFactory.createActiveSeasonFromTomorrow : SeasonFactory.createSeasonFromTomorrow
    const {season} = await createSeason(admin, temporaryAndRandom(), {
        days: 0, deadline: SeasonFactory.DEFAULT_BOOKING_DEADLINE_DAYS, cookingDays: 'all', startInDays: differenceInCalendarDays(day, new Date())
    })
    scene.created.seasonIds.push(season.id!)
    if (isActive) scene.activeSeason = season
    // The chef has a household and a login of its own: the chef's mails go to the chef's user
    const chefsHousehold = await createSceneHousehold(admin, scene)
    const chef = await createScenePerson(admin, scene, chefsHousehold.id, partOf(ACTOR.CHEF), true)
    const {dinner} = await SeasonFactory.createCookingTeamWithChefAndDinner(admin, season, chef.id, {day})
    scene.dinner = {season, event: dinner}
    scene.people[ACTOR.CHEF] = chef
})

Given('a dinner in the past month', async ({adminContext: admin, scene}) => {
    await createDinnerInThePastMonth(admin, scene)
})

/**
 * The actor's ticket on the scenario dinner: a consumed dinner takes the admin's correction, guest tickets included, in
 * a household moved in before the dinner; an open or closed dinner books the ticket by the preference while the dinner
 * is open, in the selling household with a login, since the sale mails the seller
 */
const hasTicket = async (admin: BrowserContext, scene: Scene, actor: Actor, dinnerMode: DinnerMode, guestTickets: number): Promise<void> => {
    const {season, event} = fromScene(scene, 'dinner')
    if (event.state === DinnerStateSchema.enum.CONSUMED) {
        const household = await createSceneHousehold(admin, scene, {movedInDate: daysFromNow(-60)})
        const person = await createScenePerson(admin, scene, household.id, partOf(actor))
        const ticketPriceId = await ticketPriceIdOf(admin, season.id!, actor)
        await OrderFactory.bookTickets(admin, {householdId: household.id, dinnerEventId: event.id, inhabitantId: person.id, ticketPriceId, dinnerMode, guestTickets})
        scene.people[actor] = person
        return
    }
    if (guestTickets > 0) throw new Error('A preference books no guest ticket: the scenario dinner is consumed for guest tickets')
    const person = await createScenePerson(admin, scene, (await householdOf(admin, scene, HOUSEHOLD.SELLING)).id, partOf(actor), true)
    await bookWhileOpen(admin, scene, [person], dinnerMode)
    scene.people[actor] = person
}

Given('{actor} has a ticket', async ({adminContext: admin, scene}, actor: Actor) => {
    await hasTicket(admin, scene, actor, Mode.DINEIN, 0)
})

Given('{actor} has a ticket with the dinner mode {mode} and {int} guest ticket(s)', async ({adminContext: admin, scene}, actor: Actor, mode: DinnerMode, guestTickets: number) => {
    await hasTicket(admin, scene, actor, mode, guestTickets)
})

Given('an inhabitant without a ticket', async ({adminContext: admin, scene}) => {
    const {id} = await householdOf(admin, scene, HOUSEHOLD.WAITING)
    scene.people[ACTOR.INHABITANT] = await createScenePerson(admin, scene, id, partOf(ACTOR.INHABITANT))
})

Given('{int} inhabitant(s) is/are on the waiting list', async ({adminContext: admin, scene}, count: number) => {
    const {id} = await householdOf(admin, scene, HOUSEHOLD.WAITING)
    for (let place = 1; place <= count; place++) {
        const person = await createScenePerson(admin, scene, id, `waiting ${place}`)
        await wish(admin, scene, person, Mode.DINEIN)
        expect(await placeOf(admin, scene, person), `inhabitant ${person.id} waits on the dinner`).toBeDefined()
        scene.waiting.push(person)
    }
    const [first] = scene.waiting
    if (first) scene.people[ACTOR.FIRST_IN_LINE] = first
})

Given('{int} ticket(s) is/are for sale', async ({adminContext: admin, scene}, count: number) => {
    if (count === 0) return
    // The seller's ticket goes first; each further ticket is another seller's, booked while the dinner is open
    const {id} = await householdOf(admin, scene, HOUSEHOLD.SELLING)
    const sellers: InhabitantDetail[] = []
    for (let seller = 2; seller <= count; seller++) sellers.push(await createScenePerson(admin, scene, id, `seller ${seller}`))
    if (sellers.length > 0) await bookWhileOpen(admin, scene, sellers)
    for (const seller of [personOf(scene, ACTOR.SELLER), ...sellers]) await wish(admin, scene, seller, Mode.NONE)
})

Given('an inhabitant of a household without a user is on the waiting list', async ({adminContext: admin, scene}) => {
    const {id} = await householdOf(admin, scene, HOUSEHOLD.WITHOUT_USER)
    const person = await createScenePerson(admin, scene, id, partOf(ACTOR.INHABITANT))
    await wish(admin, scene, person, Mode.DINEIN)
    expect(await placeOf(admin, scene, person), `inhabitant ${person.id} waits on the dinner`).toBeDefined()
    scene.people[ACTOR.INHABITANT] = person
})

/**
 * Books the scenario dinner for the actor: the user's inhabitant by the user's own booking write, any other inhabitant
 * by the admin's override on the preference. Past the deadline the booking buys a ticket for sale or takes a place
 */
const bookTheDinnerFor = async (admin: BrowserContext, scene: Scene, actor: Actor): Promise<void> => {
    switch (actor) {
        case ACTOR.USERS_INHABITANT: {
            const member = contextOfActor(scene, ACTOR.USER)
            const {householdId, inhabitantId} = await getSessionUserInfo(member)
            const {season, event} = fromScene(scene, 'dinner')
            const order = OrderFactory.createBookingOrder(inhabitantId, event.id, await ticketPriceIdOf(admin, season.id!, actor))
            await WaitlistFactory.queue(member, householdId, season.id!, order)
            const person = await HouseholdFactory.getInhabitantById(admin, inhabitantId)
            if (!person) throw new Error(`The user's inhabitant ${inhabitantId} is gone`)
            scene.people[actor] = person
            await placeOf(admin, scene, person)
            return
        }
        default: {
            const person = personOf(scene, actor)
            await wish(admin, scene, person, Mode.DINEIN)
            await placeOf(admin, scene, person)
        }
    }
}

When('the dinner is booked', async ({adminContext: admin, scene}) => {
    await bookTheDinnerFor(admin, scene, ACTOR.INHABITANT)
})

When('the dinner is booked for {actor}', async ({adminContext: admin, scene}, actor: Actor) => {
    await bookTheDinnerFor(admin, scene, actor)
})

When('the ticket is released', async ({adminContext: admin, scene}) => {
    await wish(admin, scene, personOf(scene, ACTOR.SELLER), Mode.NONE)
})

When('the portion is added', async ({adminContext: admin, scene}) => {
    const {event} = fromScene(scene, 'dinner')
    await joinChefPool(admin, event)
    const added = await WaitlistFactory.addExtraPortions(admin, event.id, 1)
    expect(added?.assigned, 'the extra portion goes to the first in line').toHaveLength(1)
})

Given('the dinner is in the state {dinnerState}', async ({adminContext: admin, scene}, state: DinnerState) => {
    const dinner = fromScene(scene, 'dinner')
    if (dinner.event.state === state) return
    await joinChefPool(admin, dinner.event)
    const updated = await DinnerEventFactory.updateDinnerEvent(admin, dinner.event.id, {state})
    expect(updated?.state, `the dinner moves to ${state}`).toBe(state)
    scene.dinner = {...dinner, event: {...dinner.event, state}}
})

Given('the dinner has {int} expense(s)', async ({adminContext: admin, scene}, count: number) => {
    const {event} = fromScene(scene, 'dinner')
    const expense = ExpenseFactory.defaultExpenseCreate()
    // The chef endpoints read and write the expenses; the admin joins the chefs only to add one
    if (count > 0) await joinChefPool(admin, event)
    for (let added = 0; added < count; added++) await ExpenseFactory.add(admin, event.id, expense)
    const dinner = await DinnerEventFactory.getDinnerEvent(admin, event.id)
    expect(dinner?.totalCost, 'the dinner\'s cost is the sum of its expenses').toBe(count * expense.amount)
})

/** The person of an actor's part, a baby of the user's household created on first use with no preference: the user books for the household's own people */
const householdPersonOf = async (admin: BrowserContext, member: BrowserContext, scene: Scene, actor: Actor): Promise<InhabitantDetail> => {
    const known = scene.people[actor]
    if (known) return known
    switch (actor) {
        case ACTOR.BABY_WHO_TASTES:
        case ACTOR.HUNGRY_BABY: {
            const {householdId} = await getSessionUserInfo(member)
            const person = await HouseholdFactory.createInhabitantWithConfig(admin, householdId, {
                lastName: partOf(actor),
                birthDate: TicketFactory.birthDateForTicketType(TicketTypeSchema.enum.BABY, fromScene(scene, 'dinner').event.date),
                dinnerPreferences: createDefaultWeekdayMap(Mode.NONE)
            })
            scene.created.inhabitantIds.push(person.id)
            scene.people[actor] = person
            return person
        }
        default:
            return personOf(scene, actor)
    }
}

Given('{int} ticket(s) of {actor} is/are BOOKED with the dinner mode {mode}', async ({adminContext: admin, contextOf, scene}, count: number, actor: Actor, mode: DinnerMode) => {
    const person = await householdPersonOf(admin, await contextOf(ACTOR.USER), scene, actor)
    if (count === 0) return
    const {season, event} = fromScene(scene, 'dinner')
    // The admin's correction: the person's own ticket, the further tickets guest tickets booked on the person
    await OrderFactory.bookTickets(admin, {
        householdId: person.householdId, dinnerEventId: event.id, inhabitantId: person.id,
        ticketPriceId: await ticketPriceIdOf(admin, season.id!, actor), dinnerMode: mode, guestTickets: count - 1
    })
})

// The booker's own booking write for a person of the booker's household, naming the person's own order when it has one
When('{actor} picks the dinner mode {mode} for {actor}', async ({adminContext: admin, contextOf, scene}, booker: Actor, mode: DinnerMode, actor: Actor) => {
    const person = personOf(scene, actor)
    const {season, event} = fromScene(scene, 'dinner')
    const own = await OrderFactory.getOrderOf(admin, event.id, person)
    const order = OrderFactory.createBookingOrder(person.id, event.id, await ticketPriceIdOf(admin, season.id!, actor), mode, own?.id)
    await OrderFactory.scaffoldOrders(await contextOf(booker), {householdId: person.householdId, seasonId: season.id!, dinnerEventIds: [event.id], orders: [order]})
})

Then('{int} ticket(s) of {actor} is/are {orderState} with the dinner mode {mode}', async ({adminContext: admin, scene}, count: number, actor: Actor, orderState: OrderState, mode: DinnerMode) => {
    const orders = await OrderFactory.getOrdersOf(admin, fromScene(scene, 'dinner').event.id, personOf(scene, actor))
    expect(orders.map(({state, dinnerMode}) => ({state, dinnerMode})), `${count} ${orderState} ${mode} tickets of ${actor}`)
        .toEqual(Array.from({length: count}, () => ({state: orderState, dinnerMode: mode})))
})

Then('{actor} has {int} place(s) on the waiting list', async ({adminContext: admin, scene}, actor: Actor, count: number) => {
    const {id} = personOf(scene, actor)
    const places = (await WaitlistFactory.entries(admin, [fromScene(scene, 'dinner').event.id])).filter(entry => entry.inhabitantId === id)
    expect(places, `${count} places of ${actor} on the dinner's waiting list`).toHaveLength(count)
})

Then('{int} ticket(s) is/are released', async ({adminContext: admin, scene}, count: number) => {
    const orders = await OrderFactory.getAllOrdersForEvents(admin, fromScene(scene, 'dinner').event.id)
    expect(orders.filter(order => order.state === OrderStateSchema.enum.RELEASED), `${count} released tickets on the dinner`).toHaveLength(count)
})

Then('{int} ticket(s) of {actor} has/have a transaction', async ({adminContext: admin, scene}, count: number, actor: Actor) => {
    const orderIds = new Set((await OrderFactory.getOrdersOf(admin, fromScene(scene, 'dinner').event.id, personOf(scene, actor))).map(order => order.id))
    // The unbilled transactions: the monthly billing has not run on them
    const transactions = (await BillingFactory.getCurrentPeriodTransactions(admin)).filter(transaction => transaction.orderId !== null && orderIds.has(transaction.orderId))
    expect(transactions, `${count} tickets of ${actor} with a transaction`).toHaveLength(count)
})

Given('an inhabitant without dinner preferences', async ({adminContext: admin, scene}) => {
    const household = await createSceneHousehold(admin, scene)
    // The create writes no preferences, as the Heynabo import leaves a new inhabitant
    const person = await HouseholdFactory.createInhabitantWithConfig(admin, household.id, {dinnerPreferences: null})
    expect(person.dinnerPreferences, 'the inhabitant has no dinner preferences').toBeNull()
    scene.people[ACTOR.INHABITANT] = person
})

Then('{actor}\'s dinner preferences are the dinner mode {mode} on the cooking days', async ({adminContext: admin, scene}, actor: Actor, mode: DinnerMode) => {
    const {cookingDays} = await SeasonFactory.getSeason(admin, fromScene(scene, 'activeSeason').id!)
    const person = await HouseholdFactory.getInhabitantById(admin, personOf(scene, actor).id)
    expect(person?.dinnerPreferences, `${actor} has ${mode} on the active season's cooking days, NONE on the others`)
        .toEqual(Object.fromEntries(WEEKDAYS.map(day => [day, cookingDays[day] ? mode : Mode.NONE])))
})
