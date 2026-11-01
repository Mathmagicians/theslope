import { test, expect } from '@playwright/test'
import type { SecureSessionData } from '#auth-utils'
import { HouseholdFactory } from '~~/tests/e2e/testDataFactories/householdFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import { useBookingValidation } from '~/composables/useBookingValidation'
import { useWeekDayMapValidation } from '~/composables/useWeekDayMapValidation'
import type { UserCreate } from '~/composables/useCoreValidation'

const { memberValidatedBrowserContext, freshMemberContext, getSessionUserInfo, getSession } = testHelpers
const { DinnerModeSchema } = useBookingValidation()
const { createDefaultWeekdayMap } = useWeekDayMapValidation({
    valueSchema: DinnerModeSchema,
    defaultValue: DinnerModeSchema.enum.DINEIN
})

test.describe('Authorization Middleware', () => {
    test('GIVEN member WHEN updating preferences via admin endpoint THEN returns 403', async ({ browser }) => {
        const memberContext = await memberValidatedBrowserContext(browser)
        const { inhabitantId } = await getSessionUserInfo(memberContext)

        // Member tries to update their OWN preferences via admin endpoint - should be 403
        const preferences = createDefaultWeekdayMap(DinnerModeSchema.enum.DINEIN)
        await HouseholdFactory.updateInhabitant(memberContext, inhabitantId, { dinnerPreferences: preferences }, 403)
    })
})

test.describe('Session', () => {
    // The keys a token travels under: the User row's column, and nuxt-auth-utils' server-only data with the key login writes
    const TOKEN_KEYS: string[] = ['passwordHash' satisfies keyof UserCreate, 'secure', 'heynaboToken' satisfies keyof SecureSessionData]

    // Every key of a JSON value, at any depth
    const keysOf = (value: unknown): string[] => value !== null && typeof value === 'object'
        ? Object.entries(value).flatMap(([key, inner]) => [key, ...keysOf(inner)])
        : []

    test('GIVEN a member signs in WHEN the browser reads the session THEN it carries the user and no token field', async ({ browser }) => {
        const memberContext = await freshMemberContext(browser)
        try {
            const session = await getSession(memberContext)

            expect(session.user, 'the session carries its user').toBeDefined()
            expect(keysOf(session).filter(key => TOKEN_KEYS.includes(key))).toEqual([])
        } finally {
            await memberContext.close()
        }
    })
})
