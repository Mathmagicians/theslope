import {expect, type BrowserContext} from '@playwright/test'
import {defineParameterType} from 'playwright-bdd'
import {
    Given, When, Then, fromScene, contextOfActor, createSceneHousehold, createScenePerson, createDinnerInThePastMonth,
    ticketPriceIdOf, periodOf, REQUEST, type Actor, type Scene
} from '~~/tests/e2e/fixtures'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import {SenderFactory} from '~~/tests/e2e/testDataFactories/senderFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import {useBillingValidation, type InvoiceDisplay} from '~/composables/useBillingValidation'

const {daysFromNow} = testHelpers
const {CSV_HEADER} = useBillingValidation()

/** The billing periods a re-send names, by their words in a feature: the scenario's period, an id no period has, a body with no id */
const BILLING_PERIOD = {PERIOD: 'period', UNKNOWN: 'unknown period', INVALID: 'invalid period'} as const
type BillingPeriodWords = typeof BILLING_PERIOD[keyof typeof BILLING_PERIOD]
const UNKNOWN_PERIOD_ID = 999_999_999

defineParameterType({name: 'billingPeriod', regexp: Object.values(BILLING_PERIOD)})

/**
 * Unbilled orders in the past month in households of their own: each household's inhabitant has a ticket on a consumed
 * dinner, and the DAILY_MAINTENANCE job closes the tickets with a transaction each
 */
const unbilledOrdersIn = async (admin: BrowserContext, scene: Scene, households: number): Promise<void> => {
    const dinner = await createDinnerInThePastMonth(admin, scene)
    const ticketPriceId = await ticketPriceIdOf(admin, fromScene(scene, 'dinner').season.id!)
    for (let billed = 1; billed <= households; billed++) {
        // Moved in before the dinner, so the dinner falls in the household's residency
        const household = await createSceneHousehold(admin, scene, {movedInDate: daysFromNow(-60)})
        const person = await createScenePerson(admin, scene, household.id, `billed ${billed}`)
        await OrderFactory.bookTickets(admin, {householdId: household.id, dinnerEventId: dinner.id, inhabitantId: person.id, ticketPriceId})
        scene.billedHouseholds.push(household)
    }
    await SeasonFactory.runDailyMaintenance(admin)
}

Given('the past month has unbilled orders', async ({adminContext: admin, scene}) => {
    await unbilledOrdersIn(admin, scene, 1)
})

Given('the past month has unbilled orders in {int} household(s)', async ({adminContext: admin, scene}, households: number) => {
    await unbilledOrdersIn(admin, scene, households)
})

/** The re-send's body for the period the words name */
const resendBodyOf = async (admin: BrowserContext, scene: Scene, period: BillingPeriodWords): Promise<unknown> => {
    switch (period) {
        case BILLING_PERIOD.PERIOD:
            return SenderFactory.monthlyBillingEventBody(await periodOf(admin, scene))
        case BILLING_PERIOD.UNKNOWN:
            return SenderFactory.monthlyBillingEventBody(UNKNOWN_PERIOD_ID)
        case BILLING_PERIOD.INVALID:
            return {billingPeriodSummaryId: 'nope'}
    }
}

When('the {billingPeriod} is re-sent by {actor}', async ({adminContext: admin, scene}, period: BillingPeriodWords, actor: Actor) => {
    const {status} = await SenderFactory.triggerMonthlyBillingEventRaw(contextOfActor(scene, actor), await resendBodyOf(admin, scene, period))
    scene.answer = {request: REQUEST.RESEND, status}
})

Then('each invoice of the period names its household and PBS number', async ({adminContext: admin, scene}) => {
    const {invoices} = await BillingFactory.getBillingPeriodById(admin, await periodOf(admin, scene))
    // The households the scenario billed: the period also holds the invoices of earlier scenarios' households, removed since
    for (const {id, pbsId, address} of scene.billedHouseholds) {
        expect(invoices.filter(invoice => invoice.householdId === id).map(invoice => ({pbsId: invoice.pbsId, address: invoice.address})),
            `household ${id} has one invoice with its PBS number and address`).toEqual([{pbsId, address}])
    }
})

// The repository's order: the address, then the PBS number, compared as the database compares text, by code point
const byAddressThenPbsId = (a: InvoiceDisplay, b: InvoiceDisplay): number =>
    a.address === b.address ? a.pbsId - b.pbsId : a.address < b.address ? -1 : 1

Then('the invoices of the period are ordered by address, then PBS number', async ({adminContext: admin, scene}) => {
    const {invoices} = await BillingFactory.getBillingPeriodById(admin, await periodOf(admin, scene))
    expect(invoices.length, 'two invoices at least to compare').toBeGreaterThanOrEqual(2)
    expect(invoices.map(invoice => invoice.id)).toEqual([...invoices].sort(byAddressThenPbsId).map(invoice => invoice.id))
})

Then('the transactions of each invoice add up to its amount', async ({adminContext: admin, scene}) => {
    const {invoices} = await BillingFactory.getBillingPeriodById(admin, await periodOf(admin, scene))
    for (const {id} of scene.billedHouseholds) {
        const invoice = invoices.find(invoice => invoice.householdId === id)
        expect(invoice, `household ${id} has an invoice`).toBeDefined()
        const transactions = await BillingFactory.getInvoiceTransactions(admin, invoice!.id)
        expect(transactions.reduce((sum, transaction) => sum + transaction.amount, 0), `invoice ${invoice!.id}`).toBe(invoice!.amount)
    }
})

When('{actor} opens the period\'s accountant link', async ({adminContext: admin, scene}, actor: Actor) => {
    const {shareToken} = await BillingFactory.getBillingPeriodById(admin, await periodOf(admin, scene))
    scene.publicPeriod = await BillingFactory.getBillingPeriodByToken(contextOfActor(scene, actor), shareToken)
})

Then('{actor} sees the period with its invoices', async ({adminContext: admin, scene}, actor: Actor) => {
    // The actor who opened the link is the one who sees it
    contextOfActor(scene, actor)
    const period = await BillingFactory.getBillingPeriodById(admin, await periodOf(admin, scene))
    const seen = fromScene(scene, 'publicPeriod')
    expect(seen.id).toBe(period.id)
    expect(seen.invoices.map(invoice => invoice.id), 'the link shows every invoice of the period').toEqual(period.invoices.map(invoice => invoice.id))
})

Then('the period\'s CSV file downloads through the accountant link', async ({adminContext: admin, scene}) => {
    const period = await BillingFactory.getBillingPeriodById(admin, await periodOf(admin, scene))
    const {csv, filename} = await BillingFactory.getBillingCsvByToken(fromScene(scene, 'context'), period.shareToken)
    const [header, ...rows] = csv.split('\n')
    expect(header).toBe(CSV_HEADER)
    expect(rows, 'one row per invoice').toHaveLength(period.invoices.length)
    expect(filename).toContain(period.billingPeriod)
})
