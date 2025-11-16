import {defineEventHandler, getValidatedRouterParams, readValidatedBody, setResponseStatus} from "h3"
import {updateDinnerEvent} from "~~/server/data/prismaRepository"
import {useBookingValidation} from "~/composables/useBookingValidation"
import type {DinnerEventDetail} from "~/composables/useBookingValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from "zod"

const {h3eFromCatch} = eventHandlerHelper
const {BaseDinnerEventSchema} = useBookingValidation()

const idSchema = z.object({
    id: z.coerce.number().int().positive('ID must be a positive integer')
})

export default defineEventHandler(async (event): Promise<DinnerEventDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id, dinnerEventData
    try {
        ({id} = await getValidatedRouterParams(event, idSchema.parse))
        dinnerEventData = await readValidatedBody(event, BaseDinnerEventSchema.partial().omit({id: true, createdAt: true, updatedAt: true}).parse)
    } catch (error) {
        const h3e = h3eFromCatch('🍽️ > DINNER_EVENT > [POST] Input validation error', error)
        console.error(`🍽️ > DINNER_EVENT > [POST] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Database operations try-catch - separate concerns
    try {
        console.info(`🍽️ > DINNER_EVENT > [POST] Updating dinner event ${id}`)
        const updatedDinnerEvent = await updateDinnerEvent(d1Client, id, dinnerEventData)
        console.info(`🍽️ > DINNER_EVENT > [POST] Successfully updated dinner event ${updatedDinnerEvent.menuTitle}`)
        setResponseStatus(event, 200)
        return updatedDinnerEvent
    } catch (error) {
        const h3e = h3eFromCatch(`🍽️ > DINNER_EVENT > [POST] Error updating dinner event ${id}`, error)
        console.error(`🍽️ > DINNER_EVENT > [POST] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
