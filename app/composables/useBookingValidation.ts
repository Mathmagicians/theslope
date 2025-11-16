import {z} from 'zod'
import {
    TicketTypeSchema,
    OrderStateSchema,
    DinnerStateSchema,
    DinnerModeSchema, TicketPriceSchema
} from '~~/prisma/generated/zod'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import {useHouseholdValidation} from '~/composables/useHouseholdValidation'
import {useTicketPriceValidation} from '~/composables/useTicketPriceValidation'
import {useAllergyValidation} from '~/composables/useAllergyValidation'

/**
 * Validation schemas for Bookings domain (DinnerEvent + Order)
 *
 * ADR-009 Compliance:
 * - DisplaySchema: Minimal fields for index endpoints (GET /)
 * - DetailSchema: Display + ALL remaining scalars + comprehensive relations (GET /[id])
 * - Detail ALWAYS EXTENDS Display
 */
export const useBookingValidation = () => {
    const {CookingTeamWithMembersSchema} = useCookingTeamValidation()
    const {InhabitantDisplaySchema} = useHouseholdValidation()
    const {TicketPriceSchema} = useTicketPriceValidation()
    const {AllergyTypeDisplaySchema} = useAllergyValidation()

    // ============================================================================
    // DINNER EVENT
    // ============================================================================

    // all scalar fields
    const DinnerEventBaseSchema = z.object({
        date: z.coerce.date(),
        menuTitle: z.string(),
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

    const DinnerEventRelationsOnlySchema = z.object({
        chef: InhabitantDisplaySchema.nullable(),
        cookingTeam: CookingTeamWithMembersSchema.nullable(),
        tickets: z.array(z.lazy(() => OrderDetailSchema)).optional()
    })

    /**
     * DinnerEvent Display - all scalars fields for index endpoints (GET /api/admin/dinner-event)
     * ADR-009: Lightweight, display-ready data for lists/calendar
     */
    const DinnerEventDisplaySchema = DinnerEventBaseSchema.extend({
        id: z.number().int().positive()
    })


    /**
     * DinnerEvent Detail - Display +  relations (GET /api/admin/dinner-event/[id])
     * ADR-009: Operation-ready, comprehensive data
     */
    const DinnerEventDetailSchema = DinnerEventDisplaySchema.merge(DinnerEventRelationsOnlySchema)

    /**
     * DinnerEvent Create - For API input validation (PUT /api/admin/dinner-event)
     */
    const DinnerEventCreateSchema = DinnerEventBaseSchema

    /**
     * DinnerEvent Update - For API input validation (POST /api/admin/dinner-event/[id])
     */
    const DinnerEventUpdateSchema = DinnerEventCreateSchema.partial().extend({
        id: z.number().int().positive()
    })

    // ============================================================================
    // ORDER
    // ============================================================================

    const OrderBaseSchema = z.object({
        dinnerEventId: z.number().int().positive(),
        inhabitantId: z.number().int().positive(),
        bookedByUserId: z.number().int().positive().nullable(),
        ticketPriceId: z.number().int().positive(),
        priceAtBooking: z.number().int(),
        dinnerMode: DinnerModeSchema,
        state: OrderStateSchema,
        ticketPrice: TicketPriceSchema,
        releasedAt: z.coerce.date().nullable(),
        closedAt: z.coerce.date().nullable(),
        createdAt: z.coerce.date(),
        updatedAt: z.coerce.date()
    })

    const OrderRelationsOnlySchema = z.object({
        chef: InhabitantDisplaySchema.nullable(),
        cookingTeam: CookingTeamWithMembersSchema.nullable(),
        tickets: z.array(z.lazy(() => OrderDetailSchema)).optional()
    })

    /**
     * Order Display - Minimal for index endpoints (GET /api/order), all scalar fields
     * ADR-009: Lightweight with flattened ticketType
     */
    const OrderDisplaySchema = OrderBaseSchema.extend({
        id: z.number().int().positive(),
    })

    /**
     * Order Detail - Display + comprehensive relations (GET /api/order/[id])
     * ADR-009: Operation-ready with full nested objects
     */
    const OrderDetailSchema = OrderDisplaySchema.extend({
        // DinnerEvent relation - ALL scalar fields
        dinnerEvent: DinnerEventDisplaySchema,
        // Inhabitant relation
        inhabitant: z.object({
            id: z.number().int().positive(),
            name: z.string(),
            lastName: z.string(),
            pictureUrl: z.string().nullable()
        }),
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

    /**
     * Order Create - Repository layer (used internally)
     */
    const OrderCreateSchema = z.object({
        dinnerEventId: z.number().int().positive(),
        inhabitantId: z.number().int().positive(),
        bookedByUserId: z.number().int().positive().optional(),
        ticketPriceId: z.number().int().positive(),
        priceAtBooking: z.number().int().optional(),
        dinnerMode: DinnerModeSchema,
        state: OrderStateSchema
    })

    /**
     * Batch order creation request (PUT /api/order)
     * Business rules:
     * - ONE user (bookedByUserId) books for entire family
     * - Can have different inhabitantIds (family members + guests)
     * - Can have multiple orders for same inhabitantId (e.g., adult + child tickets)
     * - All bookedByUserId must be the same (VALIDATED HERE)
     * - All inhabitants from same household (VALIDATED IN REPOSITORY - requires DB lookup)
     */
    const CreateOrdersRequestSchema = z.object({
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
     * Order query filters (GET /api/order?...)
     */
    const OrderQuerySchema = z.object({
        state: OrderStateSchema.optional(),
        fromDate: z.coerce.date().optional(),
        toDate: z.coerce.date().optional()
    })

    /**
     * Order history entry
     */
    const OrderHistorySchema = z.object({
        id: z.number().int().positive(),
        orderId: z.number().int().positive().nullable(),
        action: OrderStateSchema,
        performedByUserId: z.number().int().positive().nullable(),
        auditData: z.string(),
        timestamp: z.coerce.date()
    })

    // ============================================================================
    // Serialization (ADR-010 - Repository layer)
    // ============================================================================

    const SerializedOrderSchema = OrderDisplaySchema.extend({
        releasedAt: z.string().nullable(),
        closedAt: z.string().nullable(),
        createdAt: z.string(),
        updatedAt: z.string()
    })

    const SerializedOrderHistorySchema = OrderHistorySchema.extend({
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

    function serializeOrderHistory(history: z.infer<typeof OrderHistorySchema>): z.infer<typeof SerializedOrderHistorySchema> {
        return {
            ...history,
            timestamp: history.timestamp.toISOString()
        }
    }

    function deserializeOrderHistory(serialized: z.infer<typeof SerializedOrderHistorySchema>): z.infer<typeof OrderHistorySchema> {
        return {
            ...serialized,
            timestamp: new Date(serialized.timestamp)
        }
    }

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

        // Order
        OrderDisplaySchema,
        OrderDetailSchema,
        OrderCreateSchema,
        CreateOrdersRequestSchema,
        SwapOrderRequestSchema,
        OrderQuerySchema,
        OrderHistorySchema,

        // Serialization
        SerializedOrderSchema,
        SerializedOrderHistorySchema,
        serializeOrder,
        deserializeOrder,
        serializeOrderHistory,
        deserializeOrderHistory
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

// Order
export type OrderDisplay = z.infer<ReturnType<typeof useBookingValidation>['OrderDisplaySchema']>
export type OrderDetail = z.infer<ReturnType<typeof useBookingValidation>['OrderDetailSchema']>
export type OrderCreate = z.infer<ReturnType<typeof useBookingValidation>['OrderCreateSchema']>
export type CreateOrdersRequest = z.infer<ReturnType<typeof useBookingValidation>['CreateOrdersRequestSchema']>
export type SwapOrderRequest = z.infer<ReturnType<typeof useBookingValidation>['SwapOrderRequestSchema']>
export type OrderQuery = z.infer<ReturnType<typeof useBookingValidation>['OrderQuerySchema']>
export type OrderHistory = z.infer<ReturnType<typeof useBookingValidation>['OrderHistorySchema']>
export type SerializedOrder = z.infer<ReturnType<typeof useBookingValidation>['SerializedOrderSchema']>
export type SerializedOrderHistory = z.infer<ReturnType<typeof useBookingValidation>['SerializedOrderHistorySchema']>
