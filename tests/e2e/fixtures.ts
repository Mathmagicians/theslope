import type {BrowserContext} from '@playwright/test'
import {test as base, createBdd} from 'playwright-bdd'
import testHelpers from '~~/tests/e2e/testHelpers'
import type {Season} from '~/composables/useSeasonValidation'
import type {UserDetail} from '~/composables/useCoreValidation'
import type {DailyMaintenanceResult} from '~/composables/useBookingValidation'
import type {HeynaboImportResponse} from '~/composables/useHeynaboValidation'
import type {MonthlyBillingResponse} from '~/composables/useBillingValidation'
import type {useMaintenanceValidation} from '~/composables/useMaintenanceValidation'
import type {HealthReport} from '~~/workers/common/health'

const {validatedBrowserContext, memberValidatedBrowserContext} = testHelpers

type JobTypes = ReturnType<typeof useMaintenanceValidation>['JobType']

/** A job a WHEN ran, with the result its endpoint answered */
export type JobRun =
    | {job: JobTypes['HEYNABO_IMPORT'], result: HeynaboImportResponse}
    | {job: JobTypes['DAILY_MAINTENANCE'], result: DailyMaintenanceResult}
    | {job: JobTypes['MONTHLY_BILLING'], result: MonthlyBillingResponse | null}

/** What the steps of one scenario hand each other */
export type Scene = {
    /** The browser context of the actor a GIVEN signed in */
    context?: BrowserContext
    activeSeason?: Season
    health?: {worker: string, report: HealthReport}
    jobRun?: JobRun
    /** The user a sign-in answered */
    signedInUser?: UserDetail
}

/** The value an earlier step of the scenario put in the scene */
export const fromScene = <K extends keyof Scene>(scene: Scene, key: K): NonNullable<Scene[K]> => {
    const value = scene[key]
    if (value === undefined) throw new Error(`The scene holds no ${key}: a step before this one sets it`)
    return value as NonNullable<Scene[K]>
}

export const test = base.extend<{adminContext: BrowserContext, memberContext: BrowserContext, scene: Scene}>({
    adminContext: async ({browser}, use) => {
        const context = await validatedBrowserContext(browser)
        await use(context)
        await context.close()
    },
    memberContext: async ({browser}, use) => {
        const context = await memberValidatedBrowserContext(browser)
        await use(context)
        await context.close()
    },
    // Playwright reads a fixture's dependencies from its first parameter's destructuring; the scene has none
    // eslint-disable-next-line no-empty-pattern
    scene: async ({}, use) => {
        await use({})
    }
})

export const {Given, When, Then} = createBdd(test)
