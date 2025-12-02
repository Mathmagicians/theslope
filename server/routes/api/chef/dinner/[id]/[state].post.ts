import {defineEventHandler, getValidatedRouterParams, setResponseStatus, getRequestURL} from 'h3'
import {fetchDinnerEvent, updateDinnerEvent} from '~~/server/data/financesRepository'
import {createHeynaboEvent, updateHeynaboEvent, cancelHeynaboEvent, uploadHeynaboEventImage, getRandomDefaultDinnerPicture} from '~~/server/integration/heynabo/heynaboClient'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useBooking} from '~/composables/useBooking'
import type {DinnerEventDetail} from '~/composables/useBookingValidation'
import type {UserDetail} from '~/composables/useCoreValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {z} from 'zod'

const {throwH3Error} = eventHandlerHelper
const {DinnerStateSchema} = useBookingValidation()
const DinnerState = DinnerStateSchema.enum

const paramsSchema = z.object({
    id: z.coerce.number().int().positive('ID must be a positive integer'),
    state: DinnerStateSchema
})

/**
 * Change dinner event state (chef operation)
 *
 * POST /api/chef/dinner/[id]/[state]
 *
 * Supported state transitions (ADR-013):
 * - ANNOUNCED: Create/update Heynabo event, requires NOT CANCELLED
 * - CANCELLED: Cancel Heynabo event, requires ANNOUNCED
 */
export default defineEventHandler(async (event): Promise<DinnerEventDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const PREFIX = '👨‍🍳 > CHEF > DINNER > STATE > '

    // Input validation - FAIL EARLY
    let id!: number
    let targetState!: typeof DinnerState[keyof typeof DinnerState]
    try {
        ({id, state: targetState} = await getValidatedRouterParams(event, paramsSchema.parse))
    } catch (error) {
        return throwH3Error(PREFIX + 'Input validation error', error, 400)
    }

    // Get user session and Heynabo token
    const session = await getUserSession(event)
    const user = session?.user as UserDetail | undefined
    const heynaboToken = user?.passwordHash

    if (!heynaboToken) {
        throw createError({statusCode: 401, message: PREFIX + 'Not authenticated or missing Heynabo token'})
    }

    // Business logic
    try {
        const dinner = await fetchDinnerEvent(d1Client, id)
        if (!dinner) {
            throw createError({statusCode: 404, message: PREFIX + `Dinner event ${id} not found`})
        }

        const {createHeynaboEventPayload} = useBooking()
        const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://skraaningen.dk'

        switch (targetState) {
            case DinnerState.ANNOUNCED: {
                if (dinner.state === DinnerState.CANCELLED) {
                    throw createError({statusCode: 400, message: PREFIX + `Cannot announce cancelled dinner event ${id}`})
                }

                const heynaboPayload = createHeynaboEventPayload(
                    {date: dinner.date, menuTitle: dinner.menuTitle, menuDescription: dinner.menuDescription},
                    baseUrl,
                    dinner.cookingTeam?.name
                )

                let heynaboEventId = dinner.heynaboEventId
                if (heynaboEventId) {
                    await updateHeynaboEvent(heynaboToken, heynaboEventId, heynaboPayload)
                } else {
                    const heynaboEvent = await createHeynaboEvent(heynaboToken, heynaboPayload)
                    heynaboEventId = heynaboEvent.id

                    // Upload random default dinner picture to new Heynabo event
                    try {
                        const pictureFilename = getRandomDefaultDinnerPicture()
                        const requestUrl = getRequestURL(event)
                        const pictureUrl = `${requestUrl.origin}/${encodeURIComponent(pictureFilename)}`
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

                const announcedDinner = await updateDinnerEvent(d1Client, id, {
                    heynaboEventId,
                    state: DinnerState.ANNOUNCED
                })

                setResponseStatus(event, 200)
                return announcedDinner
            }

            case DinnerState.CANCELLED: {
                if (dinner.state !== DinnerState.ANNOUNCED) {
                    throw createError({statusCode: 400, message: PREFIX + `Can only cancel announced dinners. Current state: ${dinner.state}`})
                }

                if (dinner.heynaboEventId) {
                    const heynaboPayload = createHeynaboEventPayload(
                        {date: dinner.date, menuTitle: dinner.menuTitle, menuDescription: dinner.menuDescription},
                        baseUrl,
                        dinner.cookingTeam?.name
                    )
                    await cancelHeynaboEvent(heynaboToken, dinner.heynaboEventId, heynaboPayload)
                }

                const cancelledDinner = await updateDinnerEvent(d1Client, id, {
                    state: DinnerState.CANCELLED
                })

                setResponseStatus(event, 200)
                return cancelledDinner
            }

            default:
                throw createError({statusCode: 400, message: PREFIX + `State transition to ${targetState} not supported via this endpoint`})
        }
    } catch (error) {
        return throwH3Error(PREFIX + `Error changing dinner event ${id} to ${targetState}`, error)
    }
})
