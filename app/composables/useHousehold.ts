import {z} from 'zod'
import {isBefore, isAfter} from 'date-fns'
import {WEEKDAYS, type WeekDayMap} from '~/types/dateTypes'
import {groupBy} from '~/utils/batchUtils'
import type {InhabitantDetail, InhabitantDisplay, InhabitantName, HouseholdDisplay} from '~/composables/useCoreValidation'
import {useBookingValidation, DinnerMode} from '~/composables/useBookingValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {HOUSEHOLD_WORDS} from '~/config/householdWords'

/**
 * Curried predicate: is a dinner event within the household's residency period?
 * Takes household dates, returns a filter function for dinner event dates.
 *
 * DRY — one predicate for both user booking and system scaffolding.
 * Per ADR-016, both paths build a dinnerEventById map from the filtered set.
 *
 * Boundary rules:
 * - Event on movedInDate → included (moved in that day, can eat)
 * - Event on moveOutDate → included (still there that day)
 * - moveOutDate null → no upper bound
 *
 * @param movedInDate - Household move-in date
 * @param moveOutDate - Household move-out date (null = no upper bound)
 * @returns Predicate: (eventDate) => boolean
 */
export const isHouseholdActiveOnDay = (
    movedInDate: Date,
    moveOutDate: Date | null
) => (eventDate: Date): boolean =>
    !isAfter(movedInDate, eventDate) && (!moveOutDate || !isBefore(moveOutDate, eventDate))

const ResidencyStatusSchema = z.enum(['pending', 'active', 'leaving', 'moved-out'])

/** A household's residency on a day, from its move-in and move-out dates: the ribbon, the admin's badges, the alert */
export const ResidencyStatus = ResidencyStatusSchema.enum
export type ResidencyStatus = z.infer<typeof ResidencyStatusSchema>

export const getResidencyStatus = (
    movedInDate: Date,
    moveOutDate: Date | null,
    now: Date
): ResidencyStatus => {
    if (isAfter(movedInDate, now)) return ResidencyStatus.pending
    if (moveOutDate && isBefore(moveOutDate, now)) return ResidencyStatus['moved-out']
    if (moveOutDate) return ResidencyStatus.leaving
    return ResidencyStatus.active
}

/**
 * Resolve which household a Heynabo entity should be routed to, given N candidates
 * sharing the same heynaboId. Pure function, deterministic, always resolves.
 *
 * Returns the resolved household, or null if no candidates (caller should create).
 *
 * The rules (ADR-013, Heynabo import routing):
 * 1. 0 candidates → null (create new)
 * 2. 1 candidate → that one
 * 3. N candidates, exactly 1 without moveOutDate → that one (active household)
 * 4. N candidates, all with moveOutDate → newest moveOutDate, tie-break lowest id
 * 5. N candidates, 2+ without moveOutDate → lowest id (deterministic)
 */
export const resolveHouseholdForHeynaboId = (
    _heynaboId: number,
    candidates: HouseholdDisplay[]
): HouseholdDisplay | null => {
    // One candidate is rule 2 under rule 3 or rule 4: alone it is the active one, or the newest move-out
    const active = candidates.filter(c => !c.moveOutDate)
    if (active.length > 0) return [...active].sort((a, b) => a.id - b.id)[0] ?? null
    return [...candidates].sort((a, b) =>
        (b.moveOutDate?.getTime() ?? 0) - (a.moveOutDate?.getTime() ?? 0) || a.id - b.id)[0] ?? null
}

/** Where one inhabitant currently lives — keyed globally by inhabitant heynaboId */
export type InhabitantPlacement = {
    inhabitant: InhabitantDisplay
    household: HouseholdDisplay
}

/**
 * Build lookup maps for Heynabo import reconciliation.
 * Groups by heynaboId and picks a winner household per address.
 *
 * `inhabitantPlacements` is GLOBAL (inhabitant heynaboId is unique): routing must see
 * members placed at other addresses to move them home instead of colliding on create,
 * and members admin-placed in a sibling household at the same address to preserve them.
 *
 * @returns resolved: winner household per address, inhabitantPlacements: inhabitant heynaboId → current placement
 */
export const buildResolvedHouseholdMap = (households: HouseholdDisplay[]) => {
    const grouped = groupBy<HouseholdDisplay, number>(h => h.heynaboId)(households)
    const resolved = new Map<number, HouseholdDisplay>()
    for (const [heynaboId, candidates] of grouped) {
        const winner = resolveHouseholdForHeynaboId(heynaboId, candidates)
        if (winner) resolved.set(heynaboId, winner)
    }

    const inhabitantPlacements = new Map<number, InhabitantPlacement>()
    for (const household of households) {
        for (const inhabitant of household.inhabitants ?? []) {
            inhabitantPlacements.set(inhabitant.heynaboId, {inhabitant, household})
        }
    }

    return {resolved, inhabitantPlacements}
}

/**
 * Business logic for working with households and inhabitants
 */
export const useHousehold = () => {
    const {DinnerModeSchema} = useBookingValidation()

    const {createDefaultWeekdayMap: createDinnerModeMap} = useWeekDayMapValidation<DinnerMode>({
        valueSchema: DinnerModeSchema,
        defaultValue: DinnerMode.DINEIN
    })

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
        const [first] = values
        if (first === undefined) {
            return { value: defaultValue, consensus: true }
        }
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
        inhabitants: InhabitantDetail[]
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
    const formatNameWithInitials = (inhabitant: InhabitantName): string => {
        const lastNameParts = inhabitant.lastName.split(/\s+/)
        const initials = lastNameParts.map(part => `${part.charAt(0).toUpperCase()}.`).join('')
        return `${inhabitant.name} ${initials}`
    }

    /**
     * Normalize a name: lowercase, collapse whitespace, trim
     */
    const normalizeName = (name: string): string =>
        name.toLowerCase().replace(/\s+/g, ' ').trim()

    /** The id of the one match; none or several match nothing */
    const uniqueMatchId = (matches: {id: number}[]): number | null => matches.length === 1 ? matches[0]?.id ?? null : null

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
    const matchInhabitantByNameWithInitials = (shortName: string, inhabitants: InhabitantDisplay[]): number | null => {
        const normalizedInput = normalizeName(shortName)
        if (!normalizedInput) return null

        const normalized = inhabitants.map(i => ({
            id: i.id,
            name: normalizeName(i.name),
            lastName: normalizeName(i.lastName),
            fullName: normalizeName(`${i.name} ${i.lastName}`)
        }))

        // Strategy 1: Exact match on "firstName lastName"
        const exactMatch = normalized.find(i => i.fullName === normalizedInput)
        if (exactMatch) return exactMatch.id

        // A non-empty input splits into at least one word
        const inputParts = normalizedInput.split(' ')
        const [inputFirstWord = normalizedInput, inputSecondWord] = inputParts

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
                    const [singleInitial] = initials
                    if (initials.length === 1 && singleInitial) {
                        const singleInitialMatches = normalized.filter(i => {
                            const nameWords = i.name.split(' ')
                            // First word of name must match input first word
                            if (nameWords[0] !== inputFirstWord) return false
                            // Initial can match remaining name words OR lastName words
                            const remainingNameWords = nameWords.slice(1)
                            const lastNameWords = i.lastName.split(' ')
                            return [...remainingNameWords, ...lastNameWords].some(word => word.startsWith(singleInitial))
                        })
                        const singleInitialMatch = uniqueMatchId(singleInitialMatches)
                        if (singleInitialMatch !== null) return singleInitialMatch
                    }
                }
            }
        }

        // Strategy 3: First name exact match (must be unique)
        if (inputParts.length === 1) {
            const firstNameMatch = uniqueMatchId(normalized.filter(i => i.name === normalizedInput))
            if (firstNameMatch !== null) return firstNameMatch
        }

        // Strategy 4: First word of composite name match (must be unique)
        // "Jimmy" matches {name: "Jimmy Diksen", ...}
        if (inputParts.length === 1) {
            const firstWordMatch = uniqueMatchId(normalized.filter(i => i.name.split(' ')[0] === normalizedInput))
            if (firstWordMatch !== null) return firstWordMatch
        }

        // Strategy 5: First name + lastName prefix match (must be unique)
        // "Jeppe Eg" matches {name: "Jeppe", lastName: "Eg Bilslev-Jensen"}
        if (inputParts.length === 2 && inputSecondWord !== undefined) {
            const prefixMatch = uniqueMatchId(normalized.filter(i =>
                i.name === inputFirstWord && i.lastName.startsWith(inputSecondWord)
            ))
            if (prefixMatch !== null) return prefixMatch
        }

        return null
    }

    /**
     * Create a matcher function bound to a specific inhabitants list
     */
    const createInhabitantMatcher = (inhabitants: InhabitantDisplay[]) => {
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
        inhabitants: InhabitantDisplay[]
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

        const [first, second] = uniqueLastNames
        if (first === undefined) return null

        // A person living alone reads as the last name alone
        if (inhabitants.length === 1) return first

        return HOUSEHOLD_WORDS.familyName(first, second, uniqueLastNames.length > 2)
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