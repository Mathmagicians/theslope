import {defineEventHandler, getValidatedRouterParams, readValidatedBody, setResponseStatus, getRequestURL} from 'h3'
import type {H3Error} from 'h3'
import {fetchDinnerEvent, updateDinnerEvent, updateDinnerEventAllergens} from '~~/server/data/financesRepository'
import {createHeynaboEvent, updateHeynaboEvent, cancelHeynaboEvent, uploadHeynaboEventImage, getRandomDefaultDinnerPicture, updateHeynaboEventWithFallback} from '~~/server/integration/heynabo/heynaboClient'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useBooking} from '~/composables/useBooking'
import type {DinnerEventDetail} from '~/composables/useBookingValidation'
import type {UserSession} from '~/composables/useCoreValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {requireChefForDinner} from '~~/server/utils/authorizationHelper'
import {z} from 'zod'

const {throwH3Error, h3eFromCatch} = eventHandlerHelper
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
 * Update dinner event (chef operation)
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

    // Authorization: caller must be in this dinner's team chef pool.
    // Throws 401/403/404.
    await requireChefForDinner(event, id)

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
        let heynaboSyncDegraded = false

        const uploadDefaultPicture = async (token: string, heynaboEventId: number): Promise<void> => {
            try {
                const pictureFilename = getRandomDefaultDinnerPicture()
                const pictureUrl = `${baseUrl}/${encodeURIComponent(pictureFilename)}`
                const imageResponse = await fetch(pictureUrl)
                if (imageResponse.ok) {
                    const imageBlob = await imageResponse.blob()
                    await uploadHeynaboEventImage(token, heynaboEventId, imageBlob, pictureFilename)
                } else {
                    console.warn(PREFIX, 'Failed to fetch default picture:', pictureUrl, 'status:', imageResponse.status)
                }
            } catch (imageError) {
                console.warn(h3eFromCatch(`${PREFIX}Image upload failed (non-blocking)`, imageError).message)
            }
        }

        const {allergenIds, state: targetState, ...menuUpdates} = updates

        if (targetState) {
            switch (targetState) {
                case DinnerState.ANNOUNCED: {
                    if (dinner.state === DinnerState.CONSUMED) {
                        throw createError({statusCode: 400, message: PREFIX + `Cannot announce consumed dinner event ${id}`})
                    }
                    if (!heynaboToken) {
                        throw createError({statusCode: 401, message: PREFIX + 'Not authenticated or missing Heynabo token'})
                    }

                    const heynaboPayload = createHeynaboEventPayload(dinner, baseUrl)

                    // Idempotent publish: update existing; recreate only on 404 (HN no longer has it).
                    // Other HN failures keep the existing id and mark degraded — chef can retry via Publicer.
                    let heynaboEventId: number | null = dinner.heynaboEventId
                    if (heynaboEventId) {
                        const result = await updateHeynaboEvent(heynaboToken, heynaboEventId, heynaboPayload)
                            .then(() => 'ok' as const)
                            .catch((error: H3Error) => {
                                heynaboSyncDegraded = true
                                return error.statusCode === 404 ? 'missing' : 'failed'
                            })
                        if (result === 'missing') heynaboEventId = null
                    }

                    if (!heynaboEventId) {
                        const created = await createHeynaboEvent(heynaboToken, heynaboPayload)
                            .catch(() => { heynaboSyncDegraded = true; return null })
                        if (created) {
                            heynaboEventId = created.id
                            await uploadDefaultPicture(heynaboToken, created.id)
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

                    if (dinner.heynaboEventId && heynaboToken) {
                        const heynaboPayload = createHeynaboEventPayload(dinner, baseUrl)
                        try {
                            await cancelHeynaboEvent(heynaboToken, dinner.heynaboEventId, heynaboPayload)
                        } catch {
                            // Any failure (incl. 404) = HN out of sync with our cancelled state
                            heynaboSyncDegraded = true
                        }
                    }

                    updatedDinner = await updateDinnerEvent(d1Client, id, {
                        ...menuUpdates,
                        state: DinnerState.CANCELLED
                    })
                    console.info(PREFIX + `Cancelled dinner ${id}`)
                    break
                }

                case DinnerState.SCHEDULED: {
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
            updatedDinner = await updateDinnerEvent(d1Client, id, menuUpdates)

            if (updatedDinner.heynaboEventId) {
                const heynaboPayload = createHeynaboEventPayload(updatedDinner, baseUrl)
                await updateHeynaboEventWithFallback(heynaboToken, updatedDinner.heynaboEventId, heynaboPayload)
                    .catch(() => { heynaboSyncDegraded = true })
            }
        }

        if (allergenIds !== undefined) {
            updatedDinner = await updateDinnerEventAllergens(d1Client, id, allergenIds)
            console.info(PREFIX + `Updated ${allergenIds.length} allergens for dinner ${id}`)
        }

        console.info(PREFIX + `Updated dinner ${id} (heynaboSyncDegraded=${heynaboSyncDegraded})`)
        setResponseStatus(event, heynaboSyncDegraded ? 207 : 200)
        return updatedDinner
    } catch (error) {
        return throwH3Error(PREFIX + `Error updating dinner event ${id}`, error)
    }
})
