import {defineEventHandler, getValidatedRouterParams, setResponseStatus, createError} from "h3"
import {fetchDinnerEvent} from "~~/server/data/financesRepository"
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
    let id: number
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        id = params.id
    } catch (error) {
        return throwH3Error('🍽️ > DINNER_EVENT > [GET] Input validation error', error)
    }

    // Database operations try-catch - separate concerns
    let dinnerEvent!: DinnerEventDetail | null
    try {
        console.info(`🍽️ > DINNER_EVENT > [GET] Fetching dinner event ${id}`)
        dinnerEvent = await fetchDinnerEvent(d1Client, id)
    } catch (error) {
        return throwH3Error(`🍽️ > DINNER_EVENT > [GET] Error fetching dinner event ${id}`, error)
    }
    if (!dinnerEvent) {
        throw createError({
                statusCode: 404,
                message: `🍽️ > DINNER_EVENT > [GET] Dinner event ${id} not found`
            })
    }

    console.info(`🍽️ > DINNER_EVENT > [GET] Successfully fetched dinner event ${dinnerEvent.menuTitle}`)
    setResponseStatus(event, 200)
    return dinnerEvent
})
