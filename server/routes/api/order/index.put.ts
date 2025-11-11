import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {useOrderValidation} from "~/composables/useOrderValidation"
import type { Order } from '~/composables/useOrderValidation'
import {createOrder} from "~~/server/data/prismaRepository"
const {h3eFromCatch} = eventHandlerHelper

export default defineEventHandler(async (event): Promise<Order[]> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const {CreateOrdersRequestSchema} = useOrderValidation()

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

        const createdOrders: Order[] = []
        for (const orderItem of requestData.orders) {
            const orderData = {
                dinnerEventId: requestData.dinnerEventId,
                inhabitantId: orderItem.inhabitantId,
                ticketPriceId: orderItem.ticketPriceId
            }
            const savedOrder = await createOrder(d1Client, orderData)
            createdOrders.push(savedOrder)
        }

        console.info(`🎟️ > ORDER > [PUT] Successfully created ${createdOrders.length} order(s)`)
        setResponseStatus(event, 201)
        return createdOrders
    } catch (error) {
        const h3e = h3eFromCatch(`🎟️ > ORDER > [PUT] Error creating orders`, error)
        console.error(`🎟️ > ORDER > [PUT] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
