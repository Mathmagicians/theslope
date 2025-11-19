import {defineEventHandler, getValidatedQuery, setResponseStatus} from "h3"
import {fetchDinnerEvents} from "~~/server/data/financesRepository"
import {z} from "zod"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import type {DinnerEventDisplay} from "~/composables/useBookingValidation"

const {throwH3Error} = eventHandlerHelper

const querySchema = z.object({
    seasonId: z.coerce.number().int().positive().optional()
})

export default defineEventHandler(async (event): Promise<DinnerEventDisplay[]> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let seasonId!: number | undefined
    try {
        const query = await getValidatedQuery(event, querySchema.parse)
        seasonId = query.seasonId
    } catch (error) {
        return throwH3Error('🍽️ > DINNER_EVENT > [GET] Input validation error', error)
    }

    // Business logic try-catch - separate concerns
    try {
        const dinnerEvents = await fetchDinnerEvents(d1Client, seasonId)
        console.info(`🍽️ > DINNER_EVENT > [GET] Retrieved ${dinnerEvents.length} dinner events${seasonId ? ` for season ${seasonId}` : ''}`)
        setResponseStatus(event, 200)
        return dinnerEvents
    } catch (error) {
        return throwH3Error('🍽️ > DINNER_EVENT > [GET] Error fetching dinner events', error)
    }
})
