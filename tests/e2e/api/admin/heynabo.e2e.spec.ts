import {test, expect} from '@playwright/test'
import testHelpers from '../../testHelpers'
import {useHeynaboValidation} from '~/composables/useHeynaboValidation'

const {validatedBrowserContext} = testHelpers
const {HeynaboImportResponseSchema} = useHeynaboValidation()

test.describe('Heynabo Integration API', () => {
    test('GET /api/admin/heynabo/import should sync households from Heynabo', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Call the import endpoint
        const response = await context.request.get('/api/admin/heynabo/import')
        expect(response.status()).toBe(200)

        const result = await response.json()

        // Verify response parses correctly with schema (ADR-009: batch ops use lightweight types)
        const parsed = HeynaboImportResponseSchema.parse(result)
        expect(parsed.householdsCreated).toBeGreaterThanOrEqual(0)
        expect(parsed.householdsDeleted).toBeGreaterThanOrEqual(0)
        expect(parsed.householdsUnchanged).toBeGreaterThanOrEqual(0)
        expect(parsed.inhabitantsCreated).toBeGreaterThanOrEqual(0)
        expect(parsed.inhabitantsDeleted).toBeGreaterThanOrEqual(0)
        expect(parsed.usersCreated).toBeGreaterThanOrEqual(0)

        // Verify households were synced to database
        const householdsResponse = await context.request.get('/api/admin/household')
        expect(householdsResponse.status()).toBe(200)

        const households = await householdsResponse.json()
        expect(Array.isArray(households)).toBe(true)
        expect(households.length).toBeGreaterThan(0)

        // Verify first household has expected properties
        const firstHousehold = households[0]
        expect(firstHousehold).toHaveProperty('id')
        expect(firstHousehold).toHaveProperty('heynaboId')
        expect(firstHousehold).toHaveProperty('address')
        expect(firstHousehold).toHaveProperty('inhabitants')
    })
})
