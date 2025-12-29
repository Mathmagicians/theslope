import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {requireHouseholdAccess} from "~~/server/utils/authorizationHelper"
import {fetchOrder} from "~~/server/data/financesRepository"
import {z} from "zod"
import type { OrderDetail } from '~/composables/useBookingValidation'
const {throwH3Error} = eventHandlerHelper

const idSchema = z.object({
    id: z.coerce.number().int().positive('ID must be a positive integer')
})

export default defineEventHandler(async (event):Promise<OrderDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    let id!: number
    let order: OrderDetail | null
    try {
        ({id} = await getValidatedRouterParams(event, idSchema.parse))
    } catch (error) {
        return throwH3Error('🎟️ > ORDER > [GET] Input validation error', error)
    }

    try {
        console.info(`🎟️ > ORDER > [GET] Fetching order ${id}`)
        order = await fetchOrder(d1Client, id)

    } catch (error) {
        return throwH3Error(`🎟️ > ORDER > [GET] Error fetching order ${id}`, error)
    }
    if (!order) {
        throw createError({
            statusCode: 404,
            message: `🎟️ > ORDER > [GET] Order ${id} not found`
        })
    }

    await requireHouseholdAccess(event, order.inhabitant.householdId)
    console.info(`🎟️ > ORDER > [GET] Successfully fetched order ${order.id}`)
    setResponseStatus(event, 200)
    return order
})
