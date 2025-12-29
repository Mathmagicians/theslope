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
    ROUTE_PERMISSIONS,
    usePermissions
} from '~/composables/usePermissions'
import { useCoreValidation } from '~/composables/useCoreValidation'
import type { UserDetail } from '~/composables/useCoreValidation'

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
            { roles: [], expected: false, description: 'with no roles' },
            { roles: [SystemRole.ADMIN, SystemRole.ALLERGYMANAGER], expected: true, description: 'with multiple roles including ADMIN' },
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
            { roles: [], expected: false, description: 'with no roles' },
            { roles: [SystemRole.ADMIN, SystemRole.ALLERGYMANAGER], expected: true, description: 'with multiple roles including ALLERGYMANAGER' },
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
            { userHouseholdId: 5, targetHouseholdId: 5, expected: true, description: 'another matching household' },
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
            { roles: [SystemRole.ADMIN, SystemRole.ALLERGYMANAGER], expected: true, description: 'both roles can mutate' },
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
    describe('getRoutePermission', () => {
        it.each([
            // Admin allergy-type mutations (most specific)
            { pathname: '/api/admin/allergy-type', method: 'PUT', expectsCheck: true, description: 'allergy-type PUT' },
            { pathname: '/api/admin/allergy-type', method: 'POST', expectsCheck: true, description: 'allergy-type POST' },
            { pathname: '/api/admin/allergy-type', method: 'DELETE', expectsCheck: true, description: 'allergy-type DELETE' },
            { pathname: '/api/admin/allergy-type/1', method: 'DELETE', expectsCheck: true, description: 'allergy-type/:id DELETE' },

            // Other admin mutations (ADMIN only)
            { pathname: '/api/admin/season', method: 'PUT', expectsCheck: true, description: 'season PUT' },
            { pathname: '/api/admin/household', method: 'POST', expectsCheck: true, description: 'household POST' },
            { pathname: '/api/admin/users', method: 'DELETE', expectsCheck: true, description: 'users DELETE' },

            // Admin GET (authenticated)
            { pathname: '/api/admin/season', method: 'GET', expectsCheck: true, description: 'admin GET' },

            // User routes (authenticated, ownership checked per-endpoint)
            { pathname: '/api/order/1', method: 'GET', expectsCheck: true, description: 'order GET' },
            { pathname: '/api/order/', method: 'PUT', expectsCheck: true, description: 'order PUT' },
            { pathname: '/api/household/1', method: 'GET', expectsCheck: true, description: 'household GET' },
            { pathname: '/api/team/my', method: 'GET', expectsCheck: true, description: 'team GET' },

            // Fallback
            { pathname: '/api/unknown', method: 'GET', expectsCheck: true, description: 'unknown api route' },
        ])('should find permission check for $description', ({ pathname, method, expectsCheck }) => {
            const check = getRoutePermission(pathname, method)
            if (expectsCheck) {
                expect(check).not.toBeNull()
                expect(typeof check).toBe('function')
            } else {
                expect(check).toBeNull()
            }
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

        it('allergy-type mutations should allow ADMIN', () => {
            const check = getRoutePermission('/api/admin/allergy-type', 'PUT')
            expect(check!(adminUser)).toBe(true)
        })

        it('allergy-type mutations should allow ALLERGYMANAGER', () => {
            const check = getRoutePermission('/api/admin/allergy-type', 'PUT')
            expect(check!(allergyManagerUser)).toBe(true)
        })

        it('allergy-type mutations should deny regular user', () => {
            const check = getRoutePermission('/api/admin/allergy-type', 'PUT')
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
    })

    describe('ROUTE_PERMISSIONS order matters', () => {
        it('should have allergy-type rule before general admin rule', () => {
            const allergyTypeRuleIndex = ROUTE_PERMISSIONS.findIndex(
                r => r.prefix === '/api/admin/allergy-type'
            )
            const generalAdminRuleIndex = ROUTE_PERMISSIONS.findIndex(
                r => r.prefix === '/api/admin/' && r.methods?.includes('PUT')
            )

            expect(allergyTypeRuleIndex).toBeLessThan(generalAdminRuleIndex)
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

// ============================================================================
// COMPOSABLE EXPORT
// ============================================================================

describe('usePermissions - Composable Export', () => {
    it('should export all functions via composable', () => {
        const permissions = usePermissions()

        expect(permissions.isAdmin).toBe(isAdmin)
        expect(permissions.isAllergyManager).toBe(isAllergyManager)
        expect(permissions.isInHousehold).toBe(isInHousehold)
        expect(permissions.isAuthenticated).toBe(isAuthenticated)
        expect(permissions.canMutateAllergies).toBe(canMutateAllergies)
        expect(permissions.getRoutePermission).toBe(getRoutePermission)
        expect(permissions.ROUTE_PERMISSIONS).toBe(ROUTE_PERMISSIONS)
    })
})

// ============================================================================
// ADR-001 COMPLIANCE
// ============================================================================

describe('usePermissions - ADR-001 Compliance', () => {
    it('should import SystemRoleSchema from generated layer', () => {
        // Verify the enum values match Prisma generated types
        expect(SystemRole.ADMIN).toBe('ADMIN')
        expect(SystemRole.ALLERGYMANAGER).toBe('ALLERGYMANAGER')
    })

    it('should use .enum property for enum values', () => {
        const user = createUser({ systemRoles: [SystemRole.ADMIN] })
        // The composable uses SystemRoleSchema.enum internally
        expect(isAdmin(user)).toBe(true)
    })
})
