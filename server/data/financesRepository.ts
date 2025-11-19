import type {D1Database} from '@cloudflare/workers-types'
import eventHandlerHelper from "../utils/eventHandlerHelper"
import {getPrismaClientConnection} from "../utils/database"

import type {
    OrderCreate,
    OrderDisplay,
    OrderDetail,
    DinnerEventCreate,
    DinnerEventDisplay,
    DinnerEventDetail
} from '~/composables/useBookingValidation'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'

/**
 * Finances Repository
 *
 * Handles all financial operations including:
 * - Orders (dinner event bookings)
 * - Invoices (household billing)
 * - Transactions (payment records)
 *
 * ADR-010: Repository-layer serialization
 * ADR-005: CASCADE/SET NULL relationship handling
 * ADR-002: Separate validation vs business logic error handling
 */

const {h3eFromCatch} = eventHandlerHelper

/*** ORDERS ***/

// ADR-005: Order relationships:
// - Strong to DinnerEvent (order cannot exist without dinner event)
// - Strong to Inhabitant (order cannot exist without inhabitant)
// - Weak to User (bookedByUser) - order can exist if user is deleted (audit trail)
// - Weak to Transaction (order can exist without transaction)

export async function createOrder(d1Client: D1Database, orderData: OrderCreate): Promise<OrderDisplay> {
    console.info(`🎟️ > ORDER > [CREATE] Creating order for inhabitant ${orderData.inhabitantId} on dinner event ${orderData.dinnerEventId}`)
    const {OrderDisplaySchema} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const ticketPrice = await prisma.ticketPrice.findUnique({
            where: { id: orderData.ticketPriceId }
        })

        if (!ticketPrice) {
            throw createError({
                statusCode: 404,
                message: `Ticket price with ID ${orderData.ticketPriceId} not found`
            })
        }

        const newOrder = await prisma.order.create({
            data: {
                ...orderData,
                priceAtBooking: ticketPrice.price
            }
        })

        console.info(`🎟️ > ORDER > [CREATE] Successfully created order with ID ${newOrder.id}`)

        // Transform Prisma type to domain type and validate (ADR-010)
        const domainOrder = {
            ...newOrder,
            ticketType: ticketPrice.ticketType
        }

        return OrderDisplaySchema.parse(domainOrder)
    } catch (error) {
        const h3e = h3eFromCatch(`Error creating order for inhabitant ${orderData.inhabitantId}`, error)
        console.error(`🎟️ > ORDER > [CREATE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

/**
 * Batch create multiple orders for a household (parent booking for family + guests)
 * Business rules:
 * - ONE user (bookedByUserId) books for entire family
 * - Can have different inhabitantIds from same household
 * - Can have multiple orders for same inhabitantId (e.g., adult + child tickets)
 * - All orders must have same bookedByUserId
 * - All inhabitants must be from same household
 * @param d1Client - D1 database client
 * @param ordersData - Array of order creation data
 * @returns Promise<OrderDisplay[]> - All orders for this dinner from this household
 */
export async function createOrders(d1Client: D1Database, ordersData: OrderCreate[]): Promise<OrderDisplay[]> {
    console.info(`🎟️ > ORDER > [BATCH CREATE] Creating ${ordersData.length} orders for household`)
    const {OrderDisplaySchema} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        // Business validation: All inhabitants must be from same household (requires DB lookup)
        const inhabitantIds = [...new Set(ordersData.map(o => o.inhabitantId))]
        const inhabitants = await prisma.inhabitant.findMany({
            where: { id: { in: inhabitantIds } },
            select: { id: true, householdId: true }
        })

        if (inhabitants.length !== inhabitantIds.length) {
            throw createError({
                statusCode: 404,
                message: `Some inhabitants not found`
            })
        }

        const householdIds = [...new Set(inhabitants.map(i => i.householdId))]
        if (householdIds.length > 1) {
            throw createError({
                statusCode: 400,
                message: `All inhabitants must be from the same household. Found ${householdIds.length} different households.`
            })
        }

        const householdId = householdIds[0]
        console.info(`🎟️ > ORDER > [BATCH CREATE] Validated: All ${inhabitantIds.length} inhabitants from household ${householdId}`)

        // Validate all ticket prices exist
        const ticketPriceIds = [...new Set(ordersData.map(o => o.ticketPriceId))]
        const ticketPrices = await prisma.ticketPrice.findMany({
            where: { id: { in: ticketPriceIds } }
        })

        if (ticketPrices.length !== ticketPriceIds.length) {
            throw createError({
                statusCode: 404,
                message: `Some ticket prices not found`
            })
        }

        // Create price lookup map
        const priceMap = new Map(ticketPrices.map(tp => [tp.id, tp]))

        // Prepare data with priceAtBooking
        const ordersWithPrices = ordersData.map(orderData => ({
            ...orderData,
            priceAtBooking: priceMap.get(orderData.ticketPriceId)!.price
        }))

        // Batch insert - Prisma createMany returns { count: number }, NOT the created records
        const result = await prisma.order.createMany({
            data: ordersWithPrices
        })

        console.info(`🎟️ > ORDER > [BATCH CREATE] Inserted ${result.count} orders`)

        // Fetch ALL orders for this household + dinner event (acceptable per business rules)
        // This handles the fact that createMany doesn't return IDs
        const dinnerEventId = ordersData[0].dinnerEventId // All orders for same dinner event
        const householdInhabitantIds = inhabitants.map(i => i.id)

        const createdOrders = await prisma.order.findMany({
            where: {
                dinnerEventId,
                inhabitantId: { in: householdInhabitantIds }
            },
            select: {
                id: true,
                dinnerEventId: true,
                inhabitantId: true,
                bookedByUserId: true,
                ticketPriceId: true,
                priceAtBooking: true,
                dinnerMode: true,
                state: true,
                releasedAt: true,
                closedAt: true,
                createdAt: true,
                updatedAt: true,
                ticketPrice: {
                    select: {
                        id: true,
                        ticketType: true,
                        price: true,
                        description: true,
                        maximumAgeLimit: true
                    }
                }
            },
            orderBy: { id: 'asc' }
        })

        console.info(`🎟️ > ORDER > [BATCH CREATE] Successfully fetched ${createdOrders.length} orders for household ${householdId}`)

        // Transform to domain type with ticketType (use included relation instead of priceMap)
        return createdOrders.map(order => {
            return OrderDisplaySchema.parse({
                ...order,
                ticketType: order.ticketPrice.ticketType
            })
        })
    } catch (error) {
        const h3e = h3eFromCatch(`Error batch creating ${ordersData.length} orders`, error)
        console.error(`🎟️ > ORDER > [BATCH CREATE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function fetchOrder(d1Client: D1Database, id: number): Promise<OrderDetail | null> {
    console.info(`🎟️ > ORDER > [GET] Fetching order with ID ${id}`)
    const {OrderDetailSchema} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const order = await prisma.order.findFirst({
            where: {id},
            include: {
                dinnerEvent: {
                    select: {
                        id: true,
                        date: true,
                        menuTitle: true,
                        menuDescription: true,
                        menuPictureUrl: true,
                        state: true,
                        totalCost: true,
                        heynaboEventId: true,
                        chefId: true,
                        cookingTeamId: true,
                        seasonId: true,
                        createdAt: true,
                        updatedAt: true
                    }
                },
                inhabitant: {
                    select: {
                        id: true,
                        name: true,
                        lastName: true,
                        pictureUrl: true
                    }
                },
                bookedByUser: {
                    select: {
                        id: true,
                        email: true
                    }
                },
                ticketPrice: {
                    select: {
                        id: true,
                        ticketType: true,
                        price: true,
                        description: true
                    }
                }
            }
        })

        if (!order) {
            console.info(`🎟️ > ORDER > [GET] No order found with ID ${id}`)
            return null
        }

        console.info(`🎟️ > ORDER > [GET] Successfully fetched order with ID ${order.id}`)

        // Transform to flatten ticketType from ticketPrice (ADR-009)
        return OrderDetailSchema.parse({
            ...order,
            ticketType: order.ticketPrice.ticketType
        })
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching order with ID ${id}`, error)
        console.error(`🎟️ > ORDER > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function deleteOrder(d1Client: D1Database, id: number): Promise<OrderDisplay> {
    console.info(`🎟️ > ORDER > [DELETE] Deleting order with ID ${id}`)
    const {OrderDisplaySchema} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        // Delete order - cascade handles strong associations (Transaction) automatically
        const deletedOrder = await prisma.order.delete({
            where: {id},
            include: {
                ticketPrice: {
                    select: {
                        ticketType: true
                    }
                }
            }
        })

        console.info(`🎟️ > ORDER > [DELETE] Successfully deleted order with ID ${deletedOrder.id}`)

        // Transform Prisma type to domain type and validate (ADR-010)
        const {ticketPrice, ...orderWithoutRelation} = deletedOrder
        const domainOrder = {
            ...orderWithoutRelation,
            ticketType: ticketPrice.ticketType
        }

        return OrderDisplaySchema.parse(domainOrder)
    } catch (error) {
        const h3e = h3eFromCatch(`Error deleting order with ID ${id}`, error)
        console.error(`🎟️ > ORDER > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function fetchOrders(d1Client: D1Database, dinnerEventId?: number): Promise<OrderDisplay[]> {
    console.info(`🎟️ > ORDER > [GET] Fetching orders${dinnerEventId ? ` for dinner event ${dinnerEventId}` : ''}`)
    const {OrderDisplaySchema} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const orders = await prisma.order.findMany({
            where: dinnerEventId ? {dinnerEventId} : undefined,
            include: {
                ticketPrice: {
                    select: {
                        ticketType: true
                    }
                }
            },
            orderBy: {
                createdAt: 'asc'
            }
        })

        console.info(`🎟️ > ORDER > [GET] Successfully fetched ${orders.length} orders${dinnerEventId ? ` for dinner event ${dinnerEventId}` : ''}`)

        // Transform Prisma types to domain types and validate (ADR-010)
        const domainOrders = orders.map(order => {
            const {ticketPrice, ...orderWithoutRelation} = order
            const domainOrder = {
                ...orderWithoutRelation,
                ticketType: ticketPrice.ticketType
            }
            return OrderDisplaySchema.parse(domainOrder)
        })

        return domainOrders
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching orders${dinnerEventId ? ` for dinner event ${dinnerEventId}` : ''}`, error)
        console.error(`🎟️ > ORDER > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

/*** DINNER EVENTS ***/

// ADR-005: DinnerEvent relationships:
// - Strong to Season (events are part of season's dining schedule)
// - Weak to CookingTeam (event can exist without assigned team)
// - Weak to Inhabitant chef (event can exist without assigned chef)

export async function saveDinnerEvent(d1Client: D1Database, dinnerEvent: DinnerEventCreate): Promise<DinnerEventDisplay> {
    console.info(`🍽️ > DINNER_EVENT > [SAVE] Saving dinner event ${dinnerEvent.menuTitle} on ${dinnerEvent.date}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {DinnerEventDisplaySchema} = useBookingValidation()

    try {
        const newDinnerEvent = await prisma.dinnerEvent.create({
            data: dinnerEvent
        })

        console.info(`🍽️ > DINNER_EVENT > [SAVE] Successfully saved dinner event ${newDinnerEvent.menuTitle} with ID ${newDinnerEvent.id}`)
        return DinnerEventDisplaySchema.parse(newDinnerEvent)
    } catch (error) {
        const h3e = h3eFromCatch(`Error saving dinner event ${dinnerEvent?.menuTitle}`, error)
        console.error(`🍽️ > DINNER_EVENT > [SAVE] ${h3e.message}`, error)
        throw h3e
    }
}

export async function fetchDinnerEvents(d1Client: D1Database, seasonId?: number): Promise<DinnerEventDisplay[]> {
    console.info(`🍽️ > DINNER_EVENT > [GET] Fetching dinner events${seasonId ? ` for season ${seasonId}` : ''}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {DinnerEventDisplaySchema} = useBookingValidation()

    try {
        const dinnerEvents = await prisma.dinnerEvent.findMany({
            where: seasonId ? {seasonId} : undefined,
            include: {
                Season: true,
                chef: true,
                cookingTeam: {
                    include: {
                        season: true
                    }
                }
            },
            orderBy: {
                date: 'asc'
            }
        })

        console.info(`🍽️ > DINNER_EVENT > [GET] Successfully fetched ${dinnerEvents.length} dinner events${seasonId ? ` for season ${seasonId}` : ''}`)
        return dinnerEvents.map(de => DinnerEventDisplaySchema.parse(de))
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching dinner events${seasonId ? ` for season ${seasonId}` : ''}`, error)
        console.error(`🍽️ > DINNER_EVENT > [GET] ${h3e.message}`, error)
        throw h3e
    }
}

export async function fetchDinnerEvent(d1Client: D1Database, id: number): Promise<DinnerEventDetail | null> {
    console.info(`🍽️ > DINNER_EVENT > [GET] Fetching dinner event with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {DinnerEventDetailSchema} = useBookingValidation()
    const {deserializeCookingTeam} = useCookingTeamValidation()

    try {
        const dinnerEvent = await prisma.dinnerEvent.findFirst({
            where: {id},
            include: {
                Season: true,
                chef: true,
                cookingTeam: {
                    include: {
                        season: true,
                        assignments: {
                            include: {
                                inhabitant: true
                            }
                        }
                    }
                },
                tickets: {
                    include: {
                        inhabitant: true,
                        bookedByUser: true,
                        ticketPrice: true
                    }
                }
            }
        })

        if (dinnerEvent) {
            // Deserialize cookingTeam if present (affinity JSON string -> WeekDayMap object)
            const dinnerEventToValidate = {
                ...dinnerEvent,
                cookingTeam: dinnerEvent.cookingTeam ? deserializeCookingTeam(dinnerEvent.cookingTeam) : null
            }

            console.info(`🍽️ > DINNER_EVENT > [GET] Found dinner event ${dinnerEvent.menuTitle} (ID: ${dinnerEvent.id})`)
            return DinnerEventDetailSchema.parse(dinnerEventToValidate)
        } else {
            console.info(`🍽️ > DINNER_EVENT > [GET] No dinner event found with ID ${id}`)
            return null
        }
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching dinner event with ID ${id}`, error)
        console.error(`🍽️ > DINNER_EVENT > [GET] ${h3e.message}`, error)
        throw h3e
    }
}

export async function updateDinnerEvent(d1Client: D1Database, id: number, dinnerEventData: Partial<DinnerEventCreate>): Promise<DinnerEventDetail> {
    console.info(`🍽️ > DINNER_EVENT > [UPDATE] Updating dinner event with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {DinnerEventDetailSchema} = useBookingValidation()
    const {deserializeCookingTeam} = useCookingTeamValidation()

    try {
        const updatedDinnerEvent = await prisma.dinnerEvent.update({
            where: {id},
            data: dinnerEventData,
            include: {
                Season: true,
                chef: true,
                cookingTeam: {
                    include: {
                        season: true,
                        assignments: {
                            include: {
                                inhabitant: true
                            }
                        }
                    }
                }
            }
        })

        // Deserialize cookingTeam if present (affinity JSON string -> WeekDayMap object)
        const dinnerEventToValidate = {
            ...updatedDinnerEvent,
            cookingTeam: updatedDinnerEvent.cookingTeam ? deserializeCookingTeam(updatedDinnerEvent.cookingTeam) : null
        }

        console.info(`🍽️ > DINNER_EVENT > [UPDATE] Successfully updated dinner event ${updatedDinnerEvent.menuTitle} (ID: ${updatedDinnerEvent.id})`)
        return DinnerEventDetailSchema.parse(dinnerEventToValidate)
    } catch (error) {
        const h3e = h3eFromCatch(`Error updating dinner event with ID ${id}`, error)
        console.error(`🍽️ > DINNER_EVENT > [UPDATE] ${h3e.message}`, error)
        throw h3e
    }
}

export async function deleteDinnerEvent(d1Client: D1Database, id: number): Promise<DinnerEventDisplay> {
    console.info(`🍽️ > DINNER_EVENT > [DELETE] Deleting dinner event with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {DinnerEventDisplaySchema} = useBookingValidation()

    try {
        const deletedDinnerEvent = await prisma.dinnerEvent.delete({
            where: {id}
        })

        console.info(`🍽️ > DINNER_EVENT > [DELETE] Successfully deleted dinner event ${deletedDinnerEvent.menuTitle}`)
        return DinnerEventDisplaySchema.parse(deletedDinnerEvent)
    } catch (error) {
        const h3e = h3eFromCatch(`Error deleting dinner event with ID ${id}`, error)
        console.error(`🍽️ > DINNER_EVENT > [DELETE] ${h3e.message}`, error)
        throw h3e
    }
}

/*** INVOICES ***/
// TODO: Add invoice functions (fetchInvoices, createInvoice, etc.)
// ADR-005: Invoice relationships:
// - Strong to Household (invoice cannot exist without household)
// - Weak to Transactions (transactions can exist without invoice)

/*** TRANSACTIONS ***/
// TODO: Add transaction functions (fetchTransactions, createTransaction, etc.)
// ADR-005: Transaction relationships:
// - Weak to Order (transaction preserves snapshot even if order deleted)
// - Weak to Invoice (transaction can exist without invoice)
