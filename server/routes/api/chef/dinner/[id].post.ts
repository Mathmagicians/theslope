import {defineEventHandler, getValidatedRouterParams, readValidatedBody, setResponseStatus, getRequestURL} from 'h3'
import {fetchDinnerEvent, updateDinnerEvent, updateDinnerEventAllergens} from '~~/server/data/financesRepository'
import {createHeynaboEvent, updateHeynaboEvent, cancelHeynaboEvent, uploadHeynaboEventImage, getRandomDefaultDinnerPicture, updateHeynaboEventWithFallback} from '~~/server/integration/heynabo/heynaboClient'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useBooking} from '~/composables/useBooking'
import type {DinnerEventDetail} from '~/composables/useBookingValidation'
import type {UserSession} from '~/composables/useCoreValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {z} from 'zod'

const {throwH3Error} = eventHandlerHelper
const {DinnerStateSchema, DinnerEventUpdateSchema} = useBookingValidation()
const DinnerState = DinnerStateSchema.enum

const idSchema = z.object({
    id: z.coerce.number().int().positive('ID must be a positive integer')
})

// Consolidated schema: menu fields + state + allergens (all optional, at least one required)
const ChefDinnerUpdateSchema = DinnerEventUpdateSchema.extend({
    state: DinnerStateSchema.optional(),
    allergenIds: z.array(z.number().int().positive()).optional()
}).refine(
    data => Object.keys(data).some(k => data[k as keyof typeof data] !== undefined),
    {message: 'At least one field must be provided'}
)

type ChefDinnerUpdate = z.infer<typeof ChefDinnerUpdateSchema>

/**
 * Update dinner event (chef operation) - CONSOLIDATED ENDPOINT
 *
 * POST /api/chef/dinner/[id]
 *
 * Handles:
 * - Menu fields (title, description, picture) - syncs to Heynabo if announced
 * - State transitions (ANNOUNCED creates Heynabo event, CANCELLED cancels it)
 * - Allergens (NO Heynabo sync - we're source of truth)
 *
 * ADR-013: Uses user's Heynabo token. Falls back to system token for admins without Heynabo.
 */
export default defineEventHandler(async (event): Promise<DinnerEventDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const PREFIX = '👨‍🍳 > CHEF > DINNER > UPDATE > '

    // Input validation - FAIL EARLY
    let id!: number
    let updates!: ChefDinnerUpdate
    try {
        ({id} = await getValidatedRouterParams(event, idSchema.parse))
        updates = await readValidatedBody(event, ChefDinnerUpdateSchema.parse)
        console.info(PREFIX, `Called with dinner ID ${id}, updates:`, Object.keys(updates).join(', '))
    } catch (error) {
        return throwH3Error(PREFIX + 'Input validation error', error, 400)
    }

    // Get user session and Heynabo token
    const session = await getUserSession(event)
    const user = session?.user as UserSession | undefined
    const heynaboToken = user?.passwordHash // User's Heynabo token stored in session

    // Business logic
    try {
        const dinner = await fetchDinnerEvent(d1Client, id)
        if (!dinner) {
            throw createError({statusCode: 404, message: PREFIX + `Dinner event ${id} not found`})
        }

        const {createHeynaboEventPayload, canCancelDinner} = useBooking()
        const baseUrl = getRequestURL(event).origin
        let updatedDinner = dinner

        // Extract allergenIds (handled separately via repository)
        const {allergenIds, state: targetState, ...menuUpdates} = updates

        // 1. Handle state transition (if provided)
        if (targetState) {
            switch (targetState) {
                case DinnerState.ANNOUNCED: {
                    // Allow from SCHEDULED (normal announce) or CANCELLED (undo cancellation)
                    if (dinner.state === DinnerState.CONSUMED) {
                        throw createError({statusCode: 400, message: PREFIX + `Cannot announce consumed dinner event ${id}`})
                    }

                    if (!heynaboToken) {
                        throw createError({statusCode: 401, message: PREFIX + 'Not authenticated or missing Heynabo token'})
                    }

                    const heynaboPayload = createHeynaboEventPayload(dinner, baseUrl)

                    let heynaboEventId = dinner.heynaboEventId
                    if (heynaboEventId) {
                        await updateHeynaboEvent(heynaboToken, heynaboEventId, heynaboPayload)
                    } else {
                        const heynaboEvent = await createHeynaboEvent(heynaboToken, heynaboPayload)
                        heynaboEventId = heynaboEvent.id

                        // Upload random default dinner picture to new Heynabo event
                        try {
                            const pictureFilename = getRandomDefaultDinnerPicture()
                            const pictureUrl = `${baseUrl}/${encodeURIComponent(pictureFilename)}`
                            console.info(PREFIX, 'Fetching default picture:', pictureUrl)
                            const imageResponse = await fetch(pictureUrl)
                            if (imageResponse.ok) {
                                const imageBlob = await imageResponse.blob()
                                await uploadHeynaboEventImage(heynaboToken, heynaboEventId, imageBlob, pictureFilename)
                            } else {
                                console.warn(PREFIX, 'Failed to fetch default picture:', pictureUrl, 'status:', imageResponse.status)
                            }
                        } catch (imageError) {
                            console.warn(PREFIX, 'Image upload failed (non-blocking):', imageError)
                        }
                    }

                    updatedDinner = await updateDinnerEvent(d1Client, id, {
                        ...menuUpdates,
                        heynaboEventId,
                        state: DinnerState.ANNOUNCED
                    })
                    console.info(PREFIX + `Announced dinner ${id} (heynaboEventId: ${heynaboEventId})`)
                    break
                }

                case DinnerState.CANCELLED: {
                    if (!canCancelDinner(dinner)) {
                        const reason = dinner.state === DinnerState.CANCELLED
                            ? 'already cancelled'
                            : 'already consumed'
                        throw createError({statusCode: 400, message: PREFIX + `Cannot cancel dinner ${id}: ${reason}`})
                    }

                    // Cancel in Heynabo if announced
                    if (dinner.heynaboEventId && heynaboToken) {
                        const heynaboPayload = createHeynaboEventPayload(dinner, baseUrl)
                        await cancelHeynaboEvent(heynaboToken, dinner.heynaboEventId, heynaboPayload)
                    }

                    updatedDinner = await updateDinnerEvent(d1Client, id, {
                        ...menuUpdates,
                        state: DinnerState.CANCELLED
                    })
                    console.info(PREFIX + `Cancelled dinner ${id}`)
                    break
                }

                case DinnerState.SCHEDULED: {
                    // Undo cancellation - only allowed from CANCELLED state
                    if (dinner.state !== DinnerState.CANCELLED) {
                        throw createError({statusCode: 400, message: PREFIX + `Cannot revert to SCHEDULED: dinner ${id} is not cancelled (current state: ${dinner.state})`})
                    }

                    updatedDinner = await updateDinnerEvent(d1Client, id, {
                        ...menuUpdates,
                        state: DinnerState.SCHEDULED
                    })
                    console.info(PREFIX + `Reverted dinner ${id} to SCHEDULED (undo cancellation)`)
                    break
                }

                default:
                    throw createError({statusCode: 400, message: PREFIX + `State transition to ${targetState} not supported`})
            }
        } else if (Object.keys(menuUpdates).length > 0) {
            // 2. Handle menu field updates (no state change)
            updatedDinner = await updateDinnerEvent(d1Client, id, menuUpdates)

            // Sync to Heynabo if announced (best-effort, user token with system fallback)
            if (updatedDinner.heynaboEventId) {
                try {
                    const heynaboPayload = createHeynaboEventPayload(updatedDinner, baseUrl)
                    await updateHeynaboEventWithFallback(heynaboToken, updatedDinner.heynaboEventId, heynaboPayload)
                    console.info(PREFIX + `Synced menu updates to Heynabo event ${updatedDinner.heynaboEventId}`)
                } catch (heynaboError) {
                    console.warn(PREFIX + `Failed to sync to Heynabo (non-blocking):`, heynaboError)
                }
            }
        }

        // 3. Handle allergens (if provided) - NO Heynabo sync
        if (allergenIds !== undefined) {
            updatedDinner = await updateDinnerEventAllergens(d1Client, id, allergenIds)
            console.info(PREFIX + `Updated ${allergenIds.length} allergens for dinner ${id}`)
        }

        console.info(PREFIX + `Successfully updated dinner event ${id}`)
        setResponseStatus(event, 200)
        return updatedDinner
    } catch (error) {
        return throwH3Error(PREFIX + `Error updating dinner event ${id}`, error)
    }
})
