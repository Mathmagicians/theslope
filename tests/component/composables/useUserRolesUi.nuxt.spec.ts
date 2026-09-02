// @vitest-environment nuxt
import {describe, it, expect, beforeEach} from 'vitest'
import {mockNuxtImport} from '@nuxt/test-utils/runtime'
import {SystemRoleSchema} from '~~/prisma/generated/zod'
import {useUserRolesUi} from '~/composables/useUserRolesUi'

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

describe('useUserRolesUi', () => {
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
            const {getRoleConfig} = useUserRolesUi()
            const config = getRoleConfig(role)

            expect(config).toBeDefined()
            expect(config?.label).toBeTruthy()
            expect(config?.icon).toBeTruthy()
            expect(config?.color).toBeTruthy()
            expect(config?.predicate).toBeDefined()
        })

        it('returns null for unknown role', () => {
            const {getRoleConfig} = useUserRolesUi()
            expect(getRoleConfig('UNKNOWN_ROLE')).toBeNull()
        })
    })

    describe('roleLabels', () => {
        it('contains all known roles', () => {
            const {roleLabels} = useUserRolesUi()
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

            const {visibleRoles} = useUserRolesUi()

            expect(visibleRoles.value).toHaveLength(expected.length)
            expected.forEach(role => expect(visibleRoles.value).toContain(role))
        })
    })
})
