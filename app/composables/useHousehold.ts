import {z} from 'zod'
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

    // Create weekday map factory with DINEIN as default (for preferences)
    const {createDefaultWeekdayMap: createDinnerModeMap} = useWeekDayMapValidation<DinnerMode>({
        valueSchema: DinnerModeSchema,
        defaultValue: DinnerMode.DINEIN
    })

    // Create weekday map factory for booleans (for consensus)
    const {createDefaultWeekdayMap: createBooleanMap} = useWeekDayMapValidation<boolean>({
        valueSchema: z.boolean(),
        defaultValue: true
    })

    /**
     * Compute consensus for any array of values
     * Returns first value if all same, defaultValue if mixed or empty
     */
    const computeConsensus = <T>(
        values: T[],
        defaultValue: T
    ): { value: T, consensus: boolean } => {
        if (values.length === 0) {
            return { value: defaultValue, consensus: true }
        }
        const first = values[0]!
        const allSame = values.every(v => v === first)
        return {
            value: allSame ? first : defaultValue,
            consensus: allSame
        }
    }

    /**
     * Compute aggregated dinner preferences across multiple inhabitants
     * Uses computeConsensus for each weekday
     */
    const computeAggregatedPreferences = (
        inhabitants: Pick<InhabitantDetail, 'dinnerPreferences'>[]
    ): { preferences: WeekDayMap<DinnerMode>, consensus: WeekDayMap<boolean> } => {
        const preferences = createDinnerModeMap(DinnerMode.DINEIN)
        const consensus = createBooleanMap(true)

        if (inhabitants.length === 0) {
            return { preferences, consensus }
        }

        for (const day of WEEKDAYS) {
            const preferencesForDay = inhabitants.map(i =>
                i.dinnerPreferences?.[day] ?? DinnerMode.DINEIN
            )
            const result = computeConsensus(preferencesForDay, DinnerMode.DINEIN)
            preferences[day] = result.value
            consensus[day] = result.consensus
        }

        return { preferences, consensus }
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
     * Normalize a name: lowercase, collapse whitespace, trim
     */
    const normalizeName = (name: string): string =>
        name.toLowerCase().replace(/\s+/g, ' ').trim()

    /**
     * Match a short name against inhabitants list
     * Supports six strategies (tried in order):
     * 1. Exact match: "Mads Bruun Hovgaard" matches {name: "Mads", lastName: "Bruun Hovgaard"}
     * 2. Initials format (exact): "Mads B.H." matches {name: "Mads", lastName: "Bruun Hovgaard"}
     * 2b. Single initial (unique): "Mads B." matches {name: "Mads", lastName: "Bruun Hovgaard"} if unique
     * 3. First name only (unique): "Babyyoda" matches {name: "Babyyoda", ...}
     * 4. First word match (unique): "Jimmy" matches {name: "Jimmy Diksen", ...}
     * 5. First name + lastName prefix: "Jeppe Eg" matches {name: "Jeppe", lastName: "Eg Bilslev"}
     *
     * @param shortName - Name to match (e.g., "Mads B.H." or "Mads B." or "Babyyoda")
     * @param inhabitants - List of inhabitants to match against
     * @returns Matched inhabitant ID or null if no match/ambiguous
     */
    const matchInhabitantByNameWithInitials = (shortName: string, inhabitants: Pick<InhabitantDisplay, 'id' | 'name' | 'lastName'>[]): number | null => {
        const normalizedInput = normalizeName(shortName)
        if (!normalizedInput) return null

        // Pre-normalize all inhabitants for consistent matching
        const normalized = inhabitants.map(i => ({
            id: i.id,
            name: normalizeName(i.name),
            lastName: normalizeName(i.lastName),
            fullName: normalizeName(`${i.name} ${i.lastName}`)
        }))

        // Strategy 1: Exact match on "firstName lastName"
        const exactMatch = normalized.find(i => i.fullName === normalizedInput)
        if (exactMatch) return exactMatch.id

        // Parse input into parts for subsequent strategies
        const inputParts = normalizedInput.split(' ')
        const inputFirstWord = inputParts[0]!

        // Strategy 2: Match "FirstName X.Y." format against initials (exact count match)
        if (inputParts.length >= 2) {
            const inputRest = inputParts.slice(1).join(' ')

            if (inputRest.includes('.')) {
                // Extract initials: "b.h." → ["b", "h"]
                const initials = inputRest
                    .split('.')
                    .map(s => s.trim())
                    .filter(s => s.length > 0)

                if (initials.length > 0) {
                    const initialsMatch = normalized.find(i => {
                        if (i.name !== inputFirstWord) return false
                        const lastNameParts = i.lastName.split(' ')
                        if (lastNameParts.length !== initials.length) return false
                        return initials.every((initial, idx) =>
                            lastNameParts[idx]?.startsWith(initial)
                        )
                    })
                    if (initialsMatch) return initialsMatch.id

                    // Strategy 2b: Single initial matches ANY word of remaining name + lastName
                    // "Anna L." matches {name: "Anna", lastName: "Berg Larsen"} (L matches Larsen)
                    // "Anna B." matches {name: "Anna Berg", lastName: "Larsen"} (B matches Berg in name)
                    if (initials.length === 1) {
                        const singleInitial = initials[0]!
                        const singleInitialMatches = normalized.filter(i => {
                            const nameWords = i.name.split(' ')
                            // First word of name must match input first word
                            if (nameWords[0] !== inputFirstWord) return false
                            // Initial can match remaining name words OR lastName words
                            const remainingNameWords = nameWords.slice(1)
                            const lastNameWords = i.lastName.split(' ')
                            return [...remainingNameWords, ...lastNameWords].some(word => word.startsWith(singleInitial))
                        })
                        if (singleInitialMatches.length === 1) return singleInitialMatches[0]!.id
                    }
                }
            }
        }

        // Strategy 3: First name exact match (must be unique)
        if (inputParts.length === 1) {
            const firstNameMatches = normalized.filter(i => i.name === normalizedInput)
            if (firstNameMatches.length === 1) return firstNameMatches[0]!.id
        }

        // Strategy 4: First word of composite name match (must be unique)
        // "Jimmy" matches {name: "Jimmy Diksen", ...}
        if (inputParts.length === 1) {
            const firstWordMatches = normalized.filter(i =>
                i.name.split(' ')[0] === normalizedInput
            )
            if (firstWordMatches.length === 1) return firstWordMatches[0]!.id
        }

        // Strategy 5: First name + lastName prefix match (must be unique)
        // "Jeppe Eg" matches {name: "Jeppe", lastName: "Eg Bilslev-Jensen"}
        if (inputParts.length === 2) {
            const inputLastName = inputParts[1]!
            const prefixMatches = normalized.filter(i =>
                i.name === inputFirstWord && i.lastName.startsWith(inputLastName)
            )
            if (prefixMatches.length === 1) return prefixMatches[0]!.id
        }

        return null
    }

    /**
     * Create a matcher function bound to a specific inhabitants list
     */
    const createInhabitantMatcher = (inhabitants: Pick<InhabitantDisplay, 'id' | 'name' | 'lastName'>[]) => {
        return (shortName: string): number | null => matchInhabitantByNameWithInitials(shortName, inhabitants)
    }

    /**
     * Format household family name from inhabitants' last names
     * Used for displaying a welcoming household title instead of garbled Heynabo names
     *
     * Examples:
     * - Single last name: "Familien Hansen"
     * - Two last names: "Familien Hansen & Jensen"
     * - Three+ last names: "Familien Hansen & Jensen m.fl."
     * - Single person: "Hansen" (no "Familien" prefix)
     * - No inhabitants: null
     *
     * @param inhabitants - Array of inhabitants with lastName
     * @returns Formatted family name string or null if no inhabitants
     */
    const formatHouseholdFamilyName = (
        inhabitants: Pick<InhabitantDisplay, 'lastName'>[]
    ): string | null => {
        if (inhabitants.length === 0) return null

        // Extract unique last names, preserving order of first occurrence
        const uniqueLastNames: string[] = []
        for (const inhabitant of inhabitants) {
            const lastName = inhabitant.lastName?.trim()
            if (lastName && !uniqueLastNames.includes(lastName)) {
                uniqueLastNames.push(lastName)
            }
        }

        if (uniqueLastNames.length === 0) return null

        // Single person household - no "Familien" prefix
        if (inhabitants.length === 1) {
            return uniqueLastNames[0]!
        }

        // Multiple people - use "Familien" prefix
        if (uniqueLastNames.length === 1) {
            return `Familien ${uniqueLastNames[0]}`
        }

        if (uniqueLastNames.length === 2) {
            return `Familien ${uniqueLastNames[0]} & ${uniqueLastNames[1]}`
        }

        // 3+ unique last names - show first two + "m.fl."
        return `Familien ${uniqueLastNames[0]} & ${uniqueLastNames[1]} m.fl.`
    }

    return {
        computeConsensus,
        computeAggregatedPreferences,
        formatNameWithInitials,
        formatHouseholdFamilyName,
        matchInhabitantByNameWithInitials,
        createInhabitantMatcher
    }
}