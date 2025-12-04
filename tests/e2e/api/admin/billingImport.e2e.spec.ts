import {test, expect} from '@playwright/test'
import {BillingFactory} from '../../testDataFactories/billingFactory'
import {HouseholdFactory} from '../../testDataFactories/householdFactory'
import {SeasonFactory} from '../../testDataFactories/seasonFactory'
import {DinnerEventFactory} from '../../testDataFactories/dinnerEventFactory'
import testHelpers from '../../testHelpers'

const {validatedBrowserContext, headers} = testHelpers
const BILLING_IMPORT_ENDPOINT = '/api/admin/billing/import'

const testHouseholdIds: number[] = []

test.describe('Billing Import API', () => {

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Ensure active season with dinner events
        await SeasonFactory.createActiveSeason(context)

        // Create a test household
        const {household} = await HouseholdFactory.createHouseholdWithInhabitants(
            context,
            {address: 'Billing Test Address 123'},
            1
        )
        testHouseholdIds.push(household.id)
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        for (const householdId of testHouseholdIds) {
            await HouseholdFactory.deleteHousehold(context, householdId).catch(() => {})
        }
    })

    test('all CSV files in order-import folder can be parsed', () => {
        const csvFiles = BillingFactory.getCSVFiles()

        // Skip in CI/CD where .theslope is gitignored and empty
        test.skip(csvFiles.length === 0, '.theslope/order-import is empty (gitignored, local-only test)')

        for (const filePath of csvFiles) {
            BillingFactory.validateCSVFile(filePath)
        }
    })

    test('GIVEN valid CSV WHEN importing THEN creates orders', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const activeSeason = await SeasonFactory.createActiveSeason(context)
        const events = await DinnerEventFactory.getDinnerEventsForSeason(context, activeSeason.id!)
        expect(events.length, 'Active season should have dinner events').toBeGreaterThan(0)

        const dates = events.slice(0, 2).map(e => e.date)
        const csv = BillingFactory.generateCSV('Billing Test Address 123', dates, 1, 1)

        const result = await BillingFactory.importOrders(context, csv)

        const expectedCount = dates.length * 2 // 1 adult + 1 child per date
        expect(result.count).toBe(expectedCount)
        expect(result.orders).toHaveLength(expectedCount)
    })

    test('GIVEN empty CSV WHEN importing THEN fails with 400', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const response = await context.request.post(BILLING_IMPORT_ENDPOINT, {
            headers,
            data: {csvContent: ''}
        })

        expect(response.status()).toBe(400)
    })

    test('GIVEN CSV with unknown address WHEN importing THEN fails with 400', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const activeSeason = await SeasonFactory.createActiveSeason(context)
        const events = await DinnerEventFactory.getDinnerEventsForSeason(context, activeSeason.id!)
        const dates = events.slice(0, 1).map(e => e.date)

        const csv = BillingFactory.generateCSV('Unknown Address 999', dates)

        const response = await context.request.post(BILLING_IMPORT_ENDPOINT, {
            headers,
            data: {csvContent: csv}
        })

        expect(response.status()).toBe(400)
        const error = await response.json()
        expect(error.message || error.statusMessage).toMatch(/not found/i)
    })

    test('GIVEN CSV with date missing dinner event WHEN importing THEN fails with 400', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const csv = BillingFactory.generateCSV('Billing Test Address 123', [new Date(2099, 11, 25)])

        const response = await context.request.post(BILLING_IMPORT_ENDPOINT, {
            headers,
            data: {csvContent: csv}
        })

        expect(response.status()).toBe(400)
        const error = await response.json()
        expect(error.message || error.statusMessage).toMatch(/no dinner event/i)
    })
})
