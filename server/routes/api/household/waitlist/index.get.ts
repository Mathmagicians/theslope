import {defineEventHandler, getValidatedQuery, setResponseStatus} from 'h3'
import {z} from 'zod'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {requireHouseholdAccess} from '~~/server/utils/authorizationHelper'
import {isAdmin} from '~/composables/usePermissions'
import {fetchWaitlistForDinner, fetchWaitlistForHousehold} from '~~/server/data/waitlistRepository'
import {useWaitlistValidation, type WaitlistEntryWithPosition} from '~/composables/useWaitlistValidation'
import {useWaitlist} from '~/composables/useWaitlist'

const {throwH3Error} = eventHandlerHelper
const LOG = '⏳ > WAITLIST > [GET]'

const querySchema = z.object({
    householdId: z.coerce.number().int().positive(),
    dinnerEventIds: z.union([z.coerce.number().int().positive(), z.array(z.coerce.number().int().positive())]).optional(),
    adminBypass: z.coerce.boolean().optional()
})

/**
 * GET /api/household/waitlist?householdId=X&dinnerEventIds=Y - a household's waiting-list entries with their positions
 */
export default defineEventHandler(async (event): Promise<WaitlistEntryWithPosition[]> => {
    const d1Client = event.context.cloudflare.env.DB
    const {WaitlistEntryWithPositionSchema} = useWaitlistValidation()
    const {positionOf} = useWaitlist()

    let query!: z.infer<typeof querySchema>
    try {
        query = await getValidatedQuery(event, querySchema.parse)
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error, 400)
    }

    await requireHouseholdAccess(event, query.householdId, query.adminBypass ? isAdmin : undefined)

    try {
        const dinnerEventIds = query.dinnerEventIds === undefined ? undefined : [query.dinnerEventIds].flat()
        const entries = await fetchWaitlistForHousehold(d1Client, query.householdId, dinnerEventIds)
        // A position counts the whole queue of the entry's dinner, not only the household's entries
        const queues = new Map<number, Awaited<ReturnType<typeof fetchWaitlistForDinner>>>()
        for (const dinnerEventId of new Set(entries.map(entry => entry.dinnerEventId))) {
            queues.set(dinnerEventId, await fetchWaitlistForDinner(d1Client, dinnerEventId))
        }
        const withPositions = entries.map(entry => ({...entry, position: positionOf(queues.get(entry.dinnerEventId) ?? [], entry.id) ?? 1}))
        setResponseStatus(event, 200)
        return withPositions.map(entry => WaitlistEntryWithPositionSchema.parse(entry))
    } catch (error) {
        return throwH3Error(`${LOG} Error fetching the waiting-list entries of household ${query.householdId}`, error)
    }
})
