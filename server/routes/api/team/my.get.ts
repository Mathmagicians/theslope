/**
 * GET /api/team/my - Returns cooking teams the current user is assigned to in the active season
 *
 * Returns: CookingTeamDetail[] - Teams with assignments and dinnerEvents
 *
 * Business logic:
 * - Gets user's inhabitant ID from auth context
 * - Gets active season ID
 * - Finds all teams in active season where user has an assignment
 * - Returns team details with dinnerEvents
 *
 * ADR Compliance:
 * - ADR-002: Separate try-catch for validation and business logic
 * - ADR-004: Logging standards (info for success, error for failures)
 * - ADR-009: Returns Detail type (bounded: 1-3 teams per user, includes dinnerEvents)
 */
import {fetchMyTeams, fetchActiveSeasonId} from '~~/server/data/prismaRepository'
import type {CookingTeamDetail} from '~~/app/composables/useCookingTeamValidation'
import type {UserDetail} from '~~/app/composables/useCoreValidation'

export default defineEventHandler(async (event): Promise<CookingTeamDetail[]> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Get authenticated user's inhabitant ID from session
    const session = await getUserSession(event)
    // Type cast: Module augmentation doesn't expand UserDetail properties (see types/auth.d.ts)
    const user = session?.user as UserDetail | undefined
    const inhabitantId = user?.Inhabitant?.id

    if (!inhabitantId) {
        console.warn('👥 > [team/my] > GET > User has no inhabitant - returning empty array')
        return []
    }

    // Business logic
    try {
        // Get active season ID
        const activeSeasonId = await fetchActiveSeasonId(d1Client)
        if (!activeSeasonId) {
            console.info('👥 > [team/my] > GET > No active season found - returning empty array')
            return []
        }

        // Fetch user's teams with dinnerEvents
        const myTeams = await fetchMyTeams(d1Client, activeSeasonId, inhabitantId)

        console.info(`👥 > [team/my] > GET > Found ${myTeams.length} teams for inhabitant ${inhabitantId}`)
        setResponseStatus(event, 200)
        return myTeams
    } catch (error) {
        console.error('👥 > [team/my] > GET > Error fetching user teams:', error)
        throw createError({statusCode: 500, message: 'Failed to fetch user teams', cause: error})
    }
})
