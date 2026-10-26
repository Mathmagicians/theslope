import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createError} from 'h3'
import {notifyBookingOutcomes, notifyExtraPortions, sendNotifications} from '~~/server/utils/sender/events/waitlist'
import * as peopleReads from '~~/server/data/prismaRepository'
import * as dinnerReads from '~~/server/data/financesRepository'
import {fetchHouseholdsByIds, fetchInhabitantsByIds, fetchSeason, fetchUsersByIds} from '~~/server/data/prismaRepository'
import {fetchDinnerEvents, fetchDinnerEventsByIds, fetchOrderHistoryForDinners, fetchOrders} from '~~/server/data/financesRepository'
import {fetchWaitlistForDinners} from '~~/server/data/waitlistRepository'
import type {EmailChannel} from '~~/server/utils/sender/config'
import type {EmailMessage} from '~/composables/useNotificationValidation'
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
import {fakeSenderQueue as fakeQueue, sentMessages as sentBodies, type FakeSenderQueue} from '~~/tests/component/utils/sender/fakeSenderQueue'
import {fakeDeliveries} from '~~/tests/component/utils/sender/fakeDeliveries'

// The unit runtime has no D1: the lookups answer from the test
vi.mock('~~/server/data/prismaRepository', () => ({
    fetchHouseholdsByIds: vi.fn(), fetchInhabitantsByIds: vi.fn(), fetchSeason: vi.fn(), fetchUsersByIds: vi.fn()
}))
vi.mock('~~/server/data/financesRepository', () => ({
    createOrders: vi.fn(), findReleasedOrderId: vi.fn(), claimReleasedOrder: vi.fn(), fetchDinnerEventsByIds: vi.fn(), fetchDinnerEvents: vi.fn(),
    fetchOrders: vi.fn(), fetchDeliveries: vi.fn(), recordDeliveries: vi.fn(), fetchOrderHistoryForDinners: vi.fn()
}))
vi.mock('~~/server/data/waitlistRepository', async importOriginal => ({
    ...await importOriginal<typeof import('~~/server/data/waitlistRepository')>(), fetchWaitlistForDinners: vi.fn()
}))
// The events read the app config, and log through createError, from the Nitro auto-import scope. Its buildup threshold is 3
await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).stubAppConfig())
vi.stubGlobal('createError', createError)

const {Kind, mailKindOf} = NotificationFactory
const Mode = useBookingValidation().DinnerModeSchema.enum
const {DeliverySubjectSchema, DeliveryKindSchema, SenderEventSchema} = useDeliveryValidation()
const SenderEvent = SenderEventSchema.enum

// The Delivery rows and the order history D1 holds for the run: the history read answers from the history the case writes
let recorded: {rows: Delivery[]}
const store: {history: OrderHistoryDisplay[]} = {history: []}
beforeEach(() => {
    // The booking emails flag is on unless a case turns it off
    vi.stubEnv('SHOULD_SEND_BOOKING_EMAILS_FLAG', 'true')
    recorded = fakeDeliveries()
    store.history = []
    vi.mocked(fetchOrderHistoryForDinners).mockImplementation(async (_, dinnerEventIds) => store.history.filter(row => dinnerEventIds.some(id => id === row.dinnerEventId)))
})
afterEach(() => vi.unstubAllEnvs())

const dinner = {dinnerEventId: 7, date: new Date(2026, 9, 19), menuTitle: 'Lasagne'}
const to = 'anna@example.com'

// The emails the queue took, whichever call carried them
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

// The notifications follow a booking that is already saved: a failed lookup leaves the booking standing, sends nothing,
// writes the delivery step's failure line, the one the Diagnostics dashboard reads, and reaches the caller
describe('booking notifications after the action', () => {
    const logs = {error: vi.spyOn(console, 'error'), warn: vi.spyOn(console, 'warn'), info: vi.spyOn(console, 'info')}
    const reason = 'D1 down'
    beforeEach(() => {
        Object.values(logs).forEach(spy => spy.mockImplementation(() => {}))
        Object.values({...dinnerReads, ...peopleReads}).filter(read => vi.isMockFunction(read)).forEach(read => read.mockRejectedValue(new Error(reason)))
    })
    afterEach(() => vi.clearAllMocks())

    const sale = {dinnerEventId: 7, ticketPriceId: 4, orderId: 78, dinnerMode: Mode.DINEIN, isGuestTicket: false, buyerInhabitantId: 41, buyerHouseholdId: 2, sellerHouseholdId: 3, sellerInhabitantId: 31}

    it.each([
        {operation: 'notifyBookingOutcomes', notify: (channel: EmailChannel) =>
            notifyBookingOutcomes({} as D1Database, channel, {joined: [], ticketsSold: [sale], waitlistTicketsSold: [sale], waitlistPortionsAssigned: []})},
        {operation: 'notifyExtraPortions', notify: (channel: EmailChannel) =>
            notifyExtraPortions({} as D1Database, channel, WaitlistFactory.defaultAssignmentResult({dinnerEventId: 7, waitlistTicketsSold: [sale]}))},
        {operation: 'sendNotifications', notify: (channel: EmailChannel) => sendNotifications({} as D1Database, channel, 9)}
    ])('$operation rejects with a failed lookup\'s error, logs the booking status sender event failed and sends no notification', async ({notify}) => {
        const queue = fakeQueue()

        await expect(notify(NotificationFactory.channel(queue))).rejects.toThrow(reason)
        expect(sentMessages(queue)).toEqual([])
        expect(logs.error).toHaveBeenCalledWith(`📬 > DELIVERY > [EVENT ${SenderEvent.BOOKING_STATUS}] failed: ${reason}`)
    })
})

// A placement a run finished for another's stopped run sends the notifications of its kind: an extra portion tells its
// buyer, a sold ticket the seller and the buyer. Here one person sold and bought: one login hears both kinds of one order
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

    const sale = {dinnerEventId: dinner.dinnerEventId, ticketPriceId: 4, buyerInhabitantId: member.id, buyerHouseholdId: household.id, sellerHouseholdId: household.id, sellerInhabitantId: member.id, orderId: 78, dinnerMode: Mode.DINEIN, isGuestTicket: false}
    const portion = {dinnerEventId: dinner.dinnerEventId, entryId: 1, inhabitantId: member.id, isGuestTicket: false, portions: 1, orderId: 77, ticketPriceId: 4, dinnerMode: Mode.DINEIN}

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
    // A household's first user is its member of the lowest id with a login, in whatever order its read lists them
    const [parent, child, sibling] = [person(101, 10, 1010), person(102, 10, null), person(103, 10, 1030)]
    const neighbour = person(111, 11, 1110)
    const [seller, sellerWithoutLogin, sellerToo] = [person(301, 30, 3010), person(302, 30, null), person(303, 30, 3030)]
    const [buyer, buyerWithoutLogin] = [person(201, 20, 2010), person(202, 20, null)]
    const chef = person(501, 50, 5010)
    const [chefsPartner, chefWithoutOwnLogin] = [person(521, 52, 5210), person(522, 52, null)]
    const householdOf = (members: Member[]): HouseholdDetail =>
        ({...HouseholdFactory.defaultHouseholdDetail(`h${members[0]!.householdId}`), id: members[0]!.householdId, inhabitants: members})
    const [sellers, buyers] = [householdOf([seller, sellerWithoutLogin, sellerToo]), householdOf([buyer, buyerWithoutLogin])]
    // Every household has a user; the chef without a login of their own lives with one
    const households = [
        householdOf([parent, child, sibling]), householdOf([neighbour]), sellers, buyers, householdOf([chef]),
        householdOf([chefsPartner, chefWithoutOwnLogin])
    ]
    const people = households.flatMap(household => household.inhabitants)
    const addressOf = ({id}: Member): string => `${id}@example.com`
    // The account the DAILY_MAINTENANCE job and the preference runs book with: a login of no household, with an address
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

    const ADULT_PRICE = TicketFactory.defaultTicketPrices().find(price => price.ticketType === TicketTypeSchema.enum.ADULT)!
    const ADULT_PRICE_ID = ADULT_PRICE.id!
    // The queue entry of a person's place
    const entryOf = (member: Member): number => 600 + member.id
    // A place in the dinner's adult line, the line's size at the join; the buildup threshold is 3
    const joinedEvent = (joiner: Member, bookedByUserId: number, position: number, overrides: Partial<WaitlistJoined> = {}): WaitlistJoined => ({
        dinnerEventId: dinner.dinnerEventId, inhabitantId: joiner.id, bookedByUserId, position, ticketType: TicketTypeSchema.enum.ADULT, queueSize: position, portionNeed: position,
        entryId: entryOf(joiner), isGuestTicket: false, ticketPriceId: ADULT_PRICE_ID, dinnerMode: DinnerModeSchema.enum.DINEIN,
        queuedByType: {[TicketTypeSchema.enum.ADULT]: position},
        ...overrides
    })
    // A released ticket of the selling household sold to the owner; the sold order keeps its id
    const saleTo = (owner: Member, overrides: Partial<TicketSale> = {}): TicketSale => ({
        dinnerEventId: dinner.dinnerEventId, ticketPriceId: ADULT_PRICE_ID, buyerInhabitantId: owner.id, buyerHouseholdId: owner.householdId,
        sellerHouseholdId: sellers.id, sellerInhabitantId: null, orderId: 77, dinnerMode: DinnerModeSchema.enum.DINEIN, isGuestTicket: false,
        ...overrides
    })
    const portionTo = (owner: Member, orderId = 88) =>
        ({dinnerEventId: dinner.dinnerEventId, entryId: entryOf(owner), inhabitantId: owner.id, isGuestTicket: false, portions: 1, orderId, ticketPriceId: ADULT_PRICE_ID, dinnerMode: DinnerModeSchema.enum.DINEIN})
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
    // portion: nine notifications
    const everyKind = () => outcomesOf({
        joined, ticketsSold: [saleTo(buyer)], waitlistTicketsSold: [saleTo(buyer, {orderId: 78})], waitlistPortionsAssigned: [portionTo(buyer)]
    })

    it.each([
        {event: 'the dinner is booked', run: (queue: FakeSenderQueue) => notify(queue, everyKind())},
        {event: 'a portion is added', run: (queue: FakeSenderQueue) => notifyExtraPortions({} as D1Database, NotificationFactory.channel(queue),
            WaitlistFactory.defaultAssignmentResult({dinnerEventId: dinner.dinnerEventId, waitlistTicketsSold: [saleTo(buyer)], assigned: [portionTo(buyer)]}))}
    ])('GIVEN the booking emails flag off WHEN $event THEN no email is sent and no delivery record is written', async ({run}) => {
        vi.stubEnv('SHOULD_SEND_BOOKING_EMAILS_FLAG', 'false')
        const queue = fakeQueue()

        await run(queue)

        expect(sentMessages(queue)).toEqual([])
        expect(recorded.rows).toEqual([])
    })

    it.each([
        {operation: 'every kind of booking notification', outcomes: everyKind, kinds: [
            Kind.WAITLIST_JOINED, Kind.WAITLIST_JOINED, Kind.WAITLIST_JOINED, Kind.WAITLIST_BUILDUP, Kind.TICKET_SOLD, Kind.TICKET_BOUGHT,
            Kind.TICKET_SOLD, Kind.WAITLIST_TICKET_ASSIGNED, Kind.WAITLIST_EXTRA_PORTION
        ]},
        {operation: 'no booking notification', outcomes: () => outcomesOf({}), kinds: []}
    ])('GIVEN an operation with $operation WHEN the dinner is booked THEN one email of its kind is queued and one delivery record written per notification', async ({outcomes, kinds}) => {
        const queue = fakeQueue()

        await notify(queue, outcomes())

        expect(sentMessages(queue).map(message => message.meta.kind).sort()).toEqual([...kinds].sort())
        expect(recorded.rows).toHaveLength(kinds.length)
    })

    // An email about an inhabitant goes to the inhabitant's closest user (findClosestUserInHousehold): the inhabitant's own
    // user, else the first user of the inhabitant's household, whoever booked. A sale emails both sides: the seller's
    // closest user, the selling household's first user when the history names no seller, and the buyer's. The waitlist
    // buildup goes to the chef's closest user. One recipient per email, never every member
    it.each([
        {email: 'waitlist joined for an inhabitant with a user, joined by a system run', heard: ofKind(Kind.WAITLIST_JOINED), outcomes: outcomesOf({joined: [joinedEvent(parent, systemUser.id, 1)]}), to: [parent]},
        {email: 'waitlist joined for an inhabitant without a user, joined by a system run', heard: ofKind(Kind.WAITLIST_JOINED), outcomes: outcomesOf({joined: [joinedEvent(child, systemUser.id, 1)]}), to: [parent]},
        {email: 'waitlist ticket assigned to the first in line with a user', heard: ofKind(Kind.WAITLIST_TICKET_ASSIGNED), outcomes: outcomesOf({waitlistTicketsSold: [saleTo(buyer)]}), to: [buyer]},
        {email: 'waitlist ticket assigned to the first in line without a user', heard: ofKind(Kind.WAITLIST_TICKET_ASSIGNED), outcomes: outcomesOf({waitlistTicketsSold: [saleTo(buyerWithoutLogin)]}), to: [buyer]},
        {email: 'ticket bought by an inhabitant with a user', heard: ofKind(Kind.TICKET_BOUGHT), outcomes: outcomesOf({ticketsSold: [saleTo(buyer)]}), to: [buyer]},
        {email: 'ticket bought for an inhabitant without a user', heard: ofKind(Kind.TICKET_BOUGHT), outcomes: outcomesOf({ticketsSold: [saleTo(buyerWithoutLogin)]}), to: [buyer]},
        {email: 'waitlist extra portion for an inhabitant with a user', heard: ofKind(Kind.WAITLIST_EXTRA_PORTION), outcomes: outcomesOf({waitlistPortionsAssigned: [portionTo(buyer)]}), to: [buyer]},
        {email: 'waitlist extra portion for an inhabitant without a user', heard: ofKind(Kind.WAITLIST_EXTRA_PORTION), outcomes: outcomesOf({waitlistPortionsAssigned: [portionTo(buyerWithoutLogin)]}), to: [buyer]},
        {email: 'ticket sold for a seller with the household\'s second user', heard: ofKind(Kind.TICKET_SOLD), outcomes: outcomesOf({ticketsSold: [saleTo(buyer, {sellerInhabitantId: sellerToo.id})]}), to: [sellerToo]},
        {email: 'ticket sold for a seller without a user', heard: ofKind(Kind.TICKET_SOLD), outcomes: outcomesOf({ticketsSold: [saleTo(buyer, {sellerInhabitantId: sellerWithoutLogin.id})]}), to: [seller]},
        {email: 'ticket sold for a seller the history does not name', heard: ofKind(Kind.TICKET_SOLD), outcomes: outcomesOf({ticketsSold: [saleTo(buyer)]}), to: [seller]},
        {email: 'waitlist buildup for a chef with a user', heard: ofKind(Kind.WAITLIST_BUILDUP), outcomes: outcomesOf({joined: [joinedEvent(neighbour, neighbour.userId!, 3)]}), to: [chef]},
        {email: 'waitlist buildup for a chef without a user, in a household with one', heard: ofKind(Kind.WAITLIST_BUILDUP), chefId: chefWithoutOwnLogin.id,
            outcomes: outcomesOf({joined: [joinedEvent(neighbour, neighbour.userId!, 3)]}), to: [chefsPartner]}
    ])('GIVEN $email WHEN the emails resolve THEN one goes, to the closest user', async ({heard, outcomes, to, chefId = chef.id}) => {
        mockDinners(chefId)
        const queue = fakeQueue()

        await notify(queue, outcomes)

        expect(sentMessages(queue).filter(heard).map(message => message.to)).toEqual(to.map(addressOf))
    })

    it('GIVEN a household its read lists with a later login first WHEN a child\'s place mails THEN the member of the lowest id with a login hears it', async () => {
        mockPeople(people, logins, households.map(household => ({...household, inhabitants: [...household.inhabitants].reverse()})))
        const queue = fakeQueue()

        await notify(queue, outcomesOf({joined: [joinedEvent(child, systemUser.id, 1)]}))

        expect(sentMessages(queue).map(message => message.to)).toEqual([addressOf(parent)])
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

    // An email sent writes the delivery record of its subject and version. A subject's version counts up from 1, one step
    // per history row that sends an email: a place on the waiting list its join, an order the extra portion that created
    // it and each BUY, the dinner its first waitlist buildup and each extra portion row after it
    describe('the delivery records of the emails', () => {
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
        // The records of the emails of a notification, by the notification their reference leads with
        const rowsOfKind = (kind: string) => recorded.rows.filter(row => mailKindOf(row.reference) === kind)
        // A subject's records, each by its notification and version, by version and then notification
        const rowsOf = (subjectType: Delivery['subjectType'], subjectId: number) => recorded.rows
            .filter(row => row.subjectType === subjectType && row.subjectId === subjectId)
            .map(row => ({kind: mailKindOf(row.reference), version: row.version}))
            .sort((a, b) => a.version - b.version || a.kind.localeCompare(b.kind))

        it.each([
            {email: 'waitlist joined for an inhabitant', kind: Kind.WAITLIST_JOINED, outcomes: outcomesOf({joined: [joinedEvent(parent, parent.userId!, 1)]}), history: [],
                subject: {subjectType: TICKET_WAITLIST, subjectId: entryOf(parent), version: 1}},
            {email: 'waitlist ticket assigned to the first in line', kind: Kind.WAITLIST_TICKET_ASSIGNED, outcomes: outcomesOf({waitlistTicketsSold: [saleTo(buyer)]}), history: [bought(77)],
                subject: {subjectType: ORDER, subjectId: 77, version: 1}},
            {email: 'ticket sold for the seller to the waiting list', kind: Kind.TICKET_SOLD, outcomes: outcomesOf({waitlistTicketsSold: [saleTo(buyer)]}), history: [bought(77)],
                subject: {subjectType: ORDER, subjectId: 77, version: 1}},
            {email: 'ticket bought by an inhabitant', kind: Kind.TICKET_BOUGHT, outcomes: outcomesOf({ticketsSold: [saleTo(buyer)]}), history: [bought(77)],
                subject: {subjectType: ORDER, subjectId: 77, version: 1}},
            {email: 'ticket sold for the seller a second time', kind: Kind.TICKET_SOLD, outcomes: outcomesOf({ticketsSold: [saleTo(buyer)]}), history: [bought(77), bought(77)],
                subject: {subjectType: ORDER, subjectId: 77, version: 2}},
            {email: 'waitlist extra portion for the first in line', kind: Kind.WAITLIST_EXTRA_PORTION, outcomes: outcomesOf({waitlistPortionsAssigned: [portionTo(buyer, 88)]}), history: [extraPortion(88)],
                subject: {subjectType: ORDER, subjectId: 88, version: 1}},
            {email: 'waitlist buildup for the chef', kind: Kind.WAITLIST_BUILDUP, outcomes: outcomesOf({joined: [joinedEvent(neighbour, neighbour.userId!, 3)]}), history: [],
                subject: {subjectType: DINNER_EVENT, subjectId: dinner.dinnerEventId, version: 1}},
            // The chef's extra portions before the first buildup tell the chef nothing
            {email: 'waitlist buildup for the chef after the chef\'s earlier extra portions', kind: Kind.WAITLIST_BUILDUP,
                outcomes: outcomesOf({joined: [joinedEvent(neighbour, neighbour.userId!, 3)]}), history: [extraPortion(88), extraPortion(89)],
                subject: {subjectType: DINNER_EVENT, subjectId: dinner.dinnerEventId, version: 1}}
        ])('GIVEN $email WHEN it is sent THEN one delivery record of its subject and version is written', async ({kind, outcomes, history, subject}) => {
            store.history = history
            const queue = fakeQueue()

            await notify(queue, outcomes)

            expect(mailsOfKind(queue, kind)).toHaveLength(1)
            expect(rowsOfKind(kind)).toEqual([expect.objectContaining({...subject, kind: DeliveryKindSchema.enum.EMAIL})])
        })

        // A subject through its history, a step every 10 minutes: each step's new history rows land 5 minutes before it; a
        // step with no new row sends no new version
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
            {subject: 'a line building up, then after each of two rounds of extra portions, then a rerun', subjectType: DINNER_EVENT, subjectId: dinner.dinnerEventId, steps: [
                {outcomes: outcomesOf({joined: [joinedEvent(neighbour, neighbour.userId!, 3)]}), history: []},
                {outcomes: outcomesOf({joined: [joinedEvent(parent, parent.userId!, 3)]}), history: [extraPortion(88, 15)]},
                {outcomes: outcomesOf({joined: [joinedEvent(sibling, sibling.userId!, 3)]}), history: [extraPortion(88, 15), extraPortion(89, 25)]},
                {outcomes: outcomesOf({joined: [joinedEvent(sibling, sibling.userId!, 3)]}), history: [extraPortion(88, 15), extraPortion(89, 25)]}
            ], rows: [
                {kind: Kind.WAITLIST_BUILDUP, version: 1}, {kind: Kind.WAITLIST_BUILDUP, version: 2}, {kind: Kind.WAITLIST_BUILDUP, version: 3}
            ]}
        ])('GIVEN $subject WHEN each step notifies THEN its versions count up from 1, one per history row that sends an email', async ({subjectType, subjectId, steps, rows}) => {
            for (const [index, {outcomes, history}] of steps.entries()) {
                vi.setSystemTime(at(10 * (index + 1)))
                store.history = history
                await notify(fakeQueue(), outcomes)
            }

            expect(rowsOf(subjectType, subjectId)).toEqual(rows)
        })
    })

    // A maintenance run reads the booking notifications off the dinners past their booking deadline as they stand and
    // sends those without a delivery record: two runs have the effects of one
    describe('the booking notifications a maintenance run sends', () => {
        const {OrderAuditActionSchema, OrderAuditChangeSchema, OrderAuditSourceSchema, createOrderAuditData} = useBookingValidation()
        const SEASON_ID = 9
        // The run's clock, the day before the dinner and past its booking deadline
        const at = (minute: number) => new Date(2026, 9, 18, 12, minute)
        beforeEach(() => {
            vi.useFakeTimers({toFake: ['Date']})
            vi.setSystemTime(at(30))
            vi.mocked(fetchDinnerEvents).mockResolvedValue([{...DinnerEventFactory.defaultDinnerEventDisplay(), id: dinner.dinnerEventId, date: dinner.date, seasonId: SEASON_ID}])
        })
        afterEach(() => vi.useRealTimers())

        // The parent's place on the waiting list
        const place = () => WaitlistFactory.defaultEntry({
            id: entryOf(parent), dinnerEventId: dinner.dinnerEventId, inhabitantId: parent.id, ticketPrice: ADULT_PRICE, createdAt: at(10)
        })
        // A ticket sold to the first in line: the buyer holds the order, the row's snapshot the seller's order before the sale
        const sale = () => OrderFactory.defaultOrderHistoryDisplay(undefined, {
            id: 1, orderId: 77, inhabitantId: buyer.id, dinnerEventId: dinner.dinnerEventId, action: OrderAuditActionSchema.enum.USER_CLAIMED, timestamp: at(10),
            auditData: createOrderAuditData(OrderAuditChangeSchema.enum.BUY,
                OrderFactory.defaultOrderSnapshot({id: 77, dinnerEventId: dinner.dinnerEventId, inhabitantId: seller.id, householdId: sellers.id}),
                OrderAuditSourceSchema.enum['waitlist-assignment'])
        })
        const soldTicket = OrderFactory.defaultOrder(undefined, {id: 77, dinnerEventId: dinner.dinnerEventId, inhabitantId: buyer.id, ticketPriceId: ADULT_PRICE_ID})

        const notifications = [
            {outcome: 'a place on the waiting list', kinds: [Kind.WAITLIST_JOINED], written: () => ({queue: [place()], history: [], booked: []})},
            {outcome: 'a ticket sold to the first in line', kinds: [Kind.TICKET_SOLD, Kind.WAITLIST_TICKET_ASSIGNED],
                written: () => ({queue: [], history: [sale()], booked: [soldTicket]})}
        ]
        // D1 holds the dinner as written, with the booking emails flag as given
        const holdDinner = ({queue, history, booked}: ReturnType<typeof notifications[number]['written']>, flag: string) => {
            vi.stubEnv('SHOULD_SEND_BOOKING_EMAILS_FLAG', flag)
            store.history = history
            vi.mocked(fetchWaitlistForDinners).mockResolvedValue(queue)
            vi.mocked(fetchOrders).mockResolvedValue(booked)
        }
        const send = (sender: FakeSenderQueue, options?: Parameters<typeof sendNotifications>[3], seasonId: number | null = SEASON_ID) =>
            sendNotifications({} as D1Database, NotificationFactory.channel(sender), seasonId, options)

        const states = [
            {given: 'no delivery records', flag: 'true', runBefore: async () => undefined, sent: true},
            {given: 'the delivery records of the maintenance run before', flag: 'true', runBefore: () => send(fakeQueue()), sent: false},
            {given: 'no delivery records and the booking emails flag off', flag: 'false', runBefore: async () => undefined, sent: false}
        ]

        it.each(notifications.flatMap(notification => states.map(state => ({...notification, ...state}))))('GIVEN a dinner with $outcome and $given WHEN a maintenance run sends the booking notifications THEN its emails go: $sent', async ({kinds, written, flag, runBefore, sent}) => {
            holdDinner(written(), flag)
            await runBefore()
            const sender = fakeQueue()

            await send(sender)

            expect(sentMessages(sender).map(message => message.meta.kind).sort()).toEqual(sent ? kinds : [])
        })

        // The admin's view of what the DAILY_MAINTENANCE job sends, whether or not the flag lets it send
        it('GIVEN a dinner with a ticket sold to the first in line and the booking emails flag off WHEN the maintenance run is a dry run THEN it lists the booking notifications per user, and nothing is sent or recorded', async () => {
            const [, ticketSold] = notifications
            holdDinner(ticketSold!.written(), 'false')
            const sender = fakeQueue()

            const {dryRun} = await send(sender, {dryRun: true})

            expect(dryRun?.senderEvent).toBe(SenderEvent.BOOKING_STATUS)
            expect([...dryRun?.users ?? []].sort((a, b) => a.userId - b.userId)).toEqual([
                {userId: buyer.userId, toSend: {[Kind.WAITLIST_TICKET_ASSIGNED]: 1}},
                {userId: seller.userId, toSend: {[Kind.TICKET_SOLD]: 1}}
            ])
            expect(sentMessages(sender)).toEqual([])
            expect(recorded.rows).toEqual([])
        })

        // Without an active season no dinner has notifications to send
        const nothingCounted = {sent: 0}
        it.each([
            {run: 'sends the booking notifications', options: undefined, result: {counts: nothingCounted, emitted: []}},
            {run: 'does a dry run of the booking notifications', options: {dryRun: true}, result: {counts: nothingCounted, dryRun: {senderEvent: SenderEvent.BOOKING_STATUS, users: []}}}
        ])('GIVEN no active season WHEN a maintenance run $run THEN it reads no dinners, sends nothing and counts nothing', async ({options, result}) => {
            const sender = fakeQueue()

            expect(await send(sender, options, null)).toEqual(result)
            expect(fetchDinnerEvents).not.toHaveBeenCalled()
            expect(sentMessages(sender)).toEqual([])
        })
    })
})
