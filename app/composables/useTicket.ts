import {useBookingValidation} from '~/composables/useBookingValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import {calculateAgeOnDate} from '~/utils/date'

/**
 * Business logic for working with tickets and ticket types
 *
 * Handles:
 * - Ticket type determination based on age and season pricing
 * - Ticket type display configuration (labels, colors, icons)
 * - Ticket-related domain operations
 * - Default ticket prices from app config
 */
export const useTicket = () => {
    // Get ticket type enum from validation composable
    const {TicketTypeSchema} = useBookingValidation()
    const TicketType = TicketTypeSchema.enum

    /**
     * Get default ticket prices from app config
     * Used as fallback when no season ticket prices are available
     */
    const getDefaultTicketPrices = (): TicketPrice[] => {
        const appConfig = useAppConfig()
        return appConfig.theslope?.defaultSeason?.ticketPrices ?? []
    }

    /**
     * UI configuration for ticket type display
     * Maps ticket types to their display properties (label, color, icon)
     */
    const ticketTypeConfig = {
        [TicketType.ADULT]: {
            label: 'Voksen',
            color: 'primary' as const,
            icon: 'i-heroicons-user'
        },
        [TicketType.CHILD]: {
            label: 'Barn',
            color: 'success' as const,
            icon: 'i-heroicons-user-circle'
        },
        [TicketType.BABY]: {
            label: 'Baby',
            color: 'neutral' as const,
            icon: 'i-heroicons-face-smile'
        }
    }

    /**
     * Determine ticket type based on age and season ticket prices
     *
     * Algorithm:
     * 1. Calculate age on reference date (default: today)
     * 2. Sort ticket prices by maximumAgeLimit (ascending)
     * 3. Return first ticket type where age < maximumAgeLimit (UNDER the limit)
     * 4. Default to ADULT if no match or no birthDate
     *
     * Example with maximumAgeLimit=2 for BABY, 12 for CHILD:
     * - Age 0, 1 → BABY (under 2)
     * - Age 2-11 → CHILD (under 12)
     * - Age 12+  → ADULT
     *
     * @param birthDate - Date of birth (null/undefined → ADULT)
     * @param ticketPrices - Season ticket prices with age limits (falls back to defaults if not provided)
     * @param referenceDate - Date to calculate age on (default: today)
     * @returns Ticket type enum value
     */
    const determineTicketType = (
        birthDate: Date | null | undefined,
        ticketPrices?: TicketPrice[],
        referenceDate: Date = new Date()
    ): typeof TicketType[keyof typeof TicketType] => {
        // Default to ADULT if no birthDate
        if (!birthDate) return TicketType.ADULT

        // Use provided ticket prices or fall back to defaults
        const prices = ticketPrices?.length ? ticketPrices : getDefaultTicketPrices()
        if (!prices.length) return TicketType.ADULT

        const age = calculateAgeOnDate(birthDate, referenceDate)

        // Sort by age limit (ascending) and find first match
        const sorted = [...prices]
            .filter(tp => tp.maximumAgeLimit !== null && tp.maximumAgeLimit !== undefined)
            .sort((a, b) => a.maximumAgeLimit! - b.maximumAgeLimit!)

        for (const price of sorted) {
            if (age < price.maximumAgeLimit!) {
                return price.ticketType
            }
        }

        // No match → ADULT (over all age limits)
        return TicketType.ADULT
    }

    /**
     * Get ticket type configuration for an inhabitant
     * Convenience function combining determineTicketType + config lookup
     *
     * @param birthDate - Date of birth
     * @param ticketPrices - Season ticket prices
     * @param referenceDate - Date to calculate age on (default: today)
     * @returns Ticket type display config (label, color, icon)
     */
    const getTicketTypeConfig = (
        birthDate: Date | null,
        ticketPrices?: TicketPrice[],
        referenceDate?: Date
    ) => {
        const ticketType = determineTicketType(birthDate, ticketPrices, referenceDate)
        return ticketTypeConfig[ticketType]
    }

    /**
     * Get the matching TicketPrice for an inhabitant based on their age
     * Returns the full TicketPrice object including id and price
     *
     * @param birthDate - Date of birth
     * @param ticketPrices - Season ticket prices with age limits
     * @param referenceDate - Date to calculate age on (default: today)
     * @returns TicketPrice object or undefined if not found
     */
    const getTicketPriceForInhabitant = (
        birthDate: Date | null,
        ticketPrices?: TicketPrice[],
        referenceDate?: Date
    ): TicketPrice | undefined => {
        const ticketType = determineTicketType(birthDate, ticketPrices, referenceDate)
        return ticketPrices?.find(tp => tp.ticketType === ticketType)
    }

    /**
     * Convert price from øre to DKK (integer)
     * @param dkkFraction - Price in øre (100 øre = 1 kr)
     * @returns Price in DKK as integer
     */
    const convertPriceToDecimalFormat = (dkkFraction: number): number => Math.round(dkkFraction / 100)

    /**
     * Format price from øre to DKK with locale formatting
     * @param dkkFraction - Price in øre (100 øre = 1 kr)
     * @returns Formatted price string (e.g., "1.500" for 150000 øre)
     */
    const formatPrice = (dkkFraction: number): string => convertPriceToDecimalFormat(dkkFraction).toLocaleString('da-DK')

    return {
        ticketTypeConfig,
        determineTicketType,
        getTicketTypeConfig,
        getTicketPriceForInhabitant,
        convertPriceToDecimalFormat,
        formatPrice
    }
}
