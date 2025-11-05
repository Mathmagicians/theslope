import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {useOrderValidation} from "~/composables/useOrderValidation"
import type { Order } from '~/composables/useOrderValidation'
import {createOrder} from "~~/server/data/prismaRepository"
const {h3eFromCatch} = eventHandlerHelper
const {OrderCreateSchema, OrderSchema} = useOrderValidation()

export default defineEventHandler(async (event): Promise<Order> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    let orderData
    try {
        orderData = await readValidatedBody(event, OrderCreateSchema.parse)
    } catch (error) {
        const h3e = h3eFromCatch('🎟️ > ORDER > [PUT] Input validation error', error)
        console.error(`🎟️ > ORDER > [PUT] ${h3e.statusMessage}`, error)
        throw h3e
    }

    try {
        console.info(`🎟️ > ORDER > [PUT] Creating order for ${orderData.dinnerEventId}`)
        const savedOrder = await createOrder(d1Client, orderData)
        console.info(`🎟️ > ORDER > [PUT] Successfully created order ${savedOrder.id}`)
        setResponseStatus(event, 201)
        return savedOrder
    } catch (error) {
        const h3e = h3eFromCatch(`🎟️ > ORDER > [PUT] Error creating order`, error)
        console.error(`🎟️ > ORDER > [PUT] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
