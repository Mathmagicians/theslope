/**
 * Daily Maintenance Service
 *
 * Core logic for daily maintenance tasks, called by both:
 * - Nitro scheduled task (context.cloudflare.env.DB)
 * - HTTP endpoint (event.context.cloudflare.env.DB)
 *
 * All operations are idempotent (ADR-015).
 */
import type {D1Database} from '@cloudflare/workers-types'
import {consumeDinners} from '~~/server/utils/consumeDinners'
import {closeOrders} from '~~/server/utils/closeOrders'
import {createTransactions} from '~~/server/utils/createTransactions'
import {scaffoldPrebookings} from '~~/server/utils/scaffoldPrebookings'
import {fetchActiveSeasonId} from '~~/server/data/prismaRepository'
import {createJobRun, completeJobRun} from '~~/server/data/maintenanceRepository'
import {useMaintenanceValidation} from '~/composables/useMaintenanceValidation'
import type {DailyMaintenanceResult} from '~/composables/useBookingValidation'

const LOG = '🔧 > DAILY > [MAINTENANCE]'

export async function runDailyMaintenance(d1Client: D1Database, triggeredBy: string): Promise<DailyMaintenanceResult> {
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

        // 4. Scaffold pre-bookings for active season
        const activeSeasonId = await fetchActiveSeasonId(d1Client)
        let scaffoldResult = null
        if (activeSeasonId) {
            scaffoldResult = await scaffoldPrebookings(d1Client, activeSeasonId)
            console.info(`${LOG} Step 4 complete: scaffolded ${scaffoldResult?.created ?? 0} orders`)
        } else {
            console.info(`${LOG} Step 4 skipped: no active season`)
        }

        const result: DailyMaintenanceResult = {
            jobRunId: jobRun.id,
            consume: consumeResult,
            close: closeResult,
            transact: transactResult,
            scaffold: scaffoldResult
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
