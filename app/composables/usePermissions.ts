import type { UserDetail, UserDisplay } from '~/composables/useCoreValidation'
import { SystemRoleSchema } from '~~/prisma/generated/zod'

/**
 * Permission Predicates for Authorization
 *
 * Used by frontend (auth.ts) and backend (middleware)
 */

const SystemRole = SystemRoleSchema.enum

// ============= BASE PREDICATES =============

/** Check if user has ADMIN role */
export const isAdmin = (user: UserDetail | UserDisplay): boolean =>
    user.systemRoles?.includes(SystemRole.ADMIN) ?? false

/** Check if user has ALLERGYMANAGER role */
export const isAllergyManager = (user: UserDetail | UserDisplay): boolean =>
    user.systemRoles?.includes(SystemRole.ALLERGYMANAGER) ?? false

/** Check if user belongs to specified household */
export const isInHousehold = (user: UserDetail | UserDisplay, householdId: number): boolean =>
    user.Inhabitant?.householdId === householdId

/** Always returns true - for authenticated-only routes */
export const isAuthenticated = (_user: UserDetail | UserDisplay): boolean => true

// ============= COMPOSED PREDICATES =============

/** Permission for allergy mutations: ADMIN or ALLERGYMANAGER */
export const canMutateAllergies = (user: UserDetail | UserDisplay): boolean =>
    isAdmin(user) || isAllergyManager(user)

// ============= SESSION-AWARE PREDICATES =============

/** Check if current session user is member of specified household */
export const isHouseholdMember = (householdId: number): boolean => {
    const {user} = useUserSession()
    if (!user.value) return false
    return isInHousehold(user.value as UserDetail, householdId)
}

// ============= ROUTE PERMISSION TABLE =============

type PermissionCheck = (user: UserDetail | UserDisplay) => boolean

/**
 * Route permission table - evaluated in order (most specific first)
 *
 * - prefix: pathname prefix to match
 * - methods: HTTP methods this rule applies to (null = all methods)
 * - check: permission predicate function
 */
export const ROUTE_PERMISSIONS: Array<{
    prefix: string
    methods: string[] | null
    check: PermissionCheck
}> = [
    // ===== ADMIN ROUTES (most specific first) =====

    // Allergy types: ADMIN or ALLERGYMANAGER can mutate
    { prefix: '/api/admin/allergy-type', methods: ['PUT', 'POST', 'DELETE'], check: canMutateAllergies },

    // All other admin mutations: ADMIN only
    { prefix: '/api/admin/', methods: ['PUT', 'POST', 'DELETE'], check: isAdmin },

    // Admin GET: all authenticated users (view access)
    { prefix: '/api/admin/', methods: ['GET'], check: isAuthenticated },

    // ===== USER ROUTES (ownership checked per-endpoint) =====

    { prefix: '/api/order/', methods: null, check: isAuthenticated },
    { prefix: '/api/household/', methods: null, check: isAuthenticated },
    { prefix: '/api/team/', methods: null, check: isAuthenticated },
    { prefix: '/api/chef/', methods: null, check: isAuthenticated },

    // ===== FALLBACK =====

    { prefix: '/api/', methods: null, check: isAuthenticated },
]

/** Find matching permission check for a route */
export const getRoutePermission = (pathname: string, method: string): PermissionCheck | null => {
    for (const rule of ROUTE_PERMISSIONS) {
        if (!pathname.startsWith(rule.prefix)) continue
        if (rule.methods !== null && !rule.methods.includes(method)) continue
        return rule.check
    }
    return null
}

export const usePermissions = () => ({
    isAdmin,
    isAllergyManager,
    isInHousehold,
    isAuthenticated,
    canMutateAllergies,
    isHouseholdMember,
    getRoutePermission,
    ROUTE_PERMISSIONS
})
