import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from 'h3'
import {idParams} from '~/composables/useCoreValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {requireChefForDinner} from '~~/server/utils/authorizationHelper'
import {deleteExpense} from '~~/server/data/financesRepository'
import type {Expense} from '~/composables/useBillingValidation'

const {throwH3Error} = eventHandlerHelper
const LOG = '🧾 > CHEF > EXPENSES > [DELETE]'
const paramSchema = idParams('id', 'expenseId')

/**
 * DELETE /api/chef/dinner/[id]/expenses/[expenseId] - remove a grocery line; returns the removed line (ADR-009)
 */
export default defineEventHandler(async (event): Promise<Expense> => {
    const d1Client = event.context.cloudflare.env.DB

    let id!: number
    let expenseId!: number
    try {
        ({id, expenseId} = await getValidatedRouterParams(event, paramSchema.parse))
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error, 400)
    }

    await requireChefForDinner(event, id)

    try {
        const removed = await deleteExpense(d1Client, id, expenseId)
        setResponseStatus(event, 200)
        return removed
    } catch (error) {
        return throwH3Error(`${LOG} Error removing expense ${expenseId} from dinner ${id}`, error)
    }
})
