import {test, expect} from '@playwright/test'
import testHelpers from '../../testHelpers'

const {validatedBrowserContext} = testHelpers

test.describe('Heynabo Integration API', () => {
    test('GET /api/admin/heynabo/import should import households from Heynabo', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Call the import endpoint
        const response = await context.request.get('/api/admin/heynabo/import')
        expect(response.status()).toBe(200)

        const households = await response.json()

        // Verify response structure
        expect(Array.isArray(households)).toBe(true)
        expect(households.length).toBeGreaterThan(0)

        // Verify first household has expected properties
        const firstHousehold = households[0]
        expect(firstHousehold).toHaveProperty('id')
        expect(firstHousehold).toHaveProperty('heynaboId')
        expect(firstHousehold).toHaveProperty('address')
        expect(firstHousehold).toHaveProperty('pbsId')
        expect(firstHousehold).toHaveProperty('name')
        expect(firstHousehold).toHaveProperty('movedInDate')

        // Verify household was saved to database - fetch it back with inhabitants
        const fetchResponse = await context.request.get(`/api/admin/household/${firstHousehold.id}`)
        expect(fetchResponse.status()).toBe(200)

        const fetchedHousehold = await fetchResponse.json()
        expect(fetchedHousehold).toHaveProperty('inhabitants')
        expect(Array.isArray(fetchedHousehold.inhabitants)).toBe(true)

        // Verify inhabitants with users have systemRoles properly set
        if (fetchedHousehold.inhabitants.length > 0) {
            const inhabitantWithUser = fetchedHousehold.inhabitants.find((i: unknown) => i.user)
            if (inhabitantWithUser) {
                expect(inhabitantWithUser.user).toHaveProperty('systemRoles')
                // systemRoles should be an array (deserialized by repository)
                expect(Array.isArray(inhabitantWithUser.user.systemRoles)).toBe(true)
            }
        }
    })
})
