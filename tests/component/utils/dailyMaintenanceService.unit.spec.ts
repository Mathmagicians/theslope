import {beforeEach, describe, expect, it, vi} from 'vitest'
import {runDailyMaintenance} from '~~/server/utils/dailyMaintenanceService'
import {consumeDinners} from '~~/server/utils/consumeDinners'
import {closeOrders} from '~~/server/utils/closeOrders'
import {createTransactions} from '~~/server/utils/createTransactions'
import {clipPreferences} from '~~/server/utils/initializePreferences'
import {scaffoldPrebookings} from '~~/server/utils/scaffoldPrebookings'
import {sendNotifications} from '~~/server/utils/sender/events/waitlist'
import {fetchActiveSeasonId} from '~~/server/data/prismaRepository'
import {completeJobRun, createJobRun} from '~~/server/data/maintenanceRepository'
import {deleteWaitlistForConsumedDinners} from '~~/server/data/waitlistRepository'
import {useMaintenanceValidation} from '~/composables/useMaintenanceValidation'
import {NotificationFactory} from '~~/tests/e2e/testDataFactories/notificationFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {fakeSenderQueue} from '~~/tests/component/utils/sender/fakeSenderQueue'

// The unit runtime has no D1: each step of the run and the job run record answer from the test
vi.mock('~~/server/utils/consumeDinners', () => ({consumeDinners: vi.fn()}))
vi.mock('~~/server/utils/closeOrders', () => ({closeOrders: vi.fn()}))
vi.mock('~~/server/utils/createTransactions', () => ({createTransactions: vi.fn()}))
vi.mock('~~/server/utils/initializePreferences', () => ({clipPreferences: vi.fn()}))
vi.mock('~~/server/utils/scaffoldPrebookings', () => ({scaffoldPrebookings: vi.fn()}))
vi.mock('~~/server/utils/sender/events/waitlist', () => ({sendNotifications: vi.fn()}))
vi.mock('~~/server/data/prismaRepository', () => ({fetchActiveSeasonId: vi.fn()}))
vi.mock('~~/server/data/maintenanceRepository', () => ({createJobRun: vi.fn(), completeJobRun: vi.fn()}))
vi.mock('~~/server/data/waitlistRepository', () => ({deleteWaitlistForConsumedDinners: vi.fn()}))
// The run's scaffold line reads the app config, from the Nitro auto-import scope
await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).stubAppConfig())

const {JobStatus} = useMaintenanceValidation()
const d1Client = {} as D1Database

beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, 'info').mockImplementation(() => {})
})

describe('runDailyMaintenance', () => {
    // A step's failure is the run's: the job run records it, and the caller hears it
    it('GIVEN the notifications step fails WHEN the daily maintenance runs THEN the job run completes FAILED with the reason, and the run rethrows', async () => {
        const jobRun = SeasonFactory.defaultJobRun({status: JobStatus.RUNNING})
        const steps = OrderFactory.defaultDailyMaintenanceResult({jobRunId: jobRun.id})
        vi.mocked(createJobRun).mockResolvedValue(jobRun)
        vi.mocked(consumeDinners).mockResolvedValue(steps.consume)
        vi.mocked(closeOrders).mockResolvedValue(steps.close)
        vi.mocked(createTransactions).mockResolvedValue(steps.transact)
        vi.mocked(deleteWaitlistForConsumedDinners).mockResolvedValue(steps.clearWaitlist)
        vi.mocked(fetchActiveSeasonId).mockResolvedValue(9)
        vi.mocked(clipPreferences).mockResolvedValue(steps.initPrefs)
        vi.mocked(scaffoldPrebookings).mockResolvedValue(OrderFactory.defaultScaffoldResult())
        const failure = new Error('D1 down')
        vi.mocked(sendNotifications).mockRejectedValue(failure)

        await expect(runDailyMaintenance(d1Client, jobRun.triggeredBy, NotificationFactory.channel(fakeSenderQueue()))).rejects.toThrow(failure)

        expect(completeJobRun).toHaveBeenCalledExactlyOnceWith(d1Client, jobRun.id, JobStatus.FAILED, undefined, failure.message)
    })
})
