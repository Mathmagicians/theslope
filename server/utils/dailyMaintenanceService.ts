/**
 * Daily Maintenance Service
 *
 * Core logic for daily maintenance tasks, called by both:
 * - Nitro scheduled task (context.cloudflare.env.DB)
 * - HTTP endpoint (event.context.cloudflare.env.DB)
 *
 * All operations are idempotent (ADR-015).
 */
import {consumeDinners} from '~~/server/utils/consumeDinners'
import {closeOrders} from '~~/server/utils/closeOrders'
import {createTransactions} from '~~/server/utils/createTransactions'
import {clipPreferences} from '~~/server/utils/initializePreferences'
import {scaffoldPrebookings} from '~~/server/utils/scaffoldPrebookings'
import {fetchActiveSeasonId} from '~~/server/data/prismaRepository'
import {createJobRun, completeJobRun} from '~~/server/data/maintenanceRepository'
import {useMaintenanceValidation} from '~/composables/useMaintenanceValidation'
import {deleteWaitlistForConsumedDinners} from '~~/server/data/waitlistRepository'
import type {DailyMaintenanceResult} from '~/composables/useBookingValidation'
import {useDeliveryValidation} from '~/composables/useDeliveryValidation'
import {useBooking} from '~/composables/useBooking'
import type {EmailChannel} from '~~/server/utils/sender/config'
import {sendNotifications} from '~~/server/utils/sender/events/waitlist'

const LOG = '🔧 > DAILY > [MAINTENANCE]'
const {BOOKING_STATUS} = useDeliveryValidation().SenderEventSchema.enum

export async function runDailyMaintenance(d1Client: D1Database, triggeredBy: string, email: EmailChannel): Promise<DailyMaintenanceResult> {
    const {JobType, JobStatus} = useMaintenanceValidation()

    console.info(`${LOG} Starting daily maintenance (triggeredBy=${triggeredBy})`)

    // Create job run record
    const jobRun = await createJobRun(d1Client, {
        jobType: JobType.DAILY_MAINTENANCE,
        triggeredBy
    })

    try {
        // 1. Consume past dinners
        const consumeResult = await consumeDinners(d1Client)
        console.info(`${LOG} Step 1 complete: consumed ${consumeResult.consumed} dinners`)

        // 2. Close orders on consumed dinners
        const closeResult = await closeOrders(d1Client)
        console.info(`${LOG} Step 2 complete: closed ${closeResult.closed} orders`)

        // 3. Create transactions for closed orders
        const transactResult = await createTransactions(d1Client)
        console.info(`${LOG} Step 3 complete: created ${transactResult.created} transactions`)

        // 4. A consumed dinner has no queue
        const clearWaitlist = await deleteWaitlistForConsumedDinners(d1Client)
        console.info(`${LOG} Step 4 complete: cleared ${clearWaitlist.cleared} waiting-list entries`)

        // Initialize NULL preferences + scaffold pre-bookings (requires active season)
        const activeSeasonId = await fetchActiveSeasonId(d1Client)
        let initPrefsResult = {initialized: 0}
        let scaffoldResult = null
        let notifications: DailyMaintenanceResult['notifications'] = {}

        if (activeSeasonId) {
            initPrefsResult = await clipPreferences(d1Client, activeSeasonId)
            console.info(`${LOG} initPrefs: initialized ${initPrefsResult.initialized} inhabitants`)

            scaffoldResult = await scaffoldPrebookings(d1Client, {seasonId: activeSeasonId})
            console.info(`${LOG} scaffold: ${useBooking().formatScaffoldResult(scaffoldResult)}`)

            // The dinners as they stand after the scaffold owe the notifications of its outcomes too
            const {counts} = await sendNotifications(d1Client, email, activeSeasonId, {jobRunId: jobRun.id})
            notifications = {[BOOKING_STATUS]: counts}
            console.info(`${LOG} notifications: ${BOOKING_STATUS} sent ${counts.sent}`)
        } else {
            console.info(`${LOG} initPrefs/scaffold/notifications skipped: no active season`)
        }

        const result: DailyMaintenanceResult = {
            jobRunId: jobRun.id,
            consume: consumeResult,
            close: closeResult,
            transact: transactResult,
            clearWaitlist,
            initPrefs: initPrefsResult,
            scaffold: scaffoldResult,
            notifications
        }

        // Complete job run with success
        await completeJobRun(d1Client, jobRun.id, JobStatus.SUCCESS, result)

        console.info(`${LOG} Daily maintenance complete (jobRunId=${jobRun.id})`)
        return result
    } catch (error) {
        // Complete job run with failure
        await completeJobRun(
            d1Client,
            jobRun.id,
            JobStatus.FAILED,
            undefined,
            error instanceof Error ? error.message : 'Unknown error'
        )
        throw error
    }
}
