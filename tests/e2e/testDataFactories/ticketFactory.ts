import {useTicketPriceValidation, type TicketPrice} from '~/composables/useTicketPriceValidation'

const {createTicketPrice, TicketTypeSchema} = useTicketPriceValidation()
const TicketType = TicketTypeSchema.enum

/**
 * Factory for creating test ticket price data
 * Provides standard ticket price configurations for testing age-based ticket type logic
 */
export class TicketFactory {
    /**
     * Standard ticket price configuration used across tests
     * Mirrors typical production pricing structure:
     * - BABY (0-2 years): Free
     * - BABY "Hungry Baby" (0-2 years): 1500 øre
     * - CHILD (3-12 years): 3000 øre
     * - ADULT (13+ years): 5000 øre
     */
    static readonly defaultTicketPricesData: TicketPrice[] = [
        createTicketPrice(TicketType.BABY, 0, undefined, 'Baby (0-2 år)', 2),
        createTicketPrice(TicketType.BABY, 1500, undefined, 'Sulten baby (0-2 år)', 2),
        createTicketPrice(TicketType.CHILD, 3000, undefined, undefined, 12),
        createTicketPrice(TicketType.ADULT, 5000, undefined, undefined, undefined)
    ]

    /**
     * Get default ticket prices with optional overrides
     * Uses spread pattern for easy customization in tests
     *
     * @example
     * // Use defaults
     * const prices = TicketFactory.defaultTicketPrices()
     *
     * @example
     * // Override specific prices
     * const prices = TicketFactory.defaultTicketPrices({
     *   babyAge: 1,
     *   childPrice: 4000
     * })
     */
    static readonly defaultTicketPrices = (overrides?: {
        babyAge?: number
        babyPrice?: number
        hungryBabyAge?: number
        hungryBabyPrice?: number
        childAge?: number
        childPrice?: number
        adultPrice?: number
        seasonId?: number
    }): TicketPrice[] => {
        return [
            createTicketPrice(
                TicketType.BABY,
                overrides?.babyPrice ?? 0,
                overrides?.seasonId,
                'Baby (0-2 år)',
                overrides?.babyAge ?? 2,
                1
            ),
            createTicketPrice(
                TicketType.BABY,
                overrides?.hungryBabyPrice ?? 1500,
                overrides?.seasonId,
                'Sulten baby (0-2 år)',
                overrides?.hungryBabyAge ?? 2,
                2
            ),
            createTicketPrice(
                TicketType.CHILD,
                overrides?.childPrice ?? 3000,
                overrides?.seasonId,
                undefined,
                overrides?.childAge ?? 12,
                3
            ),
            createTicketPrice(
                TicketType.ADULT,
                overrides?.adultPrice ?? 5000,
                overrides?.seasonId,
                undefined,
                undefined,
                4
            )
        ]
    }
}