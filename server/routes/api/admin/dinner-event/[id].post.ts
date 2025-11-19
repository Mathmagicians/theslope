import {defineEventHandler, getValidatedRouterParams, readValidatedBody, setResponseStatus} from "h3"
import {updateDinnerEvent} from "~~/server/data/financesRepository"
import {useBookingValidation} from "~/composables/useBookingValidation"
import type {DinnerEventDetail} from "~/composables/useBookingValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from "zod"

const {throwH3Error} = eventHandlerHelper
const {BaseDinnerEventSchema} = useBookingValidation()

const idSchema = z.object({
    id: z.coerce.number().int().positive('ID must be a positive integer')
})

export default defineEventHandler(async (event): Promise<DinnerEventDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id!: number
    let dinnerEventData!: any
    try {
        ({id} = await getValidatedRouterParams(event, idSchema.parse))
        dinnerEventData = await readValidatedBody(event, BaseDinnerEventSchema.partial().omit({id: true, createdAt: true, updatedAt: true}).parse)
    } catch (error) {
        return throwH3Error('🍽️ > DINNER_EVENT > [POST] Input validation error', error)
    }

    // Database operations try-catch - separate concerns
    try {
        console.info(`🍽️ > DINNER_EVENT > [POST] Updating dinner event ${id}`)
        const updatedDinnerEvent = await updateDinnerEvent(d1Client, id, dinnerEventData)
        console.info(`🍽️ > DINNER_EVENT > [POST] Successfully updated dinner event ${updatedDinnerEvent.menuTitle}`)
        setResponseStatus(event, 200)
        return updatedDinnerEvent
    } catch (error) {
        return throwH3Error(`🍽️ > DINNER_EVENT > [POST] Error updating dinner event ${id}`, error)
    }
})
