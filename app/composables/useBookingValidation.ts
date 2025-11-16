import { z } from 'zod'
import {
  TicketTypeSchema,
  OrderStateSchema,
  DinnerStateSchema,
  DinnerModeSchema
} from '~~/prisma/generated/zod'
import { useCookingTeamValidation } from '~/composables/useCookingTeamValidation'
import { useHouseholdValidation } from '~/composables/useHouseholdValidation'

const OrderActionSchema = z.enum(['CREATED', 'RELEASED', 'CLAIMED', 'CLOSED', 'DELETED'])

/**
 * Validation schemas for Bookings domain (DinnerEvent + Order)
 *
 * ADR-009 Compliance:
 * - DisplaySchema: Minimal fields for index endpoints (GET /)
 * - DetailSchema: Display + ALL remaining scalars + comprehensive relations (GET /[id])
 * - Detail ALWAYS EXTENDS Display
 */
export const useBookingValidation = () => {
  const { CookingTeamWithMembersSchema } = useCookingTeamValidation()
  const { InhabitantDisplaySchema } = useHouseholdValidation()

  // ============================================================================
  // DINNER EVENT
  // ============================================================================

  /**
   * DinnerEvent Display - Minimal for index endpoints (GET /api/admin/dinner-event)
   * ADR-009: Lightweight, display-ready data for lists/calendar
   */
  const DinnerEventDisplaySchema = z.object({
    id: z.number().int().positive(),
    date: z.coerce.date(),
    menuTitle: z.string(),
    state: DinnerStateSchema,
    chefId: z.number().int().positive().nullable(),
    cookingTeamId: z.number().int().positive().nullable()
  })

  /**
   * DinnerEvent Detail - Display + ALL remaining scalars + relations (GET /api/admin/dinner-event/[id])
   * ADR-009: Operation-ready, comprehensive data
   */
  const DinnerEventDetailSchema = DinnerEventDisplaySchema.extend({
    // Remaining scalar fields
    menuDescription: z.string().max(500).nullable(),
    menuPictureUrl: z.string().url().nullable(),
    totalCost: z.number().int().min(0),
    heynaboEventId: z.number().int().positive().nullable(),
    seasonId: z.number().int().positive().nullable(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    // Relations
    chef: InhabitantDisplaySchema.nullable(),
    cookingTeam: CookingTeamWithMembersSchema.nullable(),
    tickets: z.array(z.lazy(() => OrderDetailSchema)).optional()
  })

  /**
   * DinnerEvent Create - For API input validation (PUT /api/admin/dinner-event)
   */
  const DinnerEventCreateSchema = z.object({
    date: z.coerce.date(),
    menuTitle: z.string().min(1).max(200),
    menuDescription: z.string().max(500).optional().nullable(),
    menuPictureUrl: z.string().url().optional().nullable(),
    state: DinnerStateSchema.optional(),
    totalCost: z.number().int().min(0).optional(),
    heynaboEventId: z.number().int().positive().optional().nullable(),
    chefId: z.number().int().positive().optional().nullable(),
    cookingTeamId: z.number().int().positive().optional().nullable(),
    seasonId: z.number().int().positive().optional().nullable()
  })

  /**
   * DinnerEvent Update - For API input validation (POST /api/admin/dinner-event/[id])
   */
  const DinnerEventUpdateSchema = DinnerEventCreateSchema.partial().extend({
    id: z.number().int().positive()
  })

  // ============================================================================
  // ORDER
  // ============================================================================

  /**
   * Order Display - Minimal for index endpoints (GET /api/order)
   * ADR-009: Lightweight with flattened ticketType
   */
  const OrderDisplaySchema = z.object({
    id: z.number().int().positive(),
    dinnerEventId: z.number().int().positive(),
    inhabitantId: z.number().int().positive(),
    bookedByUserId: z.number().int().positive().nullable(),
    ticketPriceId: z.number().int().positive(),
    priceAtBooking: z.number().int(),
    dinnerMode: DinnerModeSchema,
    state: OrderStateSchema,
    ticketType: TicketTypeSchema, // Flattened from ticketPrice relation
    releasedAt: z.coerce.date().nullable(),
    closedAt: z.coerce.date().nullable(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date()
  })

  /**
   * Order Detail - Display + comprehensive relations (GET /api/order/[id])
   * ADR-009: Operation-ready with full nested objects
   */
  const OrderDetailSchema = OrderDisplaySchema.omit({ ticketType: true }).extend({
    // DinnerEvent relation - ALL scalar fields
    dinnerEvent: z.object({
      id: z.number().int().positive(),
      date: z.coerce.date(),
      menuTitle: z.string(),
      menuDescription: z.string().nullable(),
      menuPictureUrl: z.string().nullable(),
      state: DinnerStateSchema,
      totalCost: z.number().int(),
      heynaboEventId: z.number().int().positive().nullable(),
      chefId: z.number().int().positive().nullable(),
      cookingTeamId: z.number().int().positive().nullable(),
      seasonId: z.number().int().positive().nullable(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date()
    }),
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
   */
  const CreateOrdersRequestSchema = z.object({
    dinnerEventId: z.number().int().positive(),
    orders: z.array(z.object({
      inhabitantId: z.number().int().positive(),
      ticketPriceId: z.number().int().positive(),
      dinnerMode: DinnerModeSchema
    })).min(1).max(20)
  })

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
    action: OrderActionSchema,
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
    OrderActionSchema,

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
