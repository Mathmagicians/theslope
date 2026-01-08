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
        createTicketPrice(TicketType.BABY, 0, undefined, 'Baby (under 2 år)', 2),
        createTicketPrice(TicketType.BABY, 1500, undefined, 'Sulten baby (under 2 år)', 2),
        createTicketPrice(TicketType.CHILD, 3000, undefined, 'Barn (under 12 år)', 12),
        createTicketPrice(TicketType.ADULT, 5000, undefined, 'Voksen (12+ år)', undefined)
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
                'Baby (under 2 år)',
                overrides?.babyAge ?? 2,
                1
            ),
            createTicketPrice(
                TicketType.BABY,
                overrides?.hungryBabyPrice ?? 1500,
                overrides?.seasonId,
                'Sulten baby (under 2 år)',
                overrides?.hungryBabyAge ?? 2,
                2
            ),
            createTicketPrice(
                TicketType.CHILD,
                overrides?.childPrice ?? 3000,
                overrides?.seasonId,
                'Barn (under 12 år)',
                overrides?.childAge ?? 12,
                3
            ),
            createTicketPrice(
                TicketType.ADULT,
                overrides?.adultPrice ?? 5000,
                overrides?.seasonId,
                'Voksen (12+ år)',
                undefined,
                4
            )
        ]
    }

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