import type {H3Event} from 'h3'
import type {UserDetail} from '~/composables/useCoreValidation'
import {getRoutePermission, isInHousehold} from '~/composables/usePermissions'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error, getSessionUser} = eventHandlerHelper
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
 */
export const requireHouseholdAccess = async (
    event: H3Event,
    targetHouseholdId: number
): Promise<UserDetail> => {
    const user = await getRequiredUser(event)

    if (!isInHousehold(user, targetHouseholdId)) {
        return throwH3Error(
            `${PREFIX} User ${user.email} denied access to household ${targetHouseholdId}`,
            new Error('Access denied to this household'),
            403
        )
    }
    return user
}

const authorizationHelper = {
    getRequiredUser,
    requireRoutePermission,
    requireHouseholdAccess
}

export default authorizationHelper
