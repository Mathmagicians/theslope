/**
 * Unit tests for usePermissions composable
 * Tests permission predicates and route permission table
 */

import { describe, it, expect } from 'vitest'
import {
    isAdmin,
    isAllergyManager,
    isInHousehold,
    isAuthenticated,
    canMutateAllergies,
    getRoutePermission,
    ROUTE_PERMISSIONS
} from '~/composables/usePermissions'
import { useCoreValidation } from '~/composables/useCoreValidation'
import type { UserDetail } from '~/composables/useCoreValidation'
import { DEFAULT_APPEARANCE, DEFAULT_NOTIFICATION_CHANNELS } from '~/composables/useUserPreferenceValidation'

const { SystemRoleSchema } = useCoreValidation()
const SystemRole = SystemRoleSchema.enum

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

const createUser = (overrides: Partial<UserDetail> = {}): UserDetail => ({
    id: 1,
    email: 'test@example.com',
    phone: null,
    systemRoles: [],
    notificationChannels: [...DEFAULT_NOTIFICATION_CHANNELS],
    appearance: {...DEFAULT_APPEARANCE},
    createdAt: new Date(),
    updatedAt: new Date(),
    Inhabitant: null,
    ...overrides
})

const createUserWithInhabitant = (householdId: number, overrides: Partial<UserDetail> = {}): UserDetail => ({
    ...createUser(overrides),
    Inhabitant: {
        id: 1,
        heynaboId: 1,
        householdId,
        pictureUrl: null,
        name: 'Test',
        lastName: 'User',
        birthDate: null,
        dinnerPreferences: null,
        userId: 1,
        household: {
            id: householdId,
            heynaboId: 1,
            pbsId: 1,
            movedInDate: new Date(),
            moveOutDate: null,
            name: 'Test Household',
            address: 'Test Address 1',
            shortName: 'T_1'
        }
    },
    ...overrides
})

// ============================================================================
// BASE PREDICATES
// ============================================================================

describe('usePermissions - Base Predicates', () => {
    describe('isAdmin', () => {
        it.each([
            { roles: [SystemRole.ADMIN], expected: true, description: 'with ADMIN role' },
            { roles: [SystemRole.ALLERGYMANAGER], expected: false, description: 'with ALLERGYMANAGER only' },
        ])('should return $expected $description', ({ roles, expected }) => {
            const user = createUser({ systemRoles: roles })
            expect(isAdmin(user)).toBe(expected)
        })

        it('should handle undefined systemRoles gracefully', () => {
            const user = createUser({ systemRoles: undefined })
            expect(isAdmin(user)).toBe(false)
        })
    })

    describe('isAllergyManager', () => {
        it.each([
            { roles: [SystemRole.ALLERGYMANAGER], expected: true, description: 'with ALLERGYMANAGER role' },
            { roles: [SystemRole.ADMIN], expected: false, description: 'with ADMIN only' },
        ])('should return $expected $description', ({ roles, expected }) => {
            const user = createUser({ systemRoles: roles })
            expect(isAllergyManager(user)).toBe(expected)
        })

        it('should handle undefined systemRoles gracefully', () => {
            const user = createUser({ systemRoles: undefined })
            expect(isAllergyManager(user)).toBe(false)
        })
    })

    describe('isInHousehold', () => {
        it.each([
            { userHouseholdId: 1, targetHouseholdId: 1, expected: true, description: 'matching household' },
            { userHouseholdId: 1, targetHouseholdId: 2, expected: false, description: 'different household' },
        ])('should return $expected for $description', ({ userHouseholdId, targetHouseholdId, expected }) => {
            const user = createUserWithInhabitant(userHouseholdId)
            expect(isInHousehold(user, targetHouseholdId)).toBe(expected)
        })

        it('should return false when user has no Inhabitant', () => {
            const user = createUser()
            expect(isInHousehold(user, 1)).toBe(false)
        })
    })

    describe('isAuthenticated', () => {
        it('should always return true for any user', () => {
            const regularUser = createUser()
            const adminUser = createUser({ systemRoles: [SystemRole.ADMIN] })
            const userWithInhabitant = createUserWithInhabitant(1)

            expect(isAuthenticated(regularUser)).toBe(true)
            expect(isAuthenticated(adminUser)).toBe(true)
            expect(isAuthenticated(userWithInhabitant)).toBe(true)
        })
    })
})

// ============================================================================
// COMPOSED PREDICATES
// ============================================================================

describe('usePermissions - Composed Predicates', () => {
    describe('canMutateAllergies', () => {
        it.each([
            { roles: [SystemRole.ADMIN], expected: true, description: 'ADMIN can mutate' },
            { roles: [SystemRole.ALLERGYMANAGER], expected: true, description: 'ALLERGYMANAGER can mutate' },
            { roles: [], expected: false, description: 'no roles cannot mutate' },
        ])('$description', ({ roles, expected }) => {
            const user = createUser({ systemRoles: roles })
            expect(canMutateAllergies(user)).toBe(expected)
        })
    })
})

// ============================================================================
// ROUTE PERMISSION TABLE
// ============================================================================

describe('usePermissions - Route Permission Table', () => {
    // Which check a route gets is the Route Permission Checks' subject; the fallback catches every other api route
    describe('getRoutePermission', () => {
        it('should find the fallback permission check for an unknown api route', () => {
            const check = getRoutePermission('/api/unknown', 'GET')
            expect(typeof check).toBe('function')
        })

        it('should return null for non-API routes', () => {
            const check = getRoutePermission('/some/other/path', 'GET')
            expect(check).toBeNull()
        })
    })

    describe('Route Permission Checks', () => {
        const adminUser = createUser({ systemRoles: [SystemRole.ADMIN] })
        const allergyManagerUser = createUser({ systemRoles: [SystemRole.ALLERGYMANAGER] })
        const regularUser = createUser({ systemRoles: [] })

        // The allergy-type rule comes before the general admin rule, or the ALLERGYMANAGER would be denied
        it('allergy-type mutations should allow ADMIN and ALLERGYMANAGER, and deny a regular user', () => {
            const check = getRoutePermission('/api/admin/allergy-type', 'PUT')
            expect(check!(adminUser)).toBe(true)
            expect(check!(allergyManagerUser)).toBe(true)
            expect(check!(regularUser)).toBe(false)
        })

        it('other admin mutations should allow ADMIN only', () => {
            const check = getRoutePermission('/api/admin/season', 'PUT')
            expect(check!(adminUser)).toBe(true)
            expect(check!(allergyManagerUser)).toBe(false)
            expect(check!(regularUser)).toBe(false)
        })

        it('admin GET should allow any authenticated user', () => {
            const check = getRoutePermission('/api/admin/season', 'GET')
            expect(check!(adminUser)).toBe(true)
            expect(check!(allergyManagerUser)).toBe(true)
            expect(check!(regularUser)).toBe(true)
        })

        it('order routes should allow any authenticated user', () => {
            const check = getRoutePermission('/api/order/', 'PUT')
            expect(check!(regularUser)).toBe(true)
        })

        it('own user routes should allow any authenticated user', () => {
            const check = getRoutePermission('/api/user/preferences', 'POST')
            expect(check!(regularUser)).toBe(true)
        })

        // Settings carry a per-key writer in the registry, so the route table is a coarse
        // gate: it lets any authenticated caller reach the endpoint, which then runs the
        // key's own predicate. Key names never enter the route table. The setting rule comes
        // before the general admin rule, or the regular user would be denied.
        it('setting POST reaches the endpoint for any authenticated user', () => {
            const check = getRoutePermission('/api/admin/setting/allergy-poster-notes', 'POST')

            expect(check!(adminUser)).toBe(true)
            expect(check!(allergyManagerUser)).toBe(true)
            expect(check!(regularUser)).toBe(true)
        })
    })

    describe('ROUTE_PERMISSIONS order matters', () => {
        it('should have the own-user rule before the generic api fallback', () => {
            const userRuleIndex = ROUTE_PERMISSIONS.findIndex(r => r.prefix === '/api/user/')
            const fallbackIndex = ROUTE_PERMISSIONS.findIndex(r => r.prefix === '/api/')

            expect(userRuleIndex).toBeGreaterThanOrEqual(0)
            expect(userRuleIndex).toBeLessThan(fallbackIndex)
        })

        it('should have more specific rules before less specific', () => {
            const prefixes = ROUTE_PERMISSIONS.map(r => r.prefix)

            // Check that longer (more specific) prefixes come before shorter ones
            for (let i = 0; i < prefixes.length - 1; i++) {
                const current = prefixes[i]!
                const next = prefixes[i + 1]!

                // If both start the same, longer should come first
                if (next.startsWith(current) && current !== next) {
                    throw new Error(
                        `Less specific rule "${current}" comes before more specific "${next}"`
                    )
                }
            }
        })
    })
})
