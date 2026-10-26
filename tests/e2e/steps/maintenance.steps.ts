import {expect, type BrowserContext} from '@playwright/test'
import {defineParameterType} from 'playwright-bdd'
import {Given, When, Then, fromScene, type JobRun, type Scene} from '~~/tests/e2e/fixtures'
import {useMaintenanceValidation} from '~/composables/useMaintenanceValidation'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'

const {JobType} = useMaintenanceValidation()

/** The idempotent jobs (ADR-015) by their JobType value */
defineParameterType({
    name: 'job',
    regexp: Object.values(JobType),
    transformer: (job: string) => JobType[job as keyof typeof JobType]
})

const runOf = async (context: BrowserContext, job: JobRun['job']): Promise<JobRun> => {
    switch (job) {
        case JobType.HEYNABO_IMPORT:
            return {job, result: await HouseholdFactory.runHeynaboImport(context)}
        case JobType.DAILY_MAINTENANCE:
            return {job, result: await SeasonFactory.runDailyMaintenance(context)}
        case JobType.MONTHLY_BILLING:
            return {job, result: await BillingFactory.generateBilling(context)}
    }
}

/** Runs the job through the signed-in actor's context; the scene keeps every run, a later step reads what a run billed */
const runJob = async (scene: Scene, job: JobRun['job']): Promise<void> => {
    scene.jobRun = await runOf(fromScene(scene, 'context'), job)
    scene.jobRuns.push(scene.jobRun)
}

When('the {job} job runs', async ({scene}, job: JobRun['job']) => {
    await runJob(scene, job)
})

Given('the {job} job has run {int} time(s)', async ({scene}, job: JobRun['job'], runs: number) => {
    for (let run = 0; run < runs; run++) await runJob(scene, job)
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
