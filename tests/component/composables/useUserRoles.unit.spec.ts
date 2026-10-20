import {describe, it, expect} from 'vitest'
import {ROLE_OWNERSHIP, reconcileUserRoles} from '~/composables/useUserRoles'
import {useCoreValidation} from '~/composables/useCoreValidation'

const {SystemRoleSchema, RoleOwnerSchema} = useCoreValidation()
const SystemRole = SystemRoleSchema.enum
const RoleOwner = RoleOwnerSchema.enum

describe('useUserRoles (server-safe module)', () => {
    describe('ROLE_OWNERSHIP', () => {
        it.each([
            {role: SystemRole.ADMIN, owner: RoleOwner.HN},
            {role: SystemRole.ALLERGYMANAGER, owner: RoleOwner.TS}
        ])('maps $role to $owner', ({role, owner}) => {
            expect(ROLE_OWNERSHIP[role]).toBe(owner)
        })
    })

    describe('reconcileUserRoles', () => {
        describe('HN caller (owns ADMIN, preserves ALLERGYMANAGER)', () => {
            it.each([
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
                    scenario: 'loses ALLERGYMANAGER, preserves ADMIN',
                    existing: [SystemRole.ADMIN, SystemRole.ALLERGYMANAGER],
                    incoming: [],
                    expected: [SystemRole.ADMIN]
                },
                {
                    scenario: 'gains ALLERGYMANAGER, preserves ADMIN',
                    existing: [SystemRole.ADMIN],
                    incoming: [SystemRole.ALLERGYMANAGER],
                    expected: [SystemRole.ADMIN, SystemRole.ALLERGYMANAGER]
                }
            ])('$scenario', ({existing, incoming, expected}) => {
                const result = reconcileUserRoles(existing, incoming, RoleOwner.TS)

                expect(result.roles).toHaveLength(expected.length)
                expected.forEach(role => expect(result.roles).toContain(role))
                expect(result.adminAdded).toBe(false)
                expect(result.adminRemoved).toBe(false)
            })
        })
    })
})
