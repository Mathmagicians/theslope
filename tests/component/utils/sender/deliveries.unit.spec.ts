import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createError, type H3Event} from 'h3'
import {deliverDesired, deliverInBackground, type DesiredOutgoing} from '~~/server/utils/sender/deliveries'
import {fetchDeliveries, recordDeliveries} from '~~/server/data/financesRepository'
import type {EmailChannel} from '~~/server/utils/sender/config'
import type {EmailMessage} from '~/composables/useNotificationValidation'
import {useDeliveryValidation, type Delivery} from '~/composables/useDeliveryValidation'
import {useUserPreferenceValidation} from '~/composables/useUserPreferenceValidation'
import {NotificationFactory} from '~~/tests/e2e/testDataFactories/notificationFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {fakeSenderQueue as fakeQueue, sentBatches, sentMessages, type FakeSenderQueue} from '~~/tests/component/utils/sender/fakeSenderQueue'
import {fakeDeliveries} from '~~/tests/component/utils/sender/fakeDeliveries'
import {spyOnLogs} from '~~/tests/component/logSpies'

// The unit runtime has no D1: the Delivery rows answer from the test
vi.mock('~~/server/data/financesRepository', () => ({fetchDeliveries: vi.fn(), recordDeliveries: vi.fn()}))
// A failure logs through createError, from the Nitro auto-import scope
vi.stubGlobal('createError', createError)

const {Kind} = NotificationFactory
const {SenderEventSchema, DeliverySubjectSchema, DeliveryKindSchema} = useDeliveryValidation()
const SenderEvent = SenderEventSchema.enum
const {TICKET_WAITLIST, ORDER} = DeliverySubjectSchema.enum
const {EMAIL, SMS} = useUserPreferenceValidation().NotificationChannelSchema.enum

// Two users of the run, email among their channels
const anna = UserFactory.defaultUserWithInhabitant('anna', {id: 6, email: 'anna@example.com'})
const knud = UserFactory.defaultUserWithInhabitant('knud', {id: 7, email: 'knud@example.com'})
const outgoing = NotificationFactory.defaultDesiredOutgoing

const logs = spyOnLogs()
// Each line of a log level, its arguments as text
const linesOf = (spy: typeof logs.error): string[] => spy.mock.calls.map(args =>
    args.map(arg => arg instanceof Error ? arg.message : typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '))
const errorLines = (): string[] => linesOf(logs.error)
const allLines = (): string[] => Object.values(logs).flatMap(linesOf)

let recorded: {rows: Delivery[]}
beforeEach(() => {
    Object.values(logs).forEach(spy => spy.mockImplementation(() => {}))
    recorded = fakeDeliveries()
})
afterEach(() => vi.clearAllMocks())

// A sender event's run on a channel: the run loads its desired deliveries through the closure
const deliverOn = (channel: EmailChannel, senderEvent: Parameters<typeof deliverDesired>[2], desired: DesiredOutgoing[], options?: Parameters<typeof deliverDesired>[4]) =>
    deliverDesired({} as D1Database, channel, senderEvent, async () => desired, options)

// A booking status run on email through the queue
const deliver = (queue: FakeSenderQueue, desired: DesiredOutgoing[], options?: Parameters<typeof deliverDesired>[4]) =>
    deliverOn(NotificationFactory.channel(queue), SenderEvent.BOOKING_STATUS, desired, options)

const messageTo = (queue: FakeSenderQueue, address: string): EmailMessage | undefined =>
    sentMessages<EmailMessage>(queue).find(message => message.to === address)

describe('deliverDesired', () => {
    it('GIVEN deliveries of two subject types WHEN a run delivers them THEN it reads the recorded rows once per subject type, queues the mails in one batch and records them in one write', async () => {
        const queue = fakeQueue()

        await deliver(queue, [
            outgoing(anna, {subjectType: TICKET_WAITLIST, subjectId: 601}),
            outgoing(knud, {subjectType: TICKET_WAITLIST, subjectId: 602}),
            outgoing(anna, {subjectType: ORDER, subjectId: 77, notification: Kind.TICKET_SOLD})
        ])

        const reads = vi.mocked(fetchDeliveries).mock.calls.map(([, subjectType, subjectIds]) => ({subjectType, subjectIds: [...subjectIds].sort((a, b) => a - b)}))
        expect(reads).toHaveLength(2)
        expect(reads).toEqual(expect.arrayContaining([{subjectType: TICKET_WAITLIST, subjectIds: [601, 602]}, {subjectType: ORDER, subjectIds: [77]}]))
        expect(queue.send).not.toHaveBeenCalled()
        expect(sentBatches(queue).map(batch => batch.length)).toEqual([3])
        expect(vi.mocked(recordDeliveries)).toHaveBeenCalledTimes(1)
    })

    it('GIVEN a job\'s run WHEN its deliveries queue THEN each records its subject, version and channel, the queued mail\'s dedupe key its reference and the job its run, counts as sent, and one line logs the count', async () => {
        const queue = fakeQueue()

        const {counts} = await deliver(queue, [outgoing(anna, {subjectId: 601, version: 2}), outgoing(knud, {subjectType: ORDER, subjectId: 77})], {jobRunId: 5})

        expect(recorded.rows).toHaveLength(2)
        expect(recorded.rows).toEqual(expect.arrayContaining([
            expect.objectContaining({subjectType: TICKET_WAITLIST, subjectId: 601, version: 2, kind: DeliveryKindSchema.enum.EMAIL, jobRunId: 5, reference: messageTo(queue, anna.email)?.meta.dedupeKey}),
            expect.objectContaining({subjectType: ORDER, subjectId: 77, version: 1, kind: DeliveryKindSchema.enum.EMAIL, jobRunId: 5, reference: messageTo(queue, knud.email)?.meta.dedupeKey})
        ]))
        expect(counts).toEqual({sent: 2})
        expect(logs.info).toHaveBeenCalledWith(`📬 > DELIVERY > [EVENT ${SenderEvent.BOOKING_STATUS}] sent 2`)
    })

    it('GIVEN a notification sent and recorded WHEN a run delivers it again THEN no email goes and its row stays one', async () => {
        const delivery = outgoing(anna)
        await deliver(fakeQueue(), [delivery])
        const queue = fakeQueue()

        const {counts} = await deliver(queue, [delivery])

        expect(sentMessages(queue)).toEqual([])
        expect(counts.sent).toBe(0)
        expect(recorded.rows).toHaveLength(1)
    })

    // An override is the admin's act on the users' behalf: its line names the admin and the users (ADR-004)
    it('GIVEN notifications to two users sent and recorded WHEN an admin re-sends them THEN they go again, each records a second row, and one line logs the admin and the users', async () => {
        const desired = [outgoing(anna, {subjectId: 601}), outgoing(knud, {subjectId: 602})]
        await deliver(fakeQueue(), desired)
        const queue = fakeQueue()
        const adminOverride = {adminUserId: 90}

        const {counts} = await deliver(queue, desired, {adminOverride})

        expect(sentMessages<EmailMessage>(queue).map(message => message.to).sort()).toEqual([anna.email, knud.email])
        expect(counts.sent).toBe(2)
        expect(recorded.rows).toHaveLength(4)
        const lines = allLines().filter(line => line.includes(`[EVENT ${SenderEvent.BOOKING_STATUS}] re-sent by admin ${adminOverride.adminUserId} to users`))
        expect(lines).toHaveLength(1)
        expect(lines[0]!.split('to users')[1]!.match(/\d+/g)?.map(Number).sort((a, b) => a - b)).toEqual([anna.id, knud.id])
    })

    it('GIVEN the queue refused a run\'s mail WHEN the next run delivers it THEN it goes and records its one row', async () => {
        const delivery = outgoing(anna)
        await deliver(fakeQueue([1]), [delivery])
        const queue = fakeQueue()

        await deliver(queue, [delivery])

        expect(recorded.rows.map(row => row.reference)).toEqual(sentMessages<EmailMessage>(queue).map(message => message.meta.dedupeKey))
        expect(recorded.rows).toHaveLength(1)
    })

    // A mail goes where the recipient's channels hold email
    it.each([
        {recipient: 'email among its channels', channels: [EMAIL, SMS], sent: 1},
        {recipient: 'no email among its channels', channels: [SMS], sent: 0}
    ])('GIVEN a recipient with $recipient WHEN a run delivers THEN $sent mails go, recorded and counted alike', async ({channels, sent}) => {
        const queue = fakeQueue()

        const {counts} = await deliver(queue, [outgoing({...anna, notificationChannels: channels})])

        expect(sentMessages(queue)).toHaveLength(sent)
        expect(recorded.rows).toHaveLength(sent)
        expect(counts).toEqual({sent})
    })

    // A mailbox, the accountant's, has no user and no channels of its own: the user's opt-out does not reach it
    it('GIVEN a delivery to a mailbox WHEN a run delivers it THEN its email goes to the mailbox, counts as sent and records its row', async () => {
        const mailbox = NotificationFactory.config().accountantEmail
        const queue = fakeQueue()

        const {counts} = await deliverOn(NotificationFactory.channel(queue), SenderEvent.MONTHLY_BILLING, [NotificationFactory.mailboxDesiredOutgoing(mailbox)])

        expect(sentMessages<EmailMessage>(queue).map(message => message.to)).toEqual([mailbox])
        expect(counts).toEqual({sent: 1})
        expect(recorded.rows).toHaveLength(1)
    })

    // An admin's re-send leaves a mailbox's delivery recorded twice; the sent-twice warning is about users' deliveries
    it('GIVEN a delivery to a mailbox recorded twice, once by an admin\'s re-send WHEN a run delivers it THEN nothing goes again and no line reports it sent twice', async () => {
        const delivery = NotificationFactory.mailboxDesiredOutgoing(NotificationFactory.config().accountantEmail)
        recorded.rows = [NotificationFactory.recordedDelivery(delivery), NotificationFactory.recordedDelivery(delivery)]
        const queue = fakeQueue()

        const {counts} = await deliverOn(NotificationFactory.channel(queue), SenderEvent.MONTHLY_BILLING, [delivery])

        expect(sentMessages(queue)).toEqual([])
        expect(counts).toEqual({sent: 0})
        expect(linesOf(logs.warn).some(line => line.includes('[SENT TWICE]'))).toBe(false)
    })

    it('GIVEN deliveries to two users, one of them recorded WHEN delivered as a dry run THEN it counts per user what a run sends, and neither queues nor records', async () => {
        const sentBefore = outgoing(anna, {subjectId: 601})
        await deliver(fakeQueue(), [sentBefore])
        const queue = fakeQueue()

        const {counts, dryRun} = await deliver(queue, [
            sentBefore,
            outgoing(anna, {subjectId: 602}),
            outgoing(knud, {subjectType: ORDER, subjectId: 77, notification: Kind.TICKET_SOLD})
        ], {dryRun: true})

        expect(counts).toEqual({sent: 2})
        expect(dryRun).toEqual({senderEvent: SenderEvent.BOOKING_STATUS, users: expect.any(Array)})
        expect([...dryRun?.users ?? []].sort((a, b) => a.userId - b.userId)).toEqual([
            {userId: anna.id, toSend: {[Kind.WAITLIST_JOINED]: 1}},
            {userId: knud.id, toSend: {[Kind.TICKET_SOLD]: 1}}
        ])
        expect(sentMessages(queue)).toEqual([])
        expect(recorded.rows).toHaveLength(1)
    })

    // E-mail off is the deployment's state, known before any read: the run loads nothing and has nothing to list
    it.each([
        {run: 'a run delivers', options: {}},
        {run: 'a dry run delivers', options: {dryRun: true}}
    ])('GIVEN email off in the environment WHEN $run THEN it loads no deliveries, records nothing, counts nothing sent, and one line logs the sender event, the missing setting and nothing sent', async ({options}) => {
        const off = NotificationFactory.channelOff
        const load = vi.fn(async () => [outgoing(anna)])

        const result = await deliverDesired({} as D1Database, off, SenderEvent.BOOKING_STATUS, load, options)

        expect(load).not.toHaveBeenCalled()
        expect(recorded.rows).toEqual([])
        expect(result).toStrictEqual({counts: {sent: 0}})
        const [line, ...more] = linesOf(logs.warn)
        expect(more).toEqual([])
        for (const named of [`[EVENT ${SenderEvent.BOOKING_STATUS}]`, off.missing, 'nothing sent']) {
            expect(line).toContain(named)
        }
    })

    // Two runs on one dinner raced: the next run names the delivery that went twice
    it('GIVEN two recorded rows of one delivery WHEN a run reads them THEN it logs the delivery sent twice by its notification, subject, version and user', async () => {
        const delivery = outgoing(anna, {subjectId: 601, version: 2})
        recorded.rows = [NotificationFactory.recordedDelivery(delivery), NotificationFactory.recordedDelivery(delivery)]

        await deliver(fakeQueue(), [delivery])

        const line = linesOf(logs.warn).find(text => text.includes('[SENT TWICE]'))
        for (const named of [delivery.notification, delivery.subjectType, `${delivery.subjectId}`, `v${delivery.version}`, `user-${anna.id}`]) {
            expect(line).toContain(named)
        }
    })

    it.each([
        {step: 'the read of the recorded rows', senderEvent: SenderEvent.BOOKING_STATUS, fails: () => vi.mocked(fetchDeliveries).mockRejectedValue(new Error('D1 down'))},
        {step: 'the record of the queued mails', senderEvent: SenderEvent.MONTHLY_BILLING, fails: () => vi.mocked(recordDeliveries).mockRejectedValue(new Error('D1 down'))}
    ])('GIVEN $step fails WHEN a $senderEvent run delivers THEN it logs the sender event failed with the reason and rethrows', async ({senderEvent, fails}) => {
        fails()

        await expect(deliverOn(NotificationFactory.channel(fakeQueue()), senderEvent, [outgoing(anna)])).rejects.toThrow('D1 down')
        expect(errorLines().some(line => line.includes(`[EVENT ${senderEvent}] failed:`))).toBe(true)
        expect(errorLines().join('\n')).toContain('D1 down')
    })
})

// The user does not wait for notifications: the work runs after the response, and its failure is the step's log line
describe('deliverInBackground', () => {
    it('GIVEN work that fails WHEN handed to the background THEN the request waits on it and the failure does not reject', async () => {
        const waitUntil = vi.fn()

        deliverInBackground({waitUntil} as unknown as H3Event, () => Promise.reject(new Error('D1 down')))

        expect(waitUntil).toHaveBeenCalledTimes(1)
        await expect(waitUntil.mock.calls[0]![0]).resolves.toBeUndefined()
    })
})
