import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import type { OrderDisplay } from '~/composables/useBookingValidation'
import { useBookingValidation } from '~/composables/useBookingValidation'
import {createOrders} from "~~/server/data/prismaRepository"
const {h3eFromCatch} = eventHandlerHelper

export default defineEventHandler(async (event): Promise<OrderDisplay[]> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const {CreateOrdersRequestSchema, OrderStateSchema} = useBookingValidation()

    let requestData
    try {
        requestData = await readValidatedBody(event, CreateOrdersRequestSchema.parse)
    } catch (error) {
        const h3e = h3eFromCatch('🎟️ > ORDER > [PUT] Input validation error', error)
        console.error(`🎟️ > ORDER > [PUT] ${h3e.statusMessage}`, error)
        throw h3e
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
        const h3e = h3eFromCatch(`🎟️ > ORDER > [PUT] Error creating orders`, error)
        console.error(`🎟️ > ORDER > [PUT] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
