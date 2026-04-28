import type {H3Event} from 'h3'
import type {UserDetail} from '~/composables/useCoreValidation'
import {getRoutePermission, isInHousehold} from '~/composables/usePermissions'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import {fetchDinnerEvent} from '~~/server/data/financesRepository'
import {findTeamAssignmentByTeamAndInhabitant} from '~~/server/data/prismaRepository'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error, getSessionUser} = eventHandlerHelper
const {TeamRoleSchema} = useCookingTeamValidation()
const PREFIX = '🔒 > [AUTHORIZE]'

/**
 * Get authenticated user or throw 401
 */
export const getRequiredUser = async (event: H3Event): Promise<UserDetail> => {
    const user = await getSessionUser(event)
    if (!user) {
        return throwH3Error(`${PREFIX} No authenticated user`, new Error('Authentication required'), 401)
    }
    return user
}

/**
 * Check route permission using the route table
 */
export const requireRoutePermission = async (
    event: H3Event,
    pathname: string,
    method: string
): Promise<UserDetail> => {
    const user = await getRequiredUser(event)
    const permissionCheck = getRoutePermission(pathname, method)

    if (!permissionCheck) {
        return throwH3Error(`${PREFIX} No permission rule for ${method} ${pathname}`, new Error('Forbidden'), 403)
    }

    if (!permissionCheck(user)) {
        return throwH3Error(
            `${PREFIX} User ${user.email} denied ${method} ${pathname}`,
            new Error('Insufficient permissions'),
            403
        )
    }
    return user
}

/**
 * Verify user belongs to specified household
 * @param adminBypass - Optional predicate to bypass household check (for admin corrections)
 */
export const requireHouseholdAccess = async (
    event: H3Event,
    targetHouseholdId: number,
    adminBypass: (user: UserDetail) => boolean = () => false
): Promise<UserDetail> => {
    const user = await getRequiredUser(event)

    if (adminBypass(user)) {
        console.info(`${PREFIX} Admin bypass for user ${user.email} on household ${targetHouseholdId}`)
        return user
    }

    if (!isInHousehold(user, targetHouseholdId)) {
        return throwH3Error(
            `${PREFIX} User ${user.email} denied access to household ${targetHouseholdId}`,
            new Error('Access denied to this household'),
            403
        )
    }
    return user
}

/**
 * Verify caller is in the chef pool of the given dinner's cooking team.
 *
 * Semantics: any inhabitant with a `CookingTeamAssignment` of `role=CHEF` for
 * the dinner's `cookingTeamId` is allowed. Mirrors the UI gate (team chefs
 * help each other on each others' menus).
 *
 * No admin bypass — admins use `/api/admin/dinner-event/[id]` for corrections.
 *
 * @returns the authenticated UserDetail on success
 * @throws 401 when not authenticated
 * @throws 403 when user has no Inhabitant or is not a CHEF on the team
 * @throws 404 when dinner is missing or has no cookingTeamId
 */
export const requireChefForDinner = async (
    event: H3Event,
    dinnerEventId: number
): Promise<UserDetail> => {
    const user = await getRequiredUser(event)
    const myInhabitantId = user.Inhabitant?.id

    if (!myInhabitantId) {
        return throwH3Error(
            `${PREFIX} User ${user.email} has no inhabitant — cannot be chef`,
            new Error('Inhabitant required'),
            403
        )
    }

    const d1Client = event.context.cloudflare.env.DB
    const dinner = await fetchDinnerEvent(d1Client, dinnerEventId)

    if (!dinner) {
        return throwH3Error(
            `${PREFIX} Dinner ${dinnerEventId} not found`,
            new Error('Dinner not found'),
            404
        )
    }
    if (!dinner.cookingTeamId) {
        return throwH3Error(
            `${PREFIX} Dinner ${dinnerEventId} has no cooking team`,
            new Error('Dinner has no team'),
            404
        )
    }

    const assignment = await findTeamAssignmentByTeamAndInhabitant(
        d1Client,
        dinner.cookingTeamId,
        myInhabitantId
    )

    if (!assignment || assignment.role !== TeamRoleSchema.enum.CHEF) {
        return throwH3Error(
            `${PREFIX} User ${user.email} is not a chef on team ${dinner.cookingTeamId} for dinner ${dinnerEventId}`,
            new Error('Not in chef pool'),
            403
        )
    }

    return user
}

const authorizationHelper = {
    getRequiredUser,
    requireRoutePermission,
    requireHouseholdAccess,
    requireChefForDinner
}

export default authorizationHelper
