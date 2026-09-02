import {useCookingTeamValidation, ROLE_LABELS, type CookingTeamDisplay, type TeamRole, type RoleAssignmentPlan} from '~/composables/useCookingTeamValidation'
import type {InhabitantDisplay} from '~/composables/useCoreValidation'
import type {DinnerEventDetail} from '~/composables/useBookingValidation'
import {chunkArray} from '~/utils/batchUtils'
import {formatDate} from '~/utils/date'

/**
 * Predicate: the role's current holder is not the given inhabitant.
 * True when the role is vacant OR held by someone else.
 * Used by parents of RoleAssignment to gate `v-if`.
 */
export const isNotAssignedToMe = (
    holder: InhabitantDisplay | undefined,
    myInhabitantId: number | null
): boolean =>
    !holder || (myInhabitantId !== null && holder.id !== myInhabitantId)

/**
 * Run the chef auto-claim when the dinner is vacant and the caller has an Inhabitant.
 * Returns the value the caller assigns to `wasAutoClaimed`. Propagates `claim` errors
 * for the caller's wrapper to handle.
 */
export const tryAutoClaim = async <T>(
    currentChefId: number | null,
    myInhabitantId: number | null,
    claim: () => Promise<T>
): Promise<boolean> => {
    if (currentChefId !== null || myInhabitantId === null) return false
    await claim()
    return true
}

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

    /**
     * Toast title for "the current user just took the role on this dinner".
     */
    const formatRoleClaimedTitle = (dinner: Pick<DinnerEventDetail, 'date' | 'cookingTeam'>, role: TeamRole): string => {
        const dateLabel = formatDate(dinner.date)
        const teamLabel = dinner.cookingTeam ? ` med ${getTeamShortName(dinner.cookingTeam.name)}` : ''
        return `Du er nu blevet ${ROLE_LABELS[role].toLowerCase()} for middagen d. ${dateLabel}${teamLabel}`
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
        formatRoleClaimedTitle,
        getDefaultCookingTeam,
        mergeInhabitantsWithAssignments,
        chunkTeamAffinities,
        decideRoleAssignmentWrites,
        isNotAssignedToMe,
        tryAutoClaim
    }
}
