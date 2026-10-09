import {createError, defineEventHandler, getValidatedRouterParams, readValidatedBody, setResponseStatus} from 'h3'
import {z} from 'zod'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {requireChefForDinner} from '~~/server/utils/authorizationHelper'
import {fetchUser} from '~~/server/data/prismaRepository'
import {createExpense} from '~~/server/data/financesRepository'
import {useBillingValidation, type Expense, type ExpenseCreate} from '~/composables/useBillingValidation'

const {throwH3Error} = eventHandlerHelper
const LOG = '🧾 > CHEF > EXPENSES > [PUT]'
const paramsSchema = z.object({id: z.coerce.number().int().positive()})

/**
 * PUT /api/chef/dinner/[id]/expenses - a grocery line on the dinner
 *
 * The payer defaults to the chef entering the line; null means the kitchen paid directly. The payer's snapshot
 * outlives the user row (the Heynabo import deletes users first).
 */
export default defineEventHandler(async (event): Promise<Expense> => {
    const d1Client = event.context.cloudflare.env.DB
    const {ExpenseCreateSchema, LedgerEntryTypeSchema} = useBillingValidation()

    let id!: number
    let body!: ExpenseCreate
    try {
        ({id} = await getValidatedRouterParams(event, paramsSchema.parse))
        body = await readValidatedBody(event, ExpenseCreateSchema.parse)
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error, 400)
    }

    const chef = await requireChefForDinner(event, id)

    try {
        const paidByUserId = body.paidByUserId === undefined ? chef.id : body.paidByUserId
        const payer = paidByUserId === null ? null : paidByUserId === chef.id ? chef : await fetchUser(d1Client, {id: paidByUserId})
        if (paidByUserId !== null && !payer) throw createError({statusCode: 404, message: `User ${paidByUserId} not found`})

        const expense = await createExpense(d1Client, {
            type: LedgerEntryTypeSchema.enum.REGULAR,
            dinnerEventId: id,
            paidByUserId,
            paidBy: {id: payer?.id ?? null, email: payer?.email ?? ''},
            amount: body.amount,
            description: body.description
        })
        setResponseStatus(event, 201)
        return expense
    } catch (error) {
        return throwH3Error(`${LOG} Error adding an expense to dinner ${id}`, error)
    }
})
