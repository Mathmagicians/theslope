import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from "h3"
import {deleteDinnerEvent} from "~~/server/data/financesRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from "zod"
import type {DinnerEventDetail} from "~/composables/useBookingValidation"

const {throwH3Error} = eventHandlerHelper

const idSchema = z.object({
    id: z.coerce.number().int().positive('ID must be a positive integer')
})

export default defineEventHandler(async (event): Promise<DinnerEventDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id!: number
    try {
        ({id} = await getValidatedRouterParams(event, idSchema.parse))
    } catch (error) {
        return throwH3Error('🍽️ > DINNER_EVENT > [DELETE] Input validation error', error)
    }

    // Database operations try-catch - separate concerns
    try {
        console.info(`🍽️ > DINNER_EVENT > [DELETE] Deleting dinner event ${id}`)
        const deletedDinnerEvent = await deleteDinnerEvent(d1Client, id)
        console.info(`🍽️ > DINNER_EVENT > [DELETE] Successfully deleted dinner event ${deletedDinnerEvent.menuTitle}`)
        setResponseStatus(event, 200)
        return deletedDinnerEvent
    } catch (error) {
        return throwH3Error(`🍽️ > DINNER_EVENT > [DELETE] Error deleting dinner event ${id}`, error)
    }
})