import {defineEventHandler, getValidatedRouterParams, readValidatedBody, setResponseStatus} from 'h3'
import {fetchDinnerEvent, updateDinnerEvent, updateDinnerEventAllergens} from '~~/server/data/financesRepository'
import {deleteHeynaboEventAsSystem} from '~~/server/integration/heynabo/heynaboClient'
import {CHEF_LOSS_DINNER_UPDATES} from '~/composables/useBooking'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import type {DinnerEventDetail} from '~/composables/useBookingValidation'
import {getRequiredUser} from '~~/server/utils/authorizationHelper'
import {isAdmin} from '~/composables/usePermissions'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {z} from 'zod'

const {throwH3Error} = eventHandlerHelper
const {RemoveRoleRequestSchema, DinnerStateSchema} = useBookingValidation()
const {TeamRoleSchema} = useCookingTeamValidation()
const DinnerState = DinnerStateSchema.enum
const TeamRole = TeamRoleSchema.enum
const PREFIX = '👩‍🍳 > TEAM > COOKING > REMOVE_ROLE > [POST] > '

const idSchema = z.object({
    id: z.coerce.number().int().positive('ID must be a positive integer')
})

/**
 * Remove a chef from a dinner event ("Meld afbud").
 *
 * POST /api/team/cooking/[id]/remove-role
 *
 * Twin of assign-role. Applies CHEF_LOSS_DINNER_UPDATES + clears allergens, reverts
 * the dinner to SCHEDULED, deletes the Heynabo event best-effort (ADR-013):
 * 200 on full success, 207 when the HN deletion failed.
 *
 * Authz: self-remove allowed; removing another inhabitant requires admin.
 */
export default defineEventHandler(async (event): Promise<DinnerEventDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    let id!: number
    let body!: z.infer<typeof RemoveRoleRequestSchema>
    try {
        ({id} = await getValidatedRouterParams(event, idSchema.parse))
        body = await readValidatedBody(event, RemoveRoleRequestSchema.parse)
    } catch (error) {
        return throwH3Error(PREFIX + 'Input validation error', error, 400)
    }

    const caller = await getRequiredUser(event)
    const callerInhabitantId = caller.Inhabitant?.id
    if (!callerInhabitantId) {
        return throwH3Error(PREFIX + `User ${caller.email} has no inhabitant`, new Error('Inhabitant required'), 403)
    }
    const targetInhabitantId = body.inhabitantId ?? callerInhabitantId
    if (targetInhabitantId !== callerInhabitantId && !isAdmin(caller)) {
        return throwH3Error(PREFIX + 'Removing another chef requires admin', new Error('Forbidden'), 403)
    }

    try {
        const dinner = await fetchDinnerEvent(d1Client, id)
        if (!dinner) {
            throw createError({statusCode: 404, message: PREFIX + `Dinner event ${id} not found`})
        }
        if (body.role !== TeamRole.CHEF) {
            throw createError({statusCode: 400, message: PREFIX + 'Only the CHEF role can be removed from a dinner'})
        }
        if (dinner.state === DinnerState.CONSUMED) {
            throw createError({statusCode: 400, message: PREFIX + `Cannot remove chef from consumed dinner ${id}`})
        }
        if (dinner.chefId !== targetInhabitantId) {
            throw createError({statusCode: 400, message: PREFIX + `Inhabitant ${targetInhabitantId} is not the chef of dinner ${id}`})
        }

        let heynaboSyncDegraded = false
        if (dinner.heynaboEventId) {
            try {
                await deleteHeynaboEventAsSystem(dinner.heynaboEventId)
            } catch (heynaboError) {
                console.warn(`${PREFIX}Failed to delete Heynabo event ${dinner.heynaboEventId} (non-blocking):`, heynaboError)
                heynaboSyncDegraded = true
            }
        }

        await updateDinnerEvent(d1Client, id, CHEF_LOSS_DINNER_UPDATES)
        const updatedDinner = await updateDinnerEventAllergens(d1Client, id, [])
        console.info(PREFIX + `Removed chef from dinner ${id}, reverted to SCHEDULED (heynaboSyncDegraded=${heynaboSyncDegraded})`)
        setResponseStatus(event, heynaboSyncDegraded ? 207 : 200)
        return updatedDinner
    } catch (error) {
        return throwH3Error(PREFIX + `Error removing chef from dinner ${id}`, error)
    }
})
