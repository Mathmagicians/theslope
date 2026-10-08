import {defineEventHandler, getValidatedRouterParams, readValidatedBody, setResponseStatus} from 'h3'
import {z} from 'zod'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {requireChefForDinner} from '~~/server/utils/authorizationHelper'
import {assignWaitlistPortions} from '~~/server/utils/waitlistAssignment'
import {getNotificationConfig} from '~~/server/utils/sender/config'
import {useWaitlistValidation, type WaitlistAssignmentResult, type WaitlistReleaseRequest} from '~/composables/useWaitlistValidation'

const {throwH3Error} = eventHandlerHelper
const LOG = '👨‍🍳 > CHEF > WAITLIST > [RELEASE]'

const idSchema = z.object({id: z.coerce.number().int().positive()})

/**
 * POST /api/chef/dinner/[id]/release-portions - the chef releases N portions; the queue's first entries that fit get their tickets
 */
export default defineEventHandler(async (event): Promise<WaitlistAssignmentResult> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const {WaitlistReleaseRequestSchema, WaitlistAssignmentResultSchema} = useWaitlistValidation()

    let id!: number
    let body!: WaitlistReleaseRequest
    try {
        id = (await getValidatedRouterParams(event, idSchema.parse)).id
        body = await readValidatedBody(event, WaitlistReleaseRequestSchema.parse)
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error, 400)
    }

    const chef = await requireChefForDinner(event, id)

    try {
        const result = await assignWaitlistPortions(d1Client, id, body.portions, chef.id, {
            queue: cloudflare.env.SENDER,
            config: getNotificationConfig(event)
        })
        console.info(`${LOG} Chef ${chef.id} released ${body.portions} portions on dinner ${id}: ${result.assigned.length} assigned, ${result.waiting} waiting`)
        setResponseStatus(event, 200)
        return WaitlistAssignmentResultSchema.parse(result)
    } catch (error) {
        return throwH3Error(`${LOG} Error releasing portions on dinner ${id}`, error)
    }
})
