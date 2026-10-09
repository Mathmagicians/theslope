import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from 'h3'
import {z} from 'zod'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {requireChefForDinner} from '~~/server/utils/authorizationHelper'
import {summarizeWaitlist} from '~~/server/utils/waitlistAssignment'
import {useWaitlistValidation, type WaitlistQueueSummary} from '~/composables/useWaitlistValidation'

const {throwH3Error} = eventHandlerHelper
const LOG = '👨‍🍳 > CHEF > WAITLIST > [GET]'

const idSchema = z.object({id: z.coerce.number().int().positive()})

/**
 * GET /api/chef/dinner/[id]/waitlist - the dinner's queue size and portion need, for the chef's card
 */
export default defineEventHandler(async (event): Promise<WaitlistQueueSummary> => {
    const d1Client = event.context.cloudflare.env.DB
    const {WaitlistQueueSummarySchema} = useWaitlistValidation()

    let id!: number
    try {
        id = (await getValidatedRouterParams(event, idSchema.parse)).id
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error, 400)
    }

    await requireChefForDinner(event, id)

    try {
        const summary = await summarizeWaitlist(d1Client, id)
        setResponseStatus(event, 200)
        return WaitlistQueueSummarySchema.parse(summary)
    } catch (error) {
        return throwH3Error(`${LOG} Error reading the queue of dinner ${id}`, error)
    }
})
