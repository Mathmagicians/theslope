import {beforeEach, describe, expect, it, vi} from 'vitest'
import {runMonthlyBilling} from '~~/server/utils/monthlyBillingService'
import {generateBilling} from '~~/server/utils/generateBilling'
import {completeJobRun, createJobRun} from '~~/server/data/maintenanceRepository'
import {useMaintenanceValidation} from '~/composables/useMaintenanceValidation'
import {NotificationFactory} from '~~/tests/e2e/testDataFactories/notificationFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {fakeSenderQueue} from '~~/tests/component/utils/sender/fakeSenderQueue'
import {spyOnLogs} from '~~/tests/component/logSpies'

// The unit runtime has no D1: the billing step and the job run record answer from the test
vi.mock('~~/server/utils/generateBilling', () => ({generateBilling: vi.fn()}))
vi.mock('~~/server/data/maintenanceRepository', () => ({createJobRun: vi.fn(), completeJobRun: vi.fn()}))
// The billing service reads the season's deadlines from the app config as it loads
await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).stubAppConfig())

const {JobStatus, JobType} = useMaintenanceValidation()
const d1Client = {} as D1Database
const logs = spyOnLogs()

beforeEach(() => {
    vi.resetAllMocks()
    Object.values(logs).forEach(spy => spy.mockImplementation(() => {}))
})

describe('runMonthlyBilling', () => {
    const jobRun = SeasonFactory.defaultJobRun({jobType: JobType.MONTHLY_BILLING, status: JobStatus.RUNNING})

    // A failure is the run's: the job run records its text, and the caller hears it
    it.each([
        {thrown: 'an error', failure: new Error('D1 down')},
        {thrown: 'a value that is no error', failure: 'D1 down'}
    ])('GIVEN the billing fails with $thrown WHEN the monthly billing runs THEN the job run completes FAILED with the reason, and the run rethrows', async ({failure}) => {
        vi.mocked(createJobRun).mockResolvedValue(jobRun)
        vi.mocked(generateBilling).mockRejectedValue(failure)

        await expect(runMonthlyBilling(d1Client, jobRun.triggeredBy, {archive: undefined, email: NotificationFactory.channel(fakeSenderQueue())})).rejects.toBe(failure)

        expect(completeJobRun).toHaveBeenCalledExactlyOnceWith(d1Client, jobRun.id, JobStatus.FAILED, undefined, 'D1 down')
    })
})
