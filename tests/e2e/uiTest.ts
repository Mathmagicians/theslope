import {test as base, expect} from '@playwright/test'
import {closeCase, guardContext, openCase} from './apiErrorGuard'

/**
 * Playwright for the UI specs, with `test` carrying the API error guard: each case fails at its end on a 4xx or 5xx its
 * pages got from `/api/` that it did not declare (`testHelpers.expectApiError`). The guard records the built-in
 * `context` and `page`, and every context the helpers open (`testHelpers.openContext`).
 */
export * from '@playwright/test'

export const test = base.extend<{apiErrorGuard: typeof guardContext}>({
    // Auto, so a case that opens its contexts through the helpers alone is guarded too
    apiErrorGuard: [
        // Playwright reads a fixture's dependencies from its first parameter's destructuring; the guard has none
        // eslint-disable-next-line no-empty-pattern
        async ({}, use) => {
            openCase()
            await use(guardContext)
            expect(closeCase(), 'API errors the case did not declare (testHelpers.expectApiError)').toEqual([])
        },
        {auto: true}
    ],
    // Through the guard fixture, so the case is open when the built-in context opens and the context reports to it
    context: async ({context, apiErrorGuard}, use) => {
        await use(apiErrorGuard(context))
    }
})
