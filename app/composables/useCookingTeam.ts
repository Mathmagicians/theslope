import {useCookingTeamValidation, type CookingTeamDisplay, type TeamRole, type RoleAssignmentPlan} from '~/composables/useCookingTeamValidation'
import type {InhabitantDisplay} from '~/composables/useCoreValidation'
import {chunkArray} from '~/utils/batchUtils'

const TEAM_COLORS = ['party', 'peach', 'secondary', 'neutral', 'info', 'warning', 'error', 'ocean', 'winery', 'primary', 'caramel'] as const
export type TeamColor = typeof TEAM_COLORS[number]

/**
 * Business logic for working with cooking teams
 */
export const useCookingTeam = () => {
    const {CookingTeamSchema, TeamRoleSchema} = useCookingTeamValidation()

    const getTeamColor = (index: number): TeamColor => {
        const colorIndex = index % TEAM_COLORS.length
        return TEAM_COLORS[colorIndex] ?? 'neutral'
    }

    const createDefaultTeamName = (seasonShortName: string, teamNumber: number): string => {
        return `Madhold ${teamNumber} - ${seasonShortName}`
    }

    /**
     * Extract team number from team name (e.g., "Madhold 2" → 2, "Madhold 1 - 08/25-06/26" → 1)
     * Returns null if no number found in the name
     */
    const extractTeamNumber = (teamName: string): number | null => {
        const match = teamName.match(/(\d+)/)
        return match ? parseInt(match[1]!, 10) : null
    }

    /**
     * Get a compact short name for display in badges and tight UI spaces
     * Format: "Madhold X" (e.g., "Madhold 2 - 08/25-06/26" → "Madhold 2")
     * Cuts off everything after the first dash
     * Fallback: Returns full name if no dash found
     */
    const getTeamShortName = (teamName: string): string => {
        const dashIndex = teamName.indexOf(' - ')
        return dashIndex !== -1 ? teamName.substring(0, dashIndex) : teamName
    }

    const getDefaultCookingTeam = (
        seasonId: number,
        seasonShortName: string,
        teamNumber: number = 1,
        overrides?: Partial<CookingTeamDisplay>
    ): CookingTeamDisplay => {
        return {
            seasonId,
            name: createDefaultTeamName(seasonShortName, teamNumber),
            assignments: [],
            cookingDaysCount: 0,
            ...overrides
        }
    }

    /**
     * Merge inhabitants with their cooking team assignments (client-side join).
     * Pure function — caller provides both inputs.
     *
     * @param inhabitants - All community inhabitants
     * @param cookingTeams - Season's cooking teams with nested assignments
     */
    const mergeInhabitantsWithAssignments = (inhabitants: InhabitantDisplay[], cookingTeams: CookingTeamDisplay[]) => {
        const allAssignments = cookingTeams.flatMap(t => t.assignments ?? [])
        return inhabitants.map(inhabitant => {
            const assignments = allAssignments.filter(a => a.inhabitantId === inhabitant.id)
            return {
                ...inhabitant,
                CookingTeamAssignment: assignments.length > 0 ? assignments : undefined
            }
        })
    }

    // Team affinity batching (D1 rate limit safe, though typically only 3-8 teams)
    const TEAM_AFFINITY_BATCH_SIZE = 50
    const chunkTeamAffinities = chunkArray<CookingTeamDisplay>(TEAM_AFFINITY_BATCH_SIZE)

    /**
     * Decide the writes required to assign `role` to `inhabitantId` on a dinner
     * belonging to `cookingTeamId`. Pure — caller executes the plan.
     *
     * - nextChefId: the desired post-operation value of DinnerEvent.chefId.
     *   Promote (CHEF role) → inhabitantId.
     *   Demote (non-CHEF role and the inhabitant was the dinner's chef) → null.
     *   Otherwise → currentDinnerChefId (unchanged).
     *   Caller compares with current dinner.chefId and writes only on diff.
     * - assignment: the team-membership upsert payload, always present.
     */
    const decideRoleAssignmentWrites = (
        cookingTeamId: number,
        inhabitantId: number,
        role: TeamRole,
        currentDinnerChefId: number | null
    ): RoleAssignmentPlan => {
        const isChef = role === TeamRoleSchema.enum.CHEF
        const wasChefOnDinner = currentDinnerChefId === inhabitantId
        const nextChefId = isChef ? inhabitantId : (wasChefOnDinner ? null : currentDinnerChefId)
        return {
            nextChefId,
            assignment: {
                cookingTeamId,
                inhabitantId,
                role,
                allocationPercentage: 100,
                affinity: null
            }
        }
    }

    return {
        CookingTeamSchema,
        getTeamColor,
        createDefaultTeamName,
        extractTeamNumber,
        getTeamShortName,
        getDefaultCookingTeam,
        mergeInhabitantsWithAssignments,
        chunkTeamAffinities,
        decideRoleAssignmentWrites
    }
}
