import {defineEventHandler, setResponseStatus} from "h3"
import {consumeDinners} from "~~/server/utils/consumeDinners"
import {closeOrders} from "~~/server/utils/closeOrders"
import {createTransactions} from "~~/server/utils/createTransactions"
import {scaffoldPrebookings} from "~~/server/utils/scaffoldPrebookings"
import {fetchActiveSeasonId} from "~~/server/data/prismaRepository"
import {useBookingValidation, type DailyMaintenanceResult} from "~/composables/useBookingValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper
const LOG = '🔧 > DAILY > [MAINTENANCE]'

/**
 * POST /api/admin/maintenance/daily
 *
 * Runs all daily maintenance tasks in sequence:
 * 1. consumeDinners - Mark past dinners as CONSUMED
 * 2. closeOrders - Mark orders on consumed dinners as CLOSED
 * 3. createTransactions - Create transactions for closed orders
 * 4. scaffoldPrebookings - Create pre-bookings for upcoming dinners
 *
 * All operations are idempotent and resilient to missed crons.
 */
export default defineEventHandler(async (event): Promise<DailyMaintenanceResult> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const {DailyMaintenanceResultSchema} = useBookingValidation()

    console.info(`${LOG} Starting daily maintenance`)

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
            consume: consumeResult,
            close: closeResult,
            transact: transactResult,
            scaffold: scaffoldResult
        }

        console.info(`${LOG} Daily maintenance complete`)
        setResponseStatus(event, 200)
        return DailyMaintenanceResultSchema.parse(result)
    } catch (error) {
        return throwH3Error(`${LOG} Error during daily maintenance`, error)
    }
})
