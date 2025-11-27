import {defineEventHandler, getValidatedRouterParams, readValidatedBody, setResponseStatus} from "h3"
import {updateDinnerEvent} from "~~/server/data/financesRepository"
import {updateHeynaboEventAsSystem} from "~~/server/integration/heynabo/heynaboClient"
import {useBookingValidation} from "~/composables/useBookingValidation"
import {useBooking} from "~/composables/useBooking"
import type {DinnerEventDetail, DinnerEventUpdate} from "~/composables/useBookingValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from "zod"

const {throwH3Error} = eventHandlerHelper
const {DinnerEventUpdateSchema} = useBookingValidation()

const idSchema = z.object({
    id: z.coerce.number().int().positive('ID must be a positive integer')
})

/**
 * Update dinner event (admin operation)
 * POST /api/admin/dinner-event/[id]
 *
 * ADR-013: If dinner is announced (has heynaboEventId), sync changes to Heynabo (best-effort)
 */
export default defineEventHandler(async (event): Promise<DinnerEventDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const PREFIX = '🍽️ > DINNER_EVENT > [POST]'

    // Input validation - FAIL EARLY
    let id!: number
    let dinnerEventData!: DinnerEventUpdate
    try {
        ({id} = await getValidatedRouterParams(event, idSchema.parse))
        dinnerEventData = await readValidatedBody(event, DinnerEventUpdateSchema.parse)
    } catch (error) {
        return throwH3Error(`${PREFIX} Input validation error`, error)
    }

    // Business logic
    try {
        console.info(`${PREFIX} Updating dinner event ${id}`)
        const updatedDinnerEvent = await updateDinnerEvent(d1Client, id, dinnerEventData)

        // ADR-013: Sync to Heynabo if announced (best-effort, don't fail update)
        if (updatedDinnerEvent.heynaboEventId) {
            try {
                const {createHeynaboEventPayload} = useBooking()
                const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://skraaningen.dk'
                const heynaboPayload = createHeynaboEventPayload(
                    {
                        date: updatedDinnerEvent.date,
                        menuTitle: updatedDinnerEvent.menuTitle,
                        menuDescription: updatedDinnerEvent.menuDescription
                    },
                    baseUrl,
                    updatedDinnerEvent.cookingTeam?.name
                )
                await updateHeynaboEventAsSystem(updatedDinnerEvent.heynaboEventId, heynaboPayload)
            } catch (heynaboError) {
                console.warn(`${PREFIX} Failed to sync to Heynabo event ${updatedDinnerEvent.heynaboEventId}:`, heynaboError)
            }
        }

        console.info(`${PREFIX} Successfully updated dinner event ${updatedDinnerEvent.menuTitle}`)
        setResponseStatus(event, 200)
        return updatedDinnerEvent
    } catch (error) {
        return throwH3Error(`${PREFIX} Error updating dinner event ${id}`, error)
    }
})
