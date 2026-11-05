import {defineEventHandler, setResponseStatus, getValidatedQuery} from 'h3'
import {runMonthlyBilling} from '~~/server/utils/monthlyBillingService'
import {emailChannel} from '~~/server/utils/sender/config'
import type {MonthlyBillingResponse} from '~/composables/useBillingValidation'
import {useMaintenanceValidation} from '~/composables/useMaintenanceValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error} = eventHandlerHelper
const LOG = '💰 > MONTHLY > [BILLING]'

/**
 * POST /api/admin/maintenance/monthly
 *
 * Manual trigger for monthly billing (admin UI).
 * Same logic as cron task, but triggered via HTTP: generation, CSV archive (ARCHIVE), accountant mail (SENDER).
 *
 * Query params:
 * - triggeredBy: the admin's trigger from the admin UI (`adminTrigger`), the admin when absent
 */
export default defineEventHandler(async (event): Promise<MonthlyBillingResponse> => {
    const {env} = event.context.cloudflare
    const {JobTriggerQuerySchema} = useMaintenanceValidation()

    let triggeredBy: string
    try {
        ({triggeredBy} = await getValidatedQuery(event, JobTriggerQuerySchema.parse))
    } catch (error) {
        return throwH3Error(`${LOG} Invalid query parameters`, error, 400)
    }

    try {
        const result = await runMonthlyBilling(env.DB, triggeredBy, {archive: env.ARCHIVE, email: emailChannel(env)})
        setResponseStatus(event, 200)
        return result
    } catch (error) {
        return throwH3Error(`${LOG} Error during monthly billing`, error)
    }
})
