import {defineEventHandler, getValidatedRouterParams, readValidatedBody, setResponseStatus} from 'h3'
import {z} from 'zod'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {requireChefForDinner} from '~~/server/utils/authorizationHelper'
import {createExpense, fetchDinnerEvent} from '~~/server/data/financesRepository'
import {useBillingValidation, type Expense, type ExpenseCreate} from '~/composables/useBillingValidation'
import {useHousehold} from '~/composables/useHousehold'
import {formatDate} from '~/utils/date'

const {throwH3Error} = eventHandlerHelper
const LOG = '🧾 > CHEF > EXPENSES > [PUT]'
const paramsSchema = z.object({id: z.coerce.number().int().positive()})

/**
 * PUT /api/chef/dinner/[id]/expenses - a grocery line on the dinner
 *
 * The chef entering the line is its payer, named as the card names people; the snapshot outlives the user row (the
 * Heynabo import deletes users first). The note is the dinner's date and menu title, so the line reads in the ledgers
 * where lines of many dinners meet.
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
        const dinner = await fetchDinnerEvent(d1Client, id)
        const {formatNameWithInitials} = useHousehold()
        const expense = await createExpense(d1Client, {
            type: LedgerEntryTypeSchema.enum.REGULAR,
            dinnerEventId: id,
            paidByUserId: chef.id,
            paidBy: {id: chef.id, email: chef.email, name: chef.Inhabitant ? formatNameWithInitials(chef.Inhabitant) : chef.email},
            amount: body.amount,
            description: dinner ? `${formatDate(dinner.date, 'dd/MM')} ${dinner.menuTitle}`.trim() : formatDate(new Date(), 'dd/MM')
        })
        setResponseStatus(event, 201)
        return expense
    } catch (error) {
        return throwH3Error(`${LOG} Error adding an expense to dinner ${id}`, error)
    }
})
