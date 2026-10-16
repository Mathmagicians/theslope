import { test } from '@playwright/test'
import { HouseholdFactory } from '~~/tests/e2e/testDataFactories/householdFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import { useBookingValidation } from '~/composables/useBookingValidation'
import { useWeekDayMapValidation } from '~/composables/useWeekDayMapValidation'

const { memberValidatedBrowserContext, getSessionUserInfo } = testHelpers
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
