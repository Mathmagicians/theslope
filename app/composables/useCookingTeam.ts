import {useCookingTeamValidation, type CookingTeam} from './useCookingTeamValidation'

/**
 * Team colors for visual distinction (8 colors for up to 8 teams)
 */
const TEAM_COLORS = ['mocha', 'pink', 'orange', 'winery', 'party', 'peach', 'bonbon', 'caramel'] as const
export type TeamColor = typeof TEAM_COLORS[number]

/**
 * Business logic for working with cooking teams
 */
export const useCookingTeam = () => {
    const {CookingTeamSchema} = useCookingTeamValidation()

    /**
     * Get team color based on index (0-based)
     * @param index - Team index (0 = first team)
     * @returns Color name from TEAM_COLORS
     */
    const getTeamColor = (index: number): TeamColor => {
        return TEAM_COLORS[index % TEAM_COLORS.length]
    }

    /**
     * Create a default team name
     * @param seasonShortName - Short name of the season (e.g., "Uge 35/24 - Uge 23/25")
     * @param teamNumber - Sequential team number (1, 2, 3, etc.)
     * @returns Formatted team name (e.g., "Madhold 1 - Uge 35/24 - Uge 23/25")
     */
    const createDefaultTeamName = (seasonShortName: string, teamNumber: number): string => {
        return `Madhold ${teamNumber} - ${seasonShortName}`
    }

    /**
     * Create a default cooking team for a given season
     * @param seasonId - Required season ID
     * @param seasonShortName - Season's short name for generating team name
     * @param teamNumber - Sequential team number (defaults to 1)
     * @param overrides - Partial team object to override defaults
     * @returns Default cooking team with generated name
     */
    const getDefaultCookingTeam = (
        seasonId: number,
        seasonShortName: string,
        teamNumber: number = 1,
        overrides?: Partial<CookingTeam>
    ): CookingTeam => {
        return {
            seasonId,
            name: createDefaultTeamName(seasonShortName, teamNumber),
            ...overrides
        }
    }

    /**
     * Fetch inhabitants with their cooking team assignments
     *
     * ADR-009 compliant: Fetches lightweight inhabitants from index endpoint,
     * then merges with assignments from the selected season (already in store).
     *
     * @returns Inhabitants with merged assignment data, loading state, and refresh function
     */
    const useInhabitantsWithAssignments = async () => {
        const store = usePlanStore()
        const {selectedSeason} = storeToRefs(store)

        // Fetch lightweight inhabitants (ADR-009: index endpoint is lightweight)
        const {data: lightweightInhabitants, pending, error, refresh} = await useFetch<Array<{
            id: number
            name: string
            lastName: string
            pictureUrl: string | null
        }>>('/api/admin/household/inhabitants')

        // Get all assignments from selected season's cooking teams
        const allAssignments = computed(() => {
            if (!selectedSeason.value?.CookingTeams) return []

            return selectedSeason.value.CookingTeams.flatMap(team =>
                (team.assignments || []).map(assignment => ({
                    id: assignment.id,
                    role: assignment.role,
                    cookingTeamId: team.id!,
                    inhabitantId: assignment.inhabitant.id,
                    cookingTeam: {
                        id: team.id!,
                        name: team.name
                    }
                }))
            )
        })

        // Merge inhabitants with assignments (client-side join)
        const inhabitantsWithAssignments = computed(() => {
            if (!lightweightInhabitants.value) return []

            return lightweightInhabitants.value.map(inhabitant => {
                const assignment = allAssignments.value.find(a => a.inhabitantId === inhabitant.id)

                return {
                    ...inhabitant,
                    CookingTeamAssignment: assignment ? [assignment] : undefined
                }
            })
        })

        return {
            inhabitants: inhabitantsWithAssignments,
            pending,
            error,
            refresh
        }
    }

    return {
        CookingTeamSchema,
        getTeamColor,
        createDefaultTeamName,
        getDefaultCookingTeam,
        useInhabitantsWithAssignments
    }
}