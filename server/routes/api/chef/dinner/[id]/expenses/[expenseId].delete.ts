import {createError, defineEventHandler, getValidatedRouterParams, setResponseStatus} from 'h3'
import {z} from 'zod'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {requireChefForDinner} from '~~/server/utils/authorizationHelper'
import {deleteExpense, fetchExpense} from '~~/server/data/financesRepository'
import type {Expense} from '~/composables/useBillingValidation'

const {throwH3Error} = eventHandlerHelper
const LOG = '🧾 > CHEF > EXPENSES > [DELETE]'
const paramsSchema = z.object({
    id: z.coerce.number().int().positive(),
    expenseId: z.coerce.number().int().positive()
})

/**
 * DELETE /api/chef/dinner/[id]/expenses/[expenseId] - remove a grocery line; returns the removed line (ADR-009)
 */
export default defineEventHandler(async (event): Promise<Expense> => {
    const d1Client = event.context.cloudflare.env.DB

    let id!: number
    let expenseId!: number
    try {
        ({id, expenseId} = await getValidatedRouterParams(event, paramsSchema.parse))
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error, 400)
    }

    await requireChefForDinner(event, id)

    try {
        const expense = await fetchExpense(d1Client, expenseId)
        if (!expense || expense.dinnerEventId !== id) {
            throw createError({statusCode: 404, message: `Expense ${expenseId} not found on dinner ${id}`})
        }
        const removed = await deleteExpense(d1Client, expenseId)
        setResponseStatus(event, 200)
        return removed
    } catch (error) {
        return throwH3Error(`${LOG} Error removing expense ${expenseId} from dinner ${id}`, error)
    }
})
