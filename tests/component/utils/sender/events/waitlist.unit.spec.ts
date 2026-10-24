import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createError} from 'h3'
import {bookingMails, notifyBookingOutcomes, notifyExtraPortions, type BookingMails} from '~~/server/utils/sender/events/waitlist'
import * as peopleReads from '~~/server/data/prismaRepository'
import * as dinnerReads from '~~/server/data/financesRepository'
import {fetchHouseholdsByIds, fetchInhabitantsByIds, fetchSeason, fetchUsersByIds} from '~~/server/data/prismaRepository'
import {fetchDeliveries, fetchDinnerEventsByIds, fetchOrderHistoryForDinner, recordDelivery} from '~~/server/data/financesRepository'
import type {EmailChannel} from '~~/server/utils/sender/config'
import type {EmailMessage, SenderEmitResult} from '~/composables/useNotificationValidation'
import type {HouseholdDetail, InhabitantDisplay, UserDisplay} from '~/composables/useCoreValidation'
import {useBookingValidation, type BookingOutcomes, type OrderHistoryDisplay, type TicketSale, type WaitlistJoined} from '~/composables/useBookingValidation'
import {useDeliveryValidation, type Delivery} from '~/composables/useDeliveryValidation'
import {useUserPreferenceValidation, type NotificationChannel} from '~/composables/useUserPreferenceValidation'
import {formatPlace} from '~/composables/useBooking'
import {useOrder} from '~/composables/useOrder'
import {BOOKING_WORDS} from '~/config/bookingWords'
import {NotificationFactory} from '~~/tests/e2e/testDataFactories/notificationFactory'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {fakeSenderQueue as fakeQueue, sentBatches, sentMessages as sentBodies, type FakeSenderQueue} from '~~/tests/component/utils/sender/fakeSenderQueue'

// The unit runtime has no D1: the lookups answer from the test
vi.mock('~~/server/data/prismaRepository', () => ({
    fetchHouseholdsByIds: vi.fn(), fetchInhabitantsByIds: vi.fn(), fetchSeason: vi.fn(), fetchUsersByIds: vi.fn()
}))
vi.mock('~~/server/data/financesRepository', () => ({
    createOrders: vi.fn(), findReleasedOrderId: vi.fn(), claimReleasedOrder: vi.fn(), fetchDinnerEventsByIds: vi.fn(),
    fetchDeliveries: vi.fn(), recordDelivery: vi.fn(), fetchOrderHistoryForDinner: vi.fn()
}))
// The events read the config and log through createError from the Nitro auto-import scope
vi.stubGlobal('useAppConfig', () => ({theslope: {waitlistBuildupThreshold: 3}}))
vi.stubGlobal('createError', createError)

const {Kind, mailKindOf} = NotificationFactory
const {DeliverySubjectSchema, DeliveryKindSchema} = useDeliveryValidation()

// The Delivery rows and the order history D1 holds for the run: the delivery read answers from the rows and a recorded
// delivery adds one; the history read answers from the history the case writes
const store: {deliveries: Delivery[], history: OrderHistoryDisplay[]} = {deliveries: [], history: []}
beforeEach(() => {
    store.deliveries = []
    store.history = []
    vi.mocked(fetchDeliveries).mockImplementation(async (_, subjectType, subjectIds) =>
        store.deliveries.filter(row => row.subjectType === subjectType && [subjectIds].flat().includes(row.subjectId)))
    vi.mocked(recordDelivery).mockImplementation(async (_, data) => {
        const row = {...data, id: store.deliveries.length + 1, jobRunId: data.jobRunId ?? null, deliveredAt: new Date()}
        store.deliveries.push(row)
        return row
    })
    vi.mocked(fetchOrderHistoryForDinner).mockImplementation(async (_, dinnerEventId) => store.history.filter(row => row.dinnerEventId === dinnerEventId))
})

const dinner = {dinnerEventId: 7, date: new Date(2026, 9, 19), menuTitle: 'Lasagne'}
const to = 'anna@example.com'
const seller = 'PL_4_4_3'
const buyer = 'AR_1_2'

// One mail of each kind, as the booking mails of an operation that holds that mail alone
const events = [
    {kind: Kind.WAITLIST_JOINED, mails: NotificationFactory.defaultBookingMails({joined: [{to, name: 'Anna', dinner, position: 2, ticketType: 'Barn'}]})},
    {kind: Kind.WAITLIST_TICKET_ASSIGNED, mails: NotificationFactory.defaultBookingMails({assigned: [{to, name: 'Anna', dinner, ticket: 'Voksen', seller, buyer}]})},
    {kind: Kind.WAITLIST_EXTRA_PORTION, mails: NotificationFactory.defaultBookingMails({extraPortions: [{to, name: 'Anna', dinner, ticket: 'Voksen', buyer}]})},
    {kind: Kind.WAITLIST_BUILDUP, mails: NotificationFactory.defaultBookingMails({buildups: [{to, name: 'Anna', dinner, entries: 5, portions: 4.5}]})},
    {kind: Kind.TICKET_SOLD, mails: NotificationFactory.defaultBookingMails({sold: [{to, name: 'Lene', dinner, seller, buyer}]})}
]

// The result of an operation's one mail
const sendAlone = async (channel: EmailChannel, mails: BookingMails): Promise<SenderEmitResult> => {
    const [result] = await bookingMails(channel, mails)
    return result!
}

// The mails the queue took, whichever call carried them
const sentMessages = (queue: FakeSenderQueue): EmailMessage[] => sentBodies<EmailMessage>(queue)

// The dinners of the mails, the dinner above in season 9 unless named, cooked by the chef; each season holds its prices
const mockDinners = (chefId: number | null, dinners: {id: number, seasonId: number}[] = [{id: dinner.dinnerEventId, seasonId: 9}]) => {
    const rows = dinners.map(({id, seasonId}) => ({...DinnerEventFactory.defaultDinnerEventDetail(), id, seasonId, chefId}))
    vi.mocked(fetchDinnerEventsByIds).mockImplementation(async (_, ids) => rows.filter(row => ids.includes(row.id)))
    vi.mocked(fetchSeason).mockImplementation(async (_, id) => ({...SeasonFactory.defaultSeason(), id, ticketPrices: TicketFactory.defaultTicketPrices({seasonId: id})}))
}

// The repository answers each read by id from the people of the run
const mockPeople = (inhabitants: InhabitantDisplay[], users: UserDisplay[], households: HouseholdDetail[]) => {
    vi.mocked(fetchHouseholdsByIds).mockImplementation(async (_, ids) => households.filter(household => ids.includes(household.id)))
    vi.mocked(fetchInhabitantsByIds).mockImplementation(async (_, ids) => inhabitants.filter(inhabitant => ids.includes(inhabitant.id)))
    vi.mocked(fetchUsersByIds).mockImplementation(async (_, ids) => users.filter(user => ids.includes(user.id)))
}

// The people and dinner reads the mails make, each by name with its count
const peopleAndDinnerReads = {fetchDinnerEventsByIds, fetchSeason, fetchHouseholdsByIds, fetchInhabitantsByIds, fetchUsersByIds}
const readsOf = () => Object.fromEntries(Object.entries(peopleAndDinnerReads)
    .flatMap(([name, read]) => vi.mocked(read).mock.calls.length > 0 ? [[name, vi.mocked(read).mock.calls.length]] : []))

const outcomesOf = (outcomes: Partial<BookingOutcomes>): BookingOutcomes => ({...OrderFactory.defaultScaffoldResult().outcomes, ...outcomes})

describe('booking mails', () => {
    const logs = {warn: vi.spyOn(console, 'warn'), info: vi.spyOn(console, 'info')}
    beforeEach(() => Object.values(logs).forEach(spy => spy.mockImplementation(() => {})))
    afterEach(() => Object.values(logs).forEach(spy => spy.mockClear()))

    it.each(events)('$kind queues through the channel when e-mail is on', async ({mails}) => {
        const queue = fakeQueue()

        const result = await sendAlone(NotificationFactory.channel(queue), mails)

        expect(result.queued).toBe(true)
        expect(sentMessages(queue)).toHaveLength(1)
    })

    it.each(events)('$kind reports not sent and logs the missing setting when e-mail is off', async ({kind, mails}) => {
        const result = await sendAlone({on: false, missing: 'DEPLOY_URL'}, mails)

        expect(result).toMatchObject({queued: false, degraded: true})
        expect(logs.warn).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`DEPLOY_URL.*${kind}`)))
    })
})

describe('bookingMails', () => {
    const logs = {warn: vi.spyOn(console, 'warn'), info: vi.spyOn(console, 'info')}
    beforeEach(() => Object.values(logs).forEach(spy => spy.mockImplementation(() => {})))
    afterEach(() => Object.values(logs).forEach(spy => spy.mockClear()))

    const mails: BookingMails = {
        joined: [{to, name: 'Anna', dinner, position: 3, ticketType: 'Voksen'}],
        buildups: [{to: 'chef@example.com', name: 'Kok', dinner, entries: 3, portions: 2.5}],
        sold: [{to: 'seller@example.com', name: 'Lene', dinner, seller, buyer}, {to: 'seller2@example.com', name: 'Knud', dinner, seller, buyer}],
        assigned: [{to, name: 'Anna', dinner, ticket: 'Voksen', seller, buyer}],
        extraPortions: [{to, name: 'Anna', dinner, ticket: 'Voksen', buyer}]
    }

    it('queues one mail per resolved mail, each of its kind', async () => {
        const queue = fakeQueue()

        const results = await bookingMails(NotificationFactory.channel(queue), mails)

        expect(results.every(result => result.queued)).toBe(true)
        expect(sentMessages(queue).map(message => message.meta.kind).sort()).toEqual([
            Kind.TICKET_SOLD, Kind.TICKET_SOLD, Kind.WAITLIST_BUILDUP, Kind.WAITLIST_EXTRA_PORTION, Kind.WAITLIST_JOINED, Kind.WAITLIST_TICKET_ASSIGNED
        ])
    })

    it('reports every mail not sent and fails nothing when e-mail is off', async () => {
        const results = await bookingMails({on: false, missing: 'DEPLOY_URL'}, mails)

        expect(results).toHaveLength(6)
        expect(results.every(result => !result.queued && result.degraded)).toBe(true)
    })

    it('sends nothing for an operation with no mails', async () => {
        const queue = fakeQueue()

        expect(await bookingMails(NotificationFactory.channel(queue), NotificationFactory.defaultBookingMails())).toEqual([])
        expect(sentMessages(queue)).toEqual([])
    })
})

// The mails follow a booking that is already saved: a failed lookup leaves the booking standing and sends nothing
describe('booking notifications after the action', () => {
    const logs = {error: vi.spyOn(console, 'error'), warn: vi.spyOn(console, 'warn'), info: vi.spyOn(console, 'info')}
    beforeEach(() => {
        Object.values(logs).forEach(spy => spy.mockImplementation(() => {}))
        Object.values({...dinnerReads, ...peopleReads}).filter(read => vi.isMockFunction(read)).forEach(read => read.mockRejectedValue(new Error('D1 down')))
    })
    afterEach(() => vi.clearAllMocks())

    const sale = {dinnerEventId: 7, ticketPriceId: 4, buyerInhabitantId: 41, buyerHouseholdId: 2, sellerHouseholdId: 3, sellerInhabitantId: 31}

    it.each([
        {operation: 'notifyBookingOutcomes', notify: (channel: EmailChannel) =>
            notifyBookingOutcomes({} as D1Database, channel, {joined: [], ticketsSold: [sale], waitlistTicketsSold: [sale], waitlistPortionsAssigned: []})},
        {operation: 'notifyExtraPortions', notify: (channel: EmailChannel) =>
            notifyExtraPortions({} as D1Database, channel, WaitlistFactory.defaultAssignmentResult({dinnerEventId: 7, waitlistTicketsSold: [sale]}))}
    ])('$operation logs a failed lookup and reports no mails', async ({notify}) => {
        const queue = fakeQueue()

        expect(await notify(NotificationFactory.channel(queue))).toEqual([])
        expect(sentMessages(queue)).toEqual([])
        expect(logs.error).toHaveBeenCalledWith(expect.stringContaining('D1 down'))
    })
})

// A placement a run finished for another's stopped run reaches the mails its kind owes: an extra portion its buyer's,
// a sold ticket the seller's and the buyer's. Here one person sold and bought: one login hears both kinds of one order
describe('the mails of the waiting list\'s placements', () => {
    const logs = {warn: vi.spyOn(console, 'warn'), info: vi.spyOn(console, 'info')}
    const household = HouseholdFactory.defaultHouseholdDetail()
    const member = {...household.inhabitants[0]!, userId: 6}
    beforeEach(() => {
        Object.values(logs).forEach(spy => spy.mockImplementation(() => {}))
        mockDinners(null)
        mockPeople([member], [UserFactory.defaultUserWithInhabitant('member', {id: member.userId, email: to})], [{...household, inhabitants: [member]}])
    })
    afterEach(() => vi.clearAllMocks())

    const sale = {dinnerEventId: dinner.dinnerEventId, ticketPriceId: 4, buyerInhabitantId: member.id, buyerHouseholdId: household.id, sellerHouseholdId: household.id, sellerInhabitantId: member.id, orderId: 78}
    const portion = {dinnerEventId: dinner.dinnerEventId, entryId: 1, inhabitantId: member.id, isGuestTicket: false, portions: 1, orderId: 77, ticketPriceId: 4}

    it.each([
        {placement: 'an extra portion a scaffold run finished', kinds: [Kind.WAITLIST_EXTRA_PORTION], notify: (channel: EmailChannel) =>
            notifyBookingOutcomes({} as D1Database, channel, {joined: [], ticketsSold: [], waitlistTicketsSold: [], waitlistPortionsAssigned: [portion]})},
        {placement: 'a sale the chef\'s extra portions finished', kinds: [Kind.TICKET_SOLD, Kind.WAITLIST_TICKET_ASSIGNED], notify: (channel: EmailChannel) =>
            notifyExtraPortions({} as D1Database, channel, WaitlistFactory.defaultAssignmentResult({dinnerEventId: dinner.dinnerEventId, waitlistTicketsSold: [sale]}))}
    ])('$placement reaches its mails', async ({kinds, notify}) => {
        const queue = fakeQueue()

        await notify(NotificationFactory.channel(queue))

        expect(sentMessages(queue).map(message => message.meta.kind).sort()).toEqual(kinds)
    })
})

// A run's mails resolve their recipients from the people they name, read in bulk: one read of each kind, whatever the
// number of events
describe('the people a run\'s mails name', () => {
    const logs = {warn: vi.spyOn(console, 'warn'), info: vi.spyOn(console, 'info')}
    const {TicketTypeSchema, DinnerModeSchema, BookingActionSchema} = useBookingValidation()
    type Member = HouseholdDetail['inhabitants'][number]
    const template = HouseholdFactory.defaultHouseholdDetail().inhabitants[0]!
    // A person of the run with a name of its own, a login when userId is given
    const person = (id: number, householdId: number, userId: number | null): Member => ({...template, id, householdId, userId, name: `Skråner ${id}`})
    // A household lists its people in the order its read returns them; the first with a login is its first user
    const [parent, child, sibling] = [person(101, 10, 1010), person(102, 10, null), person(103, 10, 1030)]
    const neighbour = person(111, 11, 1110)
    const [seller, sellerWithoutLogin, sellerToo] = [person(301, 30, 3010), person(302, 30, null), person(303, 30, 3030)]
    const [buyer, buyerWithoutLogin] = [person(201, 20, 2010), person(202, 20, null)]
    const loner = person(401, 40, null)
    const [chef, chefWithoutLogin] = [person(501, 50, 5010), person(502, 51, null)]
    const householdOf = (members: Member[]): HouseholdDetail =>
        ({...HouseholdFactory.defaultHouseholdDetail(`h${members[0]!.householdId}`), id: members[0]!.householdId, inhabitants: members})
    const [sellers, buyers] = [householdOf([seller, sellerWithoutLogin, sellerToo]), householdOf([buyer, buyerWithoutLogin])]
    // The loner's household and the chef without a login's have no user at all
    const households = [
        householdOf([parent, child, sibling]), householdOf([neighbour]), sellers, buyers, householdOf([loner]), householdOf([chef]), householdOf([chefWithoutLogin])
    ]
    const people = households.flatMap(household => household.inhabitants)
    const addressOf = ({id}: Member): string => `${id}@example.com`
    // The account the nightly and the preference runs book with: a login of no household, with an address
    const systemUser = UserFactory.defaultUserWithInhabitant('system', {id: 9000, email: 'system@example.com'})
    const loginOf = (member: Member, notificationChannels?: NotificationChannel[]) =>
        UserFactory.defaultUserWithInhabitant(`u${member.id}`, {id: member.userId!, email: addressOf(member), notificationChannels})
    const logins = [...people.filter(member => member.userId).map(member => loginOf(member)), systemUser]
    beforeEach(() => {
        Object.values(logs).forEach(spy => spy.mockImplementation(() => {}))
        mockDinners(chef.id)
        mockPeople(people, logins, households)
    })
    afterEach(() => vi.clearAllMocks())

    const ADULT_PRICE_ID = 4
    // The queue entry of a person's place
    const entryOf = (member: Member): number => 600 + member.id
    // A place in the dinner's adult line, the line's size at the join; the buildup threshold is 3
    const joinedEvent = (joiner: Member, bookedByUserId: number, position: number, overrides: Partial<WaitlistJoined> = {}): WaitlistJoined => ({
        dinnerEventId: dinner.dinnerEventId, inhabitantId: joiner.id, bookedByUserId, position, ticketType: TicketTypeSchema.enum.ADULT, queueSize: position, portionNeed: position,
        entryId: entryOf(joiner), isGuestTicket: false, ticketPriceId: ADULT_PRICE_ID, dinnerMode: DinnerModeSchema.enum.DINEIN,
        ...overrides
    })
    // A released ticket of the selling household sold to the owner; the sold order keeps its id
    const saleTo = (owner: Member, overrides: Partial<TicketSale> = {}): TicketSale => ({
        dinnerEventId: dinner.dinnerEventId, ticketPriceId: ADULT_PRICE_ID, buyerInhabitantId: owner.id, buyerHouseholdId: owner.householdId,
        sellerHouseholdId: sellers.id, sellerInhabitantId: null, orderId: 77, dinnerMode: DinnerModeSchema.enum.DINEIN, isGuestTicket: false,
        ...overrides
    })
    const portionTo = (owner: Member, orderId = 88) =>
        ({dinnerEventId: dinner.dinnerEventId, entryId: entryOf(owner), inhabitantId: owner.id, isGuestTicket: false, portions: 1, orderId, ticketPriceId: ADULT_PRICE_ID})
    // The parent joins and books the child; the neighbour's place reaches the threshold
    const joined = [joinedEvent(parent, parent.userId!, 1), joinedEvent(child, parent.userId!, 2), joinedEvent(neighbour, neighbour.userId!, 3)]

    const notify = (queue: FakeSenderQueue, outcomes: BookingOutcomes) => notifyBookingOutcomes({} as D1Database, NotificationFactory.channel(queue), outcomes)
    const ofKind = (kind: string) => (message: EmailMessage): boolean => message.meta.kind === kind
    const mailsOfKind = (queue: FakeSenderQueue, kind: string): EmailMessage[] => sentMessages(queue).filter(ofKind(kind))

    // 40 dinners, the first 20 in season 9 and the others in season 10
    const fortyDinners = Array.from({length: 40}, (_, index) => ({id: 100 + index, seasonId: index < 20 ? 9 : 10}))

    it.each([
        {
            run: 'joins people to one dinner', dinners: [{id: dinner.dinnerEventId, seasonId: 9}], outcomes: outcomesOf({joined}),
            reads: {fetchDinnerEventsByIds: 1, fetchSeason: 1, fetchHouseholdsByIds: 1, fetchInhabitantsByIds: 1, fetchUsersByIds: 1}
        },
        {
            run: 'sells a ticket to the first in line on each of 40 dinners of two seasons', dinners: fortyDinners,
            outcomes: outcomesOf({waitlistTicketsSold: fortyDinners.map(({id}) => saleTo(buyer, {dinnerEventId: id, orderId: id}))}),
            reads: {fetchDinnerEventsByIds: 1, fetchSeason: 2, fetchHouseholdsByIds: 1, fetchInhabitantsByIds: 1, fetchUsersByIds: 1}
        }
    ])('GIVEN a run that $run WHEN its mails resolve THEN one read of each kind serves them all, and one season read per season', async ({dinners, outcomes, reads}) => {
        mockDinners(chef.id, dinners)

        await notify(fakeQueue(), outcomes)

        expect(readsOf()).toEqual(reads)
    })

    // Three joins, a buildup, a direct buy (sold and bought), a sale to the first in line (sold and assigned), an extra
    // portion: nine mails
    const everyKind = () => outcomesOf({
        joined, ticketsSold: [saleTo(buyer)], waitlistTicketsSold: [saleTo(buyer, {orderId: 78})], waitlistPortionsAssigned: [portionTo(buyer)]
    })

    it('GIVEN a run with every kind of mail WHEN its mails resolve THEN they reach the queue in one batch, not one call per mail', async () => {
        const queue = fakeQueue()

        await notify(queue, everyKind())

        expect(queue.send).not.toHaveBeenCalled()
        expect(sentBatches(queue).map(batch => batch.length)).toEqual([9])
    })

    // A mail about a person goes to the person's closest user (findClosestUser): the person's own login, else the first
    // user of the person's household, whoever booked. A sale mails both sides: the person whose ticket was released, else
    // the selling household's first user, and the buyer. The buildup goes to the chef. One recipient per mail, never
    // every member
    it.each([
        {mail: 'a place of a person with a login, joined by a system run', heard: ofKind(Kind.WAITLIST_JOINED), outcomes: outcomesOf({joined: [joinedEvent(parent, systemUser.id, 1)]}), to: [parent]},
        {mail: 'a place of a child, joined by a system run', heard: ofKind(Kind.WAITLIST_JOINED), outcomes: outcomesOf({joined: [joinedEvent(child, systemUser.id, 1)]}), to: [parent]},
        {mail: 'a ticket sold to a waiting buyer with a login', heard: ofKind(Kind.WAITLIST_TICKET_ASSIGNED), outcomes: outcomesOf({waitlistTicketsSold: [saleTo(buyer)]}), to: [buyer]},
        {mail: 'a ticket sold to a waiting child', heard: ofKind(Kind.WAITLIST_TICKET_ASSIGNED), outcomes: outcomesOf({waitlistTicketsSold: [saleTo(buyerWithoutLogin)]}), to: [buyer]},
        {mail: 'a released ticket a buyer with a login bought', heard: ofKind(Kind.TICKET_BOUGHT), outcomes: outcomesOf({ticketsSold: [saleTo(buyer)]}), to: [buyer]},
        {mail: 'a released ticket bought for a child', heard: ofKind(Kind.TICKET_BOUGHT), outcomes: outcomesOf({ticketsSold: [saleTo(buyerWithoutLogin)]}), to: [buyer]},
        {mail: 'an extra portion of an owner with a login', heard: ofKind(Kind.WAITLIST_EXTRA_PORTION), outcomes: outcomesOf({waitlistPortionsAssigned: [portionTo(buyer)]}), to: [buyer]},
        {mail: 'an extra portion of a child', heard: ofKind(Kind.WAITLIST_EXTRA_PORTION), outcomes: outcomesOf({waitlistPortionsAssigned: [portionTo(buyerWithoutLogin)]}), to: [buyer]},
        {mail: 'the sale of a second login\'s released ticket', heard: ofKind(Kind.TICKET_SOLD), outcomes: outcomesOf({ticketsSold: [saleTo(buyer, {sellerInhabitantId: sellerToo.id})]}), to: [sellerToo]},
        {mail: 'the sale of a child\'s released ticket', heard: ofKind(Kind.TICKET_SOLD), outcomes: outcomesOf({ticketsSold: [saleTo(buyer, {sellerInhabitantId: sellerWithoutLogin.id})]}), to: [seller]},
        {mail: 'the sale of a released ticket whose holder the history does not name', heard: ofKind(Kind.TICKET_SOLD), outcomes: outcomesOf({ticketsSold: [saleTo(buyer)]}), to: [seller]},
        {mail: 'the line reaching the threshold', heard: ofKind(Kind.WAITLIST_BUILDUP), outcomes: outcomesOf({joined: [joinedEvent(neighbour, neighbour.userId!, 3)]}), to: [chef]}
    ])('GIVEN $mail WHEN the mails resolve THEN it goes to its closest user alone', async ({heard, outcomes, to}) => {
        const queue = fakeQueue()

        await notify(queue, outcomes)

        expect(sentMessages(queue).filter(heard).map(message => message.to)).toEqual(to.map(addressOf))
    })

    // A ticket bought for a child: the buyer's mail of a sale to the first in line and of a direct buy read alike, the
    // count's word of the toast and the ticket line of the booking page with the household it came from
    const ticketForTheChild = [
        buyer.name, buyerWithoutLogin.name, BOOKING_WORDS.actions[BookingActionSchema.enum.BUY].toast, BOOKING_WORDS.modes[DinnerModeSchema.enum.DINEIN],
        BOOKING_WORDS.ticketChange.seller(sellers.shortName)
    ]

    // A mail greets the one who hears and names what it is about in the words of the booking pages and the chef's alert
    it.each([
        {mail: 'a child\'s place, joined by a system run', kind: Kind.WAITLIST_JOINED, outcomes: outcomesOf({joined: [joinedEvent(child, systemUser.id, 2)]}),
            reads: [parent.name, child.name, formatPlace(2, TicketTypeSchema.enum.ADULT), BOOKING_WORDS.waitlistBadge.helpText]},
        {mail: 'a guest\'s place, booked on the parent', kind: Kind.WAITLIST_JOINED, outcomes: outcomesOf({joined: [joinedEvent(parent, parent.userId!, 1, {isGuestTicket: true})]}),
            reads: [parent.name, useOrder().formatGuestLabel(parent.name)]},
        {mail: 'a ticket sold to a waiting child', kind: Kind.WAITLIST_TICKET_ASSIGNED, outcomes: outcomesOf({waitlistTicketsSold: [saleTo(buyerWithoutLogin)]}),
            reads: ticketForTheChild},
        {mail: 'a released ticket bought for a child', kind: Kind.TICKET_BOUGHT, outcomes: outcomesOf({ticketsSold: [saleTo(buyerWithoutLogin)]}),
            reads: ticketForTheChild},
        {mail: 'an extra portion of a child', kind: Kind.WAITLIST_EXTRA_PORTION, outcomes: outcomesOf({waitlistPortionsAssigned: [portionTo(buyerWithoutLogin)]}),
            reads: [buyer.name, buyerWithoutLogin.name]},
        {mail: 'the sale of a released ticket a user bought', kind: Kind.TICKET_SOLD, outcomes: outcomesOf({ticketsSold: [saleTo(buyer, {sellerInhabitantId: sellerToo.id})]}),
            reads: [sellerToo.name, buyers.shortName]},
        {mail: 'the line reaching the threshold', kind: Kind.WAITLIST_BUILDUP, outcomes: outcomesOf({joined: [joinedEvent(neighbour, neighbour.userId!, 3)]}),
            reads: [chef.name, BOOKING_WORDS.supply.chefAsk(3)]}
    ])('GIVEN $mail WHEN its $kind mail goes THEN it greets the one who hears and names what it is about', async ({kind, outcomes, reads}) => {
        const queue = fakeQueue()

        await notify(queue, outcomes)

        const [message] = mailsOfKind(queue, kind)
        expect(message, `a ${kind} mail`).toBeDefined()
        for (const text of reads) expect(message!.text).toContain(text)
    })

    it.each([
        {person: 'a person whose household has no user', chefId: chef.id, outcomes: outcomesOf({joined: [joinedEvent(loner, systemUser.id, 1)]}), unaddressed: Kind.WAITLIST_JOINED},
        {person: 'a waiting buyer whose household has no user', chefId: chef.id, outcomes: outcomesOf({waitlistTicketsSold: [saleTo(loner)]}), unaddressed: Kind.WAITLIST_TICKET_ASSIGNED},
        {person: 'a buyer of a released ticket whose household has no user', chefId: chef.id, outcomes: outcomesOf({ticketsSold: [saleTo(loner)]}), unaddressed: Kind.TICKET_BOUGHT},
        {person: 'an extra portion\'s owner whose household has no user', chefId: chef.id, outcomes: outcomesOf({waitlistPortionsAssigned: [portionTo(loner)]}), unaddressed: Kind.WAITLIST_EXTRA_PORTION},
        {person: 'a selling household with no user', chefId: chef.id, outcomes: outcomesOf({ticketsSold: [saleTo(buyer, {sellerHouseholdId: loner.householdId, sellerInhabitantId: loner.id})]}), unaddressed: Kind.TICKET_SOLD},
        {person: 'a chef without a login', chefId: chefWithoutLogin.id, outcomes: outcomesOf({joined: [joinedEvent(neighbour, neighbour.userId!, 3)]}), unaddressed: Kind.WAITLIST_BUILDUP}
    ])('GIVEN $person WHEN the mails resolve THEN that mail is reported unaddressed and the others go out', async ({chefId, outcomes, unaddressed}) => {
        mockDinners(chefId)

        const results = await notify(fakeQueue(), outcomes)

        expect(results.filter(result => !result.queued).map(result => mailKindOf(result.dedupeKey))).toEqual([unaddressed])
    })

    // The mails honour the recipient's own channels (Mine indstillinger → Notifikationer): with e-mail off the recipient
    // gets no mail, and no other login of the household gets it in its place
    describe('the recipient\'s notification channels', () => {
        const {EMAIL, SMS} = useUserPreferenceValidation().NotificationChannelSchema.enum
        // The run's logins, the recipient's saving the channels given and every other login e-mail
        const mockChannels = (recipient: Member, notificationChannels: NotificationChannel[]) => mockPeople(
            people,
            [...people.filter(member => member.userId).map(member => loginOf(member, member.id === recipient.id ? notificationChannels : [EMAIL])), systemUser],
            households
        )
        const mails = [
            {mail: 'a person\'s own place', kind: Kind.WAITLIST_JOINED, recipient: parent, outcomes: outcomesOf({joined: [joinedEvent(parent, systemUser.id, 1)]})},
            {mail: 'a child\'s place, heard by the household\'s first user', kind: Kind.WAITLIST_JOINED, recipient: parent, outcomes: outcomesOf({joined: [joinedEvent(child, systemUser.id, 1)]})},
            {mail: 'the line reaching the threshold', kind: Kind.WAITLIST_BUILDUP, recipient: chef, outcomes: outcomesOf({joined: [joinedEvent(neighbour, neighbour.userId!, 3)]})},
            {mail: 'the sale of a released ticket', kind: Kind.TICKET_SOLD, recipient: seller, outcomes: outcomesOf({ticketsSold: [saleTo(buyer)]})},
            {mail: 'a ticket sold to the first in line', kind: Kind.WAITLIST_TICKET_ASSIGNED, recipient: buyer, outcomes: outcomesOf({waitlistTicketsSold: [saleTo(buyer)]})},
            {mail: 'a released ticket bought', kind: Kind.TICKET_BOUGHT, recipient: buyer, outcomes: outcomesOf({ticketsSold: [saleTo(buyer)]})},
            {mail: 'an extra portion', kind: Kind.WAITLIST_EXTRA_PORTION, recipient: buyer, outcomes: outcomesOf({waitlistPortionsAssigned: [portionTo(buyer)]})}
        ]
        const settings = [
            {setting: 'e-mail among them', channels: [EMAIL, SMS], mailed: true},
            {setting: 'no e-mail', channels: [SMS], mailed: false}
        ]

        it.each(mails.flatMap(mail => settings.map(setting => ({...mail, ...setting}))))('GIVEN the recipient of $mail with $setting WHEN the mails resolve THEN the recipient is mailed: $mailed, and no other login in its place', async ({kind, recipient, outcomes, channels, mailed}) => {
            mockChannels(recipient, channels)
            const queue = fakeQueue()

            await notify(queue, outcomes)

            expect(mailsOfKind(queue, kind).map(message => message.to)).toEqual(mailed ? [addressOf(recipient)] : [])
        })
    })

    // One mail per subject, version, kind and recipient: a mail that goes records its Delivery row, the queued mail's
    // dedupe key its reference, and a mail its row records goes no more. A subject's version counts up from 1, one step
    // per history row that owes it a mail: a place its join, an order the extra portion that created it and each BUY, the
    // dinner its buildup and each extra portion row after it
    describe('the Delivery rows of the mails', () => {
        const {TICKET_WAITLIST, ORDER, DINNER_EVENT} = DeliverySubjectSchema.enum
        const {OrderAuditActionSchema, OrderAuditChangeSchema, OrderAuditSourceSchema, createOrderAuditData} = useBookingValidation()
        // The run's clock, the day before the dinner: a history row and a Delivery row tell their order by it
        const at = (minute: number) => new Date(2026, 9, 18, 12, minute)
        beforeEach(() => {
            vi.useFakeTimers({toFake: ['Date']})
            vi.setSystemTime(at(0))
        })
        afterEach(() => vi.useRealTimers())
        let historyId = 0
        const historyRow = (orderId: number, action: OrderHistoryDisplay['action'], auditData: string, minute: number): OrderHistoryDisplay =>
            OrderFactory.defaultOrderHistoryDisplay(undefined, {id: ++historyId, orderId, action, auditData, dinnerEventId: dinner.dinnerEventId, timestamp: at(minute)})
        const snapshotOf = (orderId: number) => OrderFactory.defaultOrderSnapshot({id: orderId, dinnerEventId: dinner.dinnerEventId})
        // The row of a sale of the order, and the row of the chef's extra portion that created the order; before the clock
        // starts unless a minute is given
        const bought = (orderId: number, minute = -10) =>
            historyRow(orderId, OrderAuditActionSchema.enum.USER_CLAIMED, createOrderAuditData(OrderAuditChangeSchema.enum.BUY, snapshotOf(orderId)), minute)
        const extraPortion = (orderId: number, minute = -10) => historyRow(orderId, OrderAuditActionSchema.enum.SYSTEM_CREATED,
            createOrderAuditData(OrderAuditChangeSchema.enum.BOOK, snapshotOf(orderId), OrderAuditSourceSchema.enum['waitlist-assignment']), minute)
        // The rows of the mails of a kind, by the kind their reference leads with
        const rowsOfKind = (kind: string) => store.deliveries.filter(row => mailKindOf(row.reference) === kind)
        // A subject's rows, each by its mail kind and version, by version and then kind
        const rowsOf = (subjectType: Delivery['subjectType'], subjectId: number) => store.deliveries
            .filter(row => row.subjectType === subjectType && row.subjectId === subjectId)
            .map(row => ({kind: mailKindOf(row.reference), version: row.version}))
            .sort((a, b) => a.version - b.version || a.kind.localeCompare(b.kind))

        const deliveries = [
            {mail: 'a place on the waiting list', kind: Kind.WAITLIST_JOINED, outcomes: outcomesOf({joined: [joinedEvent(parent, parent.userId!, 1)]}), history: [],
                subject: {subjectType: TICKET_WAITLIST, subjectId: entryOf(parent), version: 1}},
            {mail: 'a ticket sold to the first in line', kind: Kind.WAITLIST_TICKET_ASSIGNED, outcomes: outcomesOf({waitlistTicketsSold: [saleTo(buyer)]}), history: [bought(77)],
                subject: {subjectType: ORDER, subjectId: 77, version: 1}},
            {mail: 'the release that ticket was sold from', kind: Kind.TICKET_SOLD, outcomes: outcomesOf({waitlistTicketsSold: [saleTo(buyer)]}), history: [bought(77)],
                subject: {subjectType: ORDER, subjectId: 77, version: 1}},
            {mail: 'a released ticket bought', kind: Kind.TICKET_BOUGHT, outcomes: outcomesOf({ticketsSold: [saleTo(buyer)]}), history: [bought(77)],
                subject: {subjectType: ORDER, subjectId: 77, version: 1}},
            {mail: 'a ticket sold a second time', kind: Kind.TICKET_SOLD, outcomes: outcomesOf({ticketsSold: [saleTo(buyer)]}), history: [bought(77), bought(77)],
                subject: {subjectType: ORDER, subjectId: 77, version: 2}},
            {mail: 'the chef\'s extra portion', kind: Kind.WAITLIST_EXTRA_PORTION, outcomes: outcomesOf({waitlistPortionsAssigned: [portionTo(buyer, 88)]}), history: [extraPortion(88)],
                subject: {subjectType: ORDER, subjectId: 88, version: 1}},
            {mail: 'the line reaching the threshold', kind: Kind.WAITLIST_BUILDUP, outcomes: outcomesOf({joined: [joinedEvent(neighbour, neighbour.userId!, 3)]}), history: [],
                subject: {subjectType: DINNER_EVENT, subjectId: dinner.dinnerEventId, version: 1}},
            // The chef's extra portions before the first buildup owe the chef nothing
            {mail: 'the line reaching the threshold after the chef\'s earlier extra portions', kind: Kind.WAITLIST_BUILDUP,
                outcomes: outcomesOf({joined: [joinedEvent(neighbour, neighbour.userId!, 3)]}), history: [extraPortion(88), extraPortion(89)],
                subject: {subjectType: DINNER_EVENT, subjectId: dinner.dinnerEventId, version: 1}}
        ]

        it.each(deliveries)('GIVEN $mail WHEN its $kind mail goes THEN it records one Delivery row of its subject and version, the mail\'s dedupe key its reference', async ({kind, outcomes, history, subject}) => {
            store.history = history
            const queue = fakeQueue()

            await notify(queue, outcomes)

            const [mail, ...more] = mailsOfKind(queue, kind)
            expect(more).toEqual([])
            expect(rowsOfKind(kind)).toEqual([expect.objectContaining({...subject, kind: DeliveryKindSchema.enum.EMAIL, reference: mail!.meta.dedupeKey})])
        })

        it.each(deliveries)('GIVEN $mail delivered WHEN the same outcome notifies again THEN no $kind mail goes and its row stays one', async ({kind, outcomes, history}) => {
            store.history = history
            await notify(fakeQueue(), outcomes)
            const queue = fakeQueue()

            await notify(queue, outcomes)

            expect(mailsOfKind(queue, kind)).toEqual([])
            expect(rowsOfKind(kind)).toHaveLength(1)
        })

        // A subject through its history, a step every 10 minutes: each step's new history rows land 5 minutes before it
        it.each([
            {subject: 'a regular ticket bought twice', subjectType: ORDER, subjectId: 77, steps: [
                {outcomes: outcomesOf({ticketsSold: [saleTo(buyer)]}), history: [bought(77, 5)]},
                {outcomes: outcomesOf({ticketsSold: [saleTo(neighbour, {sellerHouseholdId: buyers.id, sellerInhabitantId: buyer.id})]}), history: [bought(77, 5), bought(77, 15)]}
            ], rows: [
                {kind: Kind.TICKET_BOUGHT, version: 1}, {kind: Kind.TICKET_SOLD, version: 1},
                {kind: Kind.TICKET_BOUGHT, version: 2}, {kind: Kind.TICKET_SOLD, version: 2}
            ]},
            {subject: 'an extra portion\'s ticket later bought', subjectType: ORDER, subjectId: 88, steps: [
                {outcomes: outcomesOf({waitlistPortionsAssigned: [portionTo(buyer, 88)]}), history: [extraPortion(88, 5)]},
                {outcomes: outcomesOf({waitlistTicketsSold: [saleTo(neighbour, {orderId: 88, sellerHouseholdId: buyers.id, sellerInhabitantId: buyer.id})]}),
                    history: [extraPortion(88, 5), bought(88, 15)]}
            ], rows: [
                {kind: Kind.WAITLIST_EXTRA_PORTION, version: 1}, {kind: Kind.TICKET_SOLD, version: 2}, {kind: Kind.WAITLIST_TICKET_ASSIGNED, version: 2}
            ]},
            {subject: 'a line building up, then after each of two rounds of extra portions', subjectType: DINNER_EVENT, subjectId: dinner.dinnerEventId, steps: [
                {outcomes: outcomesOf({joined: [joinedEvent(neighbour, neighbour.userId!, 3)]}), history: []},
                {outcomes: outcomesOf({joined: [joinedEvent(parent, parent.userId!, 3)]}), history: [extraPortion(88, 15)]},
                {outcomes: outcomesOf({joined: [joinedEvent(sibling, sibling.userId!, 3)]}), history: [extraPortion(88, 15), extraPortion(89, 25)]}
            ], rows: [
                {kind: Kind.WAITLIST_BUILDUP, version: 1}, {kind: Kind.WAITLIST_BUILDUP, version: 2}, {kind: Kind.WAITLIST_BUILDUP, version: 3}
            ]}
        ])('GIVEN $subject WHEN each step notifies THEN its versions count up from 1, one per history row that owes a mail', async ({subjectType, subjectId, steps, rows}) => {
            for (const [index, {outcomes, history}] of steps.entries()) {
                vi.setSystemTime(at(10 * (index + 1)))
                store.history = history
                await notify(fakeQueue(), outcomes)
            }

            expect(rowsOf(subjectType, subjectId)).toEqual(rows)
        })

        it('GIVEN the queue refused a mail WHEN the same outcome notifies again THEN the mail goes and records its one row', async () => {
            const outcomes = outcomesOf({joined: [joinedEvent(parent, parent.userId!, 1)]})
            await notify(fakeQueue([1]), outcomes)
            const queue = fakeQueue()

            await notify(queue, outcomes)

            expect(sentMessages(queue).map(message => message.meta.kind)).toEqual([Kind.WAITLIST_JOINED])
            expect(store.deliveries.map(row => row.reference)).toEqual(sentMessages(queue).map(message => message.meta.dedupeKey))
        })
    })
})
