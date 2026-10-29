import type {Prisma} from "~~/prisma/generated/client/client"
import eventHandlerHelper from "../utils/eventHandlerHelper"
import {getPrismaClientConnection} from "../utils/database"
import {useDeliveryValidation, type Delivery, type DeliveryCreate} from '~/composables/useDeliveryValidation'
import {chunkArray, groupBy} from '~/utils/batchUtils'
import {sumAmounts} from '~/utils/ledger'

import type {
    OrderDisplay,
    OrderDetail,
    OrderCreateWithPrice,
    AuditContext,
    CreateOrdersResult,
    DinnerEventCreate,
    DinnerEventDisplay,
    DinnerEventDate,
    DinnerEventDetail,
    DinnerState,
    SerializedDinnerEvent,
    OrderHistoryDisplay,
    OrderForTransaction,
    DinnerMode,
    OrderState,
    OrderAuditAction,
    OrderAuditChange,
    OrderAuditSource,
    OrderSnapshot,
    SnapshotOrder,
    TicketType
} from '~/composables/useBookingValidation'
import {useBookingValidation, OrderSortBy} from '~/composables/useBookingValidation'
import {useTicket} from '~/composables/useTicket'
import {useBooking} from '~/composables/useBooking'
import {byTimeThenId} from '~/composables/useWaitlist'
import {useHousehold} from '~/composables/useHousehold'
import {getHouseholdShortName} from '~/composables/useCoreValidation'
import {fetchActiveSeasonId, costRowsInclude, readByIds} from '~~/server/data/prismaRepository'
import {useBilling} from '~/composables/useBilling'
import {formatDate} from '~/utils/date'
import {
    useBillingValidation,
    type HouseholdBillingResponse,
    type TransactionDisplay,
    type TransactionCreateData,
    type InvoiceDisplay,
    type InvoiceCreate,
    type InvoiceCreated,
    type BillingPeriodSummaryCreate,
    type BillingPeriodSummaryId,
    type Expense,
    type ExpenseCreateData
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

// The dinner embedded in an order read: its cost is the sum of the selected expense amounts, never the stored column
const embeddedDinnerEvent = (dinnerEvent: SerializedDinnerEvent) => useBookingValidation().deserializeDinnerEvent(dinnerEvent)

// The user who wrote a history row with the name of their inhabitant, as the order timeline and Billetændringer name them
const performedByUserSelect = {select: {id: true, email: true, Inhabitant: {select: {name: true, lastName: true}}}} as const

// The expense amounts give each dinner its computed cost (ADR-010)
const orderDetailInclude = {
    dinnerEvent: {
        select: {
            id: true, date: true, menuTitle: true, menuDescription: true,
            menuPictureUrl: true, state: true, ...costRowsInclude,
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
} satisfies Prisma.OrderInclude

type OrderDetailPayload = Prisma.OrderGetPayload<{include: typeof orderDetailInclude}> & {orderHistory?: unknown[]}

// Flattens ticketType (ADR-009); history only on the reads that include it
const toOrderDetail = (order: OrderDetailPayload): OrderDetail => useBookingValidation().OrderDetailSchema.parse({
    ...order,
    dinnerEvent: embeddedDinnerEvent(order.dinnerEvent),
    ticketType: order.ticketPrice?.ticketType ?? null,
    ticketPrice: order.ticketPrice ? useTicket().withPortions(order.ticketPrice) : null,
    history: order.orderHistory
})

const dinnerEventDetailInclude = {
    Season: true,
    chef: true,
    cookingTeam: {
        include: {
            season: true,
            assignments: {include: {inhabitant: true}},
            _count: {select: {dinners: true, jokerSlots: true}}
        }
    },
    tickets: {
        include: {
            inhabitant: {include: {allergies: {include: {allergyType: true}}}},
            bookedByUser: true,
            ticketPrice: true
        }
    },
    allergens: {include: {allergyType: true}},
    expenses: {orderBy: [{createdAt: 'asc'}, {id: 'asc'}]}
} satisfies Prisma.DinnerEventInclude

/*** ORDER AUDIT ***/

// The holder an order snapshot names: the name and the household's address the short name comes from
export const snapshotInhabitantSelect = {
    name: true, lastName: true, householdId: true,
    household: {select: {address: true}}
} satisfies Prisma.InhabitantSelect

type SnapshotInhabitant = Prisma.InhabitantGetPayload<{select: typeof snapshotInhabitantSelect}>

/** An order as its history row keeps it, with its holder's name and household (ADR-011) */
export const orderSnapshotOf = (order: SnapshotOrder, inhabitant: SnapshotInhabitant): OrderSnapshot => ({
    id: order.id,
    inhabitantId: order.inhabitantId,
    dinnerEventId: order.dinnerEventId,
    ticketPriceId: order.ticketPriceId,
    priceAtBooking: order.priceAtBooking,
    dinnerMode: order.dinnerMode,
    state: order.state,
    isGuestTicket: order.isGuestTicket,
    inhabitantNameWithInitials: useHousehold().formatNameWithInitials(inhabitant),
    householdShortname: getHouseholdShortName(inhabitant.household.address),
    householdId: inhabitant.householdId
})

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
    const {OrderAuditActionSchema, readOrderAudit} = useBookingValidation()
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
            dinnerEventId: { not: null },
            // A guest ticket's history is not its booker's intent: a live order tells by its flag, a deleted one by its audit data
            OR: [{ order: { is: { isGuestTicket: false } } }, { orderId: null }]
        },
        select: {
            inhabitantId: true,
            dinnerEventId: true,
            action: true,
            timestamp: true,
            orderId: true,
            auditData: true
        },
        orderBy: { timestamp: 'desc' }
    })

    // Group by key, take most recent action per key
    const keyToAction = new Map<string, string>()
    for (const intent of userIntents) {
        // A row that cannot tell its guest flag reads as the person's own ticket
        if (intent.orderId === null && readOrderAudit(intent)?.isGuestTicket === true) continue
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
 * @returns CreateOrdersResult with householdId and the created order IDs; returns the rows in insert order
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
    const {OrderCreateWithPriceSchema, OrderAuditChangeSchema, createOrderAuditData} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)

    // Parse through schema to apply defaults (e.g., isGuestTicket: false)
    const validatedOrders = orders.map(order => OrderCreateWithPriceSchema.parse(order))

    try {
        // The holders the creation rows name
        const inhabitants = await prisma.inhabitant.findMany({
            where: {id: {in: [...new Set(validatedOrders.map(order => order.inhabitantId))]}},
            select: {id: true, ...snapshotInhabitantSelect}
        })
        const inhabitantById = new Map(inhabitants.map(inhabitant => [inhabitant.id, inhabitant]))
        const holderOf = (inhabitantId: number): SnapshotInhabitant => {
            const inhabitant = inhabitantById.get(inhabitantId)
            if (!inhabitant) throw new Error(`Inhabitant ${inhabitantId} not found`)
            return inhabitant
        }

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

        // SQLite's RETURNING hands the rows back in no set order; the ids count up in insert order, across Prisma's split inserts too
        const createdIds = createdOrders.map(o => o.id).sort((a, b) => a - b)
        console.info(`🎟️ > ORDER > [BATCH CREATE] Created order IDs: ${createdIds.join(', ')}`)

        // Create audit trail entries with denormalized fields for user intent tracking
        await prisma.orderHistory.createMany({
            data: createdIds.map((orderId, index) => {
                const order = validatedOrders[index]!
                return {
                    orderId,
                    action: auditContext.action,
                    performedByUserId: auditContext.performedByUserId,
                    inhabitantId: order.inhabitantId,
                    dinnerEventId: order.dinnerEventId,
                    seasonId: auditContext.seasonId,
                    auditData: createOrderAuditData(OrderAuditChangeSchema.enum.BOOK, orderSnapshotOf({...order, id: orderId}, holderOf(order.inhabitantId)), auditContext.source)
                }
            })
        })

        console.info(`🎟️ > ORDER > [BATCH CREATE] Successfully created ${createdIds.length} orders with audit trail for household ${householdId}`)

        return { householdId, createdIds }
    } catch (error) {
        return throwH3Error(`🎟️ > ORDER > [BATCH CREATE]: Error creating ${orders.length} orders for household ${householdId}`, error)
    }
}

export async function fetchOrder(d1Client: D1Database, id: number): Promise<OrderDetail | null> {
    console.info(`🎟️ > ORDER > [GET] Fetching order with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const order = await prisma.order.findFirst({
            where: {id},
            include: {
                ...orderDetailInclude,
                // ADR-011: Full order history audit trail for detail endpoint
                orderHistory: {
                    select: {
                        id: true,
                        orderId: true,
                        action: true,
                        performedByUserId: true,
                        performedByUser: performedByUserSelect,
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

        return toOrderDetail(order)
    } catch (error) {
        return throwH3Error(`🎟️ > ORDER > [GET]: Error fetching order with ID ${id}`, error)
    }
}

// The released tickets for sale on a dinner at this instant, per ticket type, in one statement: the price rows with their
// released orders counted, summed per type as a season may hold two prices of a type
export async function countReleasedTicketsByType(d1Client: D1Database, dinnerEventId: number): Promise<Map<TicketType, number>> {
    const {OrderStateSchema} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)
    const released = {dinnerEventId, state: OrderStateSchema.enum.RELEASED}
    try {
        const prices = await prisma.ticketPrice.findMany({
            where: {orders: {some: released}},
            select: {ticketType: true, _count: {select: {orders: {where: released}}}}
        })
        return prices.reduce((counts, {ticketType, _count}) => counts.set(ticketType, (counts.get(ticketType) ?? 0) + _count.orders), new Map<TicketType, number>())
    } catch (error) {
        return throwH3Error(`🎟️ > ORDER > [SUPPLY] Error counting the released tickets of dinner ${dinnerEventId}`, error)
    }
}

/** A claimed order, the price row its ticket keeps and the household whose released ticket it was */
export type ClaimedOrder = {order: OrderDetail, ticketPriceId: number, sellerHouseholdId: number, sellerInhabitantId: number}

// The oldest released order of a ticket type on a dinner, first released first; null when none is for sale
export async function findReleasedOrderId(d1Client: D1Database, dinnerEventId: number, ticketType: TicketType): Promise<number | null> {
    const {OrderStateSchema} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)
    try {
        const released = await prisma.order.findFirst({
            where: {dinnerEventId, ticketPrice: {ticketType}, state: OrderStateSchema.enum.RELEASED},
            orderBy: {releasedAt: 'asc'},
            select: {id: true}
        })
        return released?.id ?? null
    } catch (error) {
        return throwH3Error(`🎟️ > ORDER > [SUPPLY] Error finding a released ${ticketType} ticket of dinner ${dinnerEventId}`, error)
    }
}

/**
 * Claim a released order for an inhabitant: the order changes hands and keeps its price row, so the buyer pays its
 * price and eats its portions.
 *
 * Race-safe: the update's WHERE holds state=RELEASED, so of two concurrent claims on the order one lands.
 *
 * @returns Claimed order with the household and the inhabitant that sold it, or null when the order is no longer for sale
 *
 * ADR-011: Creates USER_CLAIMED audit entry with original household provenance; a sale to the waiting list names its
 * source, so the history tells it from a direct buy
 */
export async function claimReleasedOrder(
    d1Client: D1Database,
    orderId: number,
    newInhabitantId: number,
    claimedByUserId: number | null,
    dinnerMode: DinnerMode,
    isGuestTicket: boolean = false,
    source?: OrderAuditSource
): Promise<ClaimedOrder | null> {
    const LOG = '🎟️ > ORDER > [CLAIM]'
    const {OrderStateSchema, OrderAuditActionSchema, OrderAuditChangeSchema, createOrderAuditData} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)
    const forSale = {id: orderId, state: OrderStateSchema.enum.RELEASED}

    try {
        const existingOrder = await prisma.order.findFirst({
            where: forSale,
            include: {
                dinnerEvent: {select: {seasonId: true}},
                inhabitant: {select: snapshotInhabitantSelect}
            }
        })
        if (!existingOrder?.ticketPriceId) {
            console.info(`${LOG} Order ${orderId} is no longer for sale`)
            return null
        }

        const claimedOrder = await prisma.order.update({
            where: forSale,
            data: {
                inhabitantId: newInhabitantId,
                bookedByUserId: claimedByUserId,
                state: OrderStateSchema.enum.BOOKED,
                dinnerMode,
                isGuestTicket,
                releasedAt: null
            },
            include: orderDetailInclude
        })

        // The audit keeps the order as it stood before the claim, so the history names the household that sold it
        await prisma.orderHistory.create({
            data: {
                orderId,
                action: OrderAuditActionSchema.enum.USER_CLAIMED,
                performedByUserId: claimedByUserId,
                inhabitantId: newInhabitantId,
                dinnerEventId: existingOrder.dinnerEventId,
                seasonId: existingOrder.dinnerEvent?.seasonId ?? null,
                auditData: createOrderAuditData(OrderAuditChangeSchema.enum.BUY, orderSnapshotOf(existingOrder, existingOrder.inhabitant), source)
            }
        })

        console.info(`${LOG} Successfully claimed order ${orderId}`)

        return {
            order: toOrderDetail(claimedOrder), ticketPriceId: existingOrder.ticketPriceId,
            sellerHouseholdId: existingOrder.inhabitant.householdId, sellerInhabitantId: existingOrder.inhabitantId
        }
    } catch (error) {
        // P2025: another claim took the order between the read and the update
        if (isPrismaNotFound(error)) {
            console.warn(`${LOG} Lost race for order ${orderId}`)
            return null
        }
        return throwH3Error(`${LOG} Error claiming order ${orderId}`, error)
    }
}

/**
 * Claim the oldest released ticket of a ticket type on a dinner for an inhabitant (FIFO by releasedAt). A lost race
 * tries the next ticket for sale, up to `maxRetries` attempts.
 *
 * @returns Claimed order with the household and the inhabitant that sold it, or null if no matching ticket available
 */
export async function claimOrder(
    d1Client: D1Database,
    dinnerEventId: number,
    ticketType: TicketType,
    newInhabitantId: number,
    claimedByUserId: number | null,
    dinnerMode: DinnerMode,
    isGuestTicket: boolean = false,
    maxRetries: number = 3
): Promise<ClaimedOrder | null> {
    const LOG = '🎟️ > ORDER > [CLAIM]'

    const attemptClaim = async (attempt: number): Promise<ClaimedOrder | null> => {
        console.info(`${LOG} Attempt ${attempt}: claiming a ${ticketType} ticket (dinner=${dinnerEventId}) for inhabitant ${newInhabitantId}`)
        const orderId = await findReleasedOrderId(d1Client, dinnerEventId, ticketType)
        if (orderId === null) {
            console.info(`${LOG} No released ${ticketType} ticket for sale (dinner=${dinnerEventId})`)
            return null
        }
        const claimed = await claimReleasedOrder(d1Client, orderId, newInhabitantId, claimedByUserId, dinnerMode, isGuestTicket)
        if (claimed) return claimed
        if (attempt < maxRetries) return attemptClaim(attempt + 1)
        console.warn(`${LOG} Max retries exhausted`)
        return null
    }

    return attemptClaim(1)
}

/** A cancellation of an inhabitant's dinner and what the person held: an order, a place on the waiting list, or nothing */
export type Cancellation = {
    orderId: number | null
    inhabitantId: number
    dinnerEventId: number
    seasonId: number | null
    /** The member who cancelled; null when the system did */
    performedByUserId: number | null
    /** What wrote the cancellation: the run's source */
    source?: OrderAuditSource
    snapshot: OrderSnapshot
}

/**
 * The one writer of a cancellation's audit row: USER_CANCELLED for a member's cancellation, which the scaffolder
 * respects (fetchUserIntentKeys), SYSTEM_DELETED for the system's. The row keeps the inhabitant, the dinner and the
 * season once the order or the entry is gone; its change is CANCEL, or LEAVE for a place on the waiting list.
 */
export async function recordCancellation(
    d1Client: D1Database,
    cancellations: Cancellation | Cancellation[],
    change?: OrderAuditChange
): Promise<void> {
    const {OrderAuditActionSchema, OrderAuditChangeSchema, createOrderAuditData} = useBookingValidation()
    const rows = [cancellations].flat()
    if (rows.length === 0) return
    const prisma = await getPrismaClientConnection(d1Client)
    try {
        await prisma.orderHistory.createMany({
            data: rows.map(({snapshot, performedByUserId, source, ...row}) => ({
                ...row,
                performedByUserId,
                action: performedByUserId === null ? OrderAuditActionSchema.enum.SYSTEM_DELETED : OrderAuditActionSchema.enum.USER_CANCELLED,
                auditData: createOrderAuditData(change ?? OrderAuditChangeSchema.enum.CANCEL, snapshot, source)
            }))
        })
    } catch (error) {
        return throwH3Error(`🎟️ > ORDER > [CANCEL] Error recording ${rows.length} cancellation(s)`, error)
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
 * ADR-011: reads each order's snapshot, deletes the orders, then writes their CANCEL rows. A row names no order, as its
 * order is gone; the snapshot keeps the order's id, and inhabitantId/dinnerEventId/seasonId persist.
 *
 * @param orderIds - Single ID or array of IDs
 * @param performedByUserId - User ID if user-initiated, null for admin/system
 * @param source - What wrote the cancellation: the run's source
 */
export async function deleteOrder(
    d1Client: D1Database,
    orderIds: number | number[],
    performedByUserId: number | null = null,
    source?: OrderAuditSource
): Promise<OrderDisplay[]> {
    const LOG = '🎟️ > ORDER > [DELETE]'
    // Normalize to array, return early for empty
    const ids = [orderIds].flat()
    if (ids.length === 0) return []

    const {OrderDisplaySchema} = useBookingValidation()
    console.info(`${LOG} Deleting ${ids.length} order(s) (performedBy: ${performedByUserId ?? 'admin/system'})`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        // 1. Fetch orders with relations for audit data (includes inhabitant/household for provenance)
        const ordersToDelete = await prisma.order.findMany({
            where: { id: { in: ids } },
            include: {
                ticketPrice: { select: { ticketType: true } },
                dinnerEvent: { select: { seasonId: true } },
                inhabitant: { select: snapshotInhabitantSelect }
            }
        })

        if (ordersToDelete.length === 0) {
            console.warn(`${LOG} No orders found for IDs: ${ids.join(', ')}`)
            return []
        }

        // 2. Delete orders
        await prisma.order.deleteMany({
            where: { id: { in: ids } }
        })

        // 3. Audit entries with provenance fields after the delete (allergies omitted - captured at CREATE)
        await recordCancellation(d1Client, ordersToDelete.map(order => ({
            orderId: null,
            performedByUserId,
            source,
            inhabitantId: order.inhabitantId,
            dinnerEventId: order.dinnerEventId,
            seasonId: order.dinnerEvent?.seasonId ?? null,
            snapshot: orderSnapshotOf(order, order.inhabitant)
        })))

        console.info(`${LOG} Successfully deleted ${ordersToDelete.length} order(s) with their cancellation audit entries`)

        // Transform Prisma types to domain types and validate (ADR-010)
        // Exclude dinnerEvent - only needed seasonId for audit, not for returned OrderDisplay
        return ordersToDelete.map(order => {
            const {ticketPrice, inhabitant, dinnerEvent, ...rest} = order
            return OrderDisplaySchema.parse({ ...rest, ticketType: ticketPrice?.ticketType ?? null })
        })
    } catch (error) {
        return throwH3Error(`${LOG} Error deleting ${ids.length} order(s)`, error)
    }
}

/**
 * Sort comparator for OrderDisplay by sortBy field.
 * Extracted for unit testing (ADR-003).
 */
export const getOrderSortComparator = (sortBy: OrderSortBy) =>
    byTimeThenId<OrderDisplay>(sortBy === OrderSortBy.releasedAt ? order => order.releasedAt?.getTime() ?? 0 : order => order.createdAt.getTime())

/**
 * Fetch orders, optionally filtered by dinner event ID(s) and/or household.
 *
 * WORKAROUND: Uses raw SQL instead of Prisma nested includes because Prisma D1 adapter
 * doesn't support relationJoins, and nested includes with WHERE clauses exceed D1's
 * 100 SQL variable limit when fetching many orders.
 *
 * ADR-014: the dinner event IDs read in chunks of 90 through readByIds, one after another: a chunk binds its ids,
 * householdId and state, within D1's 100 parameter limit.
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
 * @param sortBy - Sort field: createdAt (default) or releasedAt (FIFO claim queue)
 * @param includeProvenance - Include provenance for claimed tickets (default: false)
 * @param includeDinnerContext - Include dinner event context (date, menuTitle) for economy views (default: false)
 */
export async function fetchOrders(
    d1Client: D1Database,
    dinnerEventIds?: number | number[],
    householdId?: number,
    state?: OrderState,
    sortBy: OrderSortBy = OrderSortBy.createdAt,
    includeProvenance: boolean = false,
    includeDinnerContext: boolean = false
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

    if (ids === undefined) return fetchOrdersBatch(d1Client, undefined, householdId, state, sortBy, includeProvenance, includeDinnerContext)

    // The chunks' orders merge in the requested order
    const orders = await readByIds(ids, batch => fetchOrdersBatch(d1Client, batch, householdId, state, sortBy, includeProvenance, includeDinnerContext))
    return orders.sort(getOrderSortComparator(sortBy))
}

/**
 * Internal: Fetch orders for a single batch of dinner event IDs, or for every event.
 */
async function fetchOrdersBatch(
    d1Client: D1Database,
    dinnerEventIds: number[] | undefined,
    householdId: number | undefined,
    state: OrderState | undefined,
    sortBy: OrderSortBy,
    includeProvenance: boolean,
    includeDinnerContext: boolean
): Promise<OrderDisplay[]> {
    const {OrderDisplaySchema, readOrderAudit, OrderAuditActionSchema} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        // Build WHERE clauses dynamically
        const whereClauses: string[] = []
        const params: (string | number)[] = []

        if (dinnerEventIds && dinnerEventIds.length > 0) {
            whereClauses.push(`o.dinnerEventId IN (${dinnerEventIds.map(() => '?').join(',')})`)
            params.push(...dinnerEventIds)
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
        const orderByColumn = sortBy === OrderSortBy.releasedAt ? 'o.releasedAt' : 'o.createdAt'

        // Raw SQL with JOINs, within D1's 100 variable limit. The provenance is the order's latest USER_CLAIMED row, by
        // time then by row, looked up per order on the history's orderId index; the dinner context (date, menuTitle)
        // joins DinnerEvent when includeDinnerContext=true
        const sql = `
            SELECT
                o.id, o.dinnerEventId, o.inhabitantId, o.bookedByUserId, o.ticketPriceId,
                o.priceAtBooking, o.dinnerMode, o.state, o.isGuestTicket,
                o.releasedAt, o.closedAt, o.createdAt, o.updatedAt,
                tp.ticketType,
                ${includeProvenance ? `(
                    SELECT oh.auditData FROM OrderHistory oh
                    WHERE oh.orderId = o.id AND oh.action = '${OrderAuditActionSchema.enum.USER_CLAIMED}'
                    ORDER BY oh.timestamp DESC, oh.id DESC
                    LIMIT 1
                ) as provenanceData` : 'NULL as provenanceData'},
                ${includeDinnerContext ? 'de.id as dinnerId, de.date as dinnerDate, de.menuTitle as dinnerMenuTitle' : 'NULL as dinnerId, NULL as dinnerDate, NULL as dinnerMenuTitle'}
            FROM "Order" o
            JOIN Inhabitant i ON i.id = o.inhabitantId
            LEFT JOIN TicketPrice tp ON tp.id = o.ticketPriceId
            ${includeDinnerContext ? 'LEFT JOIN DinnerEvent de ON de.id = o.dinnerEventId' : ''}
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
            dinnerId: number | null
            dinnerDate: string | null
            dinnerMenuTitle: string | null
        }

        const rawOrders = await prisma.$queryRawUnsafe<RawOrderRow[]>(sql, ...params)
        console.info(`🎟️ > ORDER > [GET] Batch returned ${rawOrders.length} orders`)

        return rawOrders.map(row => {
            // The claim's audit names the seller's household
            const provenance = row.provenanceData === null ? null : readOrderAudit({action: OrderAuditActionSchema.enum.USER_CLAIMED, auditData: row.provenanceData})

            const dinnerEvent = row.dinnerId
                ? { id: row.dinnerId, date: new Date(row.dinnerDate!), menuTitle: row.dinnerMenuTitle }
                : undefined

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
                provenanceHousehold: provenance?.householdShortname ?? undefined,
                provenanceAllergies: provenance?.allergies ?? undefined,
                dinnerEvent
            })
        })
    } catch (error) {
        const filterDesc = [
            dinnerEventIds ? `${dinnerEventIds.length} dinner event(s)` : 'all events',
            householdId ? `household ${householdId}` : 'all households',
            state ? `state=${state}` : 'all states'
        ].join(', ')
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
    const {deserializeDinnerEvent} = useBookingValidation()

    try {
        // Strip relation fields, keep only create data
        const createData = dinnerEvents.map(({allergens, ...data}) => data)

        const created = await prisma.dinnerEvent.createManyAndReturn({
            data: createData
        })

        console.info(`🍽️ > DINNER_EVENT > [SAVE] Successfully saved ${created.length} dinner event(s)`)
        return created.map(de => deserializeDinnerEvent(de))
    } catch (error) {
        return throwH3Error(`🍽️ > DINNER_EVENT > [SAVE]: Error saving ${dinnerEvents.length} dinner event(s)`, error)
    }
}

export type DinnerEventFilter = {
    seasonId?: number
    chefIds?: number[]
    excludeStates?: DinnerState[]
}

export async function fetchDinnerEvents(d1Client: D1Database, filter: DinnerEventFilter = {}): Promise<DinnerEventDisplay[]> {
    const {seasonId, chefIds, excludeStates} = filter
    console.info(`🍽️ > DINNER_EVENT > [GET] Fetching dinner events (filter: ${JSON.stringify(filter)})`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {deserializeDinnerEvent} = useBookingValidation()

    try {
        // ADR-012: spread pattern for conditional WHERE (Prisma.skip is data-only)
        const whereClause = {
            ...(seasonId !== undefined && {seasonId}),
            ...(chefIds !== undefined && {chefId: {in: chefIds}}),
            ...(excludeStates !== undefined && {state: {notIn: excludeStates}})
        }

        const dinnerEvents = await prisma.dinnerEvent.findMany({
            where: whereClause,
            include: {
                Season: true,
                chef: true,
                cookingTeam: {
                    include: {
                        season: true
                    }
                },
                ...costRowsInclude
            },
            orderBy: {
                date: 'asc'
            }
        })

        console.info(`🍽️ > DINNER_EVENT > [GET] Successfully fetched ${dinnerEvents.length} dinner events`)
        return dinnerEvents.map(de => deserializeDinnerEvent(de))
    } catch (error) {
        return throwH3Error(`🍽️ > DINNER_EVENT > [GET]: Error fetching dinner events`, error)
    }
}

/** The dinners of the ids, each as its Display with the cost of its expenses, by date; the ids read in chunks (ADR-014) */
export async function fetchDinnerEventsByIds(d1Client: D1Database, ids: number[]): Promise<DinnerEventDisplay[]> {
    console.info(`🍽️ > DINNER_EVENT > [GET] Fetching ${ids.length} dinner events by id`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {deserializeDinnerEvent} = useBookingValidation()

    try {
        const dinnerEvents = await readByIds(ids, batch => prisma.dinnerEvent.findMany({where: {id: {in: batch}}, include: costRowsInclude}))
        return dinnerEvents.map(dinnerEvent => deserializeDinnerEvent(dinnerEvent)).sort((a, b) => a.date.getTime() - b.date.getTime())
    } catch (error) {
        return throwH3Error(`🍽️ > DINNER_EVENT > [GET]: Error fetching dinner events ${ids.join(', ')}`, error)
    }
}

export async function fetchDinnerEvent(d1Client: D1Database, id: number): Promise<DinnerEventDetail | null> {
    console.info(`🍽️ > DINNER_EVENT > [GET] Fetching dinner event with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {DinnerEventDetailSchema, deserializeDinnerEventDetail} = useBookingValidation()

    try {
        const dinnerEvent = await prisma.dinnerEvent.findFirst({
            where: {id},
            include: dinnerEventDetailInclude
        })

        if (dinnerEvent) {
            // ADR-010: Deserialize handles all transformations:
            // - allergens: flatten join table
            // - chef: Inhabitant with dinnerPreferences JSON string
            // - cookingTeam: CookingTeam with affinity and assignments JSON strings
            // - tickets: flatten ticketType, add dinnerEvent ref, deserialize inhabitant
            const dinnerEventToValidate = deserializeDinnerEventDetail(dinnerEvent, useTicket().withPortions)

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
            include: dinnerEventDetailInclude
        })

        // ADR-010: Deserialize handles all transformations (same as fetchDinnerEvent)
        const dinnerEventToValidate = deserializeDinnerEventDetail(updatedDinnerEvent, useTicket().withPortions)

        console.info(`🍽️ > DINNER_EVENT > [UPDATE] Successfully updated dinner event ${updatedDinnerEvent.menuTitle} (ID: ${updatedDinnerEvent.id})`)
        return DinnerEventDetailSchema.parse(dinnerEventToValidate)
    } catch (error) {
        return throwH3Error(`️ > DINNER_EVENT > [UPDATE]: Error updating dinner event with ID ${id}`, error)
    }
}

export async function assignCookingTeamToDinnerEvent(d1Client: D1Database, dinnerEventId: number, cookingTeamId: number): Promise<DinnerEventDisplay> {
    const prisma = await getPrismaClientConnection(d1Client)
    const {deserializeDinnerEvent} = useBookingValidation()

    const updated = await prisma.dinnerEvent.update({
        where: {id: dinnerEventId},
        data: {cookingTeamId},
        include: costRowsInclude
    })

    return deserializeDinnerEvent(updated)
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
): Promise<DinnerEventDate[]> {
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
): Promise<{id: number, inhabitantId: number, dinnerEventId: number, dinnerMode: DinnerMode, seasonId: number}[]> {
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
        select: {id: true, inhabitantId: true, dinnerEventId: true, dinnerMode: true}
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
    change: OrderAuditChange
    /** What wrote the update: the run's source */
    source?: OrderAuditSource
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

        // Create audit entries for updates with audit context (ADR-011): each keeps its order as the update left it
        const updatesWithAudit = updates.flatMap(({orderId, audit}) => audit ? [{orderId, audit}] : [])
        if (updatesWithAudit.length > 0) {
            console.info(`${LOG} Creating ${updatesWithAudit.length} audit entries`)
            const {createOrderAuditData} = useBookingValidation()
            const audited = await readByIds(updatesWithAudit.map(({orderId}) => orderId), idChunk => prisma.order.findMany({
                where: {id: {in: idChunk}},
                include: {inhabitant: {select: snapshotInhabitantSelect}}
            }))
            const orderById = new Map(audited.map(order => [order.id, order]))
            const auditEntries = updatesWithAudit.flatMap(({orderId, audit: {change, source, ...row}}) => {
                const order = orderById.get(orderId)
                return order ? [{orderId, ...row, auditData: createOrderAuditData(change, orderSnapshotOf(order, order.inhabitant), source)}] : []
            })
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

    console.info(`💰 > BILLING > Fetching unbilled transactions for dinners <= ${formatDate(cutoffDate)}`)

    // Ordered by household address, then pbsId as tiebreaker.
    const transactions = await prisma.transaction.findMany({
        where: {
            invoiceId: null,
            order: {
                dinnerEvent: {
                    date: {lte: cutoffDate}
                }
            }
        },
        orderBy: [
            {order: {inhabitant: {household: {address: 'asc'}}}},
            {order: {inhabitant: {household: {pbsId: 'asc'}}}}
        ],
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

/** A period's content changed (catch-up billing): the next run archives and mails the new version */
export async function bumpBillingPeriodVersion(d1Client: D1Database, id: number): Promise<number> {
    const prisma = await getPrismaClientConnection(d1Client)
    const updated = await prisma.billingPeriodSummary.update({where: {id}, data: {version: {increment: 1}}, select: {version: true}})
    return updated.version
}

/*** DELIVERIES (ADR-015 convergence): one row per version of a subject that reached a channel ***/

/** The deliveries of the subjects of one type, in the order they were recorded; the ids read in chunks (ADR-014) */
export async function fetchDeliveries(d1Client: D1Database, subjectType: Delivery['subjectType'], subjectIds: number[]): Promise<Delivery[]> {
    const {DeliverySchema} = useDeliveryValidation()
    const prisma = await getPrismaClientConnection(d1Client)

    const rows = await readByIds(subjectIds, batch => prisma.delivery.findMany({where: {subjectType, subjectId: {in: batch}}}))
    return rows.map(row => DeliverySchema.parse(row)).sort((a, b) => a.id - b.id)
}

/** The rows in one write (ADR-014); jobRunId null = sent outside a job run (ADR-012: written as null, never as undefined) */
export async function recordDeliveries(d1Client: D1Database, rows: DeliveryCreate[]): Promise<Delivery[]> {
    if (rows.length === 0) return []
    const {DeliverySchema} = useDeliveryValidation()
    const prisma = await getPrismaClientConnection(d1Client)

    const created = await prisma.delivery.createManyAndReturn({data: rows.map(row => ({...row, jobRunId: row.jobRunId ?? null}))})
    console.info(`📬 > DELIVERY > [RECORD] ${created.length} rows: ${rows.map(row => `${row.subjectType} ${row.subjectId} v${row.version} ${row.kind}`).join(', ')}`)
    return created.map(row => DeliverySchema.parse(row))
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
                    dinnerMode: true,
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

    const currentPeriod = calculateCurrentBillingPeriod(new Date())

    // Order selection: id + isGuestTicket + dinnerMode + relations (matches deserializeTransaction signature)
    const orderSelect = {
        id: true,
        isGuestTicket: true,
        dinnerMode: true,
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
            totalAmount: sumAmounts(unbilledTransactions),
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

/*** EXPENSES: the ledger of costs; a dinner's cost is the sum of its REGULAR rows, computed on every read ***/

const EXPENSE_LOG = '🧾 > EXPENSE'

export async function createExpense(d1Client: D1Database, data: ExpenseCreateData): Promise<Expense> {
    const {serializeExpense, deserializeExpense} = useBillingValidation()
    const prisma = await getPrismaClientConnection(d1Client)
    try {
        const created = await prisma.expense.create({data: serializeExpense(data)})
        console.info(`${EXPENSE_LOG} > [CREATE] Expense ${created.id} (${data.type}) on dinner ${data.dinnerEventId}: ${data.amount} øre`)
        return deserializeExpense(created)
    } catch (error) {
        return throwH3Error(`${EXPENSE_LOG} > [CREATE] Error creating an expense on dinner ${data.dinnerEventId}`, error)
    }
}

// The lines in the order they were entered
export async function fetchExpensesForDinner(d1Client: D1Database, dinnerEventId: number): Promise<Expense[]> {
    const {deserializeExpense} = useBillingValidation()
    const prisma = await getPrismaClientConnection(d1Client)
    try {
        const expenses = await prisma.expense.findMany({where: {dinnerEventId}, orderBy: [{createdAt: 'asc'}, {id: 'asc'}]})
        return expenses.map(expense => deserializeExpense(expense))
    } catch (error) {
        return throwH3Error(`${EXPENSE_LOG} > [GET] Error fetching the expenses of dinner ${dinnerEventId}`, error)
    }
}

// Returns the removed row (ADR-009: the chef's list renders it); a row on another dinner is a miss, 404 through P2025
export async function deleteExpense(d1Client: D1Database, dinnerEventId: number, id: number): Promise<Expense> {
    const {deserializeExpense} = useBillingValidation()
    const prisma = await getPrismaClientConnection(d1Client)
    try {
        const removed = await prisma.expense.delete({where: {id, dinnerEventId}})
        console.info(`${EXPENSE_LOG} > [DELETE] Expense ${id} removed from dinner ${dinnerEventId}`)
        return deserializeExpense(removed)
    } catch (error) {
        return throwH3Error(`${EXPENSE_LOG} > [DELETE] Error removing expense ${id} from dinner ${dinnerEventId}`, error)
    }
}

/*** ORDER HISTORY OF DINNERS: the rows the chef's Billetændringer replay and the booking mails count their versions by ***/

// Every history row of the dinners in time order; a deleted order's rows stay through the denormalized dinnerEventId.
// The ids read in chunks (ADR-014)
export async function fetchOrderHistoryForDinners(d1Client: D1Database, dinnerEventIds: number[]): Promise<OrderHistoryDisplay[]> {
    const {OrderHistoryDisplaySchema} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)
    try {
        const rows = await readByIds(dinnerEventIds, batch => prisma.orderHistory.findMany({
            where: {dinnerEventId: {in: batch}},
            include: {performedByUser: performedByUserSelect}
        }))
        return rows.map(row => OrderHistoryDisplaySchema.parse(row)).sort(byTimeThenId(row => row.timestamp.getTime()))
    } catch (error) {
        return throwH3Error(`🎟️ > ORDER_HISTORY > [GET] Error fetching the order history of ${dinnerEventIds.length} dinner(s)`, error)
    }
}
