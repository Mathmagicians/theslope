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
import {useDeliveryValidation, type SenderEvent} from '~/composables/useDeliveryValidation'
import {useBooking} from '~/composables/useBooking'
import {errorMessage} from '~/utils/utils'
import type {EmailChannel} from '~~/server/utils/sender/config'
import type {DeliveryResult} from '~~/server/utils/sender/deliveries'
import {sendNotifications} from '~~/server/utils/sender/events/waitlist'
import {sendChefDeadlines} from '~~/server/utils/sender/events/chef-deadlines'

const LOG = '🔧 > DAILY > [MAINTENANCE]'
const {BOOKING_STATUS, CHEF_DEADLINES} = useDeliveryValidation().SenderEventSchema.enum

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
        const notifications: DailyMaintenanceResult['notifications'] = {}
        const failures: string[] = []
        // A notification step stands alone: the data steps have landed, so its failure is logged and the run goes on to
        // complete PARTIAL
        const notify = async (senderEvent: SenderEvent, send: () => Promise<DeliveryResult>): Promise<void> => {
            try {
                const {counts} = await send()
                notifications[senderEvent] = counts
                console.info(`${LOG} notifications: ${senderEvent} sent ${counts.sent}`)
            } catch (error) {
                const message = errorMessage(error)
                console.error(`${LOG} notifications: ${senderEvent} failed: ${message}`)
                failures.push(`${senderEvent}: ${message}`)
            }
        }

        if (activeSeasonId) {
            initPrefsResult = await clipPreferences(d1Client, activeSeasonId)
            console.info(`${LOG} initPrefs: initialized ${initPrefsResult.initialized} inhabitants`)

            scaffoldResult = await scaffoldPrebookings(d1Client, {seasonId: activeSeasonId})
            console.info(`${LOG} scaffold: ${useBooking().formatScaffoldResult(scaffoldResult)}`)

            // The dinners as they stand after the scaffold send the notifications of its outcomes too
            await notify(BOOKING_STATUS, () => sendNotifications(d1Client, email, activeSeasonId, {jobRunId: jobRun.id}))

            // The chef hears the deadlines as the scaffold left the dinners
            await notify(CHEF_DEADLINES, () => sendChefDeadlines(d1Client, email, activeSeasonId, {jobRunId: jobRun.id}))
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

        const failed = failures.join('; ')
        if (failed) await completeJobRun(d1Client, jobRun.id, JobStatus.PARTIAL, result, failed)
        else await completeJobRun(d1Client, jobRun.id, JobStatus.SUCCESS, result)

        console.info(`${LOG} Daily maintenance complete (jobRunId=${jobRun.id}${failed ? `, partial: ${failed}` : ''})`)
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
