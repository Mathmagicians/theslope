import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {notifyBillingPeriod} from '~~/server/utils/monthlyBillingService'
import type {EmailChannel} from '~~/server/utils/sender/config'
import {NOTIFICATION_ADDRESS_VARS, useNotificationValidation, type EmailMessage} from '~/composables/useNotificationValidation'
import {useBillingValidation, type BillingPeriodSummaryDetail} from '~/composables/useBillingValidation'
import {useDeliveryValidation, type Delivery} from '~/composables/useDeliveryValidation'
import {maskEmail} from '~~/workers/common/mask'
import {NotificationFactory} from '~~/tests/e2e/testDataFactories/notificationFactory'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import {fakeSenderQueue, sentMessages} from '~~/tests/component/utils/sender/fakeSenderQueue'
import {fakeDeliveries} from '~~/tests/component/utils/sender/fakeDeliveries'
import {spyOnLogs} from '~~/tests/component/logSpies'

// The unit runtime has no D1: the Delivery rows answer from the test
vi.mock('~~/server/data/financesRepository', () => ({fetchDeliveries: vi.fn(), recordDeliveries: vi.fn()}))
// The billing service reads the season's deadlines from the app config as it loads
await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).stubAppConfig())

const {Kind} = NotificationFactory
const {NotificationMessageSchema} = useNotificationValidation()
const {generateBillingCsv, generateCsvFilename} = useBillingValidation()
const {DeliverySubjectSchema, DeliveryKindSchema, SenderEventSchema} = useDeliveryValidation()
const {EMAIL} = DeliveryKindSchema.enum
const config = NotificationFactory.config()
const summary = BillingFactory.defaultSummaryData('billing')

const logs = spyOnLogs()
let recorded: {rows: Delivery[]}
beforeEach(() => {
    Object.values(logs).forEach(spy => spy.mockImplementation(() => {}))
    recorded = fakeDeliveries()
})
afterEach(() => vi.clearAllMocks())

// The accountant email of a closed period, as the monthly run and the admin's re-send send it
const notify = (channel: EmailChannel, period: BillingPeriodSummaryDetail = summary, options?: Parameters<typeof notifyBillingPeriod>[3]) =>
    notifyBillingPeriod({} as D1Database, channel, period, options)

// The one email a period's notice queues
const mailOf = async (period: BillingPeriodSummaryDetail = summary): Promise<EmailMessage> => {
    const queue = fakeSenderQueue()
    await notify(NotificationFactory.channel(queue), period)
    const [message] = sentMessages<EmailMessage>(queue)
    expect(message, 'the period\'s email').toBeDefined()
    return message!
}

describe('the billing period email', () => {
    it('is a contract-valid e-mail to the accountant, cc the admin mailbox', async () => {
        const message = await mailOf()

        expect(NotificationMessageSchema.safeParse(message).success).toBe(true)
        expect(message.to).toBe(config.accountantEmail)
        expect(message.cc).toEqual([config.adminEmail])
        expect(message.meta.kind).toBe(Kind.BILLING_PERIOD_CLOSED)
        expect(message.meta.correlationId).toBe(`${summary.billingPeriod} v1`)
    })

    it('names the period, the household count, the total in kroner and the summary link', async () => {
        const message = await mailOf()

        expect(message.subject).toBe(`Skråningen: PBS-opgørelse ${summary.billingPeriod}`)
        expect(message.text).toContain(`${summary.householdCount} husstande`)
        expect(message.text).toContain(`${(summary.totalAmount / 100).toLocaleString('da-DK', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kr.`)
        expect(message.text).toContain(`https://${config.site}/public/billing/${summary.shareToken}`)
    })

    it('attaches the period CSV under its versioned PBS filename', async () => {
        const message = await mailOf()

        expect(message.attachments).toHaveLength(1)
        const [csv] = message.attachments
        expect(csv!.filename).toBe(generateCsvFilename(summary))
        expect(csv!.filename).toMatch(/-v1\.csv$/)
        expect(csv!.contentType).toBe('text/csv; charset=utf-8')
        expect(Buffer.from(csv!.contentBase64, 'base64').toString('utf8')).toBe(generateBillingCsv(summary))
    })

    it('is the BILLING_PERIOD_UPDATED mail naming the version that replaces the earlier one, for a later version', async () => {
        const message = await mailOf({...summary, version: 2})

        expect(NotificationMessageSchema.safeParse(message).success).toBe(true)
        expect(message.meta.kind).toBe(Kind.BILLING_PERIOD_UPDATED)
        expect(message.subject).toBe(`Skråningen: PBS-opgørelse ${summary.billingPeriod} — opdatering v2`)
        expect(message.text).toContain('version 2')
        expect(message.text).toContain('erstatter den tidligere fremsendte')
        expect(message.meta.correlationId).toBe(`${summary.billingPeriod} v2`)
        expect(message.attachments[0]!.filename).toMatch(/-v2\.csv$/)
    })
})

describe('notifyBillingPeriod', () => {
    // The billing rows on prod lead with the notification, the channel and the masked mailbox
    it('queues the email, reports it queued with its dedupe key, and records one EMAIL row of the period\'s version with that key as its reference', async () => {
        const queue = fakeSenderQueue()

        const result = await notify(NotificationFactory.channel(queue))

        const [message] = sentMessages<EmailMessage>(queue)
        expect(result).toMatchObject({queued: true, dedupeKey: message!.meta.dedupeKey})
        expect(recorded.rows).toEqual([expect.objectContaining({
            subjectType: DeliverySubjectSchema.enum.BILLING_PERIOD, subjectId: summary.id, version: summary.version, kind: EMAIL, reference: message!.meta.dedupeKey
        })])
        expect(recorded.rows[0]!.reference.startsWith(`${Kind.BILLING_PERIOD_CLOSED}:${EMAIL}:${maskEmail(config.accountantEmail)}:`)).toBe(true)
    })

    // A missing accountant mailbox is a deployment fault: the period's email cannot go anywhere
    it('reports degraded, queues and records nothing, and logs the missing accountant mailbox as an error when none is configured', async () => {
        const queue = fakeSenderQueue()

        const result = await notify(NotificationFactory.channel(queue, {accountantEmail: ''}))

        expect(result).toMatchObject({queued: false, degraded: true})
        expect(sentMessages(queue)).toEqual([])
        expect(recorded.rows).toEqual([])
        expect(logs.error).toHaveBeenCalledOnce()
        expect(logs.error.mock.calls[0]![0]).toContain(NOTIFICATION_ADDRESS_VARS.accountantEmail)
        expect(logs.warn).not.toHaveBeenCalled()
    })

    it('reports not sent and logs the missing setting when e-mail is off', async () => {
        const result = await notify(NotificationFactory.channelOff)

        expect(result).toMatchObject({queued: false, degraded: true})
        expect(recorded.rows).toEqual([])
        expect(logs.error).toHaveBeenCalledWith(expect.stringContaining(NotificationFactory.channelOff.missing))
    })

    // The re-send is the admin's override (ADR-004): it goes whatever is recorded, and its line names the admin
    it('GIVEN a period whose email is recorded WHEN an admin re-sends it THEN the email goes to the accountant again, records a second row, and one line logs the admin', async () => {
        recorded.rows = [NotificationFactory.recordedDelivery({
            subjectType: DeliverySubjectSchema.enum.BILLING_PERIOD, subjectId: summary.id, version: summary.version, notification: Kind.BILLING_PERIOD_CLOSED, userId: null
        })]
        const queue = fakeSenderQueue()
        const adminOverride = {adminUserId: 90}

        await notify(NotificationFactory.channel(queue), summary, {adminOverride})

        expect(sentMessages<EmailMessage>(queue).map(message => message.to)).toEqual([config.accountantEmail])
        expect(recorded.rows).toHaveLength(2)
        expect(logs.info).toHaveBeenCalledWith(expect.stringContaining(`📬 > DELIVERY > [EVENT ${SenderEventSchema.enum.MONTHLY_BILLING}] re-sent by admin ${adminOverride.adminUserId}`))
    })
})
