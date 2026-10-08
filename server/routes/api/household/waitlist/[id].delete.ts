import {createError, defineEventHandler, getValidatedQuery, getValidatedRouterParams, setResponseStatus} from 'h3'
import {z} from 'zod'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {requireHouseholdAccess} from '~~/server/utils/authorizationHelper'
import {isAdmin} from '~/composables/usePermissions'
import {deleteWaitlistEntry, fetchWaitlistEntry} from '~~/server/data/waitlistRepository'
import type {TicketWaitlistDisplay} from '~/composables/useWaitlistValidation'

const {throwH3Error} = eventHandlerHelper
const LOG = '⏳ > WAITLIST > [DELETE]'

const idSchema = z.object({id: z.coerce.number().int().positive()})
const querySchema = z.object({adminBypass: z.coerce.boolean().optional()})

/**
 * DELETE /api/household/waitlist/[id] - leave the waiting list; the household's own entry, or any entry with `?adminBypass=true`
 */
export default defineEventHandler(async (event): Promise<TicketWaitlistDisplay> => {
    const d1Client = event.context.cloudflare.env.DB

    let id!: number
    try {
        id = (await getValidatedRouterParams(event, idSchema.parse)).id
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error, 400)
    }
    const {adminBypass} = await getValidatedQuery(event, querySchema.parse)

    const entry = await fetchWaitlistEntry(d1Client, id)
    if (!entry) throw createError({statusCode: 404, message: `Waiting-list entry ${id} not found`})
    await requireHouseholdAccess(event, entry.householdId, adminBypass ? isAdmin : undefined)

    try {
        await deleteWaitlistEntry(d1Client, id)
        const {householdId: _household, ...removed} = entry
        setResponseStatus(event, 200)
        return removed
    } catch (error) {
        return throwH3Error(`${LOG} Error removing waiting-list entry ${id}`, error)
    }
})
