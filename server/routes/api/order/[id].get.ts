import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {fetchOrder} from "~~/server/data/financesRepository"
import {idParams} from '~/composables/useCoreValidation'
import type { OrderDetail } from '~/composables/useBookingValidation'
const {throwH3Error} = eventHandlerHelper

const paramSchema = idParams('id')

/** GET /api/order/[id] - Open to any authenticated user */
export default defineEventHandler(async (event):Promise<OrderDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    let id!: number
    let order: OrderDetail | null
    try {
        ({id} = await getValidatedRouterParams(event, paramSchema.parse))
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

    console.info(`🎟️ > ORDER > [GET] Successfully fetched order ${order.id}`)
    setResponseStatus(event, 200)
    return order
})
