import {useCookingTeamValidation, type CookingTeam} from './useCookingTeamValidation'

const TEAM_COLORS = ['primary', 'neutral', 'secondary', 'info', 'warning', 'error', 'winery', 'party', 'peach', 'caramel'] as const
export type TeamColor = typeof TEAM_COLORS[number]

/**
 * Business logic for working with cooking teams
 */
export const useCookingTeam = () => {
    const {CookingTeamSchema} = useCookingTeamValidation()

    const getTeamColor = (index: number): TeamColor => {
        const colorIndex = index % TEAM_COLORS.length
        return TEAM_COLORS[colorIndex] ?? 'neutral'
    }

    const createDefaultTeamName = (seasonShortName: string, teamNumber: number): string => {
        return `Madhold ${teamNumber} - ${seasonShortName}`
    }

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
