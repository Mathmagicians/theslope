import {defineEventHandler, getValidatedRouterParams} from "h3"
import {fetchDinnerEvent} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from "zod"
import dinnerEvent from "~/components/dinner/DinnerEvent.vue";

const {h3eFromCatch} = eventHandlerHelper

const idSchema = z.object({
    id: z.coerce.number().int().positive('ID must be a positive integer')
})

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id, dinnerEvent
    try {
        ({id} = await getValidatedRouterParams(event, idSchema.parse))
    } catch (error) {
        const h3e = h3eFromCatch('🍽️ > DINNER_EVENT > [GET] Input validation error', error)
        console.error(`🍽️ > DINNER_EVENT > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Database operations try-catch - separate concerns
    try {
        console.info(`🍽️ > DINNER_EVENT > [GET] Fetching dinner event ${id}`)
        dinnerEvent = await fetchDinnerEvent(d1Client, id)
    } catch (error) {
        const h3e = h3eFromCatch(`🍽️ > DINNER_EVENT > [GET] Error fetching dinner event ${id}`, error)
        console.error(`🍽️ > DINNER_EVENT > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
    if (!dinnerEvent) {
        throw createError({
                statusCode: 404,
                message: `🍽️ > DINNER_EVENT > [GET] Dinner event ${id} not found`
            })
    }

    console.info(`🍽️ > DINNER_EVENT > [GET] Successfully fetched dinner event ${dinnerEvent.menuTitle}`)
    return dinnerEvent
})
