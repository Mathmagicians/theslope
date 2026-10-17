import {useBookingValidation, type TicketType} from '~/composables/useBookingValidation'
import type {TicketPrice, PortionTicket} from '~/composables/useTicketPriceValidation'
import {calculateAgeOnDate} from '~/utils/date'

const {TicketTypeSchema} = useBookingValidation()
const TicketType = TicketTypeSchema.enum

// The words a ticket type goes by: its label, its letter in a ticket count ("2V 1B"), and its noun for one and for many;
// its colour and glyph live in useBookingUi (ADR-017)
const ticketTypeWords: Record<TicketType, {label: string, letter: string, one: string, many: string}> = {
    [TicketType.ADULT]: {label: 'Voksen', letter: 'V', one: 'voksen', many: 'voksne'},
    [TicketType.CHILD]: {label: 'Barn', letter: 'B', one: 'barn', many: 'børn'},
    [TicketType.BABY]: {label: 'Baby', letter: 'b', one: 'baby', many: 'babyer'}
}

/** A ticket type's label: "Voksen" */
export const ticketTypeLabel = (type: TicketType): string => ticketTypeWords[type].label

/** A ticket type's letter in a ticket count: "V" */
export const ticketTypeLetter = (type: TicketType): string => ticketTypeWords[type].letter

/** A count of one ticket type in words: "1 barn", "8 voksne" */
export const ticketTypeCount = (type: TicketType, count: number): string =>
    `${count} ${count === 1 ? ticketTypeWords[type].one : ticketTypeWords[type].many}`

/**
 * Business logic for working with tickets and ticket types
 *
 * Handles:
 * - Ticket type determination based on age and season pricing
 * - The portions a ticket weighs, from the default prices in app config
 * - Ticket-related domain operations
 */
export const useTicket = () => {
    /**
     * Get default ticket prices from app config
     * Used as fallback when no season ticket prices are available
     */
    const getDefaultTicketPrices = (): TicketPrice[] => {
        const appConfig = useAppConfig()
        return appConfig.theslope?.defaultSeason?.ticketPrices ?? []
    }

    // The default price with the ticket's type and price names its portions, else its type's first default price
    const portionsOf = ({ticketType, price}: PortionTicket): number => {
        const ofType = getDefaultTicketPrices().filter(defaultPrice => defaultPrice.ticketType === ticketType)
        return (ofType.find(defaultPrice => defaultPrice.price === price) ?? ofType[0])?.portions ?? 0
    }

    // A price row read from the database, with the portions the row does not store
    const withPortions = <T extends PortionTicket>(ticketPrice: T): T & {portions: number} => ({...ticketPrice, portions: portionsOf(ticketPrice)})

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
     * The ticket type of a person or an order: the resolved price's type, else the age limits'
     *
     * @param birthDate - Date of birth (preferred for inhabitants)
     * @param ticketPrices - Season ticket prices
     * @param referenceDate - Date to calculate age on (default: today)
     * @param priceAtBooking - Frozen price from order (fallback for guests/orphans)
     */
    const resolveTicketType = (
        birthDate: Date | null,
        ticketPrices?: TicketPrice[],
        referenceDate?: Date,
        priceAtBooking?: number | null
    ): TicketType => {
        const resolved = resolveTicketPrice(birthDate, priceAtBooking, ticketPrices, referenceDate)
        // Without a resolvable price (e.g. empty price list) the age limits still decide the category
        return resolved?.ticketType ?? determineTicketType(birthDate, ticketPrices, referenceDate)
    }

    /**
     * Group inhabitants into ticket categories, classified live from birthDate.
     * Inhabitant counterpart to useOrder.groupByTicketType (which buckets orders
     * by their frozen ticketType). Returns all categories in fixed ADULT, CHILD,
     * BABY order (empty ones included); each inhabitant is stamped with its ticketType
     * so results feed formatTicketCounts directly.
     */
    const groupInhabitantsByTicketCategory = <T extends {birthDate?: Date | null}>(
        inhabitants: T[],
        ticketPrices?: TicketPrice[],
        referenceDate?: Date
    ) => {
        const classified = inhabitants.map(inhabitant => ({
            ...inhabitant,
            ticketType: determineTicketType(inhabitant.birthDate, ticketPrices, referenceDate)
        }))
        return [TicketType.ADULT, TicketType.CHILD, TicketType.BABY].map(ticketType => {
            const members = classified.filter(i => i.ticketType === ticketType)
            return {ticketType, inhabitants: members, count: members.length}
        })
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
        determineTicketType,
        resolveTicketType,
        groupInhabitantsByTicketCategory,
        findTicketPriceByType,
        resolveTicketPrice,
        portionsOf,
        withPortions,
        convertPriceToDecimalFormat,
        formatPrice
    }
}
