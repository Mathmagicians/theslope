// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {mockNuxtImport} from '@nuxt/test-utils/runtime'
import {useUserRolesUi} from '~/composables/useUserRolesUi'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {useCoreValidation, type SystemRole as SystemRoleValue} from '~/composables/useCoreValidation'

const SystemRole = useCoreValidation().SystemRoleSchema.enum

// The test runtime has no session cookie and no /api/_auth endpoint, so the session nuxt-auth-utils
// would hydrate is the one thing faked; the auth store deriving the predicates from it is real
const {session, useUserSession} = await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).mockSession())
mockNuxtImport('useUserSession', () => useUserSession)

/** The session user with the given roles; the auth store derives isAdmin and isAllergyManager from them */
const logInWithRoles = (roles: SystemRoleValue[]) => {
    session.user.value = UserFactory.defaultUserWithInhabitant('roles', {systemRoles: roles})
}

describe('useUserRolesUi', () => {
    beforeEach(() => {
        session.user.value = null
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
                scenario: 'no roles when no predicates true',
                isAdmin: false,
                isAllergyManager: false,
                expected: []
            }
        ])('shows $scenario', ({isAdmin, isAllergyManager, expected}) => {
            // Each predicate is true for the session user holding its role
            logInWithRoles([...(isAdmin ? [SystemRole.ADMIN] : []), ...(isAllergyManager ? [SystemRole.ALLERGYMANAGER] : [])])

            const {visibleRoles} = useUserRolesUi()

            expect(visibleRoles.value).toHaveLength(expected.length)
            expected.forEach(role => expect(visibleRoles.value).toContain(role))
        })
    })
})
