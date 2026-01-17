import {defineEventHandler, setResponseStatus, getValidatedRouterParams, createError} from 'h3'
import {z} from 'zod'
import {fetchTransactionsForInvoice} from '~~/server/data/financesRepository'
import type {TransactionDisplay} from '~/composables/useBillingValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error} = eventHandlerHelper
const LOG = '💰 > INVOICE > [GET TRANSACTIONS]'

const idSchema = z.object({id: z.coerce.number().int().positive()})

/**
 * GET /api/admin/billing/invoices/[id]
 *
 * Fetch transactions for a specific invoice (lazy loading for admin economy tree view).
 * Returns TransactionDisplay[] - UI uses groupByCostEntry() to organize by dinner.
 *
 * ADR-002: Separate try-catch for validation vs business logic
 */
export default defineEventHandler(async (event): Promise<TransactionDisplay[]> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Validation (ADR-002)
    let invoiceId: number
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        invoiceId = params.id
    } catch (e) {
        throw createError({statusCode: 400, message: 'Invalid invoice ID', cause: e})
    }

    // Business logic
    try {
        console.info(`${LOG} Fetching transactions for invoice ${invoiceId}`)
        const transactions = await fetchTransactionsForInvoice(d1Client, invoiceId)

        setResponseStatus(event, 200)
        return transactions
    } catch (error) {
        return throwH3Error(`${LOG} Error fetching transactions for invoice ${invoiceId}`, error)
    }
})
