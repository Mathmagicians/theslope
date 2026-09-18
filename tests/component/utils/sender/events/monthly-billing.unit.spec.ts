import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {buildBillingPeriodClosedEmail, emitBillingPeriodClosed} from '~~/server/utils/sender/events/monthly-billing'
import {useNotificationValidation} from '~/composables/useNotificationValidation'
import {useBillingValidation} from '~/composables/useBillingValidation'
import {NotificationFactory} from '~~/tests/e2e/testDataFactories/notificationFactory'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'

const {NotificationMessageSchema} = useNotificationValidation()
const {generateBillingCsv, generateCsvFilename} = useBillingValidation()
const config = NotificationFactory.config()
const summary = BillingFactory.defaultSummaryData('billing')

describe('buildBillingPeriodClosedEmail', () => {
    const message = buildBillingPeriodClosedEmail(config, summary)

    it('is a contract-valid e-mail to the accountant, cc the admin mailbox', () => {
        expect(NotificationMessageSchema.safeParse(message).success).toBe(true)
        expect(message.to).toBe(config.accountantEmail)
        expect(message.cc).toEqual([config.adminEmail])
        expect(message.meta.kind).toBe('BILLING_PERIOD_CLOSED')
        expect(message.meta.correlationId).toBe(`${summary.billingPeriod} v1`)
    })

    it('names the period, the household count, the total in kroner and the summary link', () => {
        expect(message.subject).toBe(`Skråningen: PBS-opgørelse ${summary.billingPeriod}`)
        expect(message.text).toContain(`${summary.householdCount} husstande`)
        expect(message.text).toContain(`${(summary.totalAmount / 100).toLocaleString('da-DK', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kr.`)
        expect(message.text).toContain(`https://${config.site}/public/billing/${summary.shareToken}`)
    })

    it('attaches the period CSV under its versioned PBS filename', () => {
        expect(message.attachments).toHaveLength(1)
        const [csv] = message.attachments
        expect(csv!.filename).toBe(generateCsvFilename(summary))
        expect(csv!.filename).toMatch(/-v1\.csv$/)
        expect(csv!.contentType).toBe('text/csv; charset=utf-8')
        expect(Buffer.from(csv!.contentBase64, 'base64').toString('utf8')).toBe(generateBillingCsv(summary))
    })
})

describe('buildBillingPeriodClosedEmail for a later version', () => {
    const updated = {...summary, version: 2}
    const message = buildBillingPeriodClosedEmail(config, updated)

    it('is the BILLING_PERIOD_UPDATED mail naming the version that replaces the earlier one', () => {
        expect(NotificationMessageSchema.safeParse(message).success).toBe(true)
        expect(message.meta.kind).toBe('BILLING_PERIOD_UPDATED')
        expect(message.subject).toBe(`Skråningen: PBS-opgørelse ${summary.billingPeriod} — opdatering v2`)
        expect(message.text).toContain('version 2')
        expect(message.text).toContain('erstatter den tidligere fremsendte')
        expect(message.meta.correlationId).toBe(`${summary.billingPeriod} v2`)
        expect(message.attachments[0]!.filename).toMatch(/-v2\.csv$/)
    })
})

describe('emitBillingPeriodClosed', () => {
    const logs = {warn: vi.spyOn(console, 'warn'), info: vi.spyOn(console, 'info')}
    beforeEach(() => Object.values(logs).forEach(spy => spy.mockImplementation(() => {})))
    afterEach(() => Object.values(logs).forEach(spy => spy.mockClear()))

    it('queues the mail through the binding', async () => {
        const queue = {send: vi.fn().mockResolvedValue(undefined)} as unknown as Queue

        const result = await emitBillingPeriodClosed(queue, config, summary)

        expect(result.queued).toBe(true)
        expect(queue.send).toHaveBeenCalledOnce()
    })

    it('reports degraded without touching the binding when no accountant mailbox is configured', async () => {
        const queue = {send: vi.fn()} as unknown as Queue

        const result = await emitBillingPeriodClosed(queue, NotificationFactory.config({accountantEmail: ''}), summary)

        expect(result).toMatchObject({queued: false, degraded: true})
        expect(queue.send).not.toHaveBeenCalled()
        expect(logs.warn).toHaveBeenCalledOnce()
    })
})
