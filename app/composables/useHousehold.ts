import {WEEKDAYS, type WeekDayMap} from '~/types/dateTypes'
import type {InhabitantDetail} from './useCoreValidation'
import {useBookingValidation} from './useBookingValidation'

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

    return {
        computeAggregatedPreferences
    }
}