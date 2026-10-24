import {test, expect} from '@playwright/test'
import {SenderFactory} from '~~/tests/e2e/testDataFactories/senderFactory'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import type {SenderEmitResult} from '~/composables/useNotificationValidation'
import {useDeliveryValidation} from '~/composables/useDeliveryValidation'

const {validatedBrowserContext, memberValidatedBrowserContext} = testHelpers
const {DeliverySubjectSchema, DeliveryKindSchema} = useDeliveryValidation()
const {BILLING_PERIOD} = DeliverySubjectSchema.enum

/**
 * The delivery read answers the Delivery rows of the subjects it names. Serial: its rows come from a billing period's
 * re-sent accountant mail, and monthly billing creates the period from all unbilled transactions (ADR-015 idempotent).
 * The query's rules are the useDeliveryValidation unit spec's.
 */
test.describe('GET /api/admin/sender/delivery', () => {
    let billingPeriodSummaryId: number
    let resent: SenderEmitResult
    // A period id no billing run reaches
    const UNKNOWN_SUBJECT_ID = 999_999_999

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        billingPeriodSummaryId = await BillingFactory.billingPeriodToResend(context)
        resent = (await SenderFactory.triggerMonthlyBillingEvent(context, SenderFactory.monthlyBillingEventBody(billingPeriodSummaryId)))!
        expect(resent.queued, 'the re-sent mail records its Delivery row').toBe(true)
    })

    test('GIVEN a period with a sent mail and a subject without rows WHEN an admin reads both THEN the period\'s rows answer, the sent mail\'s among them', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const rows = await SenderFactory.getDeliveries(context, BILLING_PERIOD, [billingPeriodSummaryId, UNKNOWN_SUBJECT_ID])

        expect(rows.map(row => row.subjectId)).toEqual(rows.map(() => billingPeriodSummaryId))
        expect(rows).toContainEqual(expect.objectContaining({
            subjectType: BILLING_PERIOD, subjectId: billingPeriodSummaryId, kind: DeliveryKindSchema.enum.EMAIL, reference: resent.dedupeKey
        }))
    })

    // A GET under /api/admin is open to every member (usePermissions ROUTE_PERMISSIONS: admin GET → isAuthenticated; ADR-004)
    test('GIVEN a member WHEN reading the period THEN its rows answer', async ({browser}) => {
        const context = await memberValidatedBrowserContext(browser)

        const rows = await SenderFactory.getDeliveries(context, BILLING_PERIOD, [billingPeriodSummaryId])

        expect(rows.map(row => row.reference)).toContain(resent.dedupeKey)
    })

    test('GIVEN an unknown subject type WHEN reading THEN 400', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        await SenderFactory.getDeliveriesByQuery(context, {subjectType: 'NOT_A_SUBJECT', subjectIds: [String(billingPeriodSummaryId)]}, 400)
    })
})
