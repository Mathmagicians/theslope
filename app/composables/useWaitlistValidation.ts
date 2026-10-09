import {z} from 'zod'
import {useBookingValidation} from '~/composables/useBookingValidation'

/**
 * Waiting list schemas: an entry holds an unplaced order in its create shape, the queue reads FIFO by `createdAt`,
 * and the operation results report what a join, a release or a sweep did (ADR-009 operation result types).
 */
export const useWaitlistValidation = () => {
    const {OrderCreateWithPriceSchema, DinnerModeSchema} = useBookingValidation()

    // The order an entry holds: the shape `createOrders` places, plus the guest's allergies
    const WaitlistOrderSchema = OrderCreateWithPriceSchema.extend({
        allergyTypeIds: z.array(z.number().int().positive()).optional()
    })

    const TicketWaitlistDisplaySchema = z.object({
        id: z.number().int().positive(),
        dinnerEventId: z.number().int().positive(),
        inhabitantId: z.number().int().positive(),
        isGuestTicket: z.boolean(),
        order: WaitlistOrderSchema,
        createdAt: z.coerce.date()
    })

    // Database row: the order travels as JSON (ADR-010)
    const SerializedTicketWaitlistSchema = TicketWaitlistDisplaySchema.extend({
        order: z.string()
    })

    const serializeWaitlistOrder = (order: z.infer<typeof WaitlistOrderSchema>): string => JSON.stringify(order)
    const deserializeTicketWaitlist = (row: z.infer<typeof SerializedTicketWaitlistSchema>): z.infer<typeof TicketWaitlistDisplaySchema> =>
        TicketWaitlistDisplaySchema.parse({...row, order: WaitlistOrderSchema.parse(JSON.parse(row.order))})

    const WaitlistEntryWithPositionSchema = TicketWaitlistDisplaySchema.extend({
        position: z.number().int().positive()
    })

    const WaitlistJoinRequestSchema = z.object({
        householdId: z.number().int().positive(),
        dinnerEventId: z.number().int().positive(),
        inhabitantId: z.number().int().positive(),
        ticketPriceId: z.number().int().positive(),
        dinnerMode: DinnerModeSchema.default('DINEIN'),
        isGuestTicket: z.boolean().default(false),
        allergyTypeIds: z.array(z.number().int().positive()).optional()
    })

    // What the sender did with a notification the operation emitted
    const NotificationOutcomeSchema = z.object({
        queued: z.boolean(),
        dedupeKey: z.string()
    })

    const WaitlistJoinResultSchema = WaitlistEntryWithPositionSchema.extend({
        notification: NotificationOutcomeSchema
    })

    const WaitlistReleaseRequestSchema = z.object({
        portions: z.number().positive().max(100)
    })

    const WaitlistQueueSummarySchema = z.object({
        dinnerEventId: z.number().int().positive(),
        entries: z.number().int().nonnegative(),
        portions: z.number().nonnegative()
    })

    const WaitlistAssignedSchema = z.object({
        entryId: z.number().int().positive(),
        inhabitantId: z.number().int().positive(),
        isGuestTicket: z.boolean(),
        portions: z.number().nonnegative(),
        orderId: z.number().int().positive(),
        notification: NotificationOutcomeSchema
    })

    const WaitlistAssignmentResultSchema = z.object({
        dinnerEventId: z.number().int().positive(),
        supplyPortions: z.number().nonnegative(),
        assigned: z.array(WaitlistAssignedSchema),
        portionsUsed: z.number().nonnegative(),
        waiting: z.number().int().nonnegative()
    })

    return {
        WaitlistOrderSchema,
        TicketWaitlistDisplaySchema,
        SerializedTicketWaitlistSchema,
        WaitlistEntryWithPositionSchema,
        WaitlistJoinRequestSchema,
        WaitlistJoinResultSchema,
        WaitlistReleaseRequestSchema,
        WaitlistQueueSummarySchema,
        WaitlistAssignedSchema,
        WaitlistAssignmentResultSchema,
        NotificationOutcomeSchema,
        serializeWaitlistOrder,
        deserializeTicketWaitlist
    }
}

export type WaitlistOrder = z.infer<ReturnType<typeof useWaitlistValidation>['WaitlistOrderSchema']>
export type TicketWaitlistDisplay = z.infer<ReturnType<typeof useWaitlistValidation>['TicketWaitlistDisplaySchema']>
export type SerializedTicketWaitlist = z.infer<ReturnType<typeof useWaitlistValidation>['SerializedTicketWaitlistSchema']>
export type WaitlistEntryWithPosition = z.infer<ReturnType<typeof useWaitlistValidation>['WaitlistEntryWithPositionSchema']>
export type WaitlistJoinRequest = z.infer<ReturnType<typeof useWaitlistValidation>['WaitlistJoinRequestSchema']>
export type WaitlistJoinResult = z.infer<ReturnType<typeof useWaitlistValidation>['WaitlistJoinResultSchema']>
export type WaitlistReleaseRequest = z.infer<ReturnType<typeof useWaitlistValidation>['WaitlistReleaseRequestSchema']>
export type WaitlistQueueSummary = z.infer<ReturnType<typeof useWaitlistValidation>['WaitlistQueueSummarySchema']>
export type WaitlistAssigned = z.infer<ReturnType<typeof useWaitlistValidation>['WaitlistAssignedSchema']>
export type WaitlistAssignmentResult = z.infer<ReturnType<typeof useWaitlistValidation>['WaitlistAssignmentResultSchema']>
export type NotificationOutcome = z.infer<ReturnType<typeof useWaitlistValidation>['NotificationOutcomeSchema']>
