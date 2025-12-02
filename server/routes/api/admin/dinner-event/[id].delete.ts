import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from "h3"
import {deleteDinnerEvent} from "~~/server/data/financesRepository"
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
 * ADR-013: If dinner was announced (has heynaboEventId), delete from Heynabo (best-effort)
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
        const deletedDinnerEvent = await deleteDinnerEvent(d1Client, id)

        // ADR-013: Delete from Heynabo if was announced (best-effort, don't fail delete)
        if (deletedDinnerEvent.heynaboEventId) {
            try {
                await deleteHeynaboEventAsSystem(deletedDinnerEvent.heynaboEventId)
            } catch (heynaboError) {
                console.warn(`${PREFIX} Failed to delete Heynabo event ${deletedDinnerEvent.heynaboEventId}:`, heynaboError)
            }
        }

        console.info(`${PREFIX} Successfully deleted dinner event ${deletedDinnerEvent.menuTitle}`)
        setResponseStatus(event, 200)
        return deletedDinnerEvent
    } catch (error) {
        return throwH3Error(`${PREFIX} Error deleting dinner event ${id}`, error)
    }
})