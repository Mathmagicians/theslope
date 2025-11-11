import {defineEventHandler, readValidatedBody, setResponseStatus} from "h3"
import {saveDinnerEvent} from "~~/server/data/prismaRepository"
import {useDinnerEventValidation} from "~/composables/useDinnerEventValidation"
import type {DinnerEvent} from "~/composables/useDinnerEventValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {h3eFromCatch} = eventHandlerHelper
const {DinnerEventCreateSchema} = useDinnerEventValidation()

export default defineEventHandler(async (event): Promise<DinnerEvent> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let dinnerEventData
    try {
        dinnerEventData = await readValidatedBody(event, DinnerEventCreateSchema.parse)
    } catch (error) {
        const h3e = h3eFromCatch('️️🍽️> DINNER_EVENT > [PUT] Input validation error', error)
        console.error(`🍽️ > DINNER_EVENT > [PUT] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Database operations try-catch - separate concerns
    try {
        console.info(`🍽️ > DINNER_EVENT > [PUT] Creating dinner event ${dinnerEventData.menuTitle}`)
        const savedDinnerEvent = await saveDinnerEvent(d1Client, dinnerEventData)
        console.info(`🍽️> DINNER_EVENT > [PUT] Successfully created dinner event ${savedDinnerEvent.menuTitle}`)
        setResponseStatus(event, 201)
        return savedDinnerEvent
    } catch (error) {
        const h3e = h3eFromCatch(`🍽️ > DINNER_EVENT > [PUT] Error creating dinner event`, error)
        console.error(`🍽️ > DINNER_EVENT > [PUT] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
