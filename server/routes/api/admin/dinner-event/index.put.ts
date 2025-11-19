import {defineEventHandler, readValidatedBody, setResponseStatus} from "h3"
import {saveDinnerEvent} from "~~/server/data/financesRepository"
import {useBookingValidation} from "~/composables/useBookingValidation"
import type {DinnerEventCreate, DinnerEventDetail} from "~/composables/useBookingValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper
const {DinnerEventCreateSchema} = useBookingValidation()

export default defineEventHandler(async (event): Promise<DinnerEventDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let dinnerEventData!: DinnerEventCreate
    try {
        dinnerEventData = await readValidatedBody(event, DinnerEventCreateSchema.parse)
    } catch (error) {
        return throwH3Error('🍽️ > DINNER_EVENT > [PUT] Input validation error', error)
    }

    // Database operations try-catch - separate concerns
    try {
        console.info(`🍽️ > DINNER_EVENT > [PUT] Creating dinner event ${dinnerEventData.menuTitle}`)
        const savedDinnerEvent = await saveDinnerEvent(d1Client, dinnerEventData)
        console.info(`🍽️ > DINNER_EVENT > [PUT] Successfully created dinner event ${savedDinnerEvent.menuTitle}`)
        setResponseStatus(event, 201)
        return savedDinnerEvent
    } catch (error) {
        return throwH3Error(`🍽️ > DINNER_EVENT > [PUT] Error creating dinner event`, error)
    }
})
