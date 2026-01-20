import type {D1Database} from '@cloudflare/workers-types'
import eventHandlerHelper from "../utils/eventHandlerHelper"
import {getPrismaClientConnection} from "../utils/database"
import {chunkArray, groupBy} from '~/utils/batchUtils'

import type {
    OrderDisplay,
    OrderDetail,
    OrderCreateWithPrice,
    AuditContext,
    CreateOrdersResult,
    DinnerEventCreate,
    DinnerEventDisplay,
    DinnerEventDetail,
    OrderHistoryDetail,
    OrderHistoryCreate,
    OrderForTransaction,
    DinnerMode,
    OrderState,
    OrderAuditAction
} from '~/composables/useBookingValidation'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useBooking} from '~/composables/useBooking'
import {useHousehold} from '~/composables/useHousehold'
import {getHouseholdShortName} from '~/composables/useCoreValidation'
import {fetchActiveSeasonId} from '~~/server/data/prismaRepository'
import {useBilling} from '~/composables/useBilling'
import {
    useBillingValidation,
    type HouseholdBillingResponse,
    type TransactionDisplay,
    type InvoiceDisplay,
    type InvoiceCreate,
    type InvoiceCreated,
    type BillingPeriodSummaryCreate,
    type BillingPeriodSummaryId
} from '~/composables/useBillingValidation'

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

const {throwH3Error, isPrismaNotFound} = eventHandlerHelper

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
            performedByUser: {
                select: {id: true, email: true}
            },
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
    // Flatten ticketType from ticketPrice relation before deserializing (ADR-009: flattened ticketType in OrderDisplay)
    const orderHistoryDetail = {
        ...created,
        order: created.order ? deserializeOrder({
            ...created.order,
            ticketType: created.order.ticketPrice?.ticketType ?? null
        }) : null
    }

    return OrderHistoryDetailSchema.parse(orderHistoryDetail)
}

/**
 * Fetch user cancellation keys for a season to exclude from scaffolding.
 *
 * Returns unique inhabitantId-dinnerEventId pairs where:
 * 1. action = USER_CANCELLED (admin deletions can be recreated)
 * 2. seasonId matches (scoped to season being activated)
 *
 * These pairs represent bookings the user explicitly cancelled and should
 * not be recreated by the scaffolder when activating a season.
 *
 * ADR-011: Uses denormalized fields (inhabitantId, dinnerEventId, seasonId)
 * which persist even after order deletion.
 */
export async function fetchUserCancellationKeys(
    d1Client: D1Database,
    seasonId: number
): Promise<Set<string>> {
    const {OrderAuditActionSchema} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)

    const cancellations = await prisma.orderHistory.findMany({
        where: {
            action: OrderAuditActionSchema.enum.USER_CANCELLED,
            seasonId: seasonId,
            // Denormalized fields are non-null for cancellations
            inhabitantId: { not: null },
            dinnerEventId: { not: null }
        },
        select: {
            inhabitantId: true,
            dinnerEventId: true
        }
    })

    // Create unique keys for inhabitant-dinnerEvent pairs
    const keys = new Set(
        cancellations.map(c => `${c.inhabitantId}-${c.dinnerEventId}`)
    )

    console.info(`📋 > ORDER_AUDIT > [FETCH_CANCELLATIONS] Found ${keys.size} user cancellation keys for season ${seasonId}`)

    return keys
}

/**
 * Fetch user intent keys for scaffolding decisions.
 *
 * Returns two sets based on most recent user action per (inhabitant, dinnerEvent):
 * - confirmedKeys: USER_BOOKED or USER_CLAIMED (user wants to eat)
 * - cancelledKeys: USER_CANCELLED (user doesn't want to eat)
 *
 * When both exist for same key, most recent action wins.
 *
 * ADR-011: Uses denormalized fields (inhabitantId, dinnerEventId, seasonId)
 * which persist even after order deletion.
 */
export async function fetchUserIntentKeys(
    d1Client: D1Database,
    seasonId: number
): Promise<{ confirmedKeys: Set<string>; cancelledKeys: Set<string> }> {
    const {OrderAuditActionSchema} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)

    // Fetch all user intent actions (not system actions)
    const userIntents = await prisma.orderHistory.findMany({
        where: {
            action: {
                in: [
                    OrderAuditActionSchema.enum.USER_CANCELLED,
                    OrderAuditActionSchema.enum.USER_BOOKED,
                    OrderAuditActionSchema.enum.USER_CLAIMED
                ]
            },
            seasonId: seasonId,
            inhabitantId: { not: null },
            dinnerEventId: { not: null }
        },
        select: {
            inhabitantId: true,
            dinnerEventId: true,
            action: true,
            timestamp: true
        },
        orderBy: { timestamp: 'desc' }
    })

    // Group by key, take most recent action per key
    const keyToAction = new Map<string, string>()
    for (const intent of userIntents) {
        const key = `${intent.inhabitantId}-${intent.dinnerEventId}`
        if (!keyToAction.has(key)) {
            keyToAction.set(key, intent.action)
        }
    }

    // Split into confirmed and cancelled sets
    const confirmedKeys = new Set<string>()
    const cancelledKeys = new Set<string>()

    for (const [key, action] of keyToAction) {
        if (action === OrderAuditActionSchema.enum.USER_CANCELLED) {
            cancelledKeys.add(key)
        } else {
            // USER_BOOKED or USER_CLAIMED
            confirmedKeys.add(key)
        }
    }

    console.info(`📋 > ORDER_AUDIT > [FETCH_USER_INTENT] Season ${seasonId}: ${confirmedKeys.size} confirmed, ${cancelledKeys.size} cancelled keys`)

    return { confirmedKeys, cancelledKeys }
}

/*** ORDERS ***/

// ADR-005: Order relationships:
// - Strong to DinnerEvent (order cannot exist without dinner event)
// - Strong to Inhabitant (order cannot exist without inhabitant)
// - Weak to User (bookedByUser) - order can exist if user is deleted (audit trail)
// - Weak to Transaction (order can exist without transaction)

/**
 * Create order(s) for a household with audit trail.
 * Accepts single order or array (normalized internally, same pattern as deleteOrder).
 *
 * Uses createManyAndReturn for efficient D1 insertion.
 *
 * ADR-009: Returns IDs only (DB is source of truth)
 * ADR-011: Creates OrderHistory audit entries atomically
 *
 * @param d1Client - D1 database client
 * @param householdId - Household ID (for result tracking)
 * @param ordersData - Single order or array of orders
 * @param auditContext - Audit context for OrderHistory entries
 * @returns CreateOrdersResult with householdId and created order IDs
 */
export async function createOrders(
    d1Client: D1Database,
    householdId: number,
    ordersData: OrderCreateWithPrice | OrderCreateWithPrice[],
    auditContext: AuditContext
): Promise<CreateOrdersResult> {
    // Normalize to array (same pattern as deleteOrder)
    const orders: OrderCreateWithPrice[] = Array.isArray(ordersData) ? ordersData : [ordersData]
    if (orders.length === 0) return { householdId, createdIds: [] }

    console.info(`🎟️ > ORDER > [CREATE] Creating ${orders.length} order(s) for household ${householdId}`)
    const {OrderCreateWithPriceSchema} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)

    // Parse through schema to apply defaults (e.g., isGuestTicket: false)
    const validatedOrders = orders.map(order => OrderCreateWithPriceSchema.parse(order))

    try {
        // Insert orders with createManyAndReturn (Prisma 5.14+, returns IDs)
        const createdOrders = await prisma.order.createManyAndReturn({
            data: validatedOrders.map(order => ({
                dinnerEventId: order.dinnerEventId,
                inhabitantId: order.inhabitantId,
                bookedByUserId: order.bookedByUserId,
                ticketPriceId: order.ticketPriceId,
                priceAtBooking: order.priceAtBooking,
                dinnerMode: order.dinnerMode,
                state: order.state,
                isGuestTicket: order.isGuestTicket
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
                    orderData: validatedOrders[index]
                })
            }))
        })

        console.info(`🎟️ > ORDER > [BATCH CREATE] Successfully created ${createdIds.length} orders with audit trail for household ${householdId}`)

        return { householdId, createdIds }
    } catch (error) {
        return throwH3Error(`🎟️ > ORDER > [BATCH CREATE]: Error creating ${orders.length} orders for household ${householdId}`, error)
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
                },
                // ADR-011: Full order history audit trail for detail endpoint
                orderHistory: {
                    select: {
                        id: true,
                        orderId: true,
                        action: true,
                        performedByUserId: true,
                        performedByUser: {
                            select: {
                                id: true,
                                email: true
                            }
                        },
                        auditData: true,
                        timestamp: true,
                        inhabitantId: true,
                        dinnerEventId: true,
                        seasonId: true
                    },
                    orderBy: {timestamp: 'desc'}
                }
            }
        })

        if (!order) {
            console.info(`🎟️ > ORDER > [GET] No order found with ID ${id}`)
            return null
        }

        console.info(`🎟️ > ORDER > [GET] Successfully fetched order ${order.id} with ${order.orderHistory?.length ?? 0} history entries`)

        // Transform: flatten ticketType (ADR-009)
        return OrderDetailSchema.parse({
            ...order,
            ticketType: order.ticketPrice?.ticketType ?? null,
            history: order.orderHistory
        })
    } catch (error) {
        return throwH3Error(`🎟️ > ORDER > [GET]: Error fetching order with ID ${id}`, error)
    }
}

/**
 * Audit context for order mutations
 */
export type OrderAuditContext = {
    action: OrderAuditAction
    performedByUserId: number | null
}

/**
 * Partial order update fields
 */
export type OrderUpdateFields = {
    dinnerMode?: DinnerMode
    state?: OrderState
    releasedAt?: Date | null
    ticketPriceId?: number
    priceAtBooking?: number
}

/**
 * Update an order with audit trail.
 *
 * Generic function that updates any order fields and creates audit entry.
 * Business logic (which fields to update, which action) is determined by caller.
 *
 * ADR-011: All mutations create audit entries
 * ADR-009: Returns OrderDetail
 *
 * @param d1Client - D1 database client
 * @param id - Order ID to update
 * @param updates - Fields to update
 * @param audit - Audit context (action, performedByUserId)
 * @returns Updated OrderDetail
 */
export async function updateOrder(
    d1Client: D1Database,
    id: number,
    updates: OrderUpdateFields,
    audit: OrderAuditContext
): Promise<OrderDetail> {
    const LOG = '🎟️ > ORDER > [UPDATE]'
    console.info(`${LOG} Updating order ${id}`, updates, `action=${audit.action}`)
    const {OrderDetailSchema, OrderAuditActionSchema, createOrderAuditData} = useBookingValidation()
    const {formatNameWithInitials} = useHousehold()
    const prisma = await getPrismaClientConnection(d1Client)

    // Validate audit action
    const validatedAction = OrderAuditActionSchema.parse(audit.action)

    try {
        // Fetch existing order for audit data (includes household for provenance)
        const existingOrder = await prisma.order.findUnique({
            where: {id},
            include: {
                ticketPrice: {select: {ticketType: true}},
                dinnerEvent: {select: {seasonId: true}},
                inhabitant: {
                    select: {
                        name: true, lastName: true, householdId: true,
                        household: {select: {address: true}}
                    }
                }
            }
        })

        if (!existingOrder) {
            throw createError({statusCode: 404, message: `Order ${id} not found`})
        }

        // Update order
        const order = await prisma.order.update({
            where: {id},
            data: updates,
            include: {
                dinnerEvent: {
                    select: {
                        id: true, date: true, menuTitle: true, menuDescription: true,
                        menuPictureUrl: true, state: true, totalCost: true,
                        heynaboEventId: true, chefId: true, cookingTeamId: true,
                        seasonId: true, createdAt: true, updatedAt: true
                    }
                },
                inhabitant: {
                    select: {
                        id: true, heynaboId: true, householdId: true,
                        name: true, lastName: true, pictureUrl: true
                    }
                },
                bookedByUser: {select: {id: true, email: true}},
                ticketPrice: {select: {id: true, ticketType: true, price: true, description: true}}
            }
        })

        // Create audit entry (ADR-011) with provenance fields (allergies omitted - captured at CREATE)
        const auditSnapshot = {
            id: existingOrder.id,
            inhabitantId: existingOrder.inhabitantId,
            dinnerEventId: existingOrder.dinnerEventId,
            ticketPriceId: existingOrder.ticketPriceId,
            priceAtBooking: existingOrder.priceAtBooking,
            dinnerMode: updates.dinnerMode ?? existingOrder.dinnerMode,
            state: updates.state ?? existingOrder.state,
            // Provenance fields
            inhabitantNameWithInitials: formatNameWithInitials(existingOrder.inhabitant),
            householdShortname: getHouseholdShortName(existingOrder.inhabitant.household.address),
            householdId: existingOrder.inhabitant.householdId
        }
        await prisma.orderHistory.create({
            data: {
                orderId: id,
                action: validatedAction,
                performedByUserId: audit.performedByUserId,
                inhabitantId: existingOrder.inhabitantId,
                dinnerEventId: existingOrder.dinnerEventId,
                seasonId: existingOrder.dinnerEvent?.seasonId ?? null,
                auditData: createOrderAuditData(auditSnapshot)
            }
        })

        console.info(`${LOG} Successfully updated order ${id}`)

        return OrderDetailSchema.parse({
            ...order,
            ticketType: order.ticketPrice?.ticketType ?? null
        })
    } catch (error) {
        return throwH3Error(`${LOG} Error updating order ${id}`, error)
    }
}

/**
 * Claim a released ticket for an inhabitant.
 *
 * Finds the first RELEASED order matching dinnerEventId + ticketPriceId (FIFO by releasedAt)
 * and transfers ownership to the new inhabitant. Original price is preserved.
 *
 * Race-safe: Uses atomic WHERE clause (id + state=RELEASED) so concurrent
 * claims will fail if someone else claims first.
 *
 * @param d1Client - D1 database client
 * @param dinnerEventId - Dinner event to claim ticket for
 * @param ticketPriceId - Ticket price tier to match
 * @param newInhabitantId - Inhabitant claiming the ticket
 * @param claimedByUserId - User performing the claim
 * @returns Claimed order, or null if no matching ticket available
 *
 * ADR-011: Creates USER_CLAIMED audit entry with original household provenance
 */
export async function claimOrder(
    d1Client: D1Database,
    dinnerEventId: number,
    ticketPriceId: number,
    newInhabitantId: number,
    claimedByUserId: number | null,
    dinnerMode: DinnerMode,
    isGuestTicket: boolean = false,
    maxRetries: number = 3
): Promise<OrderDetail | null> {
    const LOG = '🎟️ > ORDER > [CLAIM]'
    const {OrderDetailSchema, OrderStateSchema, OrderAuditActionSchema, createOrderAuditData} = useBookingValidation()
    const {formatNameWithInitials} = useHousehold()
    const prisma = await getPrismaClientConnection(d1Client)

    const attemptClaim = async (attempt: number): Promise<OrderDetail | null> => {
        console.info(`${LOG} Attempt ${attempt}: claiming ticket (dinner=${dinnerEventId}, ticketPrice=${ticketPriceId}) for inhabitant ${newInhabitantId}`)

        // Find first RELEASED order matching criteria (FIFO by releasedAt)
        const existingOrder = await prisma.order.findFirst({
            where: {
                dinnerEventId,
                ticketPriceId,
                state: OrderStateSchema.enum.RELEASED
            },
            orderBy: {releasedAt: 'asc'},
            include: {
                ticketPrice: {select: {ticketType: true}},
                dinnerEvent: {select: {seasonId: true}},
                inhabitant: {
                    select: {
                        name: true, lastName: true, householdId: true,
                        household: {select: {address: true}}
                    }
                }
            }
        })

        // No ticket available - stop (don't retry)
        if (!existingOrder) {
            console.warn(`${LOG} No RELEASED ticket available (dinner=${dinnerEventId}, ticketPrice=${ticketPriceId})`)
            return null
        }

        const orderId = existingOrder.id

        try {
            // Atomic claim: WHERE includes state=RELEASED so concurrent claims fail
            const claimedOrder = await prisma.order.update({
                where: {id: orderId, state: OrderStateSchema.enum.RELEASED},
                data: {
                    inhabitantId: newInhabitantId,
                    bookedByUserId: claimedByUserId,
                    state: OrderStateSchema.enum.BOOKED,
                    dinnerMode,
                    isGuestTicket,
                    releasedAt: null
                },
                include: {
                    dinnerEvent: {
                        select: {
                            id: true, date: true, menuTitle: true, menuDescription: true,
                            menuPictureUrl: true, state: true, totalCost: true,
                            heynaboEventId: true, chefId: true, cookingTeamId: true,
                            seasonId: true, createdAt: true, updatedAt: true
                        }
                    },
                    inhabitant: {
                        select: {
                            id: true, heynaboId: true, householdId: true,
                            name: true, lastName: true, pictureUrl: true
                        }
                    },
                    bookedByUser: {select: {id: true, email: true}},
                    ticketPrice: {select: {id: true, ticketType: true, price: true, description: true}}
                }
            })

            // Create audit entry with ORIGINAL household provenance
            const auditSnapshot = {
                id: existingOrder.id,
                inhabitantId: existingOrder.inhabitantId,
                dinnerEventId: existingOrder.dinnerEventId,
                ticketPriceId: existingOrder.ticketPriceId,
                priceAtBooking: existingOrder.priceAtBooking,
                dinnerMode: existingOrder.dinnerMode,
                state: existingOrder.state,
                inhabitantNameWithInitials: formatNameWithInitials(existingOrder.inhabitant),
                householdShortname: getHouseholdShortName(existingOrder.inhabitant.household.address),
                householdId: existingOrder.inhabitant.householdId
            }
            await prisma.orderHistory.create({
                data: {
                    orderId,
                    action: OrderAuditActionSchema.enum.USER_CLAIMED,
                    performedByUserId: claimedByUserId,
                    inhabitantId: newInhabitantId,
                    dinnerEventId: existingOrder.dinnerEventId,
                    seasonId: existingOrder.dinnerEvent?.seasonId ?? null,
                    auditData: createOrderAuditData(auditSnapshot)
                }
            })

            console.info(`${LOG} Successfully claimed order ${orderId}`)

            return OrderDetailSchema.parse({
                ...claimedOrder,
                ticketType: claimedOrder.ticketPrice?.ticketType ?? null
            })
        } catch (error) {
            // P2025: Race lost - someone else claimed this ticket
            if (isPrismaNotFound(error)) {
                console.warn(`${LOG} Attempt ${attempt}: lost race for order ${orderId}`)
                // Retry if attempts remaining
                if (attempt < maxRetries) {
                    return attemptClaim(attempt + 1)
                }
                console.warn(`${LOG} Max retries exhausted`)
                return null
            }
            throw error
        }
    }

    try {
        return await attemptClaim(1)
    } catch (error) {
        return throwH3Error(`${LOG} Error claiming ticket`, error)
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
 * - Null: SYSTEM_DELETED (system/admin deleted, may be re-created by scaffolder)
 *
 * ADR-011: Creates OrderHistory entries with denormalized fields before deletion.
 * When order is deleted, orderId becomes NULL but inhabitantId/dinnerEventId/seasonId persist.
 *
 * @param orderIds - Single ID or array of IDs
 * @param performedByUserId - User ID if user-initiated, null for admin/system
 */
export async function deleteOrder(
    d1Client: D1Database,
    orderIds: number | number[],
    performedByUserId: number | null = null
): Promise<OrderDisplay[]> {
    const LOG = '🎟️ > ORDER > [DELETE]'
    // Normalize to array, return early for empty
    const ids = [orderIds].flat()
    if (ids.length === 0) return []

    const {OrderDisplaySchema, OrderAuditActionSchema, createOrderAuditData} = useBookingValidation()
    const {formatNameWithInitials} = useHousehold()
    const action = performedByUserId
        ? OrderAuditActionSchema.enum.USER_CANCELLED
        : OrderAuditActionSchema.enum.SYSTEM_DELETED
    console.info(`${LOG} Deleting ${ids.length} order(s) (action: ${action}, performedBy: ${performedByUserId ?? 'admin/system'})`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        // 1. Fetch orders with relations for audit data (includes inhabitant/household for provenance)
        const ordersToDelete = await prisma.order.findMany({
            where: { id: { in: ids } },
            include: {
                ticketPrice: { select: { ticketType: true } },
                dinnerEvent: { select: { seasonId: true } },
                inhabitant: {
                    select: {
                        name: true, lastName: true, householdId: true,
                        household: { select: { address: true } }
                    }
                }
            }
        })

        if (ordersToDelete.length === 0) {
            console.warn(`${LOG} No orders found for IDs: ${ids.join(', ')}`)
            return []
        }

        // 2. Create audit entries with provenance fields BEFORE deletion (allergies omitted - captured at CREATE)
        await prisma.orderHistory.createMany({
            data: ordersToDelete.map(order => ({
                orderId: order.id,
                action,
                performedByUserId,
                inhabitantId: order.inhabitantId,
                dinnerEventId: order.dinnerEventId,
                seasonId: order.dinnerEvent?.seasonId ?? null,
                auditData: createOrderAuditData({
                    id: order.id,
                    inhabitantId: order.inhabitantId,
                    dinnerEventId: order.dinnerEventId,
                    ticketPriceId: order.ticketPriceId,
                    priceAtBooking: order.priceAtBooking,
                    dinnerMode: order.dinnerMode,
                    state: order.state,
                    // Provenance fields
                    inhabitantNameWithInitials: formatNameWithInitials(order.inhabitant),
                    householdShortname: getHouseholdShortName(order.inhabitant.household.address),
                    householdId: order.inhabitant.householdId
                })
            }))
        })

        // 3. Delete orders
        await prisma.order.deleteMany({
            where: { id: { in: ids } }
        })

        console.info(`${LOG} Successfully deleted ${ordersToDelete.length} order(s) with ${action} audit entries`)

        // Transform Prisma types to domain types and validate (ADR-010)
        return ordersToDelete.map(order => {
            const {ticketPrice, inhabitant, ...rest} = order
            return OrderDisplaySchema.parse({ ...rest, ticketType: ticketPrice?.ticketType ?? null })
        })
    } catch (error) {
        return throwH3Error(`${LOG} Error deleting ${ids.length} order(s)`, error)
    }
}

/**
 * Fetch orders, optionally filtered by dinner event ID(s) and/or household.
 *
 * WORKAROUND: Uses raw SQL instead of Prisma nested includes because Prisma D1 adapter
 * doesn't support relationJoins, and nested includes with WHERE clauses exceed D1's
 * 100 SQL variable limit when fetching many orders.
 *
 * Prisma issues tracking this limitation:
 * - https://github.com/prisma/prisma/issues/23348 (relationJoins for SQLite - not supported)
 * - https://github.com/prisma/prisma/issues/24545 (D1 variable limit with nested includes)
 *
 * See ADR-014 for the raw SQL workaround pattern.
 *
 * @param dinnerEventIds - Single ID, array of IDs, or undefined for all events
 * @param householdId - Optional household filter (required for user-facing endpoints)
 * @param state - Optional state filter (e.g., RELEASED for claim queue)
 * @param sortBy - Sort field: 'createdAt' (default) or 'releasedAt' (FIFO claim queue)
 * @param includeProvenance - Include provenance for claimed tickets (default: false)
 */
export async function fetchOrders(
    d1Client: D1Database,
    dinnerEventIds?: number | number[],
    householdId?: number,
    state?: OrderState,
    sortBy: 'createdAt' | 'releasedAt' = 'createdAt',
    includeProvenance: boolean = false
): Promise<OrderDisplay[]> {
    // Normalize to array, return early for empty
    const ids = dinnerEventIds === undefined ? undefined : [dinnerEventIds].flat()
    if (ids?.length === 0) return []

    const filterDesc = [
        ids ? `${ids.length} dinner event(s)` : 'all events',
        householdId ? `household ${householdId}` : 'all households',
        state ? `state=${state}` : 'all states'
    ].join(', ')
    console.info(`🎟️ > ORDER > [GET] Fetching orders for ${filterDesc}`)

    const {OrderDisplaySchema, deserializeOrderAuditData, OrderAuditActionSchema} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        // Build WHERE clauses dynamically
        const whereClauses: string[] = []
        const params: (string | number)[] = []

        if (ids && ids.length > 0) {
            whereClauses.push(`o.dinnerEventId IN (${ids.map(() => '?').join(',')})`)
            params.push(...ids)
        }
        if (householdId) {
            whereClauses.push('i.householdId = ?')
            params.push(householdId)
        }
        if (state) {
            whereClauses.push('o.state = ?')
            params.push(state)
        }

        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''
        const orderByColumn = sortBy === 'releasedAt' ? 'o.releasedAt' : 'o.createdAt'

        // Raw SQL with proper JOINs - avoids D1 100 variable limit
        // LEFT JOIN to latest USER_CLAIMED history entry per order (for provenance)
        const sql = `
            SELECT
                o.id, o.dinnerEventId, o.inhabitantId, o.bookedByUserId, o.ticketPriceId,
                o.priceAtBooking, o.dinnerMode, o.state, o.isGuestTicket,
                o.releasedAt, o.closedAt, o.createdAt, o.updatedAt,
                tp.ticketType,
                ${includeProvenance ? 'oh.auditData as provenanceData' : 'NULL as provenanceData'}
            FROM "Order" o
            JOIN Inhabitant i ON i.id = o.inhabitantId
            LEFT JOIN TicketPrice tp ON tp.id = o.ticketPriceId
            ${includeProvenance ? `
            LEFT JOIN (
                SELECT orderId, auditData, ROW_NUMBER() OVER (PARTITION BY orderId ORDER BY timestamp DESC) as rn
                FROM OrderHistory
                WHERE action = '${OrderAuditActionSchema.enum.USER_CLAIMED}'
            ) oh ON oh.orderId = o.id AND oh.rn = 1
            ` : ''}
            ${whereClause}
            ORDER BY ${orderByColumn} ASC
        `

        // Type for raw query result
        type RawOrderRow = {
            id: number
            dinnerEventId: number
            inhabitantId: number
            bookedByUserId: number | null
            ticketPriceId: number | null
            priceAtBooking: number
            dinnerMode: string
            state: string
            isGuestTicket: number // SQLite returns 0/1 for boolean
            releasedAt: string | null
            closedAt: string | null
            createdAt: string
            updatedAt: string
            ticketType: string | null
            provenanceData: string | null
        }

        const rawOrders = await prisma.$queryRawUnsafe<RawOrderRow[]>(sql, ...params)

        console.info(`🎟️ > ORDER > [GET] Found ${rawOrders.length} orders for ${filterDesc}`)

        return rawOrders.map(row => {
            // Extract provenance from audit data if present
            let provenanceHousehold: string | undefined
            let provenanceAllergies: string[] | undefined

            if (row.provenanceData && row.provenanceData !== 'null') {
                try {
                    const provenance = deserializeOrderAuditData(row.provenanceData).orderSnapshot
                    provenanceHousehold = provenance?.householdShortname
                    provenanceAllergies = provenance?.allergies
                } catch {
                    // Invalid provenance data - skip
                }
            }

            return OrderDisplaySchema.parse({
                id: row.id,
                dinnerEventId: row.dinnerEventId,
                inhabitantId: row.inhabitantId,
                bookedByUserId: row.bookedByUserId,
                ticketPriceId: row.ticketPriceId,
                priceAtBooking: row.priceAtBooking,
                dinnerMode: row.dinnerMode,
                state: row.state,
                isGuestTicket: Boolean(row.isGuestTicket),
                releasedAt: row.releasedAt ? new Date(row.releasedAt) : null,
                closedAt: row.closedAt ? new Date(row.closedAt) : null,
                createdAt: new Date(row.createdAt),
                updatedAt: new Date(row.updatedAt),
                ticketType: row.ticketType,
                provenanceHousehold,
                provenanceAllergies
            })
        })
    } catch (error) {
        return throwH3Error(`🎟️ > ORDER > [GET] : Error fetching orders for ${filterDesc}`, error)
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
    console.info(`🍽️ > DINNER_EVENT > [UPDATE] Updating dinner event with ID ${id}, fields: ${Object.keys(dinnerEventData).join(', ')}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {DinnerEventDetailSchema, deserializeDinnerEventDetail} = useBookingValidation()

    // Exclude relation fields that Prisma doesn't accept in update data
    const {allergens, ...updateData} = dinnerEventData
    console.info(`🍽️ > DINNER_EVENT > [UPDATE] updateData fields: ${Object.keys(updateData).join(', ')}`)

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

/**
 * Delete dinner event(s). Accepts single ID or array of IDs (normalize early pattern).
 * Handles Heynabo cleanup for announced events (ADR-013: best-effort, don't fail delete).
 * Returns IDs of deleted events.
 */
export async function deleteDinnerEvent(
    d1Client: D1Database,
    idInput: number | number[],
    deleteHeynaboEvent?: (heynaboEventId: number) => Promise<void>
): Promise<number[]> {
    // Normalize to array
    const ids = Array.isArray(idInput) ? idInput : [idInput]
    if (ids.length === 0) return []

    console.info(`🍽️ > DINNER_EVENT > [DELETE] Deleting ${ids.length} dinner event(s)`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        // Fetch heynaboEventIds before delete for cleanup (ADR-013)
        const eventsToDelete = await prisma.dinnerEvent.findMany({
            where: { id: { in: ids } },
            select: { id: true, heynaboEventId: true }
        })

        await prisma.dinnerEvent.deleteMany({
            where: { id: { in: ids } }
        })

        // ADR-013: Delete from Heynabo if announced (best-effort, parallel)
        if (deleteHeynaboEvent) {
            const heynaboDeletes = eventsToDelete
                .filter(e => e.heynaboEventId)
                .map(e => deleteHeynaboEvent(e.heynaboEventId!)
                    .catch(err => console.warn(`🍽️ > DINNER_EVENT > [DELETE] Failed to delete Heynabo event ${e.heynaboEventId}: ${err instanceof Error ? err.message : String(err)}`))
                )
            await Promise.all(heynaboDeletes)
        }

        console.info(`🍽️ > DINNER_EVENT > [DELETE] Successfully deleted ${ids.length} dinner events`)
        return ids
    } catch (error) {
        return throwH3Error(`🍽️ > DINNER_EVENT > [DELETE]: Error deleting dinner event(s)`, error)
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
        // Validate allergen IDs exist before creating join records
        if (allergenIds.length > 0) {
            const existingCount = await prisma.allergyType.count({
                where: { id: { in: allergenIds } }
            })
            if (existingCount !== allergenIds.length) {
                throw createError({
                    statusCode: 404,
                    message: `Some allergen IDs do not exist. Requested: ${allergenIds.length}, found: ${existingCount}`
                })
            }
        }

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

/*** DAILY MAINTENANCE ***/

// ADR-010: Repository handles all Prisma operations
// These functions support the daily maintenance cron (consume, close, transact)

/**
 * Fetch all dinner events in active season with consumable states.
 * Uses CONSUMABLE_DINNER_STATES from useBooking for state filtering.
 */
export async function fetchPendingDinnersInActiveSeason(
    d1Client: D1Database
): Promise<{id: number, date: Date}[]> {
    const {CONSUMABLE_DINNER_STATES} = useBooking()
    const activeSeasonId = await fetchActiveSeasonId(d1Client)

    if (!activeSeasonId) {
        return []
    }

    const prisma = await getPrismaClientConnection(d1Client)
    return prisma.dinnerEvent.findMany({
        where: {
            seasonId: activeSeasonId,
            state: {in: [...CONSUMABLE_DINNER_STATES]}
        },
        select: {id: true, date: true}
    })
}

/**
 * Update dinner events to CONSUMED state in batch
 */
export async function updateDinnersToConsumed(
    d1Client: D1Database,
    dinnerIds: number[]
): Promise<number> {
    if (dinnerIds.length === 0) return 0

    const {DinnerStateSchema} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)

    const result = await prisma.dinnerEvent.updateMany({
        where: { id: { in: dinnerIds } },
        data: { state: DinnerStateSchema.enum.CONSUMED }
    })

    return result.count
}

/**
 * Fetch all orders with closable states on CONSUMED dinners in active season.
 * Uses CLOSABLE_ORDER_STATES from useBooking for state filtering.
 * Returns fields needed for audit trail (ADR-011).
 */
export async function fetchPendingOrdersOnConsumedDinners(
    d1Client: D1Database
): Promise<{id: number, inhabitantId: number, dinnerEventId: number, seasonId: number}[]> {
    const {DinnerStateSchema} = useBookingValidation()
    const {CLOSABLE_ORDER_STATES} = useBooking()
    const activeSeasonId = await fetchActiveSeasonId(d1Client)

    if (!activeSeasonId) {
        return []
    }

    const prisma = await getPrismaClientConnection(d1Client)
    const orders = await prisma.order.findMany({
        where: {
            state: {in: [...CLOSABLE_ORDER_STATES]},
            dinnerEvent: {
                seasonId: activeSeasonId,
                state: DinnerStateSchema.enum.CONSUMED
            }
        },
        select: {id: true, inhabitantId: true, dinnerEventId: true}
    })

    // Add seasonId (we already know it's the active season)
    return orders.map(o => ({...o, seasonId: activeSeasonId}))
}

/**
 * Audit context for batch updates
 * Required for creating OrderHistory entries (USER_CANCELLED, USER_BOOKED, SYSTEM_*)
 */
export type BatchUpdateAudit = {
    action: OrderAuditAction
    performedByUserId: number | null
    inhabitantId: number
    dinnerEventId: number
    seasonId: number | null
}

/**
 * Batch update data for scaffold operations
 * Groups orders by their update signature (state + dinnerMode + ticketPriceId)
 */
export type OrderBatchUpdate = {
    orderId: number
    state: OrderState
    dinnerMode: DinnerMode
    ticketPriceId: number | null  // null = no change
    priceAtBooking: number | null // null = no change
    isNewRelease: boolean  // true = set releasedAt
    audit?: BatchUpdateAudit  // Optional audit context for OrderHistory creation
}

/**
 * Build update signature key for grouping
 * Pure function - can be unit tested via groupBy
 */
export const getOrderUpdateSignature = (update: OrderBatchUpdate): string =>
    `${update.state}-${update.dinnerMode}-${update.ticketPriceId ?? 'same'}-${update.isNewRelease}`

/**
 * Build update data from first item in group (all items in group have same signature)
 * Sets appropriate timestamps based on state transition:
 * - RELEASED: sets releasedAt (when isNewRelease=true)
 * - CLOSED: sets closedAt automatically
 */
const buildUpdateData = (update: OrderBatchUpdate, now: Date): Record<string, unknown> => {
    const {OrderStateSchema} = useBookingValidation()
    const data: Record<string, unknown> = {
        state: update.state,
        dinnerMode: update.dinnerMode
    }
    if (update.ticketPriceId !== null) {
        data.ticketPriceId = update.ticketPriceId
        data.priceAtBooking = update.priceAtBooking
    }
    if (update.isNewRelease) {
        data.releasedAt = now
    }
    if (update.state === OrderStateSchema.enum.CLOSED) {
        data.closedAt = now
    }
    return data
}

/**
 * Curried order batch update executor.
 * ADR-014: Groups by update signature, chunks IDs within groups to stay within D1 limits.
 * Creates OrderHistory entries for updates with audit context (USER_CANCELLED, USER_BOOKED, etc.)
 *
 * @param chunkSize - Max IDs per updateMany call (default 90 for D1's 100 param limit minus data params)
 * @returns Async function that executes grouped batch updates
 *
 * @example
 * const executeBatch = updateOrdersBatch(90)
 * const count = await executeBatch(d1Client, updates)
 */
export const updateOrdersBatch = (chunkSize: number = 90) =>
    async (d1Client: D1Database, updates: OrderBatchUpdate[]): Promise<number> => {
        if (updates.length === 0) return 0

        const LOG = '🎟️ > ORDER > [BATCH_UPDATE]'
        const prisma = await getPrismaClientConnection(d1Client)
        const now = new Date()
        const chunkIds = chunkArray<number>(chunkSize)

        // Group by update signature using pure utility
        const groupBySignature = groupBy<OrderBatchUpdate, string>(getOrderUpdateSignature)
        const groups = groupBySignature(updates)

        console.info(`${LOG} Batching ${updates.length} updates into ${groups.size} groups`)

        // Execute batch updates, chunking IDs within each group
        let totalCount = 0
        for (const [, groupUpdates] of groups) {
            const data = buildUpdateData(groupUpdates[0]!, now)
            const orderIds = groupUpdates.map(u => u.orderId)

            for (const idChunk of chunkIds(orderIds)) {
                const result = await prisma.order.updateMany({
                    where: { id: { in: idChunk } },
                    data
                })
                totalCount += result.count
            }
        }

        // Create audit entries for updates with audit context (ADR-011)
        const updatesWithAudit = updates.filter(u => u.audit !== undefined)
        if (updatesWithAudit.length > 0) {
            console.info(`${LOG} Creating ${updatesWithAudit.length} audit entries`)
            const auditEntries = updatesWithAudit.map(u => ({
                orderId: u.orderId,
                action: u.audit!.action,
                performedByUserId: u.audit!.performedByUserId,
                inhabitantId: u.audit!.inhabitantId,
                dinnerEventId: u.audit!.dinnerEventId,
                seasonId: u.audit!.seasonId,
                auditData: JSON.stringify({
                    state: u.state,
                    dinnerMode: u.dinnerMode,
                    ticketPriceId: u.ticketPriceId,
                    priceAtBooking: u.priceAtBooking
                })
            }))
            // Batch create audit entries (Prisma auto-chunks for D1)
            await prisma.orderHistory.createMany({ data: auditEntries })
        }

        return totalCount
    }

/**
 * Fetch all CLOSED orders in active season without a transaction.
 * Returns lean OrderForTransaction[] for batch transaction creation.
 */
export async function fetchClosedOrdersWithoutTransaction(
    d1Client: D1Database
): Promise<OrderForTransaction[]> {
    const {OrderStateSchema, OrderForTransactionSchema} = useBookingValidation()
    const activeSeasonId = await fetchActiveSeasonId(d1Client)

    if (!activeSeasonId) {
        return []
    }

    const prisma = await getPrismaClientConnection(d1Client)
    const orders = await prisma.order.findMany({
        where: {
            state: OrderStateSchema.enum.CLOSED,
            dinnerEvent: {seasonId: activeSeasonId},
            Transaction: null
        },
        include: {
            bookedByUser: { select: { id: true, email: true } },
            inhabitant: {
                select: {
                    id: true, name: true, lastName: true, householdId: true,
                    household: { select: { id: true, pbsId: true, address: true } }
                }
            },
            dinnerEvent: { select: { id: true, date: true, menuTitle: true } },
            ticketPrice: { select: { ticketType: true } }
        }
    })

    // Transform to lean domain type (ADR-010)
    return orders.map(order => OrderForTransactionSchema.parse({
        ...order,
        ticketType: order.ticketPrice?.ticketType ?? null
    }))
}

/**
 * Transaction create data for batch operations
 */
export type TransactionCreateData = {
    orderId: number
    orderSnapshot: string
    userSnapshot: string
    amount: number
    userEmailHandle: string
}

/**
 * Create transactions in batch
 */
export async function createTransactionsBatch(
    d1Client: D1Database,
    transactions: TransactionCreateData[]
): Promise<number> {
    if (transactions.length === 0) return 0

    const prisma = await getPrismaClientConnection(d1Client)

    const result = await prisma.transaction.createMany({
        data: transactions
    })

    return result.count
}

/*** BILLING GENERATION ***/

export async function fetchBillingPeriodSummary(
    d1Client: D1Database,
    billingPeriod: string
): Promise<BillingPeriodSummaryId | null> {
    // Use IdSchema because we only need to check existence and get id
    // DisplaySchema requires computed fields (invoiceSum, dinnerCount, ticketCountsByType)
    // that are derived from order snapshots - not stored in DB
    const {BillingPeriodSummaryIdSchema} = useBillingValidation()
    const prisma = await getPrismaClientConnection(d1Client)

    const summary = await prisma.billingPeriodSummary.findUnique({where: {billingPeriod}})
    return summary ? BillingPeriodSummaryIdSchema.parse(summary) : null
}

/**
 * Fetch unbilled transactions up to and including cutoff date.
 * Only returns transactions for dinners on or before the cutoff.
 *
 * @param cutoffDate - Include transactions for dinners up to this date (inclusive)
 */
export async function fetchUnbilledTransactions(
    d1Client: D1Database,
    cutoffDate: Date
): Promise<TransactionDisplay[]> {
    const {deserializeTransaction} = useBillingValidation()
    const prisma = await getPrismaClientConnection(d1Client)

    console.info(`💰 > BILLING > Fetching unbilled transactions for dinners <= ${cutoffDate.toISOString().split('T')[0]}`)

    const transactions = await prisma.transaction.findMany({
        where: {
            invoiceId: null,
            order: {
                dinnerEvent: {
                    date: {lte: cutoffDate}
                }
            }
        },
        include: {
            order: {
                include: {
                    inhabitant: {
                        select: {
                            id: true, name: true,
                            household: {select: {id: true, pbsId: true, address: true}}
                        }
                    },
                    dinnerEvent: {select: {id: true, date: true, menuTitle: true}},
                    ticketPrice: {select: {ticketType: true}}
                }
            }
        }
    })

    const results: TransactionDisplay[] = []
    for (const tx of transactions) {
        try {
            results.push(deserializeTransaction(tx))
        } catch {
            console.warn(`💰 > BILLING > Skipping transaction ${tx.id}: unparseable snapshot`)
        }
    }
    return results
}

export async function createBillingPeriodSummary(
    d1Client: D1Database,
    data: BillingPeriodSummaryCreate
): Promise<BillingPeriodSummaryId> {
    const {BillingPeriodSummaryIdSchema} = useBillingValidation()
    const prisma = await getPrismaClientConnection(d1Client)

    const created = await prisma.billingPeriodSummary.create({
        data: {...data, shareToken: crypto.randomUUID()}
    })
    return BillingPeriodSummaryIdSchema.parse(created)
}

export async function createInvoices(
    d1Client: D1Database,
    invoices: InvoiceCreate[]
): Promise<InvoiceCreated[]> {
    if (invoices.length === 0) return []
    const {InvoiceCreatedSchema} = useBillingValidation()
    const prisma = await getPrismaClientConnection(d1Client)

    const created = await prisma.invoice.createManyAndReturn({data: invoices})
    return created.map(inv => InvoiceCreatedSchema.parse(inv))
}

export async function linkTransactionsToInvoice(
    d1Client: D1Database,
    invoiceId: number,
    transactionIds: number[]
): Promise<number> {
    if (transactionIds.length === 0) return 0
    const prisma = await getPrismaClientConnection(d1Client)

    const result = await prisma.transaction.updateMany({
        where: {id: {in: transactionIds}},
        data: {invoiceId}
    })
    return result.count
}

/**
 * Fetch invoices for a billing period.
 * Used by generateBilling for reconciliation - only needs basic invoice data for lookup.
 * Returns InvoiceDisplay with transactionSum computed from related transactions.
 *
 * ADR-010: Uses deserializeInvoice for consistent transformation
 */
export async function fetchInvoicesForBillingPeriod(
    d1Client: D1Database,
    billingPeriodSummaryId: number
): Promise<InvoiceDisplay[]> {
    const {deserializeInvoice} = useBillingValidation()
    const prisma = await getPrismaClientConnection(d1Client)

    const invoices = await prisma.invoice.findMany({
        where: {billingPeriodSummaryId},
        include: {
            transactions: {select: {amount: true}}
        }
    })

    return invoices.map(inv => deserializeInvoice(inv))
}

/**
 * Fetch transactions for a specific invoice (lazy loading for admin economy tree view).
 *
 * ADR-009: Returns TransactionDisplay[] for groupByCostEntry() in UI
 * ADR-010: Repository handles transformation to domain types
 */
export async function fetchTransactionsForInvoice(
    d1Client: D1Database,
    invoiceId: number
): Promise<TransactionDisplay[]> {
    const LOG = '💰 > INVOICE_TRANSACTIONS > [GET]'
    console.info(`${LOG} Fetching transactions for invoice ${invoiceId}`)

    const {deserializeTransaction} = useBillingValidation()
    const prisma = await getPrismaClientConnection(d1Client)

    const transactions = await prisma.transaction.findMany({
        where: {invoiceId},
        include: {
            order: {
                select: {
                    id: true,
                    isGuestTicket: true,
                    inhabitant: {
                        select: {
                            id: true, name: true,
                            household: {select: {id: true, pbsId: true, address: true}}
                        }
                    },
                    dinnerEvent: {select: {id: true, date: true, menuTitle: true}},
                    ticketPrice: {select: {ticketType: true}}
                }
            }
        },
        orderBy: {createdAt: 'desc'}
    })

    console.info(`${LOG} Found ${transactions.length} transactions for invoice ${invoiceId}`)

    // ADR-010: Use deserializeTransaction for consistent transformation
    return transactions.map(deserializeTransaction)
}

/*** HOUSEHOLD BILLING ***/

/**
 * Fetch billing data for a household.
 *
 * ADR-009: Returns HouseholdBillingResponse
 * ADR-010: Repository handles transformation to domain types
 */
export async function fetchHouseholdBilling(
    d1Client: D1Database,
    householdId: number
): Promise<HouseholdBillingResponse | null> {
    const LOG = '💰 > HOUSEHOLD_BILLING > [GET]'
    console.info(`${LOG} Fetching billing for household ${householdId}`)

    const prisma = await getPrismaClientConnection(d1Client)
    const {HouseholdBillingResponseSchema, HouseholdInvoiceSchema, deserializeTransaction} = useBillingValidation()
    const {calculateCurrentBillingPeriod} = useBilling()

    const household = await prisma.household.findUnique({
        where: {id: householdId},
        select: {id: true, pbsId: true, address: true}
    })

    if (!household) {
        console.info(`${LOG} Household ${householdId} not found`)
        return null
    }

    const currentPeriod = calculateCurrentBillingPeriod()

    // Order selection: id + isGuestTicket + relations (matches deserializeTransaction signature)
    const orderSelect = {
        id: true,
        isGuestTicket: true,
        inhabitant: {
            select: {
                id: true, name: true,
                household: {select: {id: true, pbsId: true, address: true}}
            }
        },
        dinnerEvent: {select: {id: true, date: true, menuTitle: true}},
        ticketPrice: {select: {ticketType: true}}
    }

    // Fetch unbilled transactions (current period)
    const unbilledTransactions = await prisma.transaction.findMany({
        where: {
            invoiceId: null,
            order: {inhabitant: {householdId}}
        },
        include: {
            order: {select: orderSelect}
        },
        orderBy: {createdAt: 'desc'}
    })

    // Fetch past invoices with transactions
    const pastInvoices = await prisma.invoice.findMany({
        where: {householdId},
        include: {
            transactions: {
                include: {
                    order: {select: orderSelect}
                },
                orderBy: {createdAt: 'desc'}
            }
        },
        orderBy: {cutoffDate: 'desc'}
    })

    console.info(`${LOG} Found ${unbilledTransactions.length} unbilled, ${pastInvoices.length} invoices for household ${householdId}`)

    // ADR-010: Use deserializeTransaction for consistent transformation
    return HouseholdBillingResponseSchema.parse({
        householdId: household.id,
        pbsId: household.pbsId,
        address: household.address,
        currentPeriod: {
            periodStart: currentPeriod.start,
            periodEnd: currentPeriod.end,
            totalAmount: unbilledTransactions.reduce((sum, tx) => sum + tx.amount, 0),
            transactions: unbilledTransactions.map(deserializeTransaction)
        },
        pastInvoices: pastInvoices.map(invoice => HouseholdInvoiceSchema.parse({
            id: invoice.id,
            billingPeriod: invoice.billingPeriod,
            cutoffDate: invoice.cutoffDate,
            paymentDate: invoice.paymentDate,
            amount: invoice.amount,
            transactions: invoice.transactions.map(deserializeTransaction)
        }))
    })
}
