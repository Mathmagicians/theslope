import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {requireHouseholdAccess} from "~~/server/utils/authorizationHelper"
import type { CreateOrdersRequest, OrderCreateWithPrice, AuditContext, CreateOrdersResult } from '~/composables/useBookingValidation'
import { useBookingValidation } from '~/composables/useBookingValidation'
import { createOrders } from "~~/server/data/financesRepository"
import { getPrismaClientConnection } from "~~/server/utils/database"
const {throwH3Error} = eventHandlerHelper

/**
 * PUT /api/order - Create orders for a family booking
 *
 * User-facing endpoint for booking dinner tickets.
 * Handles validation, price lookup, and audit trail creation.
 *
 * ADR-002: Separate validation vs business logic error handling
 * ADR-009: Returns CreateOrdersResult (IDs only - DB is source of truth)
 */
export default defineEventHandler(async (event): Promise<CreateOrdersResult> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const {CreateOrdersRequestSchema, OrderStateSchema, DinnerModeSchema} = useBookingValidation()

    // Input validation (ADR-002)
    let requestData!: CreateOrdersRequest
    try {
        requestData = await readValidatedBody(event, CreateOrdersRequestSchema.parse)
    } catch (error) {
        return throwH3Error('🎟️ > ORDER > [PUT] Input validation error', error)
    }

    // Ownership check
    await requireHouseholdAccess(event, requestData.householdId)

    // Graceful handling of empty orders array
    if (requestData.orders.length === 0) {
        console.info(`🎟️ > ORDER > [PUT] Empty orders array for household ${requestData.householdId}`)
        setResponseStatus(event, 200)
        return { householdId: requestData.householdId, createdIds: [] }
    }

    // Business logic (ADR-002)
    try {
        console.info(`🎟️ > ORDER > [PUT] Creating ${requestData.orders.length} order(s) for dinner event ${requestData.dinnerEventId}, household ${requestData.householdId}`)
        const prisma = await getPrismaClientConnection(d1Client)

        // Validate inhabitants belong to the specified household
        const inhabitantIds = [...new Set(requestData.orders.map(o => o.inhabitantId))]
        const inhabitants = await prisma.inhabitant.findMany({
            where: { id: { in: inhabitantIds } },
            select: { id: true, householdId: true }
        })

        if (inhabitants.length !== inhabitantIds.length) {
            throw createError({
                statusCode: 404,
                message: 'Some inhabitants not found'
            })
        }

        const invalidInhabitants = inhabitants.filter(i => i.householdId !== requestData.householdId)
        if (invalidInhabitants.length > 0) {
            throw createError({
                statusCode: 400,
                message: `Inhabitants ${invalidInhabitants.map(i => i.id).join(', ')} do not belong to household ${requestData.householdId}`
            })
        }

        // Look up ticket prices to get priceAtBooking
        const ticketPriceIds = [...new Set(requestData.orders.map(o => o.ticketPriceId))]
        const ticketPrices = await prisma.ticketPrice.findMany({
            where: { id: { in: ticketPriceIds } }
        })

        if (ticketPrices.length !== ticketPriceIds.length) {
            throw createError({
                statusCode: 404,
                message: 'Some ticket prices not found'
            })
        }

        const priceMap = new Map(ticketPrices.map(tp => [tp.id, tp.price]))

        // Build OrderCreateWithPrice array
        // Note: isGuestTicket defaults to false - guest tickets use scaffold endpoint (ADR-016)
        const ordersData: OrderCreateWithPrice[] = requestData.orders.map(orderItem => ({
            dinnerEventId: requestData.dinnerEventId,
            inhabitantId: orderItem.inhabitantId,
            bookedByUserId: orderItem.bookedByUserId ?? null,
            ticketPriceId: orderItem.ticketPriceId,
            priceAtBooking: priceMap.get(orderItem.ticketPriceId)!,
            householdId: requestData.householdId,
            dinnerMode: orderItem.dinnerMode ?? DinnerModeSchema.enum.DINEIN,
            state: OrderStateSchema.enum.BOOKED,
            isGuestTicket: false
        }))

        // Create audit context for user booking
        const auditContext: AuditContext = {
            action: 'USER_BOOKED',
            performedByUserId: requestData.orders[0]?.bookedByUserId ?? null,
            source: 'api_order_put'
        }

        // Create orders with audit trail
        const result = await createOrders(d1Client, requestData.householdId, ordersData, auditContext)
        console.info(`🎟️ > ORDER > [PUT] Successfully created ${result.createdIds.length} order(s)`)

        setResponseStatus(event, 201)
        return result
    } catch (error) {
        return throwH3Error(`🎟️ > ORDER > [PUT] Error creating orders`, error)
    }
})
