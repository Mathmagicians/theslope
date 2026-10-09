import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from 'h3'
import {z} from 'zod'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {requireChefForDinner} from '~~/server/utils/authorizationHelper'
import {fetchExpensesForDinner} from '~~/server/data/financesRepository'
import type {Expense} from '~/composables/useBillingValidation'

const {throwH3Error} = eventHandlerHelper
const LOG = '🧾 > CHEF > EXPENSES > [GET]'
const paramsSchema = z.object({id: z.coerce.number().int().positive()})

/**
 * GET /api/chef/dinner/[id]/expenses - the dinner's grocery lines in the order they were entered
 */
export default defineEventHandler(async (event): Promise<Expense[]> => {
    const d1Client = event.context.cloudflare.env.DB

    let id!: number
    try {
        ({id} = await getValidatedRouterParams(event, paramsSchema.parse))
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error, 400)
    }

    await requireChefForDinner(event, id)

    try {
        const expenses = await fetchExpensesForDinner(d1Client, id)
        setResponseStatus(event, 200)
        return expenses
    } catch (error) {
        return throwH3Error(`${LOG} Error fetching the expenses of dinner ${id}`, error)
    }
})
