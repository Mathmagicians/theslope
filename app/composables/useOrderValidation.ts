import {z} from "zod"

export const useOrderValidation = () => {
    const TicketTypesSchema = z.enum(['ADULT', 'CHILD', 'HUNGRY_BABY', 'BABY'])

    // Full Order schema (includes all fields)
    const OrderSchema = z.object({
        id: z.number().int().positive(),
        dinnerEventId: z.number().int().positive(),
        inhabitantId: z.number().int().positive(),
        ticketType: TicketTypesSchema,
        createdAt: z.coerce.date(),
        updatedAt: z.coerce.date()
    })

    // Order creation schema (excludes auto-generated fields)
    const OrderCreateSchema = OrderSchema.omit({
        id: true,
        createdAt: true,
        updatedAt: true
    })

    return {OrderSchema, OrderCreateSchema, TicketTypesSchema}
}

// Export types inferred from schemas (ADR-001)
export type Order = z.infer<ReturnType<typeof useOrderValidation>['OrderSchema']>
export type OrderCreate = z.infer<ReturnType<typeof useOrderValidation>['OrderCreateSchema']>
