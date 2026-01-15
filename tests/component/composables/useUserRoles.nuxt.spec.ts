// @vitest-environment nuxt
import {describe, it, expect, beforeEach} from 'vitest'
import {mockNuxtImport} from '@nuxt/test-utils/runtime'
import {SystemRoleSchema} from '~~/prisma/generated/zod'
import {useUserRoles} from '~/composables/useUserRoles'
import {useCoreValidation} from '~/composables/useCoreValidation'

const SystemRole = SystemRoleSchema.enum

// Mock auth state - only mock what needs mocking
const mockAuthState = {
    systemRoles: [] as string[],
    isAdmin: false,
    isAllergyManager: false
}

mockNuxtImport('useAuthStore', () => {
    return () => ({
        systemRoles: ref(mockAuthState.systemRoles),
        isAdmin: ref(mockAuthState.isAdmin),
        isAllergyManager: ref(mockAuthState.isAllergyManager)
    })
})

describe('useUserRoles', () => {
    const setupMocks = (config: {
        systemRoles?: string[]
        isAdmin?: boolean
        isAllergyManager?: boolean
    } = {}) => {
        mockAuthState.systemRoles = config.systemRoles ?? []
        mockAuthState.isAdmin = config.isAdmin ?? false
        mockAuthState.isAllergyManager = config.isAllergyManager ?? false
    }

    beforeEach(() => {
        setupMocks()
    })

    describe('getRoleConfig', () => {
        it.each([
            {role: SystemRole.ADMIN},
            {role: SystemRole.ALLERGYMANAGER}
        ])('returns config for $role', ({role}) => {
            const {getRoleConfig} = useUserRoles()
            const config = getRoleConfig(role)

            expect(config).toBeDefined()
            expect(config?.label).toBeTruthy()
            expect(config?.icon).toBeTruthy()
            expect(config?.color).toBeTruthy()
            expect(config?.predicate).toBeDefined()
        })

        it('returns null for unknown role', () => {
            const {getRoleConfig} = useUserRoles()
            expect(getRoleConfig('UNKNOWN_ROLE')).toBeNull()
        })
    })

    describe('roleLabels', () => {
        it('contains all known roles', () => {
            const {roleLabels} = useUserRoles()
            expect(roleLabels[SystemRole.ADMIN]).toBeDefined()
            expect(roleLabels[SystemRole.ALLERGYMANAGER]).toBeDefined()
        })
    })

    describe('visibleRoles', () => {
        it.each([
            {
                scenario: 'only ADMIN when isAdmin true',
                isAdmin: true,
                isAllergyManager: false,
                expected: [SystemRole.ADMIN]
            },
            {
                scenario: 'only ALLERGYMANAGER when isAllergyManager true',
                isAdmin: false,
                isAllergyManager: true,
                expected: [SystemRole.ALLERGYMANAGER]
            },
            {
                scenario: 'all roles when all predicates true',
                isAdmin: true,
                isAllergyManager: true,
                expected: [SystemRole.ADMIN, SystemRole.ALLERGYMANAGER]
            },
            {
                scenario: 'no roles when no predicates true',
                isAdmin: false,
                isAllergyManager: false,
                expected: []
            }
        ])('shows $scenario', ({isAdmin, isAllergyManager, expected}) => {
            setupMocks({
                systemRoles: [SystemRole.ADMIN, SystemRole.ALLERGYMANAGER],
                isAdmin,
                isAllergyManager
            })

            const {visibleRoles} = useUserRoles()

            expect(visibleRoles.value).toHaveLength(expected.length)
            expected.forEach(role => expect(visibleRoles.value).toContain(role))
        })
    })

    describe('ROLE_OWNERSHIP', () => {
        it('maps ADMIN to HN (Heynabo)', () => {
            const {RoleOwnerSchema} = useCoreValidation()
            const {ROLE_OWNERSHIP} = useUserRoles()
            expect(ROLE_OWNERSHIP[SystemRole.ADMIN]).toBe(RoleOwnerSchema.enum.HN)
        })

        it('maps ALLERGYMANAGER to TS (TheSlope)', () => {
            const {RoleOwnerSchema} = useCoreValidation()
            const {ROLE_OWNERSHIP} = useUserRoles()
            expect(ROLE_OWNERSHIP[SystemRole.ALLERGYMANAGER]).toBe(RoleOwnerSchema.enum.TS)
        })
    })

    describe('reconcileUserRoles', () => {
        const {RoleOwnerSchema} = useCoreValidation()
        const RoleOwner = RoleOwnerSchema.enum

        describe('HN caller (owns ADMIN, preserves ALLERGYMANAGER)', () => {
            it.each([
                {
                    scenario: 'gains ADMIN',
                    existing: [],
                    incoming: [SystemRole.ADMIN],
                    expected: [SystemRole.ADMIN],
                    adminAdded: true,
                    adminRemoved: false
                },
                {
                    scenario: 'loses ADMIN',
                    existing: [SystemRole.ADMIN],
                    incoming: [],
                    expected: [],
                    adminAdded: false,
                    adminRemoved: true
                },
                {
                    scenario: 'loses ADMIN, preserves ALLERGYMANAGER',
                    existing: [SystemRole.ADMIN, SystemRole.ALLERGYMANAGER],
                    incoming: [],
                    expected: [SystemRole.ALLERGYMANAGER],
                    adminAdded: false,
                    adminRemoved: true
                },
                {
                    scenario: 'gains ADMIN, preserves ALLERGYMANAGER',
                    existing: [SystemRole.ALLERGYMANAGER],
                    incoming: [SystemRole.ADMIN],
                    expected: [SystemRole.ADMIN, SystemRole.ALLERGYMANAGER],
                    adminAdded: true,
                    adminRemoved: false
                },
                {
                    scenario: 'no change - both have ADMIN',
                    existing: [SystemRole.ADMIN],
                    incoming: [SystemRole.ADMIN],
                    expected: [SystemRole.ADMIN],
                    adminAdded: false,
                    adminRemoved: false
                }
            ])('$scenario', ({existing, incoming, expected, adminAdded, adminRemoved}) => {
                const {reconcileUserRoles} = useUserRoles()
                const result = reconcileUserRoles(existing, incoming, RoleOwner.HN)

                expect(result.roles).toHaveLength(expected.length)
                expected.forEach(role => expect(result.roles).toContain(role))
                expect(result.adminAdded).toBe(adminAdded)
                expect(result.adminRemoved).toBe(adminRemoved)
            })
        })

        describe('TS caller (owns ALLERGYMANAGER, preserves ADMIN)', () => {
            it.each([
                {
                    scenario: 'gains ALLERGYMANAGER',
                    existing: [],
                    incoming: [SystemRole.ALLERGYMANAGER],
                    expected: [SystemRole.ALLERGYMANAGER],
                    adminAdded: false,
                    adminRemoved: false
                },
                {
                    scenario: 'loses ALLERGYMANAGER',
                    existing: [SystemRole.ALLERGYMANAGER],
                    incoming: [],
                    expected: [],
                    adminAdded: false,
                    adminRemoved: false
                },
                {
                    scenario: 'loses ALLERGYMANAGER, preserves ADMIN',
                    existing: [SystemRole.ADMIN, SystemRole.ALLERGYMANAGER],
                    incoming: [],
                    expected: [SystemRole.ADMIN],
                    adminAdded: false,
                    adminRemoved: false
                },
                {
                    scenario: 'gains ALLERGYMANAGER, preserves ADMIN',
                    existing: [SystemRole.ADMIN],
                    incoming: [SystemRole.ALLERGYMANAGER],
                    expected: [SystemRole.ADMIN, SystemRole.ALLERGYMANAGER],
                    adminAdded: false,
                    adminRemoved: false
                }
            ])('$scenario', ({existing, incoming, expected, adminAdded, adminRemoved}) => {
                const {reconcileUserRoles} = useUserRoles()
                const result = reconcileUserRoles(existing, incoming, RoleOwner.TS)

                expect(result.roles).toHaveLength(expected.length)
                expected.forEach(role => expect(result.roles).toContain(role))
                expect(result.adminAdded).toBe(adminAdded)
                expect(result.adminRemoved).toBe(adminRemoved)
            })
        })
    })
})
