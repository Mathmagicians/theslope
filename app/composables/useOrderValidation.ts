import { z } from 'zod'
// Import Zod enums from generated schemas (NOT Prisma enums)
// These are auto-generated from schema.prisma by zod-prisma-types and guaranteed to match
import { TicketTypeSchema, OrderStateSchema } from '~~/prisma/generated/zod'

// OrderActionSchema for history tracking (not a Prisma enum)
const OrderActionSchema = z.enum(['CREATED', 'RELEASED', 'CLAIMED', 'CLOSED', 'DELETED'])

/**
 * Validation schemas for Order and OrderHistory entities
 * Following ADR-001: Zod schemas in composables for shared validation
 * Following ADR-010: Domain-driven serialization (repository layer handles DB format)
 */
export const useOrderValidation = () => {
  // ============================================================================
  // Input Schemas
  // ============================================================================

  /**
   * Schema for creating a single order (repository layer)
   */
  const OrderCreateSchema = z.object({
    dinnerEventId: z.number().int().positive(),
    inhabitantId: z.number().int().positive(),
    bookedByUserId: z.number().int().positive().optional(),
    ticketPriceId: z.number().int().positive(),
    priceAtBooking: z.number().int().optional(),
    state: OrderStateSchema.optional()
  })

  /**
   * Schema for batch order creation request (API endpoint)
   */
  const CreateOrdersRequestSchema = z.object({
    dinnerEventId: z.number().int().positive(),
    orders: z.array(z.object({
      inhabitantId: z.number().int().positive(),
      ticketPriceId: z.number().int().positive()
    })).min(1).max(20) // Max 20 tickets per request
  })

  /**
   * Schema for swapping (claiming) a released order
   */
  const SwapOrderRequestSchema = z.object({
    inhabitantId: z.number().int().positive() // New inhabitant for swapped order
  })

  /**
   * Schema for order query filters
   */
  const OrderQuerySchema = z.object({
    state: OrderStateSchema.optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional()
  })

  /**
   * Schema for route params (order ID)
   */
  const OrderIdSchema = z.object({
    id: z.coerce.number().int().positive()
  })

  // ============================================================================
  // Domain Schemas (Output)
  // ============================================================================

  /**
   * Base order schema - core fields from database
   */
  const BaseOrderSchema = z.object({
    id: z.number().int().positive(),
    dinnerEventId: z.number().int().positive(),
    inhabitantId: z.number().int().positive(),
    bookedByUserId: z.number().int().positive().nullable(),
    ticketPriceId: z.number().int().positive(),
    priceAtBooking: z.number().int(),
    state: OrderStateSchema,
    releasedAt: z.coerce.date().nullable(),
    closedAt: z.coerce.date().nullable(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date()
  })

  /**
   * Order display schema - base + flat ticketType for list views
   */
  const OrderDisplaySchema = BaseOrderSchema.extend({
    ticketType: TicketTypeSchema
  })

  /**
   * Order with relations (detail view) - base + nested relations
   */
  const OrderDetailSchema = BaseOrderSchema.extend({
    dinnerEvent: z.object({
      id: z.number().int().positive(),
      date: z.coerce.date(),
      menuTitle: z.string(),
      menuDescription: z.string().nullable()
    }),
    inhabitant: z.object({
      id: z.number().int().positive(),
      name: z.string(),
      lastName: z.string(),
      pictureUrl: z.string().nullable()
    }),
    bookedByUser: z.object({
      id: z.number().int().positive(),
      email: z.string()
    }).nullable(),
    ticketPrice: z.object({
      id: z.number().int().positive(),
      ticketType: TicketTypeSchema,
      price: z.number().int(),
      description: z.string().nullable()
    })
  })

  /**
   * Order history entry schema
   */
  const OrderHistorySchema = z.object({
    id: z.number().int().positive(),
    orderId: z.number().int().positive().nullable(),
    action: OrderActionSchema,
    performedByUserId: z.number().int().positive().nullable(),
    auditData: z.string(), // JSON string
    timestamp: z.coerce.date()
  })

  // ============================================================================
  // Serialized Schemas (Repository Layer - ADR-010)
  // ============================================================================

  /**
   * Serialized order schema for database operations (dates as ISO strings)
   */
  const SerializedOrderSchema = OrderDisplaySchema.extend({
    releasedAt: z.string().nullable(),
    closedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string()
  })

  /**
   * Serialized order history schema for database operations
   */
  const SerializedOrderHistorySchema = OrderHistorySchema.extend({
    timestamp: z.string()
  })

  // ============================================================================
  // Serialization Functions (ADR-010)
  // ============================================================================

  /**
   * Serialize OrderDisplay domain object to database format
   */
  function serializeOrder(order: z.infer<typeof OrderDisplaySchema>): z.infer<typeof SerializedOrderSchema> {
    return {
      ...order,
      releasedAt: order.releasedAt?.toISOString() ?? null,
      closedAt: order.closedAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString()
    }
  }

  /**
   * Deserialize database Order to OrderDisplay domain object
   */
  function deserializeOrder(serialized: z.infer<typeof SerializedOrderSchema>): z.infer<typeof OrderDisplaySchema> {
    return {
      ...serialized,
      releasedAt: serialized.releasedAt ? new Date(serialized.releasedAt) : null,
      closedAt: serialized.closedAt ? new Date(serialized.closedAt) : null,
      createdAt: new Date(serialized.createdAt),
      updatedAt: new Date(serialized.updatedAt)
    }
  }

  /**
   * Serialize OrderHistory domain object to database format
   */
  function serializeOrderHistory(history: OrderHistory): SerializedOrderHistory {
    return {
      ...history,
      timestamp: history.timestamp.toISOString()
    }
  }

  /**
   * Deserialize database OrderHistory to domain object
   */
  function deserializeOrderHistory(serialized: SerializedOrderHistory): OrderHistory {
    return {
      ...serialized,
      timestamp: new Date(serialized.timestamp)
    }
  }

  return {
    // Enums
    OrderStateSchema,
    TicketTypeSchema,
    OrderActionSchema,

    // Input schemas
    OrderCreateSchema,
    CreateOrdersRequestSchema,
    SwapOrderRequestSchema,
    OrderQuerySchema,
    OrderIdSchema,

    // Output schemas
    OrderDisplaySchema,
    OrderDetailSchema,
    OrderHistorySchema,

    // Serialized schemas
    SerializedOrderSchema,
    SerializedOrderHistorySchema,

    // Serialization functions
    serializeOrder,
    deserializeOrder,
    serializeOrderHistory,
    deserializeOrderHistory
  }
}

// Re-export types
export type OrderCreate = z.infer<ReturnType<typeof useOrderValidation>['OrderCreateSchema']>
export type CreateOrdersRequest = z.infer<ReturnType<typeof useOrderValidation>['CreateOrdersRequestSchema']>
export type SwapOrderRequest = z.infer<ReturnType<typeof useOrderValidation>['SwapOrderRequestSchema']>
export type OrderQuery = z.infer<ReturnType<typeof useOrderValidation>['OrderQuerySchema']>
export type OrderDisplay = z.infer<ReturnType<typeof useOrderValidation>['OrderDisplaySchema']>
export type OrderDetail = z.infer<ReturnType<typeof useOrderValidation>['OrderDetailSchema']>
export type OrderHistory = z.infer<ReturnType<typeof useOrderValidation>['OrderHistorySchema']>
export type SerializedOrder = z.infer<ReturnType<typeof useOrderValidation>['SerializedOrderSchema']>
export type SerializedOrderHistory = z.infer<ReturnType<typeof useOrderValidation>['SerializedOrderHistorySchema']>