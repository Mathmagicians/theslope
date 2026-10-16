import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {
    bookingMails, emitTicketSold, emitWaitlistBuildup, emitWaitlistExtraPortion, emitWaitlistJoined, emitWaitlistTicketAssigned,
    NO_BOOKING_MAILS, type BookingMails
} from '~~/server/utils/sender/events/waitlist'
import type {EmailChannel} from '~~/server/utils/sender/config'
import type {EmailMessage} from '~/composables/useNotificationValidation'
import {NotificationFactory} from '~~/tests/e2e/testDataFactories/notificationFactory'

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

const fakeQueue = () => ({send: vi.fn().mockResolvedValue(undefined)}) as unknown as Queue & {send: ReturnType<typeof vi.fn>}
const sentMessages = (queue: {send: ReturnType<typeof vi.fn>}): EmailMessage[] => queue.send.mock.calls.map(([message]) => message as EmailMessage)

describe('booking mails', () => {
    const logs = {warn: vi.spyOn(console, 'warn'), info: vi.spyOn(console, 'info')}
    beforeEach(() => Object.values(logs).forEach(spy => spy.mockImplementation(() => {})))
    afterEach(() => Object.values(logs).forEach(spy => spy.mockClear()))

    it.each(events)('$kind queues through the channel when e-mail is on', async ({send}) => {
        const queue = fakeQueue()

        const result = await send(NotificationFactory.channel(queue))

        expect(result.queued).toBe(true)
        expect(queue.send).toHaveBeenCalledOnce()
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
        expect(queue.send).not.toHaveBeenCalled()
    })
})
