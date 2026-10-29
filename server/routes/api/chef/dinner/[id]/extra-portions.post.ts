import {defineEventHandler, getValidatedRouterParams, readValidatedBody, setResponseStatus} from 'h3'
import {idParams} from '~/composables/useCoreValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {requireChefForDinner} from '~~/server/utils/authorizationHelper'
import {assignWaitlistPortions} from '~~/server/utils/waitlistAssignment'
import {emailChannel} from '~~/server/utils/sender/config'
import {notifyExtraPortions} from '~~/server/utils/sender/events/waitlist'
import {deliverInBackground} from '~~/server/utils/sender/deliveries'
import {useWaitlistValidation, type WaitlistAssignmentResult, type ExtraPortionsRequest} from '~/composables/useWaitlistValidation'

const {throwH3Error} = eventHandlerHelper
const LOG = '👨‍🍳 > CHEF > WAITLIST > [EXTRA_PORTIONS]'

const paramSchema = idParams('id')

/**
 * POST /api/chef/dinner/[id]/extra-portions - the chef cooks N more portions; the waiting entries that fit, in queue order, get regular orders
 */
export default defineEventHandler(async (event): Promise<WaitlistAssignmentResult> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const {ExtraPortionsRequestSchema, WaitlistAssignmentResultSchema} = useWaitlistValidation()

    let id!: number
    let body!: ExtraPortionsRequest
    try {
        id = (await getValidatedRouterParams(event, paramSchema.parse)).id
        body = await readValidatedBody(event, ExtraPortionsRequestSchema.parse)
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error, 400)
    }

    const {user: chef, dinner} = await requireChefForDinner(event, id)

    try {
        const result = await assignWaitlistPortions(d1Client, dinner, body.portions, chef.id)
        deliverInBackground(event, () => notifyExtraPortions(d1Client, emailChannel(cloudflare.env), result))
        console.info(`${LOG} Chef ${chef.id} cooks ${body.portions} more portions on dinner ${id}: ${result.assigned.length} assigned, ${result.waiting} waiting`)
        setResponseStatus(event, 200)
        return WaitlistAssignmentResultSchema.parse(result)
    } catch (error) {
        return throwH3Error(`${LOG} Error releasing portions on dinner ${id}`, error)
    }
})
