import {describe, it, expect} from 'vitest'
import {SystemRoleSchema} from '~~/prisma/generated/zod'
import {ROLE_OWNERSHIP, reconcileUserRoles} from '~/composables/useUserRoles'
import {useCoreValidation} from '~/composables/useCoreValidation'

const SystemRole = SystemRoleSchema.enum

describe('useUserRoles (server-safe module)', () => {
    describe('ROLE_OWNERSHIP', () => {
        it('maps ADMIN to HN (Heynabo)', () => {
            const {RoleOwnerSchema} = useCoreValidation()
            expect(ROLE_OWNERSHIP[SystemRole.ADMIN]).toBe(RoleOwnerSchema.enum.HN)
        })

        it('maps ALLERGYMANAGER to TS (TheSlope)', () => {
            const {RoleOwnerSchema} = useCoreValidation()
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
                const result = reconcileUserRoles(existing, incoming, RoleOwner.TS)

                expect(result.roles).toHaveLength(expected.length)
                expected.forEach(role => expect(result.roles).toContain(role))
                expect(result.adminAdded).toBe(adminAdded)
                expect(result.adminRemoved).toBe(adminRemoved)
            })
        })
    })
})
