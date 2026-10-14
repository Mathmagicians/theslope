import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {
    emitWaitlistBuildup, emitWaitlistJoined, emitWaitlistTicketAssigned, emitWaitlistTicketSold
} from '~~/server/utils/sender/events/waitlist'
import type {EmailChannel} from '~~/server/utils/sender/config'
import {NotificationFactory} from '~~/tests/e2e/testDataFactories/notificationFactory'

const dinner = {dinnerEventId: 7, date: new Date(2026, 9, 19), menuTitle: 'Lasagne'}
const to = 'anna@example.com'

const events = [
    {kind: 'WAITLIST_JOINED', send: (channel: EmailChannel) => emitWaitlistJoined(channel, to, 'Anna', dinner, 2)},
    {kind: 'WAITLIST_TICKET_ASSIGNED', send: (channel: EmailChannel) => emitWaitlistTicketAssigned(channel, to, 'Anna', dinner, 'Voksen')},
    {kind: 'WAITLIST_BUILDUP', send: (channel: EmailChannel) => emitWaitlistBuildup(channel, to, 'Anna', dinner, 5, 4.5)},
    {kind: 'WAITLIST_TICKET_SOLD', send: (channel: EmailChannel) => emitWaitlistTicketSold(channel, to, dinner)}
]

describe('waiting-list mails', () => {
    const logs = {warn: vi.spyOn(console, 'warn'), info: vi.spyOn(console, 'info')}
    beforeEach(() => Object.values(logs).forEach(spy => spy.mockImplementation(() => {})))
    afterEach(() => Object.values(logs).forEach(spy => spy.mockClear()))

    it.each(events)('$kind queues through the channel when e-mail is on', async ({send}) => {
        const queue = {send: vi.fn().mockResolvedValue(undefined)} as unknown as Queue

        const result = await send(NotificationFactory.channel(queue))

        expect(result.queued).toBe(true)
        expect(queue.send).toHaveBeenCalledOnce()
    })

    it.each(events)('$kind reports not sent and logs the missing setting when e-mail is off', async ({kind, send}) => {
        const result = await send({on: false, missing: 'DEPLOY_URL'})

        expect(result).toMatchObject({queued: false, degraded: true})
        expect(logs.warn).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`DEPLOY_URL.*${kind}`)))
    })
})
