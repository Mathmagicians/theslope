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
     * Mirrors typical production pricing structure.
     *
     * maximumAgeLimit means UNDER that age:
     * - BABY (under 2 years, ages 0-1): Free
     * - BABY "Hungry Baby" (under 2 years, ages 0-1): 1500 øre
     * - CHILD (under 12 years, ages 2-11): 3000 øre
     * - ADULT (12+ years): 5000 øre
     */
    static readonly defaultTicketPricesData: TicketPrice[] = [
        createTicketPrice({ticketType: TicketType.BABY, price: 0, description: 'Baby (under 2 år)', maximumAgeLimit: 2, portions: 0}),
        createTicketPrice({ticketType: TicketType.BABY, price: 1500, description: 'Sulten baby (under 2 år)', maximumAgeLimit: 2, portions: 0.25}),
        createTicketPrice({ticketType: TicketType.CHILD, price: 3000, description: 'Barn (under 12 år)', maximumAgeLimit: 12, portions: 0.5}),
        createTicketPrice({ticketType: TicketType.ADULT, price: 5000, description: 'Voksen (12+ år)', portions: 1})
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
    }): TicketPrice[] => [
        createTicketPrice({
            id: 1, seasonId: overrides?.seasonId, ticketType: TicketType.BABY, price: overrides?.babyPrice ?? 0,
            description: 'Baby (under 2 år)', maximumAgeLimit: overrides?.babyAge ?? 2, portions: 0
        }),
        createTicketPrice({
            id: 2, seasonId: overrides?.seasonId, ticketType: TicketType.BABY, price: overrides?.hungryBabyPrice ?? 1500,
            description: 'Sulten baby (under 2 år)', maximumAgeLimit: overrides?.hungryBabyAge ?? 2, portions: 0.25
        }),
        createTicketPrice({
            id: 3, seasonId: overrides?.seasonId, ticketType: TicketType.CHILD, price: overrides?.childPrice ?? 3000,
            description: 'Barn (under 12 år)', maximumAgeLimit: overrides?.childAge ?? 12, portions: 0.5
        }),
        createTicketPrice({
            id: 4, seasonId: overrides?.seasonId, ticketType: TicketType.ADULT, price: overrides?.adultPrice ?? 5000,
            description: 'Voksen (12+ år)', portions: 1
        })
    ]

    /**
     * Get default ticket prices without IDs (for create scenarios in reconciliation tests)
     */
    static readonly defaultTicketPricesWithoutIds = (overrides?: Parameters<typeof TicketFactory.defaultTicketPrices>[0]) => {
        return TicketFactory.defaultTicketPrices(overrides).map(({ id: _, ...rest }) => rest)
    }

    /**
     * Calculate a birthDate that results in a specific ticket type at a reference date.
     * Uses default ticket price age limits to determine appropriate age.
     *
     * maximumAgeLimit means UNDER that age, so:
     * - BABY: age 0 or 1 (under 2)
     * - CHILD: age 2-11 (under 12)
     * - ADULT: age 12+
     *
     * @param ticketType - The desired ticket type (uses TicketType enum)
     * @param referenceDate - The date to calculate age on (typically dinner event date)
     * @returns Date that makes the person qualify for the specified ticket type at referenceDate
     *
     * @example
     * const dinnerDate = testSeasonWithFutureDinners.dinnerEvents[0].date
     * const babyBirthDate = TicketFactory.birthDateForTicketType(TicketType.BABY, dinnerDate)
     * const childBirthDate = TicketFactory.birthDateForTicketType(TicketType.CHILD, dinnerDate)
     * const adultBirthDate = TicketFactory.birthDateForTicketType(TicketType.ADULT, dinnerDate)
     */
    static readonly birthDateForTicketType = (
        ticketType: typeof TicketType[keyof typeof TicketType],
        referenceDate: Date
    ): Date => {
        // Representative ages that clearly fall within each ticket type
        // BABY: under 2, use age 1
        // CHILD: under 12 (but not under 2), use age 8
        // ADULT: 12+, use age 25
        const ageForType = {
            [TicketType.BABY]: 1,
            [TicketType.CHILD]: 8,
            [TicketType.ADULT]: 25
        }
        const age = ageForType[ticketType]

        const birthDate = new Date(referenceDate)
        birthDate.setFullYear(birthDate.getFullYear() - age)
        // Set 1 month before reference to ensure birthday already passed
        birthDate.setMonth(birthDate.getMonth() - 1)
        return birthDate
    }
}