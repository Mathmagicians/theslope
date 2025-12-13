import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from "h3"
import {deleteDinnerEvent, fetchDinnerEvent} from "~~/server/data/financesRepository"
import {deleteHeynaboEventAsSystem} from "~~/server/integration/heynabo/heynaboClient"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from "zod"
import type {DinnerEventDetail} from "~/composables/useBookingValidation"

const {throwH3Error} = eventHandlerHelper

const idSchema = z.object({
    id: z.coerce.number().int().positive('ID must be a positive integer')
})

/**
 * Delete dinner event (admin operation)
 * DELETE /api/admin/dinner-event/[id]
 *
 * ADR-013: Heynabo cleanup handled by repository (best-effort)
 */
export default defineEventHandler(async (event): Promise<DinnerEventDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const PREFIX = '🍽️ > DINNER_EVENT > [DELETE]'

    // Input validation - FAIL EARLY
    let id!: number
    try {
        ({id} = await getValidatedRouterParams(event, idSchema.parse))
    } catch (error) {
        return throwH3Error(`${PREFIX} Input validation error`, error)
    }

    // Business logic
    try {
        console.info(`${PREFIX} Deleting dinner event ${id}`)

        // Fetch before delete to return Detail (ADR-009)
        const dinnerEventToDelete = await fetchDinnerEvent(d1Client, id)
        if (!dinnerEventToDelete) {
            return throwH3Error(`${PREFIX} Dinner event ${id} not found`, new Error('Not found'), 404)
        }

        // Delete with Heynabo cleanup (ADR-013)
        await deleteDinnerEvent(d1Client, id, deleteHeynaboEventAsSystem)

        console.info(`${PREFIX} Successfully deleted dinner event ${dinnerEventToDelete.menuTitle}`)
        setResponseStatus(event, 200)
        return dinnerEventToDelete
    } catch (error) {
        return throwH3Error(`${PREFIX} Error deleting dinner event ${id}`, error)
    }
})