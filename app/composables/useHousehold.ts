import {WEEKDAYS, type WeekDayMap} from '~/types/dateTypes'
import {useCoreValidation, type Inhabitant} from './useCoreValidation'
import {useBookingValidation} from './useBookingValidation'

/**
 * Business logic for working with households and inhabitants
 */
export const useHousehold = () => {
    const {createDefaultWeekdayMap} = useCoreValidation()
    const {DinnerModeSchema} = useBookingValidation()

    // Extract enum constants from Zod schema
    const DinnerMode = DinnerModeSchema.enum
    type DinnerMode = typeof DinnerMode[keyof typeof DinnerMode]

    /**
     * Compute aggregated dinner preferences across multiple inhabitants
     * Returns consensus value if all inhabitants have same preference for a day
     * Returns null if preferences are mixed
     * Null/undefined preferences are treated as default value (DINEIN)
     * Used for "all members" power mode functionality
     *
     * @param inhabitants - Array of inhabitants with their dinner preferences
     * @returns WeekDayMap with consensus values or null for mixed days
     */
    const computeAggregatedPreferences = (
        inhabitants: Pick<Inhabitant, 'dinnerPreferences'>[]
    ): WeekDayMap<DinnerMode | null> => {
        if (inhabitants.length === 0) {
            return createDefaultWeekdayMap(null)
        }

        const aggregated = createDefaultWeekdayMap(null)

        for (const day of WEEKDAYS) {
            // Map preferences, treating null as default value (DINEIN)
            const preferencesForDay = inhabitants.map(i =>
                i.dinnerPreferences?.[day] ?? DinnerMode.DINEIN
            )

            // Check if all preferences are the same
            const firstPreference = preferencesForDay[0]
            const allSame = preferencesForDay.every(pref => pref === firstPreference)

            // If all inhabitants agree (including those with null → DINEIN), use consensus; otherwise null (mixed)
            aggregated[day] = allSame ? firstPreference : null
        }

        return aggregated
    }

    return {
        computeAggregatedPreferences
    }
}