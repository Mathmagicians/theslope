import {defineEventHandler, getValidatedRouterParams, readValidatedBody, setResponseStatus} from 'h3'
import {z} from 'zod'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {requireChefForDinner} from '~~/server/utils/authorizationHelper'
import {createExpense} from '~~/server/data/financesRepository'
import {useBillingValidation, type Expense, type ExpenseCreate} from '~/composables/useBillingValidation'
import {useBilling} from '~/composables/useBilling'
import {useHousehold} from '~/composables/useHousehold'

const {throwH3Error} = eventHandlerHelper
const LOG = '🧾 > CHEF > EXPENSES > [PUT]'
const paramsSchema = z.object({id: z.coerce.number().int().positive()})

/**
 * PUT /api/chef/dinner/[id]/expenses - a grocery line on the dinner
 *
 * The chef entering the line is its payer, named as the card names people; the snapshot outlives the user row (the
 * Heynabo import deletes users first). The note is the body's; a body without one gets the words of expenseNoteWords,
 * so the line reads in the ledgers where lines of many dinners meet.
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

    const {user: chef, dinner} = await requireChefForDinner(event, id)

    try {
        const {formatNameWithInitials} = useHousehold()
        const {expenseNoteWords} = useBilling()
        const paidBy = {id: chef.id, email: chef.email, name: chef.Inhabitant ? formatNameWithInitials(chef.Inhabitant) : chef.email}
        const expense = await createExpense(d1Client, {
            type: LedgerEntryTypeSchema.enum.REGULAR,
            dinnerEventId: id,
            paidByUserId: chef.id,
            paidBy,
            amount: body.amount,
            description: body.description ?? expenseNoteWords(dinner, paidBy)
        })
        setResponseStatus(event, 201)
        return expense
    } catch (error) {
        return throwH3Error(`${LOG} Error adding an expense to dinner ${id}`, error)
    }
})
