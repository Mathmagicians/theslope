import {expect} from '@playwright/test'
import {defineParameterType} from 'playwright-bdd'
import {When, Then, fromScene, type JobRun} from '~~/tests/e2e/fixtures'
import {useMaintenanceValidation} from '~/composables/useMaintenanceValidation'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'

const {JobType} = useMaintenanceValidation()

/** The idempotent jobs (ADR-015) by the words a feature names them with */
const JOBS_BY_WORDS = {
    'Heynabo import': JobType.HEYNABO_IMPORT,
    'daily maintenance': JobType.DAILY_MAINTENANCE,
    'monthly billing': JobType.MONTHLY_BILLING
} as const
type JobWords = keyof typeof JOBS_BY_WORDS

defineParameterType({
    name: 'job',
    regexp: Object.keys(JOBS_BY_WORDS),
    transformer: (words: string) => JOBS_BY_WORDS[words as JobWords]
})

When('the {job} job runs', async ({scene}, job: JobRun['job']) => {
    const context = fromScene(scene, 'context')
    switch (job) {
        case JobType.HEYNABO_IMPORT:
            scene.jobRun = {job, result: await HouseholdFactory.runHeynaboImport(context)}
            break
        case JobType.DAILY_MAINTENANCE:
            scene.jobRun = {job, result: await SeasonFactory.runDailyMaintenance(context)}
            break
        case JobType.MONTHLY_BILLING:
            scene.jobRun = {job, result: await BillingFactory.generateBilling(context)}
            break
    }
})

Then('the job reports success', async ({scene}) => {
    const run = fromScene(scene, 'jobRun')
    switch (run.job) {
        case JobType.HEYNABO_IMPORT:
            // An already synced import creates nothing
            expect(run.result.householdsCreated).toBeGreaterThanOrEqual(0)
            break
        case JobType.DAILY_MAINTENANCE:
            expect(run.result.jobRunId).toBeGreaterThan(0)
            break
        case JobType.MONTHLY_BILLING:
            expect(run.result?.jobRunId).toBeGreaterThan(0)
            break
    }
})
