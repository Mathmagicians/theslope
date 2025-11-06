import {useTicketPriceValidation, type TicketPrice} from '~/composables/useTicketPriceValidation'

const {createTicketPrice} = useTicketPriceValidation()

/**
 * Factory for creating test ticket price data
 * Provides standard ticket price configurations for testing age-based ticket type logic
 */
export class TicketFactory {
    /**
     * Standard ticket price configuration used across tests
     * Mirrors typical production pricing structure:
     * - BABY: 0-2 years
     * - HUNGRY_BABY: 3-4 years
     * - CHILD: 5-12 years
     * - ADULT: 13+ years
     */
    static readonly defaultTicketPricesData: TicketPrice[] = [
        createTicketPrice('BABY', 0, undefined, undefined, 2),
        createTicketPrice('HUNGRY_BABY', 1500, undefined, undefined, 4),
        createTicketPrice('CHILD', 3000, undefined, undefined, 12),
        createTicketPrice('ADULT', 5000, undefined, undefined, null)
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
                'BABY',
                overrides?.babyPrice ?? 0,
                overrides?.seasonId,
                undefined,
                overrides?.babyAge ?? 2
            ),
            createTicketPrice(
                'HUNGRY_BABY',
                overrides?.hungryBabyPrice ?? 1500,
                overrides?.seasonId,
                undefined,
                overrides?.hungryBabyAge ?? 4
            ),
            createTicketPrice(
                'CHILD',
                overrides?.childPrice ?? 3000,
                overrides?.seasonId,
                undefined,
                overrides?.childAge ?? 12
            ),
            createTicketPrice(
                'ADULT',
                overrides?.adultPrice ?? 5000,
                overrides?.seasonId,
                undefined,
                null
            )
        ]
    }
}