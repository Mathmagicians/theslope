import {test, expect} from '@playwright/test'
import {BillingFactory} from '../../testDataFactories/billingFactory'
import testHelpers from '../../testHelpers'

const {validatedBrowserContext, headers} = testHelpers

test.describe('Billing Periods API', () => {

    test('GIVEN admin auth WHEN fetching periods THEN returns array', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const periods = await BillingFactory.getBillingPeriods(context)
        expect(Array.isArray(periods)).toBe(true)
    })

    test.describe('Error handling', () => {
        const errorCases = [
            {endpoint: '/api/admin/billing/periods/999999', expectedStatus: 404, description: 'admin period by non-existent ID'},
            {endpoint: '/api/admin/billing/periods/invalid', expectedStatus: 400, description: 'admin period by invalid ID'},
            {endpoint: '/api/public/billing/not-a-uuid', expectedStatus: 400, description: 'public billing by invalid token'},
            {endpoint: '/api/public/billing/00000000-0000-0000-0000-000000000000', expectedStatus: 404, description: 'public billing by non-existent token'},
            {endpoint: '/api/public/billing/not-a-uuid/csv', expectedStatus: 400, description: 'public CSV by invalid token'},
            {endpoint: '/api/public/billing/00000000-0000-0000-0000-000000000000/csv', expectedStatus: 404, description: 'public CSV by non-existent token'},
        ]

        for (const {endpoint, expectedStatus, description} of errorCases) {
            test(`GIVEN ${description} WHEN fetching THEN returns ${expectedStatus}`, async ({browser}) => {
                const context = await validatedBrowserContext(browser)
                const needsAuth = endpoint.includes('/admin/')
                const response = await context.request.get(endpoint, needsAuth ? {headers} : undefined)
                expect(response.status()).toBe(expectedStatus)
            })
        }
    })
})
