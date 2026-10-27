import {useTicketPriceValidation, type TicketPrice} from '~/composables/useTicketPriceValidation'
import {useTicket} from '~/composables/useTicket'
import {DEFAULT_TICKET_PRICES} from '~/config/season'

const {createTicketPrice, TicketTypeSchema} = useTicketPriceValidation()
const TicketType = TicketTypeSchema.enum
const {findTicketPriceByType} = useTicket()

/**
 * Factory for creating test ticket price data
 * Provides standard ticket price configurations for testing age-based ticket type logic
 */
export class TicketFactory {
    /**
     * The config's default ticket prices (app/config/season.ts): baby, hungry baby, child, adult.
     * maximumAgeLimit means UNDER that age: BABY ages 0-1, CHILD ages 2-11, ADULT 12+.
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
        // In the config's order: baby, hungry baby, child, adult
        const overridesOfRow = [
            {price: overrides?.babyPrice, maximumAgeLimit: overrides?.babyAge},
            {price: overrides?.hungryBabyPrice, maximumAgeLimit: overrides?.hungryBabyAge},
            {price: overrides?.childPrice, maximumAgeLimit: overrides?.childAge},
            {price: overrides?.adultPrice, maximumAgeLimit: undefined}
        ]
        return DEFAULT_TICKET_PRICES.map((defaultPrice, index) => createTicketPrice({
            ...defaultPrice, id: index + 1, seasonId: overrides?.seasonId,
            price: overridesOfRow[index]?.price ?? defaultPrice.price,
            maximumAgeLimit: overridesOfRow[index]?.maximumAgeLimit ?? defaultPrice.maximumAgeLimit
        }))
    }

    /**
     * Get default ticket prices without IDs (for create scenarios in reconciliation tests)
     */
    static readonly defaultTicketPricesWithoutIds = (overrides?: Parameters<typeof TicketFactory.defaultTicketPrices>[0]) => {
        return TicketFactory.defaultTicketPrices(overrides).map(({ id: _, ...rest }) => rest)
    }

    /** A ticket type's default price row: the first of its type, as the season lists its prices */
    static readonly defaultPriceOf = (ticketType: keyof typeof TicketType): TicketPrice =>
        findTicketPriceByType(ticketType, TicketFactory.defaultTicketPrices())!

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