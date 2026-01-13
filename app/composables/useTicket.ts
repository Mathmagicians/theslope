import {useBookingValidation} from '~/composables/useBookingValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import {calculateAgeOnDate} from '~/utils/date'

/**
 * UI configuration for ticket type display
 */
export interface TicketTypeConfig {
    label: string
    color: 'primary' | 'success' | 'neutral'
    icon: string
}

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
     * Get ticket type configuration for display (label, color, icon)
     * Uses resolveTicketPrice internally for DRY code path.
     *
     * @param birthDate - Date of birth (preferred for inhabitants)
     * @param ticketPrices - Season ticket prices
     * @param referenceDate - Date to calculate age on (default: today)
     * @param priceAtBooking - Frozen price from order (fallback for guests/orphans)
     * @returns Ticket type display config (label, color, icon)
     */
    const getTicketTypeConfig = (
        birthDate: Date | null,
        ticketPrices?: TicketPrice[],
        referenceDate?: Date,
        priceAtBooking?: number | null
    ) => {
        const resolved = resolveTicketPrice(birthDate, priceAtBooking, ticketPrices, referenceDate)
        const ticketType = resolved?.ticketType ?? TicketType.ADULT
        return ticketTypeConfig[ticketType]
    }

    /**
     * Find ticket price by explicit type (cheapest if multiple exist)
     *
     * Use when you KNOW the ticket type and need to find the price.
     * For deriving type from context (birthDate, priceAtBooking), use resolveTicketPrice.
     *
     * NOTE: Returns first match from sorted list (sorted by price asc = cheapest first).
     *
     * @param ticketType - Explicit ticket type to find
     * @param ticketPrices - Season ticket prices to search (must be sorted by price asc)
     * @returns Matching TicketPrice or undefined if not found
     */
    const findTicketPriceByType = (
        ticketType: typeof TicketType[keyof typeof TicketType],
        ticketPrices?: TicketPrice[]
    ): TicketPrice | undefined => {
        if (!ticketPrices?.length) return undefined
        return ticketPrices.find(tp => tp.ticketType === ticketType)
    }

    /**
     * Resolve a TicketPrice using available information in priority order:
     * 1. birthDate → determineTicketType → find cheapest price for that type
     * 2. priceAtBooking → find price with matching amount
     * 3. Fallback → cheapest ADULT price
     *
     * Works for both inhabitants (birthDate known) and guests (use priceAtBooking).
     * Also handles orphaned orders where TicketPrice was deleted but priceAtBooking preserved.
     *
     * NOTE: Relies on ticketPrices being sorted by price ascending (from DB).
     * .find() returns first match = cheapest price (favors user).
     *
     * @param birthDate - Date of birth (preferred, determines ticket type by age)
     * @param priceAtBooking - Frozen price from existing order (fallback when no birthDate)
     * @param ticketPrices - Season ticket prices to search (must be sorted by price asc)
     * @param referenceDate - Date to calculate age on (default: today)
     * @returns Matching TicketPrice or undefined if no prices available
     */
    const resolveTicketPrice = (
        birthDate: Date | null | undefined,
        priceAtBooking: number | null | undefined,
        ticketPrices?: TicketPrice[],
        referenceDate?: Date
    ): TicketPrice | undefined => {
        if (!ticketPrices?.length) return undefined

        // Priority 1: birthDate → ticketType → cheapest price for type
        if (birthDate) {
            const ticketType = determineTicketType(birthDate, ticketPrices, referenceDate)
            const match = findTicketPriceByType(ticketType, ticketPrices)
            if (match) return match
        }

        // Priority 2: priceAtBooking → exact price match
        if (priceAtBooking !== null && priceAtBooking !== undefined) {
            const match = ticketPrices.find(tp => tp.price === priceAtBooking)
            if (match) return match
        }

        // Fallback: ADULT price, then last available price
        return findTicketPriceByType(TicketType.ADULT, ticketPrices) ?? ticketPrices.at(-1)
    }

    /**
     * @deprecated Use resolveTicketPrice instead
     * Get the matching TicketPrice for an inhabitant based on their age
     */
    const getTicketPriceForInhabitant = (
        birthDate: Date | null,
        ticketPrices?: TicketPrice[],
        referenceDate?: Date
    ): TicketPrice | undefined => {
        return resolveTicketPrice(birthDate, undefined, ticketPrices, referenceDate)
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
        findTicketPriceByType,
        resolveTicketPrice,
        getTicketPriceForInhabitant,
        convertPriceToDecimalFormat,
        formatPrice
    }
}
