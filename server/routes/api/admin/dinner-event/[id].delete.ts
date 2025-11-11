import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from "h3"
import {deleteDinnerEvent} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from "zod"
import type {DinnerEvent} from "~/composables/useDinnerEventValidation"

const {h3eFromCatch} = eventHandlerHelper

const idSchema = z.object({
    id: z.coerce.number().int().positive('ID must be a positive integer')
})

export default defineEventHandler(async (event): Promise<DinnerEvent> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id
    try {
        ({id} = await getValidatedRouterParams(event, idSchema.parse))
    } catch (error) {
        const h3e = h3eFromCatch('🍽️ > DINNER_EVENT > [DELETE] Input validation error', error)
        console.error(`🍽️ > DINNER_EVENT > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Database operations try-catch - separate concerns
    try {
        console.info(`🍽️ > DINNER_EVENT > [DELETE] Deleting dinner event ${id}`)
        const deletedDinnerEvent = await deleteDinnerEvent(d1Client, id)
        console.info(`🍽️ > DINNER_EVENT > [DELETE] Successfully deleted dinner event ${deletedDinnerEvent.menuTitle}`)
        setResponseStatus(event, 200)
        return deletedDinnerEvent
    } catch (error) {
        const h3e = h3eFromCatch(`🍽️ > DINNER_EVENT > [DELETE] Error deleting dinner event ${id}`, error)
        console.error(`🍽️ > DINNER_EVENT > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }
})