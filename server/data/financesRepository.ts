import type {D1Database} from '@cloudflare/workers-types'
import eventHandlerHelper from "../utils/eventHandlerHelper"
import {getPrismaClientConnection} from "../utils/database"

import type {
    OrderCreate,
    OrderDisplay,
    OrderDetail,
    OrderCreateWithPrice,
    AuditContext,
    CreateOrdersResult,
    DinnerEventCreate,
    DinnerEventDisplay,
    DinnerEventDetail,
    OrderHistoryDetail,
    OrderHistoryCreate
} from '~/composables/useBookingValidation'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useCoreValidation} from '~/composables/useCoreValidation'

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

const {throwH3Error} = eventHandlerHelper

/*** ORDER AUDIT ***/

/**
 * Create an audit entry in OrderHistory.
 *
 * Used for tracking order lifecycle events (creation, cancellation, etc.)
 * Denormalized fields (inhabitantId, dinnerEventId, seasonId) persist even
 * after order deletion, enabling cancellation queries for scaffolding.
 *
 * ADR-011: OrderHistory with denormalized fields for cancellation tracking
 * ADR-010: Repository-layer serialization with validated types
 * ADR-009: Mutations return Detail schema
 */
export async function createOrderAuditEntry(
    d1Client: D1Database,
    entry: OrderHistoryCreate
): Promise<OrderHistoryDetail> {
    const {OrderHistoryCreateSchema, OrderHistoryDetailSchema, deserializeOrder} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)

    // Validate input with schema
    const validatedEntry = OrderHistoryCreateSchema.parse(entry)

    const created = await prisma.orderHistory.create({
        data: validatedEntry,
        include: {
            order: {
                include: {
                    ticketPrice: {
                        select: {ticketType: true}
                    }
                }
            }
        }
    })

    console.info(`📋 > ORDER_AUDIT > [CREATE] Created ${validatedEntry.action} entry for order ${validatedEntry.orderId}`)

    // ADR-010: Transform to domain type with proper order deserialization
    const orderHistoryDetail = {
        ...created,
        order: created.order ? {
            ...deserializeOrder(created.order),
            ticketType: created.order.ticketPrice.ticketType
        } : null
    }

    return OrderHistoryDetailSchema.parse(orderHistoryDetail)
}

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
        return throwH3Error(`️🎟️ > ORDER > [CREATE]: Error creating order for inhabitant ${orderData.inhabitantId}`, error)
    }
}

/**
 * Batch create orders for a single household with audit trail.
 *
 * Trusts caller for validation (OrdersBatchSchema ensures same householdId, max 8 orders).
 * Uses createManyAndReturn for efficient D1 insertion.
 *
 * ADR-009: Returns IDs only (DB is source of truth)
 * ADR-011: Creates OrderHistory audit entries atomically
 *
 * @param d1Client - D1 database client
 * @param householdId - Household ID (for result tracking)
 * @param ordersData - Pre-validated array of orders (max 8, same householdId)
 * @param auditContext - Audit context for OrderHistory entries
 * @returns CreateOrdersResult with householdId and created order IDs
 */
export async function createOrders(
    d1Client: D1Database,
    householdId: number,
    ordersData: OrderCreateWithPrice[],
    auditContext: AuditContext
): Promise<CreateOrdersResult> {
    console.info(`🎟️ > ORDER > [BATCH CREATE] Creating ${ordersData.length} orders for household ${householdId}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        // Insert orders with createManyAndReturn (Prisma 5.14+, returns IDs)
        const createdOrders = await prisma.order.createManyAndReturn({
            data: ordersData.map(order => ({
                dinnerEventId: order.dinnerEventId,
                inhabitantId: order.inhabitantId,
                bookedByUserId: order.bookedByUserId,
                ticketPriceId: order.ticketPriceId,
                priceAtBooking: order.priceAtBooking,
                dinnerMode: order.dinnerMode,
                state: order.state
            })),
            select: { id: true }
        })

        const createdIds = createdOrders.map(o => o.id)
        console.info(`🎟️ > ORDER > [BATCH CREATE] Created order IDs: ${createdIds.join(', ')}`)

        // Create audit trail entries atomically
        await prisma.orderHistory.createMany({
            data: createdIds.map((orderId, index) => ({
                orderId,
                action: auditContext.action,
                performedByUserId: auditContext.performedByUserId,
                auditData: JSON.stringify({
                    source: auditContext.source,
                    orderData: ordersData[index]
                })
            }))
        })

        console.info(`🎟️ > ORDER > [BATCH CREATE] Successfully created ${createdIds.length} orders with audit trail for household ${householdId}`)

        return { householdId, createdIds }
    } catch (error) {
        return throwH3Error(`🎟️ > ORDER > [BATCH CREATE]: Error creating ${ordersData.length} orders for household ${householdId}`, error)
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
                        heynaboId: true,
                        householdId: true,
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
        return throwH3Error(`🎟️ > ORDER > [GET]: Error fetching order with ID ${id}`, error)
    }
}

/**
 * Delete an order and create audit trail entry.
 *
 * @param d1Client - D1 database client
 * @param id - Order ID to delete
 * @param performedByUserId - User ID who performed deletion (null = admin/system)
 *
 * Audit action is determined by performedByUserId:
 * - Non-null: USER_CANCELLED (user deleted their own booking, respected by scaffolder)
 * - Null: ADMIN_DELETED (admin deleted, may be recreated by scaffolder)
 *
 * ADR-011: Creates OrderHistory entry with denormalized fields before deletion.
 * When order is deleted, orderId becomes NULL but inhabitantId/dinnerEventId/seasonId persist.
 */
export async function deleteOrder(
    d1Client: D1Database,
    id: number,
    performedByUserId: number | null = null
): Promise<OrderDisplay> {
    const action = performedByUserId ? 'USER_CANCELLED' : 'ADMIN_DELETED'
    console.info(`🎟️ > ORDER > [DELETE] Deleting order ${id} (action: ${action}, performedBy: ${performedByUserId ?? 'admin/system'})`)
    const {OrderDisplaySchema} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        // 1. Fetch order with relations to get denormalized fields and seasonId
        const orderToDelete = await prisma.order.findUniqueOrThrow({
            where: {id},
            include: {
                ticketPrice: {
                    select: {ticketType: true}
                },
                dinnerEvent: {
                    select: {seasonId: true}
                }
            }
        })

        // 2. Create audit entry with denormalized fields BEFORE deletion
        // (orderId becomes NULL after deletion due to SET NULL, but denormalized fields persist)
        await prisma.orderHistory.create({
            data: {
                orderId: id,
                action,
                performedByUserId,
                inhabitantId: orderToDelete.inhabitantId,
                dinnerEventId: orderToDelete.dinnerEventId,
                seasonId: orderToDelete.dinnerEvent?.seasonId ?? null,
                auditData: JSON.stringify({
                    orderSnapshot: {
                        id: orderToDelete.id,
                        inhabitantId: orderToDelete.inhabitantId,
                        dinnerEventId: orderToDelete.dinnerEventId,
                        ticketPriceId: orderToDelete.ticketPriceId,
                        priceAtBooking: orderToDelete.priceAtBooking,
                        dinnerMode: orderToDelete.dinnerMode,
                        state: orderToDelete.state
                    }
                })
            }
        })

        // 3. Delete order - cascade handles strong associations (Transaction) automatically
        const deletedOrder = await prisma.order.delete({
            where: {id},
            include: {
                ticketPrice: {
                    select: {ticketType: true}
                }
            }
        })

        console.info(`🎟️ > ORDER > [DELETE] Successfully deleted order ${deletedOrder.id} with ${action} audit entry`)

        // Transform Prisma type to domain type and validate (ADR-010)
        const {ticketPrice, ...orderWithoutRelation} = deletedOrder
        const domainOrder = {
            ...orderWithoutRelation,
            ticketType: ticketPrice.ticketType
        }

        return OrderDisplaySchema.parse(domainOrder)
    } catch (error) {
        return throwH3Error(`🎟️ > ORDER > [DELETE] : Error deleting order with ID ${id}`, error)
    }
}

export async function fetchOrders(d1Client: D1Database, dinnerEventId?: number): Promise<OrderDisplay[]> {
    console.info(`🎟️ > ORDER > [GET] Fetching orders${dinnerEventId ? ` for dinner event ${dinnerEventId}` : ''}`)
    const {OrderDisplaySchema} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        // Build where clause explicitly - field name must be specified
        const whereClause = dinnerEventId ? { dinnerEventId: dinnerEventId } : {}

        const orders = await prisma.order.findMany({
            where: whereClause,
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
        return orders.map(order => {
            const {ticketPrice, ...orderWithoutRelation} = order
            const domainOrder = {
                ...orderWithoutRelation,
                ticketType: ticketPrice.ticketType
            }
            return OrderDisplaySchema.parse(domainOrder)
        })
    } catch (error) {
        return throwH3Error(`🍽️ > DINNER_EVENT > [GET] : Error fetching orders for dinner event ${dinnerEventId}`, error)
    }
}

/*** DINNER EVENTS ***/

// ADR-005: DinnerEvent relationships:
// - Strong to Season (events are part of season's dining schedule)
// - Weak to CookingTeam (event can exist without assigned team)
// - Weak to Inhabitant chef (event can exist without assigned chef)

/**
 * Save one or more dinner events. Accepts single or array, returns Display[] (ADR-009).
 * Uses createManyAndReturn for efficient D1 insertion.
 */
export async function saveDinnerEvents(
    d1Client: D1Database,
    dinnerEventInput: DinnerEventCreate | DinnerEventCreate[]
): Promise<DinnerEventDisplay[]> {
    // Normalize to array
    const dinnerEvents = Array.isArray(dinnerEventInput) ? dinnerEventInput : [dinnerEventInput]
    if (dinnerEvents.length === 0) return []

    console.info(`🍽️ > DINNER_EVENT > [SAVE] Saving ${dinnerEvents.length} dinner event(s)`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {DinnerEventDisplaySchema} = useBookingValidation()

    try {
        // Strip relation fields, keep only create data
        const createData = dinnerEvents.map(({allergens, ...data}) => data)

        const created = await prisma.dinnerEvent.createManyAndReturn({
            data: createData
        })

        console.info(`🍽️ > DINNER_EVENT > [SAVE] Successfully saved ${created.length} dinner event(s)`)
        return created.map(de => DinnerEventDisplaySchema.parse(de))
    } catch (error) {
        return throwH3Error(`🍽️ > DINNER_EVENT > [SAVE]: Error saving ${dinnerEvents.length} dinner event(s)`, error)
    }
}

export async function fetchDinnerEvents(d1Client: D1Database, seasonId?: number): Promise<DinnerEventDisplay[]> {
    console.info(`🍽️ > DINNER_EVENT > [GET] Fetching dinner events${seasonId ? ` for season ${seasonId}` : ''}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {DinnerEventDisplaySchema} = useBookingValidation()

    try {
        // Build where clause explicitly - field name must be specified
        const whereClause = seasonId ? { seasonId: seasonId } : {}

        const dinnerEvents = await prisma.dinnerEvent.findMany({
            where: whereClause,
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
        return throwH3Error(`🍽️ > DINNER_EVENT > [GET]: Error fetching dinner events${seasonId ? ` for season ${seasonId}` : ''}`, error)
    }
}

export async function fetchDinnerEvent(d1Client: D1Database, id: number): Promise<DinnerEventDetail | null> {
    console.info(`🍽️ > DINNER_EVENT > [GET] Fetching dinner event with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {DinnerEventDetailSchema, deserializeDinnerEventDetail} = useBookingValidation()

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
                        },
                        _count: {
                            select: {dinners: true}
                        }
                    }
                },
                tickets: {
                    include: {
                        inhabitant: {
                            include: {
                                allergies: {
                                    include: {
                                        allergyType: true
                                    }
                                }
                            }
                        },
                        bookedByUser: true,
                        ticketPrice: true
                    }
                },
                allergens: {
                    include: {
                        allergyType: true
                    }
                }
            }
        })

        if (dinnerEvent) {
            // ADR-010: Deserialize handles all transformations:
            // - allergens: flatten join table
            // - chef: Inhabitant with dinnerPreferences JSON string
            // - cookingTeam: CookingTeam with affinity and assignments JSON strings
            // - tickets: flatten ticketType, add dinnerEvent ref, deserialize inhabitant
            const dinnerEventToValidate = deserializeDinnerEventDetail(dinnerEvent)

            console.info(`🍽️ > DINNER_EVENT > [GET] Found dinner event ${dinnerEvent.menuTitle} (ID: ${dinnerEvent.id})`)
            return DinnerEventDetailSchema.parse(dinnerEventToValidate)
        } else {
            console.info(`🍽️ > DINNER_EVENT > [GET] No dinner event found with ID ${id}`)
            return null
        }
    } catch (error) {
        return throwH3Error(`️ > DINNER_EVENT > [GET]: Error fetching dinner event with ID ${id}`, error)
    }
}

export async function updateDinnerEvent(d1Client: D1Database, id: number, dinnerEventData: Partial<DinnerEventCreate>): Promise<DinnerEventDetail> {
    console.info(`🍽️ > DINNER_EVENT > [UPDATE] Updating dinner event with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {DinnerEventDetailSchema, deserializeDinnerEventDetail} = useBookingValidation()

    // Exclude relation fields that Prisma doesn't accept in update data
    const {allergens, ...updateData} = dinnerEventData

    try {
        const updatedDinnerEvent = await prisma.dinnerEvent.update({
            where: {id},
            data: updateData,
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
                        },
                        _count: {
                            select: {dinners: true}
                        }
                    }
                },
                tickets: {
                    include: {
                        inhabitant: {
                            include: {
                                allergies: {
                                    include: {
                                        allergyType: true
                                    }
                                }
                            }
                        },
                        bookedByUser: true,
                        ticketPrice: true
                    }
                },
                allergens: {
                    include: {
                        allergyType: true
                    }
                }
            }
        })

        // ADR-010: Deserialize handles all transformations (same as fetchDinnerEvent)
        const dinnerEventToValidate = deserializeDinnerEventDetail(updatedDinnerEvent)

        console.info(`🍽️ > DINNER_EVENT > [UPDATE] Successfully updated dinner event ${updatedDinnerEvent.menuTitle} (ID: ${updatedDinnerEvent.id})`)
        return DinnerEventDetailSchema.parse(dinnerEventToValidate)
    } catch (error) {
        return throwH3Error(`️ > DINNER_EVENT > [UPDATE]: Error updating dinner event with ID ${id}`, error)
    }
}

export async function assignCookingTeamToDinnerEvent(d1Client: D1Database, dinnerEventId: number, cookingTeamId: number): Promise<DinnerEventDisplay> {
    const prisma = await getPrismaClientConnection(d1Client)
    const {DinnerEventDisplaySchema} = useBookingValidation()

    const updated = await prisma.dinnerEvent.update({
        where: {id: dinnerEventId},
        data: {cookingTeamId}
    })

    return DinnerEventDisplaySchema.parse(updated)
}

export async function deleteDinnerEvent(d1Client: D1Database, id: number): Promise<DinnerEventDetail> {
    console.info(`🍽️ > DINNER_EVENT > [DELETE] Deleting dinner event with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {DinnerEventDetailSchema} = useBookingValidation()
    const {deserializeInhabitantDisplay} = useCoreValidation()

    try {
        // Fetch with relations before deleting (ADR-009: mutations return Detail)
        const dinnerEventToDelete = await prisma.dinnerEvent.findUniqueOrThrow({
            where: {id},
            include: {
                chef: true,
                cookingTeam: true
            }
        })

        await prisma.dinnerEvent.delete({
            where: {id}
        })

        // Deserialize chef inhabitant if present
        const dinnerEventToValidate = {
            ...dinnerEventToDelete,
            chef: dinnerEventToDelete.chef ? deserializeInhabitantDisplay(dinnerEventToDelete.chef) : null,
            cookingTeam: dinnerEventToDelete.cookingTeam
        }

        console.info(`🍽️ > DINNER_EVENT > [DELETE] Successfully deleted dinner event ${dinnerEventToDelete.menuTitle}`)
        return DinnerEventDetailSchema.parse(dinnerEventToValidate)
    } catch (error) {
        return throwH3Error(`️ > DINNER_EVENT > [DELETE]: Error deleting dinner event with ID ${id}`, error)
    }
}

/**
 * Update allergens for a dinner event (chef operation)
 * Replaces existing allergens with new list
 * ADR-005: CASCADE on delete (DinnerEventAllergen deleted when DinnerEvent deleted)
 */
export async function updateDinnerEventAllergens(d1Client: D1Database, dinnerEventId: number, allergenIds: number[]): Promise<DinnerEventDetail> {
    console.info(`🍽️ > DINNER_EVENT > [UPDATE_ALLERGENS] Updating allergens for dinner event ${dinnerEventId}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        // Delete existing allergen assignments
        await prisma.dinnerEventAllergen.deleteMany({
            where: { dinnerEventId }
        })

        // Create new allergen assignments
        if (allergenIds.length > 0) {
            await prisma.dinnerEventAllergen.createMany({
                data: allergenIds.map(allergyTypeId => ({
                    dinnerEventId,
                    allergyTypeId
                }))
            })
        }

        console.info(`🍽️ > DINNER_EVENT > [UPDATE_ALLERGENS] Successfully updated allergens for dinner event ${dinnerEventId}`)

        // Fetch and return updated dinner event with all relations
        const updatedEvent = await fetchDinnerEvent(d1Client, dinnerEventId)
        if (!updatedEvent) {
            throw createError({
                statusCode: 404,
                message: `Dinner event ${dinnerEventId} not found after allergen update`
            })
        }
        return updatedEvent
    } catch (error) {
        return throwH3Error(`🍽️ > DINNER_EVENT > [UPDATE_ALLERGENS]: Error updating allergens for dinner event ${dinnerEventId}`, error)
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
