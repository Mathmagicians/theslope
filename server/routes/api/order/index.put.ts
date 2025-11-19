import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import type { OrderDisplay, CreateOrdersRequest } from '~/composables/useBookingValidation'
import { useBookingValidation } from '~/composables/useBookingValidation'
import {createOrders} from "~~/server/data/financesRepository"
const {throwH3Error} = eventHandlerHelper

export default defineEventHandler(async (event): Promise<OrderDisplay[]> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const {CreateOrdersRequestSchema, OrderStateSchema} = useBookingValidation()

    let requestData!: CreateOrdersRequest
    try {
        requestData = await readValidatedBody(event, CreateOrdersRequestSchema.parse)
    } catch (error) {
        return throwH3Error('🎟️ > ORDER > [PUT] Input validation error', error)
    }

    try {
        console.info(`🎟️ > ORDER > [PUT] Creating ${requestData.orders.length} order(s) for dinner event ${requestData.dinnerEventId}`)

        // Map request data to order creation data
        const ordersData = requestData.orders.map(orderItem => ({
            dinnerEventId: requestData.dinnerEventId,
            inhabitantId: orderItem.inhabitantId,
            ticketPriceId: orderItem.ticketPriceId,
            dinnerMode: orderItem.dinnerMode,
            state: OrderStateSchema.enum.BOOKED
        }))

        // Use createOrders for batch atomic operation (better than Promise.all)
        const createdOrders = await createOrders(d1Client, ordersData)

        console.info(`🎟️ > ORDER > [PUT] Successfully created ${createdOrders.length} order(s)`)
        setResponseStatus(event, 201)
        return createdOrders
    } catch (error) {
        return throwH3Error(`🎟️ > ORDER > [PUT] Error creating orders`, error)
    }
})
