import {test, expect} from '@playwright/test'

const userName = process.env.HEY_NABO_USERNAME as string
const password = process.env.HEY_NABO_PASSWORD as string
const headers = {'Content-Type': 'application/json'}

test.describe('POST /api/auth/login - UserDetail schema (ADR-009)', () => {
    test('should return UserDetail with nested household', async ({request}) => {
        // Login returns user data directly
        const response = await request.post('/api/auth/login', {
            headers,
            data: {email: userName, password}
        })
        expect(response.status()).toBe(200)

        const user = await response.json()

        // Verify User base structure (always present)
        expect(user.id).toBeDefined()
        expect(user.email).toBe(userName)
        expect(user.systemRoles).toBeDefined()

        // Inhabitant is nullable per Prisma schema (User.Inhabitant?)
        // Test user from env has Inhabitant
        if (user.Inhabitant) {
            expect(user.Inhabitant.id).toBeDefined()
            expect(user.Inhabitant.householdId).toBeDefined()

            // Household must be nested in Inhabitant when included (ADR-009)
            expect(user.Inhabitant.household).toBeDefined()
            expect(user.Inhabitant.household.id).toBe(user.Inhabitant.householdId)
            expect(user.Inhabitant.household.address).toBeDefined()
        }
    })
})
