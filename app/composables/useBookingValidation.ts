import {z} from 'zod'
import {
    TicketTypeSchema,
    OrderStateSchema,
    DinnerStateSchema,
    DinnerModeSchema,
    TicketPriceSchema as _TicketPriceSchema,
    RoleSchema,
    OrderAuditActionSchema
} from '~~/prisma/generated/zod'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import {useCoreValidation} from '~/composables/useCoreValidation'
import {useTicketPriceValidation} from '~/composables/useTicketPriceValidation'
import {useAllergyValidation} from '~/composables/useAllergyValidation'
import {chunkArray} from '~/utils/batchUtils'

export const DinnerMode = DinnerModeSchema.enum
export const DinnerState = DinnerStateSchema.enum
export const OrderState = OrderStateSchema.enum
export const OrderAuditAction = OrderAuditActionSchema.enum

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
    const {TicketPriceSchema: _TicketPriceSchema} = useTicketPriceValidation()
    const {AllergyTypeDisplaySchema, InhabitantWithAllergiesSchema} = useAllergyValidation()

    // ============================================================================
    // DINNER EVENT (Base + Display schemas - defined first for Order to reference)
    // ============================================================================

    // all scalar fields
    const DinnerEventBaseSchema = z.object({
        date: z.coerce.date(),
        menuTitle: z.string().max(500, "Menu titel må ikke være længere end 500 tegn"),
        menuDescription: z.string().max(500).nullable(),
        menuPictureUrl: z.string().url().nullable(),
        state: DinnerStateSchema,
        totalCost: z.number().int().min(0),
        chefId: z.number().int().positive().nullable(),
        cookingTeamId: z.number().int().positive().nullable(),
        heynaboEventId: z.number().int().positive().nullable(),
        seasonId: z.number().int().positive().nullable(),
        createdAt: z.coerce.date(),
        updatedAt: z.coerce.date(),
        allergens: z.array(AllergyTypeDisplaySchema).optional()
    })

    /**
     * DinnerEvent Display - all scalars fields for index endpoints (GET /api/admin/dinner-event)
     * ADR-009: Lightweight, display-ready data for lists/calendar
     */
    const DinnerEventDisplaySchema = DinnerEventBaseSchema.extend({
        id: z.number().int().positive()
    })

    /**
     * DinnerEvent Create - For API input validation (PUT /api/admin/dinner-event)
     */
    const DinnerEventCreateSchema = DinnerEventBaseSchema

    /**
     * DinnerEvent Update - For API input validation (POST /api/admin/dinner-event/[id])
     * Note: id is optional in body since it comes from URL path
     */
    const DinnerEventUpdateSchema = DinnerEventBaseSchema.partial()

    /**
     * Chef Menu Form - For chef UI form validation
     * Derived from DinnerEventBaseSchema with stricter validation for user input
     */
    const ChefMenuFormSchema = z.object({
        menuTitle: z.string()
            .min(1, 'Menu titel er påkrævet')
            .max(500, 'Menu titel må maks være 500 tegn'),
        menuDescription: z.string().max(500, 'Beskrivelse må maks være 500 tegn').nullable(),
        totalCost: z.number().int().min(0, 'Indkøbsomkostninger kan ikke være negative')
    })

    // ============================================================================
    // ORDER (defined after DinnerEventDisplaySchema so it can reference it)
    // ============================================================================

    const OrderBaseSchema = z.object({
        dinnerEventId: z.number().int().positive(),
        inhabitantId: z.number().int().positive(),
        bookedByUserId: z.number().int().positive().nullable(),
        ticketPriceId: z.number().int().positive(),
        priceAtBooking: z.number().int(),
        dinnerMode: DinnerModeSchema,
        state: OrderStateSchema,
        releasedAt: z.coerce.date().nullable(),
        closedAt: z.coerce.date().nullable(),
        createdAt: z.coerce.date(),
        updatedAt: z.coerce.date()
    })

    /**
     * Order Display - Minimal for index endpoints (GET /api/order), all scalar fields
     * ADR-009: Lightweight with flattened ticketType
     */
    const OrderDisplaySchema = OrderBaseSchema.extend({
        id: z.number().int().positive(),
        ticketType: TicketTypeSchema // Flattened from ticketPrice relation (ADR-009)
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
            id: z.number().int().positive(),
            email: z.string()
        }).nullable(),
        // TicketPrice relation
        ticketPrice: z.object({
            id: z.number().int().positive(),
            ticketType: TicketTypeSchema,
            price: z.number().int(),
            description: z.string().nullable()
        })
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
        tickets: z.array(OrderDetailSchema).optional()
    })

    /**
     * Order Create - Repository layer (used internally)
     */
    const OrderCreateSchema = z.object({
        dinnerEventId: z.number().int().positive(),
        inhabitantId: z.number().int().positive(),
        bookedByUserId: z.number().int().positive().nullable().optional(),
        ticketPriceId: z.number().int().positive(),
        priceAtBooking: z.number().int().optional(),
        dinnerMode: DinnerModeSchema,
        state: OrderStateSchema
    })

    // ============================================================================
    // BULK ORDER CREATION (ADR-009 compliant)
    // ============================================================================

    /**
     * Audit context for order creation - used for OrderHistory entries
     * Uses OrderAuditActionSchema from generated Prisma Zod types (ADR-001)
     */
    const AuditContextSchema = z.object({
        action: OrderAuditActionSchema,
        performedByUserId: z.number().int().positive().nullable(),
        source: z.string().min(1)
    })

    /**
     * Order with price and household - for batch creation
     * Extends OrderCreateSchema with required fields for batch operations:
     * - householdId: Required for same-household validation (Zod validates)
     * - priceAtBooking: Required (caller enriches from ticket prices, can be 0 for free tickets)
     */
    const OrderCreateWithPriceSchema = OrderCreateSchema.extend({
        householdId: z.number().int().positive(),
        priceAtBooking: z.number().int().nonnegative()  // Override to required, allows 0 for free tickets
    })

    // D1 constraint: max 100 bound params per query
    // Order insert: 7 params (dinnerEventId, inhabitantId, bookedByUserId, ticketPriceId, priceAtBooking, dinnerMode, state)
    // Max: 100 / 7 ≈ 14 orders, using 12 for safety margin
    const ORDER_BATCH_SIZE = 12

    // Delete operations use 1 param per ID, but keeping same batch size for consistency
    // and to avoid long-running queries that could timeout
    const DELETE_BATCH_SIZE = 50

    // Local type for batch chunking (avoids circular reference with exported type)
    type _OrderCreateWithPrice = z.infer<typeof OrderCreateWithPriceSchema>

    // Curried chunk function for order batches
    const chunkOrderBatch = chunkArray<_OrderCreateWithPrice>(ORDER_BATCH_SIZE)

    // Curried chunk function for ID arrays (used for batch deletes)
    const chunkIds = chunkArray<number>(DELETE_BATCH_SIZE)

    /**
     * Batch of orders for batch creation - validates business rules:
     * - Array size: 1-ORDER_BATCH_SIZE orders (D1 bound param limit)
     * - Same household: All orders must have same householdId
     */
    const OrdersBatchSchema = z.array(OrderCreateWithPriceSchema)
        .min(1, 'Mindst én ordre er påkrævet')
        .max(ORDER_BATCH_SIZE, `Maksimalt ${ORDER_BATCH_SIZE} ordrer per batch (D1 grænse)`)
        .refine(
            orders => new Set(orders.map(o => o.householdId)).size === 1,
            { message: 'Alle ordrer skal være fra samme husstand' }
        )

    /**
     * Result of bulk order creation
     */
    const CreateOrdersResultSchema = z.object({
        householdId: z.number().int().positive(),
        createdIds: z.array(z.number().int().positive())
    })

    /**
     * Batch order creation request (PUT /api/order)
     * Business rules:
     * - ONE user (bookedByUserId) books for entire family
     * - Can have different inhabitantIds (family members + guests)
     * - Can have multiple orders for same inhabitantId (e.g., adult + child tickets)
     * - All bookedByUserId must be the same (VALIDATED HERE, skipped if empty)
     * - All inhabitants must belong to householdId (VALIDATED IN ENDPOINT)
     */
    const CreateOrdersRequestSchema = z.object({
        householdId: z.number().int().positive(),
        dinnerEventId: z.number().int().positive(),
        orders: z.array(z.object({
            inhabitantId: z.number().int().positive(),
            ticketPriceId: z.number().int().positive(),
            dinnerMode: DinnerModeSchema,
            bookedByUserId: z.number().int().positive()
        }))
    }).refine(
        (data) => {
            // Business rule: All orders must have same bookedByUserId (single parent booking)
            // Skip validation if no orders (empty array is valid - graceful no-op)
            if (data.orders.length === 0) return true
            const userIds = [...new Set(data.orders.map(o => o.bookedByUserId))]
            return userIds.length === 1
        },
        {
            message: "Alle ordrer skal være booket af samme bruger (én forælder booker for familien)",
            path: ["orders"]
        }
    )



    /**
     * Order swap request (POST /api/order/swap)
     */
    const SwapOrderRequestSchema = z.object({
        inhabitantId: z.number().int().positive()
    })

    /**
     * Assign role to dinner event (POST /api/admin/dinner-event/[id]/assign-role)
     * Used for "Bliv chefkok", "Bliv kok", "Bliv kokkespire" buttons
     */
    const AssignRoleSchema = z.object({
        inhabitantId: z.number().int().positive('Inhabitant ID must be a positive integer'),
        role: RoleSchema
    })

    /**
     * Order query filters (GET /api/order?...)
     */
    const OrderQuerySchema = z.object({
        state: OrderStateSchema.optional(),
        fromDate: z.coerce.date().optional(),
        toDate: z.coerce.date().optional()
    })

    /**
     * OrderHistory Display - lightweight for lists (ADR-009)
     * Scalars only, no nested Order relation
     * Includes denormalized fields for cancellation queries (orderId becomes NULL after deletion)
     */
    const OrderHistoryDisplaySchema = z.object({
        id: z.number().int().positive(),
        orderId: z.number().int().positive().nullable(),
        action: OrderAuditActionSchema,
        performedByUserId: z.number().int().positive().nullable(),
        auditData: z.string(),
        timestamp: z.coerce.date(),
        // Denormalized fields for cancellation queries
        inhabitantId: z.number().int().positive().nullable(),
        dinnerEventId: z.number().int().positive().nullable(),
        seasonId: z.number().int().positive().nullable()
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
        timestamp: true
    })

    /**
     * Order snapshot for audit data - captures order state at deletion time
     * Derived from OrderDisplaySchema, picking only essential fields for audit trail
     */
    const OrderSnapshotSchema = OrderDisplaySchema.pick({
        id: true,
        inhabitantId: true,
        dinnerEventId: true,
        ticketPriceId: true,
        priceAtBooking: true,
        dinnerMode: true,
        state: true
    })

    /**
     * Create serialized audit data for OrderHistory
     */
    function createOrderAuditData(orderSnapshot: z.infer<typeof OrderSnapshotSchema>): string {
        return JSON.stringify({orderSnapshot: OrderSnapshotSchema.parse(orderSnapshot)})
    }

    // ============================================================================
    // Serialization (ADR-010 - Repository layer)
    // ============================================================================

    const SerializedOrderSchema = OrderDisplaySchema.extend({
        releasedAt: z.string().nullable(),
        closedAt: z.string().nullable(),
        createdAt: z.string(),
        updatedAt: z.string()
    })

    const SerializedOrderHistoryDisplaySchema = OrderHistoryDisplaySchema.extend({
        timestamp: z.string()
    })

    function serializeOrder(order: z.infer<typeof OrderDisplaySchema>): z.infer<typeof SerializedOrderSchema> {
        return {
            ...order,
            releasedAt: order.releasedAt?.toISOString() ?? null,
            closedAt: order.closedAt?.toISOString() ?? null,
            createdAt: order.createdAt.toISOString(),
            updatedAt: order.updatedAt.toISOString()
        }
    }

    function deserializeOrder(serialized: z.infer<typeof SerializedOrderSchema>): z.infer<typeof OrderDisplaySchema> {
        return {
            ...serialized,
            releasedAt: serialized.releasedAt ? new Date(serialized.releasedAt) : null,
            closedAt: serialized.closedAt ? new Date(serialized.closedAt) : null,
            createdAt: new Date(serialized.createdAt),
            updatedAt: new Date(serialized.updatedAt)
        }
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
    function deserializeDinnerEvent(prismaEvent: Record<string, unknown>): Record<string, unknown> {
        const allergens = prismaEvent.allergens as Array<{ allergyType: unknown }> | undefined
        return {
            ...prismaEvent,
            allergens: allergens ? allergens.map((a) => a.allergyType) : []
        }
    }

    /**
     * Transform DinnerEventDetail from Prisma format to domain format (ADR-010)
     * Handles all nested relations:
     * - allergens: Flatten join table to array of AllergyType
     * - chef: Deserialize Inhabitant with dinnerPreferences JSON string
     * - cookingTeam: Deserialize CookingTeam with affinity and assignments
     * - tickets: Transform to include ticketType (flattened from ticketPrice) and dinnerEvent reference
     */
    function deserializeDinnerEventDetail(prismaEvent: Record<string, unknown>): Record<string, unknown> {
        const allergens = prismaEvent.allergens as Array<{ allergyType: unknown }> | undefined
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
            totalCost: prismaEvent.totalCost,
            chefId: prismaEvent.chefId,
            cookingTeamId: prismaEvent.cookingTeamId,
            heynaboEventId: prismaEvent.heynaboEventId,
            seasonId: prismaEvent.seasonId,
            createdAt: prismaEvent.createdAt,
            updatedAt: prismaEvent.updatedAt
        }

        return {
            ...prismaEvent,
            allergens: allergens ? allergens.map((a) => a.allergyType) : [],
            chef: chef ? deserializeInhabitantDisplay(chef) : null,
            cookingTeam: cookingTeam ? deserializeCookingTeamDisplay(cookingTeam) : null,
            tickets: tickets?.map(ticket => {
                const ticketPrice = ticket.ticketPrice as Record<string, unknown> | undefined
                return {
                    ...ticket,
                    // Flatten ticketType from ticketPrice relation
                    ticketType: ticketPrice?.ticketType,
                    // Add parent dinnerEvent reference
                    dinnerEvent: dinnerEventForTickets,
                    // Deserialize inhabitant's dinnerPreferences JSON string
                    inhabitant: ticket.inhabitant
                        ? deserializeInhabitantDisplay(ticket.inhabitant as Record<string, unknown>)
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
        groupId: z.number().int().positive().nullable(),
        price: HeynaboEventPriceSchema,
        public: z.boolean(),
        locationText: z.string().max(100),
        locationId: z.number().int().positive().nullable(),
        minParticipants: z.number().int().positive().nullable(),
        maxParticipants: z.number().int().positive().nullable(),
        guestsAllowed: z.boolean(),
        takeAwayAllowed: z.boolean(),
        vegetarian: z.boolean(),
        commentsAllowed: z.boolean(),
        visibleToEveryone: z.boolean()
    })

    // ============================================================================
    // SCAFFOLD PRE-BOOKINGS RESULT
    // ============================================================================

    /**
     * Result schema for scaffold-prebookings endpoint
     * Used to validate API response structure
     */
    const ScaffoldResultSchema = z.object({
        seasonId: z.number().int().positive(),
        created: z.number().int().nonnegative(),
        deleted: z.number().int().nonnegative(),
        unchanged: z.number().int().nonnegative(),
        households: z.number().int().nonnegative()
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
        imageUrl: z.string().url().nullable().optional(),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional()
    })

    return {
        // Enums
        OrderStateSchema,
        TicketTypeSchema,
        DinnerStateSchema,
        DinnerModeSchema,

        // DinnerEvent
        DinnerEventDisplaySchema,
        DinnerEventDetailSchema,
        DinnerEventCreateSchema,
        DinnerEventUpdateSchema,
        ChefMenuFormSchema,

        // Order
        OrderDisplaySchema,
        OrderDetailSchema,
        OrderCreateSchema,
        CreateOrdersRequestSchema,
        SwapOrderRequestSchema,
        AssignRoleSchema,
        OrderQuerySchema,

        // OrderHistory
        OrderHistoryDisplaySchema,
        OrderHistoryDetailSchema,
        OrderHistoryCreateSchema,
        OrderSnapshotSchema,
        createOrderAuditData,

        // Batch Order Creation
        OrderAuditActionSchema,
        AuditContextSchema,
        OrderCreateWithPriceSchema,
        OrdersBatchSchema,
        CreateOrdersResultSchema,
        ORDER_BATCH_SIZE,
        DELETE_BATCH_SIZE,
        chunkOrderBatch,
        chunkIds,

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
        ScaffoldResultSchema
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

// DinnerEvent
export type DinnerEventDisplay = z.infer<ReturnType<typeof useBookingValidation>['DinnerEventDisplaySchema']>
export type DinnerEventDetail = z.infer<ReturnType<typeof useBookingValidation>['DinnerEventDetailSchema']>
export type DinnerEventCreate = z.infer<ReturnType<typeof useBookingValidation>['DinnerEventCreateSchema']>
export type DinnerEventUpdate = z.infer<ReturnType<typeof useBookingValidation>['DinnerEventUpdateSchema']>
export type ChefMenuForm = z.infer<ReturnType<typeof useBookingValidation>['ChefMenuFormSchema']>

// Order
export type OrderDisplay = z.infer<ReturnType<typeof useBookingValidation>['OrderDisplaySchema']>
export type OrderDetail = z.infer<ReturnType<typeof useBookingValidation>['OrderDetailSchema']>
export type OrderCreate = z.infer<ReturnType<typeof useBookingValidation>['OrderCreateSchema']>
export type CreateOrdersRequest = z.infer<ReturnType<typeof useBookingValidation>['CreateOrdersRequestSchema']>
export type SwapOrderRequest = z.infer<ReturnType<typeof useBookingValidation>['SwapOrderRequestSchema']>
export type AssignRole = z.infer<ReturnType<typeof useBookingValidation>['AssignRoleSchema']>
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
export type OrderCreateWithPrice = z.infer<ReturnType<typeof useBookingValidation>['OrderCreateWithPriceSchema']>
export type OrdersBatch = z.infer<ReturnType<typeof useBookingValidation>['OrdersBatchSchema']>
export type CreateOrdersResult = z.infer<ReturnType<typeof useBookingValidation>['CreateOrdersResultSchema']>

// Heynabo Event Sync (ADR-013)
export type HeynaboEventCreate = z.infer<ReturnType<typeof useBookingValidation>['HeynaboEventCreateSchema']>
export type HeynaboEventResponse = z.infer<ReturnType<typeof useBookingValidation>['HeynaboEventResponseSchema']>
export type HeynaboEventStatus = z.infer<ReturnType<typeof useBookingValidation>['HeynaboEventStatusSchema']>

// Scaffold Pre-bookings
export type ScaffoldResult = z.infer<ReturnType<typeof useBookingValidation>['ScaffoldResultSchema']>
