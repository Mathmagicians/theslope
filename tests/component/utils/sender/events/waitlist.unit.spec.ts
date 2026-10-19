import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createError} from 'h3'
import {
    bookingMails, emitTicketSold, emitWaitlistBuildup, emitWaitlistExtraPortion, emitWaitlistJoined, emitWaitlistTicketAssigned,
    NO_BOOKING_MAILS, notifyBookingOutcomes, notifyExtraPortions, type BookingMails
} from '~~/server/utils/sender/events/waitlist'
import * as peopleReads from '~~/server/data/prismaRepository'
import * as dinnerReads from '~~/server/data/financesRepository'
import {fetchHouseholdsByIds, fetchInhabitantsByIds, fetchSeason, fetchUsersByIds} from '~~/server/data/prismaRepository'
import {fetchDinnerEventsByIds} from '~~/server/data/financesRepository'
import type {EmailChannel} from '~~/server/utils/sender/config'
import type {EmailMessage, SenderEmitResult} from '~/composables/useNotificationValidation'
import type {HouseholdDetail, InhabitantDisplay, UserDisplay} from '~/composables/useCoreValidation'
import {useBookingValidation, type BookingOutcomes, type TicketSale, type WaitlistJoined} from '~/composables/useBookingValidation'
import {useUserPreferenceValidation, type NotificationChannel} from '~/composables/useUserPreferenceValidation'
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
    createOrders: vi.fn(), findReleasedOrderId: vi.fn(), claimReleasedOrder: vi.fn(), fetchDinnerEventsByIds: vi.fn()
}))
// The events read the config and log through createError from the Nitro auto-import scope
vi.stubGlobal('useAppConfig', () => ({theslope: {waitlistBuildupThreshold: 3}}))
vi.stubGlobal('createError', createError)

const dinner = {dinnerEventId: 7, date: new Date(2026, 9, 19), menuTitle: 'Lasagne'}
const to = 'anna@example.com'
const seller = 'PL_4_4_3'
const buyer = 'AR_1_2'

const events = [
    {kind: 'WAITLIST_JOINED', send: (channel: EmailChannel) => emitWaitlistJoined(channel, to, 'Anna', dinner, 2, 'Barn')},
    {kind: 'WAITLIST_TICKET_ASSIGNED', send: (channel: EmailChannel) => emitWaitlistTicketAssigned(channel, to, 'Anna', dinner, 'Voksen', seller, buyer)},
    {kind: 'WAITLIST_EXTRA_PORTION', send: (channel: EmailChannel) => emitWaitlistExtraPortion(channel, to, 'Anna', dinner, 'Voksen', buyer)},
    {kind: 'WAITLIST_BUILDUP', send: (channel: EmailChannel) => emitWaitlistBuildup(channel, to, 'Anna', dinner, 5, 4.5)},
    {kind: 'TICKET_SOLD', send: (channel: EmailChannel) => emitTicketSold(channel, to, 'Lene', dinner, seller, buyer)}
]

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

// The repository reads the mails make, each by name with its count
const readsOf = () => Object.fromEntries([...Object.entries(dinnerReads), ...Object.entries(peopleReads)]
    .flatMap(([name, read]) => vi.isMockFunction(read) && read.mock.calls.length > 0 ? [[name, read.mock.calls.length]] : []))

const outcomesOf = (outcomes: Partial<BookingOutcomes>): BookingOutcomes => ({...OrderFactory.defaultScaffoldResult().outcomes, ...outcomes})

describe('booking mails', () => {
    const logs = {warn: vi.spyOn(console, 'warn'), info: vi.spyOn(console, 'info')}
    beforeEach(() => Object.values(logs).forEach(spy => spy.mockImplementation(() => {})))
    afterEach(() => Object.values(logs).forEach(spy => spy.mockClear()))

    it.each(events)('$kind queues through the channel when e-mail is on', async ({send}) => {
        const queue = fakeQueue()

        const result = await send(NotificationFactory.channel(queue))

        expect(result.queued).toBe(true)
        expect(sentMessages(queue)).toHaveLength(1)
    })

    it.each(events)('$kind reports not sent and logs the missing setting when e-mail is off', async ({kind, send}) => {
        const result = await send({on: false, missing: 'DEPLOY_URL'})

        expect(result).toMatchObject({queued: false, degraded: true})
        expect(logs.warn).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`DEPLOY_URL.*${kind}`)))
    })

    it.each([
        {kind: 'TICKET_SOLD', send: (channel: EmailChannel) => emitTicketSold(channel, to, 'Lene', dinner, seller, buyer)},
        {kind: 'WAITLIST_TICKET_ASSIGNED', send: (channel: EmailChannel) => emitWaitlistTicketAssigned(channel, to, 'Anna', dinner, 'Voksen', seller, buyer)}
    ])('$kind names the selling and the buying household', async ({send}) => {
        const queue = fakeQueue()

        await send(NotificationFactory.channel(queue))

        const [message] = sentMessages(queue)
        expect(message!.text).toContain(seller)
        expect(message!.text).toContain(buyer)
    })

    it('WAITLIST_EXTRA_PORTION names the buying household', async () => {
        const queue = fakeQueue()

        await emitWaitlistExtraPortion(NotificationFactory.channel(queue), to, 'Anna', dinner, 'Voksen', buyer)

        expect(sentMessages(queue)[0]!.text).toContain(buyer)
    })

    it('WAITLIST_JOINED names the place and the ticket type of the line', async () => {
        const queue = fakeQueue()

        await emitWaitlistJoined(NotificationFactory.channel(queue), to, 'Anna', dinner, 2, 'Barn')

        const [message] = sentMessages(queue)
        expect(message!.text).toContain('#2 i kø')
        expect(message!.text).toContain('Billettype: Barn')
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
            'TICKET_SOLD', 'TICKET_SOLD', 'WAITLIST_BUILDUP', 'WAITLIST_EXTRA_PORTION', 'WAITLIST_JOINED', 'WAITLIST_TICKET_ASSIGNED'
        ])
    })

    it('reports every mail not sent and fails nothing when e-mail is off', async () => {
        const results = await bookingMails({on: false, missing: 'DEPLOY_URL'}, mails)

        expect(results).toHaveLength(6)
        expect(results.every(result => !result.queued && result.degraded)).toBe(true)
    })

    it('sends nothing for an operation with no mails', async () => {
        const queue = fakeQueue()

        expect(await bookingMails(NotificationFactory.channel(queue), NO_BOOKING_MAILS)).toEqual([])
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
// a sold ticket the selling household's and the buyer's
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

    const sale = {dinnerEventId: dinner.dinnerEventId, ticketPriceId: 4, buyerInhabitantId: member.id, buyerHouseholdId: household.id, sellerHouseholdId: household.id, sellerInhabitantId: member.id}
    const portion = {dinnerEventId: dinner.dinnerEventId, entryId: 1, inhabitantId: member.id, isGuestTicket: false, portions: 1, orderId: 77, ticketPriceId: 4}

    it.each([
        {placement: 'an extra portion a scaffold run finished', kinds: ['WAITLIST_EXTRA_PORTION'], notify: (channel: EmailChannel) =>
            notifyBookingOutcomes({} as D1Database, channel, {joined: [], ticketsSold: [], waitlistTicketsSold: [], waitlistPortionsAssigned: [portion]})},
        {placement: 'a sale the chef\'s extra portions finished', kinds: ['TICKET_SOLD', 'WAITLIST_TICKET_ASSIGNED'], notify: (channel: EmailChannel) =>
            notifyExtraPortions({} as D1Database, channel, WaitlistFactory.defaultAssignmentResult({dinnerEventId: dinner.dinnerEventId, waitlistTicketsSold: [sale]}))}
    ])('$placement reaches its mails', async ({kinds, notify}) => {
        const queue = fakeQueue()

        await notify(NotificationFactory.channel(queue))

        expect(sentMessages(queue).map(message => message.meta.kind).sort()).toEqual(kinds)
    })
})

// A run's mails read the people they name in bulk: one inhabitants read and one users read, whatever the number of events
describe('the people a run\'s mails name', () => {
    const logs = {warn: vi.spyOn(console, 'warn'), info: vi.spyOn(console, 'info')}
    const {TicketTypeSchema} = useBookingValidation()
    type Member = HouseholdDetail['inhabitants'][number]
    const template = HouseholdFactory.defaultHouseholdDetail().inhabitants[0]!
    // A person of the run with a name of its own, a login when userId is given
    const person = (id: number, householdId: number, userId: number | null): Member => ({...template, id, householdId, userId, name: `Skråner ${id}`})
    const [seller, sellerWithoutLogin, buyer, buyerWithoutLogin] = [person(301, 30, 3010), person(302, 30, null), person(201, 20, 2010), person(202, 20, null)]
    const [parent, child, neighbour] = [person(101, 10, 1010), person(102, 10, null), person(111, 11, 1110)]
    const [chef, chefWithoutLogin] = [person(501, 50, 5010), person(502, 50, null)]
    const householdOf = (id: number, members: Member[]): HouseholdDetail => ({...HouseholdFactory.defaultHouseholdDetail(`h${id}`), id, inhabitants: members})
    const [sellers, buyers] = [householdOf(30, [seller, sellerWithoutLogin]), householdOf(20, [buyer, buyerWithoutLogin])]
    const people = [seller, sellerWithoutLogin, buyer, buyerWithoutLogin, parent, child, neighbour, chef, chefWithoutLogin]
    const addressOf = ({id}: Member): string => `${id}@example.com`
    const logins = people.flatMap(member => member.userId ? [UserFactory.defaultUserWithInhabitant(`u${member.id}`, {id: member.userId, email: addressOf(member)})] : [])
    beforeEach(() => {
        Object.values(logs).forEach(spy => spy.mockImplementation(() => {}))
        mockDinners(chef.id)
        mockPeople(people, logins, [sellers, buyers])
    })
    afterEach(() => vi.clearAllMocks())

    // A place in the dinner's adult line; the buildup threshold is 3
    const joinedEvent = (joiner: Member, bookedByUserId: number, position: number): WaitlistJoined => ({
        dinnerEventId: dinner.dinnerEventId, inhabitantId: joiner.id, bookedByUserId, position, ticketType: TicketTypeSchema.enum.ADULT, queueSize: position, portionNeed: position
    })
    const saleTo = (owner: Member): TicketSale =>
        ({dinnerEventId: dinner.dinnerEventId, ticketPriceId: 4, buyerInhabitantId: owner.id, buyerHouseholdId: owner.householdId, sellerHouseholdId: sellers.id, sellerInhabitantId: null})
    const portionTo = (owner: Member) =>
        ({dinnerEventId: dinner.dinnerEventId, entryId: owner.id, inhabitantId: owner.id, isGuestTicket: false, portions: 1, orderId: 77, ticketPriceId: 4})
    // The parent joins and books the child; the neighbour's place reaches the threshold
    const joined = [joinedEvent(parent, parent.userId!, 1), joinedEvent(child, parent.userId!, 2), joinedEvent(neighbour, neighbour.userId!, 3)]

    // A mail's kind, its recipient and the people and households of the run its text names
    const names = [...people.map(member => member.name), sellers.shortName!, buyers.shortName!]
    const mailOf = (message: EmailMessage) => JSON.stringify({kind: message.meta.kind, to: message.to, names: names.filter(name => message.text.includes(name))})
    // A result's dedupe key leads with its kind
    const kindOf = (result: SenderEmitResult): string => result.dedupeKey.split(':')[0]!

    // 40 dinners, the first 20 in season 9 and the others in season 10
    const fortyDinners = Array.from({length: 40}, (_, index) => ({id: 100 + index, seasonId: index < 20 ? 9 : 10}))

    it.each([
        {
            run: 'joins people to one dinner', dinners: [{id: dinner.dinnerEventId, seasonId: 9}], outcomes: outcomesOf({joined}),
            reads: {fetchDinnerEventsByIds: 1, fetchSeason: 1, fetchInhabitantsByIds: 1, fetchUsersByIds: 1}
        },
        {
            run: 'sells a ticket to the first in line on each of 40 dinners of two seasons', dinners: fortyDinners,
            outcomes: outcomesOf({waitlistTicketsSold: fortyDinners.map(({id}) => ({...saleTo(buyer), dinnerEventId: id}))}),
            reads: {fetchDinnerEventsByIds: 1, fetchSeason: 2, fetchHouseholdsByIds: 1, fetchInhabitantsByIds: 1, fetchUsersByIds: 1}
        }
    ])('GIVEN a run that $run WHEN its mails resolve THEN one read of each kind serves them all, and one season read per season', async ({dinners, outcomes, reads}) => {
        mockDinners(chef.id, dinners)

        await notifyBookingOutcomes({} as D1Database, NotificationFactory.channel(fakeQueue()), outcomes)

        expect(readsOf()).toEqual(reads)
    })

    // Three joins, a buildup, a sale to the household's buyer and to the first in line, an extra portion: eight mails
    const everyKind = () => outcomesOf({
        joined, ticketsSold: [saleTo(buyer)], waitlistTicketsSold: [saleTo(buyer)], waitlistPortionsAssigned: [portionTo(buyer)]
    })

    it('GIVEN a run with every kind of mail WHEN its mails resolve THEN they reach the queue in one batch, not one call per mail', async () => {
        const queue = fakeQueue()

        await notifyBookingOutcomes({} as D1Database, NotificationFactory.channel(queue), everyKind())

        expect(queue.send).not.toHaveBeenCalled()
        expect(sentBatches(queue).map(batch => batch.length)).toEqual([8])
    })

    it('GIVEN a run with every kind of mail WHEN its mails resolve THEN each reaches its recipient and names its people', async () => {
        const queue = fakeQueue()

        const results = await notifyBookingOutcomes({} as D1Database, NotificationFactory.channel(queue), everyKind())

        expect(results.every(result => result.queued)).toBe(true)
        expect(sentMessages(queue).map(mailOf).sort()).toEqual([
            {kind: 'WAITLIST_JOINED', to: addressOf(parent), names: [parent.name]},
            {kind: 'WAITLIST_JOINED', to: addressOf(parent), names: [child.name]},
            {kind: 'WAITLIST_JOINED', to: addressOf(neighbour), names: [neighbour.name]},
            {kind: 'WAITLIST_BUILDUP', to: addressOf(chef), names: [chef.name]},
            {kind: 'TICKET_SOLD', to: addressOf(seller), names: [seller.name, sellers.shortName, buyers.shortName]},
            {kind: 'TICKET_SOLD', to: addressOf(seller), names: [seller.name, sellers.shortName, buyers.shortName]},
            {kind: 'WAITLIST_TICKET_ASSIGNED', to: addressOf(buyer), names: [buyer.name, sellers.shortName, buyers.shortName]},
            {kind: 'WAITLIST_EXTRA_PORTION', to: addressOf(buyer), names: [buyer.name, buyers.shortName]}
        ].map(mail => JSON.stringify(mail)).sort())
    })

    it.each([
        {person: 'a booker the users read does not return', chefId: chef.id, outcomes: outcomesOf({joined: [joinedEvent(parent, 9999, 1)]}), unaddressed: 'WAITLIST_JOINED'},
        {person: 'a buyer without a login', chefId: chef.id, outcomes: outcomesOf({waitlistTicketsSold: [saleTo(buyerWithoutLogin)]}), unaddressed: 'WAITLIST_TICKET_ASSIGNED'},
        {person: 'an extra portion\'s owner without a login', chefId: chef.id, outcomes: outcomesOf({waitlistPortionsAssigned: [portionTo(buyerWithoutLogin)]}), unaddressed: 'WAITLIST_EXTRA_PORTION'},
        {person: 'a chef without a login', chefId: chefWithoutLogin.id, outcomes: outcomesOf({joined: [joinedEvent(neighbour, neighbour.userId!, 3)]}), unaddressed: 'WAITLIST_BUILDUP'}
    ])('GIVEN $person WHEN the mails resolve THEN that mail is reported unaddressed and the others go out', async ({chefId, outcomes, unaddressed}) => {
        mockDinners(chefId)

        const results = await notifyBookingOutcomes({} as D1Database, NotificationFactory.channel(fakeQueue()), outcomes)

        expect(results.filter(result => !result.queued).map(kindOf)).toEqual([unaddressed])
    })

    // The mails honour the recipient's own channels (Mine indstillinger → Notifikationer): with e-mail off the recipient
    // gets no mail, and the run's other recipients hear as before
    describe('the recipient\'s notification channels', () => {
        const {EMAIL, SMS} = useUserPreferenceValidation().NotificationChannelSchema.enum
        // A second member of the selling household with a login: the sale mails every member
        const sellerToo = person(303, 30, 3030)
        const run = [...people, sellerToo]
        // The people of the run, the recipient's login saving the channels given and every other login e-mail
        const mockChannels = (recipient: Member, notificationChannels: NotificationChannel[]) => mockPeople(
            run,
            run.flatMap(member => member.userId ? [UserFactory.defaultUserWithInhabitant(`u${member.id}`, {
                id: member.userId, email: addressOf(member), notificationChannels: member.id === recipient.id ? notificationChannels : [EMAIL]
            })] : []),
            [householdOf(30, [seller, sellerToo]), buyers]
        )
        const mails = [
            {kind: 'WAITLIST_JOINED', recipient: parent, outcomes: outcomesOf({joined: [joinedEvent(parent, parent.userId!, 1)]}), others: []},
            {kind: 'WAITLIST_BUILDUP', recipient: chef, outcomes: outcomesOf({joined: [joinedEvent(neighbour, neighbour.userId!, 3)]}), others: []},
            {kind: 'TICKET_SOLD', recipient: seller, outcomes: outcomesOf({ticketsSold: [saleTo(buyer)]}), others: [sellerToo]},
            {kind: 'WAITLIST_TICKET_ASSIGNED', recipient: buyer, outcomes: outcomesOf({waitlistTicketsSold: [saleTo(buyer)]}), others: []},
            {kind: 'WAITLIST_EXTRA_PORTION', recipient: buyer, outcomes: outcomesOf({waitlistPortionsAssigned: [portionTo(buyer)]}), others: []}
        ]
        const settings = [
            {setting: 'e-mail among them', channels: [EMAIL, SMS], mailed: true},
            {setting: 'no e-mail', channels: [SMS], mailed: false}
        ]

        it.each(mails.flatMap(mail => settings.map(setting => ({...mail, ...setting}))))('GIVEN the $kind recipient\'s channels with $setting WHEN the mails resolve THEN the recipient is mailed: $mailed, and the other recipients as before', async ({kind, recipient, outcomes, others, channels, mailed}) => {
            mockChannels(recipient, channels)
            const queue = fakeQueue()

            await notifyBookingOutcomes({} as D1Database, NotificationFactory.channel(queue), outcomes)

            expect(sentMessages(queue).filter(message => message.meta.kind === kind).map(message => message.to).sort())
                .toEqual([...(mailed ? [recipient] : []), ...others].map(addressOf).sort())
        })
    })
})
