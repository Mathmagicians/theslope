import {WEEKDAYS, type WeekDayMap} from '~/types/dateTypes'
import type {InhabitantDetail, InhabitantDisplay} from '~/composables/useCoreValidation'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'

/**
 * Business logic for working with households and inhabitants
 */
export const useHousehold = () => {
    const {DinnerModeSchema} = useBookingValidation()

    // Extract enum constants from Zod schema
    const DinnerMode = DinnerModeSchema.enum
    type DinnerMode = typeof DinnerMode[keyof typeof DinnerMode]

    // Create weekday map factory with DINEIN as default
    const {createDefaultWeekdayMap} = useWeekDayMapValidation({
        valueSchema: DinnerModeSchema,
        defaultValue: DinnerMode.DINEIN
    })

    /**
     * Compute aggregated dinner preferences across multiple inhabitants
     * Returns consensus value if all inhabitants have same preference for a day
     * Returns default (DINEIN) if preferences are mixed or no inhabitants
     * Null/undefined preferences are treated as default value (DINEIN)
     * Used for "all members" power mode functionality
     *
     * @param inhabitants - Array of inhabitants with their dinner preferences
     * @returns WeekDayMap with consensus values or DINEIN for mixed days
     */
    const computeAggregatedPreferences = (
        inhabitants: Pick<InhabitantDetail, 'dinnerPreferences'>[]
    ): WeekDayMap<DinnerMode> => {
        if (inhabitants.length === 0) {
            return createDefaultWeekdayMap(DinnerMode.DINEIN)
        }

        const aggregated = createDefaultWeekdayMap(DinnerMode.DINEIN)

        for (const day of WEEKDAYS) {
            // Map preferences, treating null as default value (DINEIN)
            const preferencesForDay = inhabitants.map(i =>
                i.dinnerPreferences?.[day] ?? DinnerMode.DINEIN
            )

            // Check if all preferences are the same (array is non-empty due to guard above)
            const firstPreference = preferencesForDay[0]!
            const allSame = preferencesForDay.every(pref => pref === firstPreference)

            // If all inhabitants agree, use consensus; otherwise default (DINEIN)
            aggregated[day] = allSame ? firstPreference : DinnerMode.DINEIN
        }

        return aggregated
    }

    /**
     * Format inhabitant name with last name initials (for display)
     * Used when disambiguating inhabitants with same first name
     * Example: "Mads Bruun Hovgaard" → "Mads B.H."
     */
    const formatNameWithInitials = (inhabitant: Pick<InhabitantDisplay, 'name' | 'lastName'>): string => {
        const lastNameParts = inhabitant.lastName.split(/\s+/)
        const initials = lastNameParts.map(part => `${part.charAt(0).toUpperCase()}.`).join('')
        return `${inhabitant.name} ${initials}`
    }

    /**
     * Match a short name against inhabitants list
     * Supports three formats:
     * 1. Exact match: "Mads Bruun Hovgaard" matches inhabitant with name="Mads", lastName="Bruun Hovgaard"
     * 2. Initials format: "Mads B.H." matches inhabitant with name="Mads", lastName="Bruun Hovgaard"
     * 3. First name only: "Babyyoda" matches inhabitant with name="Babyyoda" (unique first name)
     *
     * @param shortName - Name to match (e.g., "Mads B.H." or "Mads Bruun Hovgaard" or "Babyyoda")
     * @param inhabitants - List of inhabitants to match against
     * @returns Matched inhabitant ID or null if no match
     */
    const matchInhabitantByNameWithInitials = (shortName: string, inhabitants: Pick<InhabitantDisplay, 'id' | 'name' | 'lastName'>[]): number | null => {
        const normalizedName = shortName.toLowerCase().trim()

        // Strategy 1: Exact match on "firstName lastName"
        const exactMatch = inhabitants.find(i =>
            `${i.name} ${i.lastName}`.toLowerCase().trim() === normalizedName
        )
        if (exactMatch) return exactMatch.id

        // Strategy 2: Match "FirstName X.Y." format against initials
        const nameParts = normalizedName.split(/\s+/)
        if (nameParts.length >= 2) {
            const firstName = nameParts[0]
            const lastNamePart = nameParts.slice(1).join(' ')

            // Check if last name part contains initials (dots indicate abbreviation)
            if (lastNamePart.includes('.')) {
                // Extract initials: "b.h." → ["b", "h"]
                const initials = lastNamePart
                    .split('.')
                    .map(s => s.trim().toLowerCase())
                    .filter(s => s.length > 0)

                if (initials.length > 0) {
                    // Find inhabitant where first name matches and last name parts start with initials
                    const initialsMatch = inhabitants.find(i => {
                        if (i.name.toLowerCase() !== firstName) return false

                        const lastNameParts = i.lastName.toLowerCase().split(/\s+/)
                        if (lastNameParts.length !== initials.length) return false

                        return initials.every((initial, idx) =>
                            lastNameParts[idx]?.startsWith(initial)
                        )
                    })

                    if (initialsMatch) return initialsMatch.id
                }
            }
        }

        // Strategy 3: First name only match (must be unique)
        const firstNameMatches = inhabitants.filter(i =>
            i.name.toLowerCase() === normalizedName
        )
        if (firstNameMatches.length === 1) return firstNameMatches[0]!.id

        return null
    }

    /**
     * Create a matcher function bound to a specific inhabitants list
     */
    const createInhabitantMatcher = (inhabitants: Pick<InhabitantDisplay, 'id' | 'name' | 'lastName'>[]) => {
        return (shortName: string): number | null => matchInhabitantByNameWithInitials(shortName, inhabitants)
    }

    return {
        computeAggregatedPreferences,
        formatNameWithInitials,
        matchInhabitantByNameWithInitials,
        createInhabitantMatcher
    }
}