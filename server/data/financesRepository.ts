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

        // Create orders individually to get IDs back (avoids race conditions)
        // Note: Not using createMany since it doesn't return created records
        const createdOrders = await Promise.all(
            ordersData.map(async orderData => {
                const priceAtBooking = priceMap.get(orderData.ticketPriceId)!.price

                return prisma.order.create({
                    data: {
                        ...orderData,
                        priceAtBooking
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
                    }
                })
            })
        )

        console.info(`🎟️ > ORDER > [BATCH CREATE] Successfully created ${createdOrders.length} orders for household ${householdId}`)

        // Transform to domain type with ticketType (use included relation instead of priceMap)
        return createdOrders.map(order => {
            return OrderDisplaySchema.parse({
                ...order,
                ticketType: order.ticketPrice.ticketType
            })
        })
    } catch (error) {
        return throwH3Error(`🎟️ > ORDER > [CREATE]: Error batch creating ${ordersData.length} orders`, error)
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

export async function saveDinnerEvent(d1Client: D1Database, dinnerEvent: DinnerEventCreate): Promise<DinnerEventDisplay> {
    console.info(`🍽️ > DINNER_EVENT > [SAVE] Saving dinner event ${dinnerEvent.menuTitle} on ${dinnerEvent.date}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {DinnerEventDisplaySchema} = useBookingValidation()

    // Exclude relation fields that Prisma doesn't accept in create data
    const {allergens, ...createData} = dinnerEvent

    try {
        const newDinnerEvent = await prisma.dinnerEvent.create({
            data: createData
        })

        console.info(`🍽️ > DINNER_EVENT > [SAVE] Successfully saved dinner event ${newDinnerEvent.menuTitle} with ID ${newDinnerEvent.id}`)
        return DinnerEventDisplaySchema.parse(newDinnerEvent)
    } catch (error) {
        return throwH3Error(`🍽️ > DINNER_EVENT > [SAVE]: Error saving dinner event ${dinnerEvent?.menuTitle}`, error)
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
            // Transform tickets to include flattened ticketType and dinnerEvent relation
            const transformedTickets = dinnerEvent.tickets.map(ticket => ({
                ...ticket,
                ticketType: ticket.ticketPrice.ticketType,  // Flatten from nested relation
                dinnerEvent: {  // Add the parent dinner event (excluding tickets to avoid circular ref)
                    id: dinnerEvent.id,
                    date: dinnerEvent.date,
                    menuTitle: dinnerEvent.menuTitle,
                    menuDescription: dinnerEvent.menuDescription,
                    menuPictureUrl: dinnerEvent.menuPictureUrl,
                    state: dinnerEvent.state,
                    totalCost: dinnerEvent.totalCost,
                    chefId: dinnerEvent.chefId,
                    cookingTeamId: dinnerEvent.cookingTeamId,
                    heynaboEventId: dinnerEvent.heynaboEventId,
                    seasonId: dinnerEvent.seasonId,
                    createdAt: dinnerEvent.createdAt,
                    updatedAt: dinnerEvent.updatedAt
                }
            }))

            // ADR-010: Deserialize all nested relations with JSON string fields
            // - allergens: flatten join table
            // - chef: Inhabitant with dinnerPreferences JSON string
            // - cookingTeam: CookingTeam with affinity and assignments JSON strings
            // - tickets: Order with nested inhabitant's dinnerPreferences
            const dinnerEventToValidate = deserializeDinnerEventDetail({
                ...dinnerEvent,
                tickets: transformedTickets
            })

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
                        dinners: true,
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

        // ADR-010: Deserialize all nested JSON string fields (chef.dinnerPreferences, cookingTeam.affinity, ticket.inhabitant.dinnerPreferences)
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
