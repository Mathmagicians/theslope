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
import {useDeliveryValidation} from '~/composables/useDeliveryValidation'
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
const {BOOKING_STATUS} = useDeliveryValidation().SenderEventSchema.enum
const d1Client = {} as D1Database

beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, 'info').mockImplementation(() => {})
})

describe('runDailyMaintenance', () => {
    const ACTIVE_SEASON_ID = 9
    const jobRun = SeasonFactory.defaultJobRun({status: JobStatus.RUNNING})
    // Each step answers a count of its own, so the run's result shows which step it came from
    const steps = OrderFactory.defaultDailyMaintenanceResult({
        jobRunId: jobRun.id, consume: {consumed: 2}, close: {closed: 3}, transact: {created: 4}, initPrefs: {initialized: 5}
    })
    const scaffold = OrderFactory.defaultScaffoldResult()
    const counts = {sent: 6}
    const answerSteps = (activeSeasonId: number | null) => {
        vi.mocked(createJobRun).mockResolvedValue(jobRun)
        vi.mocked(consumeDinners).mockResolvedValue(steps.consume)
        vi.mocked(closeOrders).mockResolvedValue(steps.close)
        vi.mocked(createTransactions).mockResolvedValue(steps.transact)
        vi.mocked(deleteWaitlistForConsumedDinners).mockResolvedValue(steps.clearWaitlist)
        vi.mocked(fetchActiveSeasonId).mockResolvedValue(activeSeasonId)
        vi.mocked(clipPreferences).mockResolvedValue(steps.initPrefs)
        vi.mocked(scaffoldPrebookings).mockResolvedValue(scaffold)
        vi.mocked(sendNotifications).mockResolvedValue({counts})
    }

    // Without an active season the run ends after the waiting list: the season's steps report nothing
    it.each([
        {given: 'an active season', activeSeasonId: ACTIVE_SEASON_ID, result: {...steps, scaffold, notifications: {[BOOKING_STATUS]: counts}}, seasonsRun: [ACTIVE_SEASON_ID]},
        {given: 'no active season', activeSeasonId: null, result: {...steps, initPrefs: {initialized: 0}, scaffold: null, notifications: {}}, seasonsRun: []}
    ])('GIVEN $given WHEN the daily maintenance runs THEN the job run completes SUCCESS with the result of each step it ran', async ({activeSeasonId, result, seasonsRun}) => {
        answerSteps(activeSeasonId)
        const email = NotificationFactory.channel(fakeSenderQueue())

        expect(await runDailyMaintenance(d1Client, jobRun.triggeredBy, email)).toEqual(result)

        expect(completeJobRun).toHaveBeenCalledExactlyOnceWith(d1Client, jobRun.id, JobStatus.SUCCESS, result)
        expect(vi.mocked(clipPreferences).mock.calls).toEqual(seasonsRun.map(seasonId => [d1Client, seasonId]))
        expect(vi.mocked(scaffoldPrebookings).mock.calls).toEqual(seasonsRun.map(seasonId => [d1Client, {seasonId}]))
        expect(vi.mocked(sendNotifications).mock.calls).toEqual(seasonsRun.map(seasonId => [d1Client, email, seasonId, {jobRunId: jobRun.id}]))
    })

    // A step's failure is the run's: the job run records it, and the caller hears it
    it('GIVEN the notifications step fails WHEN the daily maintenance runs THEN the job run completes FAILED with the reason, and the run rethrows', async () => {
        answerSteps(ACTIVE_SEASON_ID)
        const failure = new Error('D1 down')
        vi.mocked(sendNotifications).mockRejectedValue(failure)

        await expect(runDailyMaintenance(d1Client, jobRun.triggeredBy, NotificationFactory.channel(fakeSenderQueue()))).rejects.toThrow(failure)

        expect(completeJobRun).toHaveBeenCalledExactlyOnceWith(d1Client, jobRun.id, JobStatus.FAILED, undefined, failure.message)
    })
})
