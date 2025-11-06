import {useOrderValidation} from '~/composables/useOrderValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import {calculateAgeOnDate} from '~/utils/date'

/**
 * Business logic for working with tickets and ticket types
 *
 * Handles:
 * - Ticket type determination based on age and season pricing
 * - Ticket type display configuration (labels, colors, icons)
 * - Ticket-related domain operations
 */
export const useTicket = () => {
    // Get ticket type enum from validation composable
    const {TicketTypesSchema} = useOrderValidation()
    const TicketType = TicketTypesSchema.enum

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
        [TicketType.HUNGRY_BABY]: {
            label: 'Sulten baby',
            color: 'tertiary' as const,
            icon: 'i-heroicons-cake'
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
     * 3. Return first ticket type where age <= maximumAgeLimit
     * 4. Default to ADULT if no match or no birthDate
     *
     * @param birthDate - Date of birth (null/undefined → ADULT)
     * @param ticketPrices - Season ticket prices with age limits
     * @param referenceDate - Date to calculate age on (default: today)
     * @returns Ticket type enum value
     */
    const determineTicketType = (
        birthDate: Date | null,
        ticketPrices?: TicketPrice[],
        referenceDate: Date = new Date()
    ): typeof TicketType[keyof typeof TicketType] => {
        // Default to ADULT if no birthDate or no ticket prices
        if (!birthDate || !ticketPrices) return TicketType.ADULT

        const age = calculateAgeOnDate(birthDate, referenceDate)

        // Sort by age limit (ascending) and find first match
        const sorted = [...ticketPrices]
            .filter(tp => tp.maximumAgeLimit !== null)
            .sort((a, b) => a.maximumAgeLimit! - b.maximumAgeLimit!)

        for (const price of sorted) {
            if (age <= price.maximumAgeLimit!) {
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

    return {
        ticketTypeConfig,
        determineTicketType,
        getTicketTypeConfig
    }
}