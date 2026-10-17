import {z} from 'zod'
import {
    TicketTypeSchema,
    OrderStateSchema,
    DinnerStateSchema,
    DinnerModeSchema,
    RoleSchema,
    OrderAuditActionSchema
} from '~~/prisma/generated/zod'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import {useCoreValidation, IdSchema} from '~/composables/useCoreValidation'
import {useTicketPriceValidation, type PortionTicket} from '~/composables/useTicketPriceValidation'
import {useAllergyValidation} from '~/composables/useAllergyValidation'
import {chunkArray, ReconciliationBucketSchema} from '~/utils/batchUtils'
import {sumAmounts} from '~/utils/ledger'
import {ExpenseFragmentSchema, deserializeExpense} from '~/composables/fragments/domainFragments'

// A dinner row as Prisma hands it out: the relations a read includes, the expense amounts behind the computed cost
type DinnerEventRow = Record<string, unknown> & {
    allergens?: Array<{allergyType: unknown}> | null
    expenses?: Array<Record<string, unknown> & {amount: number}> | null
}

// What a ticket is now: released and for sale, bought from another household, waited for on the waiting list, or none
const TicketStateSchema = z.enum(['released', 'claimed', 'queued', 'normal'])
// A dinner's supply after the booking deadline: tickets for sale, a waiting list, both or neither
const SupplyStateSchema = z.enum(['FOR_SALE_AND_WAITLIST', 'FOR_SALE', 'WAITLIST', 'NONE'])
// Why an order of a booking failed: it conflicts with the state it meets, a place on the waiting list a run is assigning
const BookingFailureSchema = z.enum(['CONFLICT'])

export const DinnerMode = DinnerModeSchema.enum
export const DinnerState = DinnerStateSchema.enum
export const OrderState = OrderStateSchema.enum
export const OrderAuditAction = OrderAuditActionSchema.enum
export const TicketState = TicketStateSchema.enum
export const SupplyState = SupplyStateSchema.enum
export const BookingFailure = BookingFailureSchema.enum

/**
 * Validation schemas for Bookings domain (DinnerEvent + Order)
 *
 * ADR-009 Compliance:
 * - DisplaySchema: Minimal fields for index endpoints (GET /)
 * - DetailSchema: Display + ALL remaining scalars + comprehensive relations (GET /[id])
 * - Detail ALWAYS EXTENDS Display
 */
export const useBookingValidation = () => {
    const {CookingTeamDisplaySchema, deserializeCookingTeamDisplay} = useCookingTeamValidation()
    const {InhabitantDisplaySchema, deserializeInhabitantDisplay} = useCoreValidation()
    const {TicketPriceSchema} = useTicketPriceValidation()
    const {AllergyTypeDisplaySchema, InhabitantWithAllergiesSchema, deserializeInhabitantWithAllergies} = useAllergyValidation()

    // ============================================================================
    // DINNER EVENT (Base + Display schemas - defined first for Order to reference)
    // ============================================================================

    // all scalar fields
    const DinnerEventBaseSchema = z.object({
        date: z.coerce.date(),
        menuTitle: z.string().max(500, "Menu titel må ikke være længere end 500 tegn"),
        menuDescription: z.string().max(500).nullable(),
        menuPictureUrl: z.url().nullable(),
        state: DinnerStateSchema,
        totalCost: z.number().int().min(0),
        chefId: IdSchema.nullable(),
        cookingTeamId: IdSchema.nullable(),
        heynaboEventId: IdSchema.nullable(),
        seasonId: IdSchema.nullable(),
        createdAt: z.coerce.date(),
        updatedAt: z.coerce.date(),
        allergens: z.array(AllergyTypeDisplaySchema).optional()
    })

    /**
     * DinnerEvent Display - all scalars fields for index endpoints (GET /api/admin/dinner-event)
     * ADR-009: Lightweight, display-ready data for lists/calendar
     */
    const DinnerEventDisplaySchema = DinnerEventBaseSchema.extend({
        id: IdSchema
    })

    /**
     * DinnerEvent Info - minimal fields for grouping (economy views, cost entries)
     * Used by groupByCostEntry callback return type
     */
    const DinnerEventInfoSchema = DinnerEventDisplaySchema.pick({
        id: true,
        date: true,
        menuTitle: true
    })

    /**
     * DinnerEvent Create - For API input validation (PUT /api/admin/dinner-event)
     */
    // The cost is computed from the dinner's expense rows: no body writes it, and a body carrying it is a 400
    const DinnerEventCreateSchema = DinnerEventBaseSchema.omit({totalCost: true}).strict()

    /**
     * DinnerEvent Update - For API input validation (POST /api/chef/dinner/[id]).
     * Note: id is optional in body since it comes from URL path.
     */
    const DinnerEventUpdateSchema = DinnerEventBaseSchema.omit({totalCost: true}).partial().strict()

    /**
     * Chef Menu Form - For chef UI form validation
     * Derived from DinnerEventBaseSchema with stricter validation for user input
     */
    const ChefMenuFormSchema = z.object({
        menuTitle: z.string()
            .min(1, 'Menu titel er påkrævet')
            .max(500, 'Menu titel må maks være 500 tegn'),
        menuDescription: z.string().max(500, 'Beskrivelse må maks være 500 tegn')
    })

    // ============================================================================
    // ORDER (defined after DinnerEventDisplaySchema so it can reference it)
    // ============================================================================

    const OrderBaseSchema = z.object({
        dinnerEventId: IdSchema,
        inhabitantId: IdSchema,
        bookedByUserId: IdSchema.nullable(),
        ticketPriceId: IdSchema.nullable(), // Nullable: SET NULL when TicketPrice deleted (priceAtBooking preserved)
        priceAtBooking: z.number().int(),
        dinnerMode: DinnerModeSchema,
        state: OrderStateSchema,
        isGuestTicket: z.boolean().default(false), // True when ticket is for a guest (not the inhabitant themselves)
        releasedAt: z.coerce.date().nullable(),
        closedAt: z.coerce.date().nullable(),
        createdAt: z.coerce.date(),
        updatedAt: z.coerce.date()
    })

    /**
     * Order Display - Minimal for index endpoints (GET /api/order)
     * ADR-009: Lightweight with flattened ticketType
     */
    const OrderDisplaySchema = OrderBaseSchema.extend({
        id: IdSchema,
        ticketType: TicketTypeSchema.nullable(),
        provenanceHousehold: z.string().optional(),
        provenanceAllergies: z.array(z.string()).optional(),
        dinnerEvent: DinnerEventInfoSchema.optional()
    })

    /**
     * OrderHistory Display - lightweight for lists (ADR-009)
     * Scalars only, no nested Order relation
     * Includes denormalized fields for cancellation queries (orderId becomes NULL after deletion)
     * NOTE: Defined here (before OrderDetailSchema) so it can be referenced in OrderDetailSchema.history
     */
    const OrderHistoryDisplaySchema = z.object({
        id: IdSchema,
        orderId: IdSchema.nullable(),
        action: OrderAuditActionSchema,
        performedByUserId: IdSchema.nullable(),
        // User relation for meaningful display (e.g., "Anna booked at 14:30")
        performedByUser: z.object({
            id: IdSchema,
            email: z.string()
        }).nullable(),
        auditData: z.string(),
        timestamp: z.coerce.date(),
        // Denormalized fields for cancellation queries
        inhabitantId: IdSchema.nullable(),
        dinnerEventId: IdSchema.nullable(),
        seasonId: IdSchema.nullable()
    })

    /**
     * Order Detail - Display + comprehensive relations (GET /api/order/[id])
     * ADR-009: Operation-ready with full nested objects
     */
    const OrderDetailSchema = OrderDisplaySchema.extend({
        // DinnerEvent relation - ALL scalar fields
        dinnerEvent: DinnerEventDisplaySchema,
        // Inhabitant relation with allergies for kitchen display (clean type from useAllergyValidation)
        inhabitant: InhabitantWithAllergiesSchema,
        // BookedByUser relation
        bookedByUser: z.object({
            id: IdSchema,
            email: z.string()
        }).nullable(),
        // TicketPrice relation - nullable when TicketPrice deleted (priceAtBooking preserved); the price carries its portions
        ticketPrice: TicketPriceSchema.pick({ticketType: true, price: true, description: true, portions: true}).extend({id: IdSchema}).nullable(),
        // Order history - audit trail (ADR-011), optional for backwards compatibility
        // Populated by fetchOrder() for detail endpoint, not included in DinnerEventDetail.tickets
        history: z.array(OrderHistoryDisplaySchema).optional()
    })

    // ============================================================================
    // DINNER EVENT (Detail schema - defined after OrderDetailSchema so no z.lazy needed)
    // ============================================================================

    /**
     * DinnerEvent Detail - Display + relations (GET /api/admin/dinner-event/[id])
     * ADR-009: Operation-ready, comprehensive data
     */
    const DinnerEventDetailSchema = DinnerEventDisplaySchema.extend({
        chef: InhabitantDisplaySchema.nullable(),
        cookingTeam: CookingTeamDisplaySchema.nullable(),
        tickets: z.array(OrderDetailSchema).optional(),
        // The lines behind the cost (ADR-009: Detail carries them, Display the sum)
        expenses: z.array(ExpenseFragmentSchema).default([])
    })

    /**
     * Order Create - Repository layer (used internally)
     */
    const OrderCreateSchema = z.object({
        dinnerEventId: IdSchema,
        inhabitantId: IdSchema,
        bookedByUserId: IdSchema.nullable().optional(),
        ticketPriceId: IdSchema,
        priceAtBooking: z.number().int().optional(),
        dinnerMode: DinnerModeSchema,
        state: OrderStateSchema,
        isGuestTicket: z.boolean().default(false)
    })

    // ============================================================================
    // BULK ORDER CREATION (ADR-009 compliant)
    // ============================================================================

    /**
     * Audit context for order creation - used for OrderHistory entries
     * Uses OrderAuditActionSchema from generated Prisma Zod types (ADR-001)
     *
     * seasonId: Required for user intent tracking (fetchUserIntentKeys filters by seasonId)
     */
    // What wrote an order's creation row: a user's booking, a preference change, the nightly scaffold, the chef's extra
    // portions for the waiting list, the billing import
    const OrderAuditSourceSchema = z.enum(['user-booking', 'preference-update', 'scaffold-prebookings', 'waitlist-assignment', 'csv_billing'])

    const AuditContextSchema = z.object({
        action: OrderAuditActionSchema,
        performedByUserId: IdSchema.nullable(),
        source: OrderAuditSourceSchema,
        seasonId: IdSchema.nullable()
    })

    /**
     * Order with price and household - for batch creation
     * Extends OrderCreateSchema with required fields for batch operations:
     * - householdId: Required for same-household validation (Zod validates)
     * - priceAtBooking: Required (caller enriches from ticket prices, can be 0 for free tickets)
     */
    const OrderCreateWithPriceSchema = OrderCreateSchema.extend({
        householdId: IdSchema,
        priceAtBooking: z.number().int().nonnegative()  // Override to required, allows 0 for free tickets
    })

    // ADR-014: Prisma D1 adapter auto-chunks createManyAndReturn
    // Manual chunking is defense-in-depth; 200 is conservative (needs investigation for actual limits)
    const ORDER_BATCH_SIZE = 200

    // updateMany/deleteMany: D1 limit is 100 total params (IDs + data fields)
    // updateOrdersToClosed uses 2 data params, so max ~98 IDs. Using 90 for safety.
    const DELETE_BATCH_SIZE = 90

    // findMany with nested includes: D1 limit is 100 params, but nested queries add overhead.
    // fetchOrders includes orderHistory with WHERE clause, so use conservative 30 for IDs.
    const FETCH_IDS_BATCH_SIZE = 30

    // Order writes in batches of the insert size, and deletes in batches within D1's parameter limit
    const chunkOrderBatch = <T>(items: T[]): T[][] => chunkArray<T>(ORDER_BATCH_SIZE)(items)
    const chunkDeleteBatch = <T>(items: T[]): T[][] => chunkArray<T>(DELETE_BATCH_SIZE)(items)

    // Curried chunk function for IDs in fetch operations with nested includes
    const chunkFetchIds = chunkArray<number>(FETCH_IDS_BATCH_SIZE)

    /**
     * Batch of orders for batch creation - validates business rules:
     * - Array size: 1-ORDER_BATCH_SIZE orders (defense-in-depth, Prisma auto-chunks)
     * - Same household: All orders must have same householdId
     */
    const OrdersBatchSchema = z.array(OrderCreateWithPriceSchema)
        .min(1, 'Mindst én ordre er påkrævet')
        .max(ORDER_BATCH_SIZE, `Maksimalt ${ORDER_BATCH_SIZE} ordrer per batch`)
        .refine(
            orders => new Set(orders.map(o => o.householdId)).size === 1,
            { message: 'Alle ordrer skal være fra samme husstand' }
        )

    /**
     * Result of bulk order creation
     */
    const CreateOrdersResultSchema = z.object({
        householdId: IdSchema,
        createdIds: IdSchema.array()
    })

    /**
     * Menu handling when a chef duty is taken over on an ANNOUNCED dinner: the Heynabo event
     * is owned by the departing chef's account, so it is deleted as system and either
     * republished under the taker's token (PRESERVE) or the dinner is reset (CLEAR).
     * See docs/features/bug-fix-chef-takeover.md.
     */
    const MenuSwapStrategySchema = z.enum(['PRESERVE', 'CLEAR'])

    /**
     * Assign role to dinner event (POST /api/team/cooking/[id]/assign-role)
     * Used for "Bliv chefkok", "Bliv kok", "Bliv kokkespire" buttons and chef takeover
     */
    const AssignRoleSchema = z.object({
        inhabitantId: z.number().int().positive('Inhabitant ID must be a positive integer'),
        role: RoleSchema,
        menuStrategy: MenuSwapStrategySchema.optional()
    })

    // Remove a role from a dinner ("Meld afbud"). dinner = route [id];
    // inhabitantId optional, defaults to caller. Reuses AssignRoleSchema (DRY).
    const RemoveRoleRequestSchema = AssignRoleSchema.partial({inhabitantId: true})

    /**
     * Order query filters (GET /api/order?...)
     */
    const OrderQuerySchema = z.object({
        state: OrderStateSchema.optional(),
        fromDate: z.coerce.date().optional(),
        toDate: z.coerce.date().optional()
    })

    /**
     * OrderHistory Detail - for GET/:id and mutation returns (ADR-009)
     * Extends Display with order relation
     */
    const OrderHistoryDetailSchema = OrderHistoryDisplaySchema.extend({
        order: OrderDisplaySchema.nullable()
    })

    /**
     * OrderHistory Create - for input validation (PUT)
     * Omits id (auto-generated) and timestamp (default now())
     */
    const OrderHistoryCreateSchema = OrderHistoryDisplaySchema.omit({
        id: true,
        timestamp: true,
        performedByUser: true  // Relation object is for display only, not create (FK is performedByUserId)
    })

    /**
     * Order snapshot for audit data - captures order state at deletion/release time
     * Derived from OrderDisplaySchema, picking essential fields + provenance data
     * Provenance enables "🔄 fra AR_1" display on claimed tickets
     */
    const OrderSnapshotSchema = OrderDisplaySchema.pick({
        id: true,
        inhabitantId: true,
        dinnerEventId: true,
        ticketPriceId: true,
        priceAtBooking: true,
        dinnerMode: true,
        state: true,
        isGuestTicket: true
    }).extend({
        // Provenance fields for ticket claim feature (pre-formatted for immutable audit trail)
        inhabitantNameWithInitials: z.string(),           // "Anna B.H." - colloquial format
        householdShortname: z.string(),                   // "AR_1" - for "fra AR_1" display
        householdId: IdSchema,         // For filtering released tickets
        allergies: z.array(z.string()).optional()         // ["Peanuts", "Gluten"] - captured at CREATE, omitted at UPDATE/DELETE
    })

    /**
     * Create serialized audit data for OrderHistory
     */
    const createOrderAuditData = (orderSnapshot: z.input<typeof OrderSnapshotSchema>): string =>
        JSON.stringify({orderSnapshot: OrderSnapshotSchema.parse(orderSnapshot)})

    /**
     * Deserialize audit data from OrderHistory
     */
    const deserializeOrderAuditData = (auditData: string): {orderSnapshot: z.infer<typeof OrderSnapshotSchema>} => {
        const parsed = JSON.parse(auditData)
        return {orderSnapshot: OrderSnapshotSchema.parse(parsed.orderSnapshot)}
    }

    // A deleted order's snapshot or a created order's data holds the flag; a row without it reads as no guest
    const AuditGuestFlagSchema = z.object({
        orderSnapshot: z.object({isGuestTicket: z.boolean()}).partial().optional(),
        orderData: z.object({isGuestTicket: z.boolean()}).partial().optional()
    })
    const isGuestTicketAudit = (auditData: string): boolean => {
        const parsed = AuditGuestFlagSchema.safeParse(JSON.parse(auditData))
        return parsed.success && Boolean(parsed.data.orderSnapshot?.isGuestTicket ?? parsed.data.orderData?.isGuestTicket)
    }

    // ============================================================================
    // Serialization (ADR-010 - Repository layer)
    // ============================================================================

    // Date schema that accepts both strings (wire format) and Date objects (Prisma)
    const flexibleDateSchema = z.union([z.string(), z.date()]).transform(val => new Date(val))
    const flexibleDateNullableSchema = z.union([z.string(), z.date()]).nullable().transform(val => val ? new Date(val) : null)

    // Schema for deserializing - accepts strings or Dates, outputs Dates
    /**
     * The ticket an OrderHistory row speaks of, read from the three shapes auditData takes: the creation's `orderData`
     * with the source that wrote it, the snapshot of an update, claim or deletion, and the scalars of a bulk update. The
     * order id comes from the snapshot or the row; a row whose order is gone and whose data holds no id reads null and is
     * matched by inhabitant. A source the enum does not name reads null.
     */
    const AuditTicketSchema = z.object({
        orderId: IdSchema.nullable(),
        inhabitantId: IdSchema.nullable(),
        householdId: IdSchema.nullable(),
        householdShortname: z.string().nullable(),
        ticketPriceId: IdSchema.nullable(),
        priceAtBooking: z.number().int(),
        state: OrderStateSchema,
        deleted: z.boolean(),
        source: OrderAuditSourceSchema.nullable().catch(null)
    })

    // deleteOrder writes the deleted order's snapshot under a cancellation or a system deletion; a release writes the scalars
    const DELETION_ACTIONS: readonly z.infer<typeof OrderAuditActionSchema>[] = [OrderAuditActionSchema.enum.USER_CANCELLED, OrderAuditActionSchema.enum.SYSTEM_DELETED]

    const readAuditTicket = (row: {orderId: number | null, inhabitantId: number | null, action: z.infer<typeof OrderAuditActionSchema>, auditData: string}): z.infer<typeof AuditTicketSchema> | null => {
        const parsed = JSON.parse(row.auditData) as Record<string, unknown>
        const snapshot = parsed.orderSnapshot as Record<string, unknown> | undefined
        const source = snapshot ?? (parsed.orderData as Record<string, unknown> | undefined) ?? parsed
        const result = AuditTicketSchema.safeParse({
            orderId: (snapshot?.id as number | undefined) ?? row.orderId,
            inhabitantId: (source.inhabitantId as number | undefined) ?? row.inhabitantId,
            householdId: source.householdId ?? null,
            householdShortname: snapshot?.householdShortname ?? null,
            ticketPriceId: source.ticketPriceId ?? null,
            priceAtBooking: source.priceAtBooking ?? 0,
            state: source.state ?? OrderStateSchema.enum.BOOKED,
            deleted: snapshot !== undefined && DELETION_ACTIONS.includes(row.action),
            source: parsed.source ?? null
        })
        return result.success ? result.data : null
    }

    const SerializedOrderSchema = OrderDisplaySchema.omit({
        releasedAt: true, closedAt: true, createdAt: true, updatedAt: true
    }).extend({
        releasedAt: flexibleDateNullableSchema,
        closedAt: flexibleDateNullableSchema,
        createdAt: flexibleDateSchema,
        updatedAt: flexibleDateSchema
    })

    // Type for serialized output (wire format with string dates)
    type SerializedOrder = Omit<z.infer<typeof OrderDisplaySchema>, 'releasedAt' | 'closedAt' | 'createdAt' | 'updatedAt'> & {
        releasedAt: string | null
        closedAt: string | null
        createdAt: string
        updatedAt: string
    }

    const SerializedOrderHistoryDisplaySchema = OrderHistoryDisplaySchema.extend({
        timestamp: z.string()
    })

    function serializeOrder(order: z.infer<typeof OrderDisplaySchema>): SerializedOrder {
        return {
            ...order,
            releasedAt: order.releasedAt?.toISOString() ?? null,
            closedAt: order.closedAt?.toISOString() ?? null,
            createdAt: order.createdAt.toISOString(),
            updatedAt: order.updatedAt.toISOString()
        }
    }

    function deserializeOrder(serialized: Record<string, unknown>): z.infer<typeof OrderDisplaySchema> {
        return SerializedOrderSchema.parse(serialized)
    }

    function serializeOrderHistoryDisplay(history: z.infer<typeof OrderHistoryDisplaySchema>): z.infer<typeof SerializedOrderHistoryDisplaySchema> {
        return {
            ...history,
            timestamp: history.timestamp.toISOString()
        }
    }

    function deserializeOrderHistoryDisplay(serialized: z.infer<typeof SerializedOrderHistoryDisplaySchema>): z.infer<typeof OrderHistoryDisplaySchema> {
        return {
            ...serialized,
            timestamp: new Date(serialized.timestamp)
        }
    }

    /**
     * Transform DinnerEvent from Prisma format to domain format (ADR-010)
     * Handles join table flattening for allergens only (for Display schema)
     */
    function deserializeDinnerEvent(prismaEvent: Record<string, unknown>): z.infer<typeof DinnerEventDisplaySchema> {
        const {allergens, expenses, ...event} = prismaEvent as DinnerEventRow
        return DinnerEventDisplaySchema.parse({
            ...event,
            // The cost is the sum of the expense rows; the stored column is deprecated and its value never leaves the repository
            totalCost: sumAmounts(expenses),
            allergens: allergens ? allergens.map((a) => a.allergyType) : []
        })
    }

    /**
     * Transform DinnerEventDetail from Prisma format to domain format (ADR-010)
     * Handles all nested relations:
     * - allergens: Flatten join table to array of AllergyType
     * - chef: Deserialize Inhabitant with dinnerPreferences JSON string
     * - cookingTeam: Deserialize CookingTeam with affinity and assignments
     * - tickets: Transform to include ticketType (flattened from ticketPrice) and dinnerEvent reference
     */
    function deserializeDinnerEventDetail(
        prismaEvent: Record<string, unknown>,
        withPortions: (ticketPrice: PortionTicket) => PortionTicket & {portions: number}
    ): Record<string, unknown> {
        const {allergens, expenses: expenseRows, ...event} = prismaEvent as DinnerEventRow
        const totalCost = sumAmounts(expenseRows)
        const chef = prismaEvent.chef as Record<string, unknown> | null | undefined
        const cookingTeam = prismaEvent.cookingTeam as Record<string, unknown> | null | undefined
        const tickets = prismaEvent.tickets as Array<Record<string, unknown>> | undefined

        // Build dinnerEvent reference for tickets (excludes tickets to avoid circular ref)
        const dinnerEventForTickets = {
            id: prismaEvent.id,
            date: prismaEvent.date,
            menuTitle: prismaEvent.menuTitle,
            menuDescription: prismaEvent.menuDescription,
            menuPictureUrl: prismaEvent.menuPictureUrl,
            state: prismaEvent.state,
            totalCost,
            chefId: prismaEvent.chefId,
            cookingTeamId: prismaEvent.cookingTeamId,
            heynaboEventId: prismaEvent.heynaboEventId,
            seasonId: prismaEvent.seasonId,
            createdAt: prismaEvent.createdAt,
            updatedAt: prismaEvent.updatedAt
        }

        return {
            ...event,
            totalCost,
            expenses: (expenseRows ?? []).map(deserializeExpense),
            allergens: allergens ? allergens.map((a) => a.allergyType) : [],
            chef: chef ? deserializeInhabitantDisplay(chef) : null,
            cookingTeam: cookingTeam ? deserializeCookingTeamDisplay(cookingTeam) : null,
            tickets: tickets?.map(ticket => {
                const ticketPrice = ticket.ticketPrice as (PortionTicket & Record<string, unknown>) | null | undefined
                return {
                    ...ticket,
                    // Flatten ticketType from ticketPrice relation (null when TicketPrice deleted)
                    ticketType: ticketPrice?.ticketType ?? null,
                    ticketPrice: ticketPrice ? withPortions(ticketPrice) : ticketPrice,
                    // Add parent dinnerEvent reference
                    dinnerEvent: dinnerEventForTickets,
                    inhabitant: ticket.inhabitant
                        ? deserializeInhabitantWithAllergies(ticket.inhabitant as Record<string, unknown>)
                        : ticket.inhabitant
                }
            }) ?? []
        }
    }

    // ============================================================================
    // HEYNABO EVENT SYNC (ADR-013)
    // ============================================================================

    /**
     * Heynabo event price structure
     */
    const HeynaboEventPriceSchema = z.object({
        adult: z.number().int().min(0),
        child: z.number().int().min(0),
        taxIncluded: z.boolean()
    })

    /**
     * Heynabo event status - maps to their API
     * NOTE: Heynabo uses American spelling "CANCELED" (one L) per ADR-013
     */
    const HeynaboEventStatusSchema = z.enum(['PUBLISHED', 'DRAFT', 'CANCELED'])

    /**
     * Schema for creating/updating a Heynabo event (outgoing payload)
     * Based on Heynabo API structure from docs/heynabo_api_samples/heynabo.json
     */
    const HeynaboEventCreateSchema = z.object({
        name: z.string().max(200),
        type: z.string().nullable(),
        description: z.string().max(2000),
        start: z.string(), // ISO 8601 datetime with timezone
        end: z.string(),   // ISO 8601 datetime with timezone
        status: HeynaboEventStatusSchema,
        groupId: IdSchema.nullable(),
        price: HeynaboEventPriceSchema,
        public: z.boolean(),
        locationText: z.string().max(100),
        locationId: IdSchema.nullable(),
        minParticipants: z.number().int().positive().nullable(),
        maxParticipants: z.number().int().positive().nullable(),
        guestsAllowed: z.boolean(),
        takeAwayAllowed: z.boolean(),
        vegetarian: z.boolean(),
        commentsAllowed: z.boolean(),
        visibleToEveryone: z.boolean()
    })

    // ============================================================================
    // ORDER FOR TRANSACTION (batch operation - lean schema per ADR-009)
    // ============================================================================

    /**
     * Lean order schema for transaction creation batch operations
     * Only includes fields needed for transaction snapshots (ADR-009: batch = lean)
     */
    const OrderForTransactionSchema = z.object({
        id: IdSchema,
        dinnerEventId: IdSchema,
        inhabitantId: IdSchema,
        bookedByUserId: IdSchema.nullable(),
        ticketType: TicketTypeSchema.nullable(),
        priceAtBooking: z.number().int(),
        dinnerMode: DinnerModeSchema,
        state: OrderStateSchema,
        closedAt: z.coerce.date().nullable(),
        bookedByUser: z.object({
            id: IdSchema,
            email: z.string()
        }).nullable(),
        inhabitant: z.object({
            id: IdSchema,
            name: z.string(),
            lastName: z.string(),
            householdId: IdSchema,
            // Household billing data (frozen in snapshot for immutability)
            household: z.object({
                id: IdSchema,
                pbsId: z.number().int(),
                address: z.string()
            })
        }),
        dinnerEvent: z.object({
            id: IdSchema,
            date: z.coerce.date(),
            menuTitle: z.string()
        }),
        // Guest ticket flag - preserved in transaction snapshot for billing display
        isGuestTicket: z.boolean().default(false)
    })

    // ============================================================================
    // SCAFFOLD PRE-BOOKINGS RESULT
    // ============================================================================

    // A queued entry's place in the line of its ticket type on a dinner; the type is null when the entry's price is gone
    const QueuePositionSchema = z.object({
        inhabitantId: IdSchema,
        dinnerEventId: IdSchema,
        isGuestTicket: z.boolean(),
        position: z.number().int().positive(),
        ticketType: TicketTypeSchema.nullable()
    })

    // A wish joined a dinner's waiting list
    const WaitlistJoinedSchema = z.object({
        dinnerEventId: IdSchema,
        inhabitantId: IdSchema,
        bookedByUserId: IdSchema,
        position: z.number().int().positive(),
        ticketType: TicketTypeSchema.nullable(),
        queueSize: z.number().int().positive(),
        portionNeed: z.number().nonnegative()
    })

    // A released ticket got a new owner: an inhabitant bought it, or the first in its ticket type's line got it
    const TicketSaleSchema = z.object({
        dinnerEventId: IdSchema,
        ticketPriceId: IdSchema,
        buyerInhabitantId: IdSchema,
        buyerHouseholdId: IdSchema,
        sellerHouseholdId: IdSchema
    })

    // The chef's extra portion went to a waiting entry: a regular order at the price written at join
    const WaitlistAssignedSchema = z.object({
        entryId: IdSchema,
        inhabitantId: IdSchema,
        isGuestTicket: z.boolean(),
        portions: z.number().nonnegative(),
        orderId: IdSchema,
        ticketPriceId: IdSchema
    })

    // What one scaffold run did that its caller notifies about, one list per event; a run that finishes another run's
    // stopped extra portion reports it with its dinner
    const BookingOutcomesSchema = z.object({
        joined: z.array(WaitlistJoinedSchema),
        ticketsSold: z.array(TicketSaleSchema),
        waitlistTicketsSold: z.array(TicketSaleSchema),
        waitlistPortionsAssigned: z.array(WaitlistAssignedSchema.extend({dinnerEventId: IdSchema}))
    })

    // The generator's buckets: the reconciler's four, the claim, and a queue entry's leave and requeue
    const OrderBucketSchema = z.enum([...ReconciliationBucketSchema.options, 'claim', 'leave', 'requeue'])

    // What a booking does to one order: the preview shows it before, the reply reports it after
    const BookingActionSchema = z.enum(['BOOK', 'CANCEL', 'RELEASE', 'RECLAIM', 'BUY', 'QUEUE', 'LEAVE', 'REQUEUE', 'CHANGE_PRICE', 'CHANGE_MODE'])
    const Action = BookingActionSchema.enum

    // What a save does to the supply, which names its button: a bucket with no supply effect changes the mode
    const BookingOutcomeSchema = BookingActionSchema.extract([Action.BOOK, Action.BUY, Action.QUEUE, Action.LEAVE, Action.REQUEUE, Action.CHANGE_MODE])

    // ============================================================================
    // TICKET CHANGES - the dinner's order history replayed for the chef (ADR-009 operation result)
    // ============================================================================

    const TicketCountsSchema = z.object({
        [TicketTypeSchema.enum.ADULT]: z.number().int(),
        [TicketTypeSchema.enum.CHILD]: z.number().int(),
        [TicketTypeSchema.enum.BABY]: z.number().int()
    })

    // What a ticket event does: a booking action, the admin's deletion after the booking deadline, the chef's extra
    // portions for the waiting list, or the nightly close
    const TicketChangeKindSchema = z.enum([...BookingActionSchema.options, 'ADMIN_CANCEL', 'EXTRA_PORTIONS', 'CLOSE'])

    // The tickets one event touched by type; a ticket type change also names the tickets it changed from, a sale the
    // short name of the household it bought from
    const TicketEventSchema = z.object({
        change: TicketChangeKindSchema,
        tickets: TicketCountsSchema,
        from: TicketCountsSchema.optional(),
        seller: z.string().nullable().optional()
    })

    /**
     * One line of the dinner's ticket changes: the ticket events of one actor within one minute and the households they
     * touched, then the tickets the dinner is paid for, their kuverter and the revenue in øre after it. A row without an
     * actor is the system user's.
     */
    const TicketChangeSchema = z.object({
        id: IdSchema,
        timestamp: z.coerce.date(),
        performedByUserId: IdSchema,
        bySystem: z.boolean(),
        households: z.array(z.string()),
        events: z.array(TicketEventSchema).min(1),
        counts: TicketCountsSchema,
        portions: z.number(),
        revenue: z.number().int()
    })

    // GET /api/chef/dinner/[id]/order-history: newest first; `olderCount` counts the changes before `since`
    const TicketChangesResponseSchema = z.object({
        dinnerEventId: IdSchema,
        since: z.coerce.date().nullable(),
        changes: z.array(TicketChangeSchema),
        olderCount: z.number().int().min(0)
    })

    // One order's result in a scaffold run: who, the ticket type, which dinner, the eating mode and the action; the ticket
    // type groups a booker's guests and is null when the order's price is gone
    const BookingResultSchema = z.object({
        inhabitantId: IdSchema,
        inhabitantName: z.string(),
        isGuestTicket: z.boolean(),
        ticketType: TicketTypeSchema.nullable(),
        dinnerEventId: IdSchema,
        dinnerMode: DinnerModeSchema,
        action: BookingActionSchema,
        reason: BookingFailureSchema.optional()                     // A failed order's, when the failure has one
    })

    // The orders of a run per action, every action present
    const BookingTotalsSchema = z.record(BookingActionSchema, z.number().int().nonnegative())

    // What a scaffold run did, as the endpoints that scaffold reply it
    const ScaffoldResultSchema = z.object({
        seasonId: IdSchema.nullable(),
        totals: BookingTotalsSchema,
        positions: z.array(QueuePositionSchema).default([]),        // The place in the dinner's queue of each queued entry
        unchanged: z.number().int().nonnegative(),
        households: z.number().int().nonnegative(),
        errored: z.number().int().nonnegative().default(0),          // The failed orders and the households whose run failed as a whole
        results: z.array(BookingResultSchema),                       // Each order that landed, in a run scoped to one household
        failed: z.array(BookingResultSchema),                        // Each order that failed
        outcomes: BookingOutcomesSchema.default({joined: [], ticketsSold: [], waitlistTicketsSold: [], waitlistPortionsAssigned: []})
    })

    /**
     * Operation result for inhabitant update with preference re-scaffolding
     * ADR-009: Operation result type (not entity type)
     */
    const {InhabitantDetailSchema, HouseholdDetailSchema} = useCoreValidation()
    const InhabitantUpdateResponseSchema = z.object({
        inhabitant: InhabitantDetailSchema,
        scaffoldResult: ScaffoldResultSchema
    })

    /**
     * Operation result for household update with move-out date re-scaffolding
     * ADR-009: Operation result type (not entity type)
     */
    const HouseholdUpdateResponseSchema = z.object({
        household: HouseholdDetailSchema,
        scaffoldResult: ScaffoldResultSchema
    })

    // Operation result of POST /api/admin/season/[id]/assign-cooking-teams (ADR-009)
    const AssignCookingTeamsResponseSchema = z.object({
        seasonId: IdSchema,
        eventCount: z.number().int().min(0),
        events: z.array(DinnerEventDisplaySchema)
    })

    // ============================================================================
    // UNIFIED BOOKING SCAFFOLD (ADR-016)
    // Every household booking write goes through the scaffolder, the claim and the queue included
    // ============================================================================

    /**
     * Desired order - unified schema for all booking types
     * - orderId: Present for updates (existing order), absent for creates (new order)
     * - waitlistEntryId: Present for the household's queue entry (leave, requeue), absent otherwise
     * - state: Generator sets based on intent (BOOKED for eating, RELEASED for release)
     * - ticketPriceId: Required, UI sends the price shown to user
     * - allergyTypeIds: guest allergies (inhabitants have allergies via Allergy table)
     */
    const DesiredOrderSchema = OrderDisplaySchema.pick({
        inhabitantId: true,
        dinnerEventId: true,
        dinnerMode: true,
        isGuestTicket: true,
        state: true
    }).extend({
        orderId: IdSchema.optional(),
        waitlistEntryId: IdSchema.optional(),
        ticketPriceId: IdSchema,
        allergyTypeIds: IdSchema.array().optional()
    })

    /**
     * Scaffold orders request - unified booking endpoint
     * POST /api/household/order/scaffold
     *
     * Use cases:
     * - UC1: Single inhabitant booking
     * - UC2: Power mode (all inhabitants same mode)
     * - UC3: Grid booking (multiple dinners)
     * - UC4: Add guest (isGuestTicket=true)
     * - UC5: Release ticket (NONE after deadline)
     *
     * Audit context derived server-side:
     * - performedByUserId = session user
     * - action = USER_BOOKED or USER_CANCELLED
     * - source = 'user-booking'
     */
    const ScaffoldOrdersRequestSchema = z.object({
        householdId: IdSchema,
        seasonId: IdSchema.optional(),
        dinnerEventIds: IdSchema.array().min(1),
        orders: z.array(DesiredOrderSchema)
    })

    /**
     * Scaffold orders response - returns result
     */
    const ScaffoldOrdersResponseSchema = z.object({
        householdId: IdSchema,
        scaffoldResult: ScaffoldResultSchema
    })

    /**
     * Guest booking form - UI form validation schema
     * Used by GuestBookingForm component for UForm validation
     * Uses z.coerce for HTML input string → number conversion
     */
    const GuestBookingFormSchema = z.object({
        count: z.coerce.number({error: 'Indtast antal gæster'})
            .int({message: 'Skal være et helt tal'})
            .min(1, {message: 'Minimum 1 gæst'})
            .max(10, {message: 'Maximum 10 gæster'}),
        ticketPriceId: z.coerce.number({error: 'Vælg en billettype'})
            .int()
            .positive({message: 'Vælg en billettype'}),
        allergyTypeIds: z.array(z.coerce.number().int().positive()).default([]),
        dinnerMode: DinnerModeSchema.refine(
            mode => mode !== DinnerModeSchema.enum.NONE,
            {message: 'Gæster skal vælge en spisemåde'}
        )
    })

    // ============================================================================
    // Query Parameter Normalization
    // ============================================================================

    /**
     * Normalize query param to array of positive integers
     * Handles: undefined→[], single number→[n], array→[n,...]
     * Used for endpoints accepting 0, 1, or many IDs (e.g., dinnerEventIds)
     */
    const IdOrIdsSchema = z.union([
        z.coerce.number().int().positive().transform(n => [n]),
        z.array(z.coerce.number().int().positive())
    ]).optional().default([]).transform(v => v ?? [])

    // ============================================================================
    // Daily Maintenance Result Schemas
    // ============================================================================

    /**
     * Result of consumeDinners operation
     * Marks past ANNOUNCED dinners as CONSUMED
     */
    const ConsumeResultSchema = z.object({
        consumed: z.number().int().nonnegative()
    })

    /**
     * Result of closeOrders operation
     * Marks BOOKED orders on CONSUMED dinners as CLOSED
     */
    const CloseOrdersResultSchema = z.object({
        closed: z.number().int().nonnegative()
    })

    /**
     * Result of createTransactions operation
     * Creates transactions for CLOSED orders without one
     */
    const CreateTransactionsResultSchema = z.object({
        created: z.number().int().nonnegative()
    })

    /**
     * Result of initPreferences operation
     * Initializes NULL dinner preferences for new inhabitants
     */
    const InitPreferencesResultSchema = z.object({
        initialized: z.number().int().nonnegative()
    })

    // Result of clearing the queues of consumed dinners: the entries removed, and each dinner's share by date
    const ClearWaitlistResultSchema = z.object({
        cleared: z.number().int().nonnegative(),
        dinners: z.array(z.object({dinnerEventId: IdSchema, date: z.coerce.date(), cleared: z.number().int().positive()})).default([])
    })

    /**
     * Combined result of daily maintenance endpoint
     * Includes jobRunId for observability and parallel-safe test assertions
     */
    const DailyMaintenanceResultSchema = z.object({
        jobRunId: IdSchema,
        consume: ConsumeResultSchema,
        close: CloseOrdersResultSchema,
        transact: CreateTransactionsResultSchema,
        clearWaitlist: ClearWaitlistResultSchema.default({cleared: 0, dinners: []}),
        initPrefs: InitPreferencesResultSchema.default({initialized: 0}),
        scaffold: ScaffoldResultSchema.nullable()
    })

    /**
     * Schema for Heynabo event response (incoming from API)
     * Note: API returns id as string, some fields may be omitted
     */
    const HeynaboEventResponseSchema = z.object({
        id: z.coerce.number().int().positive(),
        name: z.string().optional(),
        start: z.string().optional(), // ISO 8601 with timezone offset
        end: z.string().optional(),   // ISO 8601 with timezone offset
        imageUrl: z.url().nullable().optional(),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional()
    })

    // What a booking row can do: book before the deadline, or claim after it (a released ticket, else a place in the queue)
    const BookingRowActionSchema = z.enum(['process', 'claim'])

    return {
        // Enums
        OrderStateSchema,
        TicketTypeSchema,
        DinnerStateSchema,
        DinnerModeSchema,

        // DinnerEvent
        DinnerEventDisplaySchema,
        DinnerEventInfoSchema,
        DinnerEventDetailSchema,
        TicketCountsSchema,
        TicketChangeKindSchema,
        TicketStateSchema,
        SupplyStateSchema,
        BookingFailureSchema,
        TicketEventSchema,
        TicketChangeSchema,
        TicketChangesResponseSchema,
        AuditTicketSchema,
        readAuditTicket,
        DinnerEventCreateSchema,
        DinnerEventUpdateSchema,
        ChefMenuFormSchema,

        // Order
        OrderDisplaySchema,
        OrderDetailSchema,
        OrderCreateSchema,
        AssignRoleSchema,
        MenuSwapStrategySchema,
        RemoveRoleRequestSchema,
        OrderQuerySchema,

        // OrderHistory
        OrderHistoryDisplaySchema,
        OrderHistoryDetailSchema,
        OrderHistoryCreateSchema,
        OrderSnapshotSchema,
        createOrderAuditData,
        isGuestTicketAudit,
        deserializeOrderAuditData,

        // Batch Order Creation
        OrderAuditActionSchema,
        OrderAuditSourceSchema,
        AuditContextSchema,
        OrderCreateWithPriceSchema,
        OrdersBatchSchema,
        CreateOrdersResultSchema,
        ORDER_BATCH_SIZE,
        DELETE_BATCH_SIZE,
        chunkOrderBatch,
        chunkDeleteBatch,
        chunkFetchIds,

        // Transaction Creation (lean batch schema - ADR-009)
        OrderForTransactionSchema,

        // Serialization
        SerializedOrderSchema,
        SerializedOrderHistoryDisplaySchema,
        serializeOrder,
        deserializeOrder,
        serializeOrderHistoryDisplay,
        deserializeOrderHistoryDisplay,

        // Transformation (ADR-010)
        deserializeDinnerEvent,
        deserializeDinnerEventDetail,

        // Heynabo Event Sync (ADR-013)
        HeynaboEventCreateSchema,
        HeynaboEventResponseSchema,
        HeynaboEventStatusSchema,

        // Scaffold Pre-bookings
        ScaffoldResultSchema,
        WaitlistJoinedSchema,
        TicketSaleSchema,
        WaitlistAssignedSchema,
        BookingOutcomesSchema,
        QueuePositionSchema,
        InhabitantUpdateResponseSchema,
        HouseholdUpdateResponseSchema,
        AssignCookingTeamsResponseSchema,

        // Unified Booking Scaffold (ADR-016)
        DesiredOrderSchema,
        ScaffoldOrdersRequestSchema,
        ScaffoldOrdersResponseSchema,
        GuestBookingFormSchema,

        // Daily Maintenance
        ConsumeResultSchema,
        CloseOrdersResultSchema,
        CreateTransactionsResultSchema,
        InitPreferencesResultSchema,
        ClearWaitlistResultSchema,
        DailyMaintenanceResultSchema,

        BookingRowActionSchema,

        // Booking plan and results
        OrderBucketSchema,
        BookingActionSchema,
        BookingOutcomeSchema,
        BookingResultSchema,
        BookingTotalsSchema,

        // Query Parameter Normalization
        IdOrIdsSchema
    }
}

// ============================================================================
// Type Exports
// ============================================================================

// Enums
export type DinnerState = z.infer<ReturnType<typeof useBookingValidation>['DinnerStateSchema']>
export type DinnerMode = z.infer<ReturnType<typeof useBookingValidation>['DinnerModeSchema']>
export type OrderState = z.infer<ReturnType<typeof useBookingValidation>['OrderStateSchema']>
export type TicketType = z.infer<ReturnType<typeof useBookingValidation>['TicketTypeSchema']>
export type TicketState = z.infer<ReturnType<typeof useBookingValidation>['TicketStateSchema']>
export type SupplyState = z.infer<ReturnType<typeof useBookingValidation>['SupplyStateSchema']>
export type BookingFailure = z.infer<ReturnType<typeof useBookingValidation>['BookingFailureSchema']>

// DinnerEvent
export type DinnerEventDisplay = z.infer<ReturnType<typeof useBookingValidation>['DinnerEventDisplaySchema']>
export type DinnerEventInfo = z.infer<ReturnType<typeof useBookingValidation>['DinnerEventInfoSchema']>
export type DinnerEventDetail = z.infer<ReturnType<typeof useBookingValidation>['DinnerEventDetailSchema']>
export type DinnerEventCreate = z.infer<ReturnType<typeof useBookingValidation>['DinnerEventCreateSchema']>
export type DinnerEventUpdate = z.infer<ReturnType<typeof useBookingValidation>['DinnerEventUpdateSchema']>
export type TicketCounts = z.infer<ReturnType<typeof useBookingValidation>['TicketCountsSchema']>
export type TicketChangeKind = z.infer<ReturnType<typeof useBookingValidation>['TicketChangeKindSchema']>
export type TicketEvent = z.infer<ReturnType<typeof useBookingValidation>['TicketEventSchema']>
export type TicketChange = z.infer<ReturnType<typeof useBookingValidation>['TicketChangeSchema']>
export type TicketChangesResponse = z.infer<ReturnType<typeof useBookingValidation>['TicketChangesResponseSchema']>
export type AuditTicket = z.infer<ReturnType<typeof useBookingValidation>['AuditTicketSchema']>
export type ChefMenuForm = z.infer<ReturnType<typeof useBookingValidation>['ChefMenuFormSchema']>

// Order
export type OrderDisplay = z.infer<ReturnType<typeof useBookingValidation>['OrderDisplaySchema']>
export type OrderDetail = z.infer<ReturnType<typeof useBookingValidation>['OrderDetailSchema']>
export type OrderCreate = z.infer<ReturnType<typeof useBookingValidation>['OrderCreateSchema']>
export type AssignRole = z.infer<ReturnType<typeof useBookingValidation>['AssignRoleSchema']>
export type MenuSwapStrategy = z.infer<ReturnType<typeof useBookingValidation>['MenuSwapStrategySchema']>
export type OrderQuery = z.infer<ReturnType<typeof useBookingValidation>['OrderQuerySchema']>
export type OrderHistoryDisplay = z.infer<ReturnType<typeof useBookingValidation>['OrderHistoryDisplaySchema']>
export type OrderHistoryDetail = z.infer<ReturnType<typeof useBookingValidation>['OrderHistoryDetailSchema']>
export type OrderHistoryCreate = z.infer<ReturnType<typeof useBookingValidation>['OrderHistoryCreateSchema']>
export type OrderSnapshot = z.infer<ReturnType<typeof useBookingValidation>['OrderSnapshotSchema']>
export type SerializedOrder = z.infer<ReturnType<typeof useBookingValidation>['SerializedOrderSchema']>
export type SerializedOrderHistoryDisplay = z.infer<ReturnType<typeof useBookingValidation>['SerializedOrderHistoryDisplaySchema']>

// Orders Creation (Bulk)
export type OrderAuditAction = z.infer<ReturnType<typeof useBookingValidation>['OrderAuditActionSchema']>
export type AuditContext = z.infer<ReturnType<typeof useBookingValidation>['AuditContextSchema']>
export type OrderAuditSource = z.infer<ReturnType<typeof useBookingValidation>['OrderAuditSourceSchema']>
export type OrderCreateWithPrice = z.infer<ReturnType<typeof useBookingValidation>['OrderCreateWithPriceSchema']>
export type OrdersBatch = z.infer<ReturnType<typeof useBookingValidation>['OrdersBatchSchema']>
export type CreateOrdersResult = z.infer<ReturnType<typeof useBookingValidation>['CreateOrdersResultSchema']>

// Transaction Creation (lean batch schema - ADR-009)
export type OrderForTransaction = z.infer<ReturnType<typeof useBookingValidation>['OrderForTransactionSchema']>

// Heynabo Event Sync (ADR-013)
export type HeynaboEventCreate = z.infer<ReturnType<typeof useBookingValidation>['HeynaboEventCreateSchema']>
export type HeynaboEventResponse = z.infer<ReturnType<typeof useBookingValidation>['HeynaboEventResponseSchema']>
export type HeynaboEventStatus = z.infer<ReturnType<typeof useBookingValidation>['HeynaboEventStatusSchema']>

// Scaffold Pre-bookings
export type ScaffoldResult = z.infer<ReturnType<typeof useBookingValidation>['ScaffoldResultSchema']>
export type QueuePosition = z.infer<ReturnType<typeof useBookingValidation>['QueuePositionSchema']>
export type WaitlistJoined = z.infer<ReturnType<typeof useBookingValidation>['WaitlistJoinedSchema']>
export type TicketSale = z.infer<ReturnType<typeof useBookingValidation>['TicketSaleSchema']>
export type BookingOutcomes = z.infer<ReturnType<typeof useBookingValidation>['BookingOutcomesSchema']>
export type InhabitantUpdateResponse = z.infer<ReturnType<typeof useBookingValidation>['InhabitantUpdateResponseSchema']>
export type HouseholdUpdateResponse = z.infer<ReturnType<typeof useBookingValidation>['HouseholdUpdateResponseSchema']>

// Unified Booking Scaffold (ADR-016)
export type DesiredOrder = z.infer<ReturnType<typeof useBookingValidation>['DesiredOrderSchema']>
export type ScaffoldOrdersRequest = z.infer<ReturnType<typeof useBookingValidation>['ScaffoldOrdersRequestSchema']>
export type ScaffoldOrdersResponse = z.infer<ReturnType<typeof useBookingValidation>['ScaffoldOrdersResponseSchema']>
export type GuestBookingFormData = z.infer<ReturnType<typeof useBookingValidation>['GuestBookingFormSchema']>

// Daily Maintenance
export type ConsumeResult = z.infer<ReturnType<typeof useBookingValidation>['ConsumeResultSchema']>
export type CloseOrdersResult = z.infer<ReturnType<typeof useBookingValidation>['CloseOrdersResultSchema']>
export type CreateTransactionsResult = z.infer<ReturnType<typeof useBookingValidation>['CreateTransactionsResultSchema']>
export type InitPreferencesResult = z.infer<ReturnType<typeof useBookingValidation>['InitPreferencesResultSchema']>
export type DailyMaintenanceResult = z.infer<ReturnType<typeof useBookingValidation>['DailyMaintenanceResultSchema']>
export type ClearWaitlistResult = z.infer<ReturnType<typeof useBookingValidation>['ClearWaitlistResultSchema']>

export type BookingRowAction = z.infer<ReturnType<typeof useBookingValidation>['BookingRowActionSchema']>

// Booking plan and results
export type OrderBucket = z.infer<ReturnType<typeof useBookingValidation>['OrderBucketSchema']>
export type BookingAction = z.infer<ReturnType<typeof useBookingValidation>['BookingActionSchema']>
export type BookingOutcome = z.infer<ReturnType<typeof useBookingValidation>['BookingOutcomeSchema']>
export type BookingResult = z.infer<ReturnType<typeof useBookingValidation>['BookingResultSchema']>
export type BookingTotals = z.infer<ReturnType<typeof useBookingValidation>['BookingTotalsSchema']>
