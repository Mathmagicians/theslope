import {z} from 'zod'
// Import TicketType enum from generated Zod schemas (single source of truth)
import { TicketTypeSchema } from '~~/prisma/generated/zod'
import { pruneAndCreate } from '~/utils/batchUtils'

/**
 * Validation schemas for TicketPrice objects
 *
 * Prices are stored in øre (1 DKK = 100 øre)
 */
export const useTicketPriceValidation = () => {
    /**
     * Schema for a single TicketPrice
     */
    const TicketPriceSchema = z.object({
        id: z.number().int().positive().optional(),
        seasonId: z.number().int().positive().optional(),
        ticketType: TicketTypeSchema,
        price: z.number().int().nonnegative(), // Non-negative integer in øre, no upper limit
        description: z.string().optional().nullable(),
        maximumAgeLimit: z.number().int().nonnegative().optional().nullable()
    })

    type TicketPrice = z.infer<typeof TicketPriceSchema>

    const createTicketPrice = (ticketType: string, price: number, seasonId?: number, description?: string, maximumAgeLimit?: number, id?: number): TicketPrice => {
        const ticketPrice = {
            id,
            ticketType,
            price,
            seasonId,
            description,
            maximumAgeLimit
        }
        return TicketPriceSchema.parse(ticketPrice)
    }

    /**
     * - at least one ticket type
     * - All prices must belong to the same season
     *
     * Note: Multiple prices for the same ticket type are allowed (price tiers, e.g., free baby vs hungry baby)
     */
    const TicketPricesArraySchema = z.array(TicketPriceSchema)
        .min(1, {message: "Udfyld mindst en billettype"})
        .refine((prices) => {
            const seasonIds = prices.map(p => p.seasonId).filter(id => id !== undefined)
            // Only validate if seasonIds are present
            return seasonIds.length === 0 || new Set(seasonIds).size === 1
        }, {
            message: "Alle billetpriser skal tilhøre samme sæson"
        })

    /**
     * Validate a single ticket price
     */
    const validateTicketPrice = (price: unknown): TicketPrice => {
        return TicketPriceSchema.parse(price)
    }

    /**
     * Validate an array of ticket prices
     */
    const validateTicketPrices = (prices: unknown): TicketPrice[] => {
        return TicketPricesArraySchema.parse(prices)
    }

    /**
     * Schema for creating ticket prices - excludes id and seasonId (auto-assigned by database)
     */
    const CreateTicketPriceSchema = TicketPriceSchema.omit({ id: true, seasonId: true })
    const CreateTicketPricesArraySchema = z.array(CreateTicketPriceSchema).min(1)

    /**
     * Reconcile ticket prices - never deletes, only creates/updates
     *
     * Business logic:
     * - Identity: (ticketType, price) - same type+price = same price entity
     * - Description/ageLimit change → update
     * - Price change → create new (preserves order references to old price)
     * - Never delete (orders reference ticketPriceId, SET NULL on delete orphans them)
     */
    const ticketPriceKey = (tp: TicketPrice): string =>
        `${tp.ticketType}:${tp.price}`

    const ticketPriceEquals = (existing: TicketPrice, incoming: TicketPrice): boolean =>
        existing.description === incoming.description &&
        existing.maximumAgeLimit === incoming.maximumAgeLimit

    const baseReconcile = pruneAndCreate<TicketPrice, TicketPrice, string>(
        ticketPriceKey,
        ticketPriceEquals
    )

    const reconcileTicketPrices = (existing: TicketPrice[]) => (incoming: TicketPrice[]) => {
        const result = baseReconcile(existing)(incoming)
        return {...result, delete: []}  // Never delete ticket prices
    }

    return {
        TicketTypeSchema,
        TicketPriceSchema,
        TicketPricesArraySchema,
        CreateTicketPriceSchema,
        CreateTicketPricesArraySchema,
        validateTicketPrice,
        validateTicketPrices,
        createTicketPrice,
        reconcileTicketPrices
    }
}

// Re-export the TicketPrice type
export type TicketPrice = z.infer<ReturnType<typeof useTicketPriceValidation>['TicketPriceSchema']>
