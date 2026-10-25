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
import type {DailyMaintenanceResult, ResendNotificationsResult} from '~/composables/useBookingValidation'
import {useBooking} from '~/composables/useBooking'
import type {EmailChannel} from '~~/server/utils/sender/config'
import {notifyBookingOutcomes, resendBookingMails} from '~~/server/utils/sender/events/waitlist'

const LOG = '🔧 > DAILY > [MAINTENANCE]'

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
        let resendNotifications: ResendNotificationsResult = {resent: 0, dinners: []}

        if (activeSeasonId) {
            initPrefsResult = await clipPreferences(d1Client, activeSeasonId)
            console.info(`${LOG} initPrefs: initialized ${initPrefsResult.initialized} inhabitants`)

            scaffoldResult = await scaffoldPrebookings(d1Client, {seasonId: activeSeasonId})
            console.info(`${LOG} scaffold: ${useBooking().formatScaffoldResult(scaffoldResult)}`)

            // The run's booking mails, then the mails the dinners still to come owe that no Delivery row records
            await notifyBookingOutcomes(d1Client, email, scaffoldResult.outcomes, jobRun.id)
            resendNotifications = await resendBookingMails(d1Client, email, activeSeasonId, jobRun.id)
            console.info(`${LOG} resendNotifications: resent ${resendNotifications.resent} owed booking mails`)
        } else {
            console.info(`${LOG} initPrefs/scaffold/resendNotifications skipped: no active season`)
        }

        const result: DailyMaintenanceResult = {
            jobRunId: jobRun.id,
            consume: consumeResult,
            close: closeResult,
            transact: transactResult,
            clearWaitlist,
            initPrefs: initPrefsResult,
            scaffold: scaffoldResult,
            resendNotifications
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
