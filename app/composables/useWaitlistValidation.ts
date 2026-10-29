import {z} from 'zod'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {IdSchema} from '~/composables/useCoreValidation'

// What a recovery does with an entry a stopped run grabbed: finish its placement, or hand it back to its line
const PlacementRecoverySchema = z.enum(['FINISH', 'RELEASE'])

export const PlacementRecovery = PlacementRecoverySchema.enum

/**
 * Waiting list schemas: an entry holds an unplaced order in its create shape, the queue reads FIFO by `createdAt`,
 * and the operation results report what a release or a sweep did (ADR-009 operation result types).
 */
export const useWaitlistValidation = () => {
    const {
        OrderCreateWithPriceSchema, OrderDisplaySchema, TicketTypeSchema, TicketSaleSchema, WaitlistAssignedSchema, AuditContextSchema, BookingOutcomesSchema
    } = useBookingValidation()

    // The order an entry holds: the shape `createOrders` places, plus the guest's allergies
    const WaitlistOrderSchema = OrderCreateWithPriceSchema.extend({
        allergyTypeIds: IdSchema.array().optional()
    })

    const TicketWaitlistDisplaySchema = z.object({
        id: IdSchema,
        dinnerEventId: IdSchema,
        inhabitantId: IdSchema,
        isGuestTicket: z.boolean(),
        order: WaitlistOrderSchema,
        createdAt: z.coerce.date(),
        // Set while a run places the entry; the order that serves it once the run knows it
        placingAt: z.coerce.date().nullable(),
        placingOrderId: IdSchema.nullable()
    })

    const TicketWaitlistCreateSchema = TicketWaitlistDisplaySchema.omit({id: true, createdAt: true, placingAt: true, placingOrderId: true})

    // The audit of a write to an entry: the history row it writes, with no order
    const WaitlistAuditContextSchema = AuditContextSchema.pick({action: true, performedByUserId: true, seasonId: true})

    // The order a placement claimed or wrote, as the recovery reads it; a claim names the household and the inhabitant it bought from
    const PlacementOrderSchema = OrderDisplaySchema.pick({id: true, state: true, inhabitantId: true, isGuestTicket: true, ticketPriceId: true, createdAt: true})
        .extend({sellerHouseholdId: IdSchema.nullable(), sellerInhabitantId: IdSchema.nullable()})

    // A ticket for sale: a released order, its inhabitant and the household that sells it
    const TicketForSaleSchema = OrderDisplaySchema.pick({id: true, dinnerEventId: true, ticketPriceId: true, releasedAt: true, inhabitantId: true})
        .extend({householdId: IdSchema})

    // Database row: the order travels as JSON (ADR-010)
    const SerializedTicketWaitlistSchema = TicketWaitlistDisplaySchema.extend({
        order: z.string()
    })

    type WaitlistOrder = z.infer<typeof WaitlistOrderSchema>
    type TicketWaitlistDisplay = z.infer<typeof TicketWaitlistDisplaySchema>
    type SerializedTicketWaitlist = z.infer<typeof SerializedTicketWaitlistSchema>

    const serializeTicketWaitlist = <T extends {order: WaitlistOrder}>(entry: T): Omit<T, 'order'> & {order: string} =>
        ({...entry, order: JSON.stringify(entry.order)})
    const deserializeTicketWaitlist = (row: SerializedTicketWaitlist): TicketWaitlistDisplay =>
        TicketWaitlistDisplaySchema.parse({...row, order: WaitlistOrderSchema.parse(JSON.parse(row.order))})

    // An entry with its place in the dinner's queue
    const TicketWaitlistDetailSchema = TicketWaitlistDisplaySchema.extend({
        position: z.number().int().positive()
    })

    const ExtraPortionsRequestSchema = z.object({
        portions: z.number().positive().max(100)
    })

    // A dinner's queue: its size, its portion need and its lines, one per ticket type in ticket type order, each in join order
    const WaitlistQueueSummarySchema = z.object({
        dinnerEventId: IdSchema,
        entries: z.number().int().nonnegative(),
        portions: z.number().nonnegative(),
        lines: z.object({
            ticketType: TicketTypeSchema,
            entries: TicketWaitlistDisplaySchema.array()
        }).array()
    })

    // A release of extra portions: the entries assigned, and the sales of another run's stopped placements it finished
    const WaitlistAssignmentResultSchema = z.object({
        dinnerEventId: IdSchema,
        supplyPortions: z.number().nonnegative(),
        assigned: z.array(WaitlistAssignedSchema),
        portionsUsed: z.number().nonnegative(),
        waiting: z.number().int().nonnegative(),
        waitlistTicketsSold: z.array(TicketSaleSchema)
    })

    // What a placement walk finished: the tickets sold and the extra portions assigned, each with its dinner
    const WaitlistPlacementOutcomesSchema = BookingOutcomesSchema.pick({waitlistTicketsSold: true, waitlistPortionsAssigned: true})

    return {
        WaitlistOrderSchema,
        TicketWaitlistDisplaySchema,
        TicketWaitlistCreateSchema,
        SerializedTicketWaitlistSchema,
        TicketWaitlistDetailSchema,
        ExtraPortionsRequestSchema,
        WaitlistQueueSummarySchema,
        WaitlistAssignedSchema,
        WaitlistAssignmentResultSchema,
        WaitlistPlacementOutcomesSchema,
        WaitlistAuditContextSchema,
        PlacementOrderSchema,
        TicketForSaleSchema,
        PlacementRecoverySchema,
        serializeTicketWaitlist,
        deserializeTicketWaitlist
    }
}

export type WaitlistOrder = z.infer<ReturnType<typeof useWaitlistValidation>['WaitlistOrderSchema']>
export type TicketWaitlistDisplay = z.infer<ReturnType<typeof useWaitlistValidation>['TicketWaitlistDisplaySchema']>
export type TicketWaitlistCreate = z.infer<ReturnType<typeof useWaitlistValidation>['TicketWaitlistCreateSchema']>
export type TicketWaitlistDetail = z.infer<ReturnType<typeof useWaitlistValidation>['TicketWaitlistDetailSchema']>
export type ExtraPortionsRequest = z.infer<ReturnType<typeof useWaitlistValidation>['ExtraPortionsRequestSchema']>
export type WaitlistQueueSummary = z.infer<ReturnType<typeof useWaitlistValidation>['WaitlistQueueSummarySchema']>
export type WaitlistAssigned = z.infer<ReturnType<typeof useWaitlistValidation>['WaitlistAssignedSchema']>
export type WaitlistAssignmentResult = z.infer<ReturnType<typeof useWaitlistValidation>['WaitlistAssignmentResultSchema']>
export type PlacementOrder = z.infer<ReturnType<typeof useWaitlistValidation>['PlacementOrderSchema']>
export type TicketForSale = z.infer<ReturnType<typeof useWaitlistValidation>['TicketForSaleSchema']>
export type PlacementRecovery = z.infer<typeof PlacementRecoverySchema>
export type GrabbedWaitlistEntry = TicketWaitlistDisplay & {placingAt: Date}
export type WaitlistPlacementOutcomes = z.infer<ReturnType<typeof useWaitlistValidation>['WaitlistPlacementOutcomesSchema']>
export type WaitlistAuditContext = z.infer<ReturnType<typeof useWaitlistValidation>['WaitlistAuditContextSchema']>
