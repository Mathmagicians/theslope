import {test, expect} from '@playwright/test'
import testHelpers from '../../testHelpers'
import {useHeynaboValidation} from '~/composables/useHeynaboValidation'
import {isAdmin} from '~/composables/usePermissions'
import type {UserDisplay} from '~/composables/useCoreValidation'

const {validatedBrowserContext} = testHelpers
const {HeynaboImportResponseSchema} = useHeynaboValidation()

test.describe('Heynabo Integration API', () => {
    test('GET /api/admin/heynabo/import should sync households from Heynabo', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Call the import endpoint
        const response = await context.request.get('/api/admin/heynabo/import')
        const responseBody = await response.text()
        const status = response.status()

        expect(status, `Expected 200 but got ${status}: ${responseBody}`).toBe(200)

        const result = JSON.parse(responseBody)

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

        // Verify imported users are linked to their Inhabitants
        // System admins are excluded - they may exist without Inhabitants
        const usersResponse = await context.request.get('/api/admin/users')
        expect(usersResponse.status()).toBe(200)

        const users: UserDisplay[] = await usersResponse.json()
        const orphanUsers = users.filter((u: UserDisplay) => u.Inhabitant === null && !isAdmin(u))

        expect(orphanUsers.length, `Orphan users: ${JSON.stringify(orphanUsers)}`).toBe(0)
    })
})
