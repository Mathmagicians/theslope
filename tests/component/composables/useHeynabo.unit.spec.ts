import { describe, expect, it } from 'vitest'
import { reconcileHouseholds, reconcileInhabitants } from '~/composables/useHeynabo'
import type { HouseholdCreate, InhabitantCreate } from '~/composables/useCoreValidation'

describe('useHeynabo', () => {

    // ========================================================================
    // TEST DATA FACTORIES
    // ========================================================================

    const createHousehold = (overrides: Partial<HouseholdCreate> = {}): HouseholdCreate => ({
        heynaboId: 1,
        pbsId: 1,
        name: 'Test Household',
        address: 'Test Address 1',
        movedInDate: new Date('2024-01-01'),
        inhabitants: [],
        ...overrides
    })

    const createInhabitant = (overrides: Partial<Omit<InhabitantCreate, 'householdId'>> = {}): Omit<InhabitantCreate, 'householdId'> => ({
        heynaboId: 1,
        name: 'Test',
        lastName: 'Person',
        pictureUrl: null,
        birthDate: null,
        ...overrides
    })

    // ========================================================================
    // RECONCILE HOUSEHOLDS
    // ========================================================================

    describe('reconcileHouseholds', () => {

        describe('create - new households from Heynabo', () => {
            it.each([
                {
                    scenario: 'empty existing, one incoming',
                    existing: [],
                    incoming: [createHousehold({ heynaboId: 1 })],
                    expectedCreate: 1
                },
                {
                    scenario: 'empty existing, multiple incoming',
                    existing: [],
                    incoming: [
                        createHousehold({ heynaboId: 1 }),
                        createHousehold({ heynaboId: 2 }),
                        createHousehold({ heynaboId: 3 })
                    ],
                    expectedCreate: 3
                },
                {
                    scenario: 'existing present, new household from Heynabo',
                    existing: [createHousehold({ heynaboId: 1 })],
                    incoming: [
                        createHousehold({ heynaboId: 1 }),
                        createHousehold({ heynaboId: 2 })
                    ],
                    expectedCreate: 1
                }
            ])('$scenario → creates $expectedCreate', ({ existing, incoming, expectedCreate }) => {
                const result = reconcileHouseholds(existing)(incoming)
                expect(result.create).toHaveLength(expectedCreate)
            })
        })

        describe('delete - households not in Heynabo (moved out)', () => {
            it.each([
                {
                    scenario: 'existing not in incoming (moved out)',
                    existing: [createHousehold({ heynaboId: 1 })],
                    incoming: [],
                    expectedDelete: 1
                },
                {
                    scenario: 'some existing not in incoming',
                    existing: [
                        createHousehold({ heynaboId: 1 }),
                        createHousehold({ heynaboId: 2 }),
                        createHousehold({ heynaboId: 3 })
                    ],
                    incoming: [createHousehold({ heynaboId: 2 })],
                    expectedDelete: 2
                },
                {
                    scenario: 'all existing in incoming',
                    existing: [createHousehold({ heynaboId: 1 })],
                    incoming: [createHousehold({ heynaboId: 1 })],
                    expectedDelete: 0
                }
            ])('$scenario → deletes $expectedDelete', ({ existing, incoming, expectedDelete }) => {
                const result = reconcileHouseholds(existing)(incoming)
                expect(result.delete).toHaveLength(expectedDelete)
            })
        })

        describe('update - changed households in Heynabo', () => {
            it.each([
                {
                    scenario: 'name changed',
                    existing: [createHousehold({ heynaboId: 1, name: 'Old Name' })],
                    incoming: [createHousehold({ heynaboId: 1, name: 'New Name' })],
                    expectedUpdate: 1
                },
                {
                    scenario: 'address changed',
                    existing: [createHousehold({ heynaboId: 1, address: 'Old Address' })],
                    incoming: [createHousehold({ heynaboId: 1, address: 'New Address' })],
                    expectedUpdate: 1
                },
                {
                    scenario: 'pbsId changed',
                    existing: [createHousehold({ heynaboId: 1, pbsId: 100 })],
                    incoming: [createHousehold({ heynaboId: 1, pbsId: 200 })],
                    expectedUpdate: 1
                },
                {
                    scenario: 'no changes',
                    existing: [createHousehold({ heynaboId: 1, name: 'Same', address: 'Same', pbsId: 1 })],
                    incoming: [createHousehold({ heynaboId: 1, name: 'Same', address: 'Same', pbsId: 1 })],
                    expectedUpdate: 0
                }
            ])('$scenario → updates $expectedUpdate', ({ existing, incoming, expectedUpdate }) => {
                const result = reconcileHouseholds(existing)(incoming)
                expect(result.update).toHaveLength(expectedUpdate)
            })
        })

        describe('idempotent - identical households', () => {
            it('returns idempotent when all fields match', () => {
                const household = createHousehold({ heynaboId: 1, name: 'Test', address: 'Addr', pbsId: 1 })
                const result = reconcileHouseholds([household])([household])

                expect(result.idempotent).toHaveLength(1)
                expect(result.create).toHaveLength(0)
                expect(result.delete).toHaveLength(0)
                expect(result.update).toHaveLength(0)
            })
        })

        describe('complex scenarios', () => {
            it('handles mixed create/update/delete/idempotent', () => {
                const existing = [
                    createHousehold({ heynaboId: 1, name: 'Unchanged' }),
                    createHousehold({ heynaboId: 2, name: 'Will Update' }),
                    createHousehold({ heynaboId: 3, name: 'Will Delete' })
                ]
                const incoming = [
                    createHousehold({ heynaboId: 1, name: 'Unchanged' }),
                    createHousehold({ heynaboId: 2, name: 'Updated Name' }),
                    createHousehold({ heynaboId: 4, name: 'New Household' })
                ]

                const result = reconcileHouseholds(existing)(incoming)

                expect(result.idempotent).toHaveLength(1)
                expect(result.update).toHaveLength(1)
                expect(result.delete).toHaveLength(1)
                expect(result.create).toHaveLength(1)

                expect(result.delete[0]!.heynaboId).toBe(3)
                expect(result.create[0]!.heynaboId).toBe(4)
                expect(result.update[0]!.heynaboId).toBe(2)
            })
        })
    })

    // ========================================================================
    // RECONCILE INHABITANTS
    // ========================================================================

    describe('reconcileInhabitants', () => {

        describe('create - new inhabitants from Heynabo', () => {
            it.each([
                {
                    scenario: 'empty existing, one incoming',
                    existing: [],
                    incoming: [createInhabitant({ heynaboId: 1 })],
                    expectedCreate: 1
                },
                {
                    scenario: 'existing present, new inhabitant from Heynabo',
                    existing: [createInhabitant({ heynaboId: 1 })],
                    incoming: [
                        createInhabitant({ heynaboId: 1 }),
                        createInhabitant({ heynaboId: 2 })
                    ],
                    expectedCreate: 1
                }
            ])('$scenario → creates $expectedCreate', ({ existing, incoming, expectedCreate }) => {
                const result = reconcileInhabitants(existing)(incoming)
                expect(result.create).toHaveLength(expectedCreate)
            })
        })

        describe('delete - inhabitants not in Heynabo (moved out)', () => {
            it.each([
                {
                    scenario: 'existing not in incoming',
                    existing: [createInhabitant({ heynaboId: 1 })],
                    incoming: [],
                    expectedDelete: 1
                },
                {
                    scenario: 'some existing not in incoming',
                    existing: [
                        createInhabitant({ heynaboId: 1 }),
                        createInhabitant({ heynaboId: 2 })
                    ],
                    incoming: [createInhabitant({ heynaboId: 1 })],
                    expectedDelete: 1
                }
            ])('$scenario → deletes $expectedDelete', ({ existing, incoming, expectedDelete }) => {
                const result = reconcileInhabitants(existing)(incoming)
                expect(result.delete).toHaveLength(expectedDelete)
            })
        })

        describe('update - changed inhabitants in Heynabo', () => {
            it.each([
                {
                    scenario: 'name changed',
                    existing: [createInhabitant({ heynaboId: 1, name: 'Old' })],
                    incoming: [createInhabitant({ heynaboId: 1, name: 'New' })],
                    expectedUpdate: 1
                },
                {
                    scenario: 'lastName changed',
                    existing: [createInhabitant({ heynaboId: 1, lastName: 'Old' })],
                    incoming: [createInhabitant({ heynaboId: 1, lastName: 'New' })],
                    expectedUpdate: 1
                },
                {
                    scenario: 'pictureUrl changed',
                    existing: [createInhabitant({ heynaboId: 1, pictureUrl: null })],
                    incoming: [createInhabitant({ heynaboId: 1, pictureUrl: 'https://example.com/pic.jpg' })],
                    expectedUpdate: 1
                },
                {
                    scenario: 'no changes',
                    existing: [createInhabitant({ heynaboId: 1, name: 'Same', lastName: 'Same', pictureUrl: null })],
                    incoming: [createInhabitant({ heynaboId: 1, name: 'Same', lastName: 'Same', pictureUrl: null })],
                    expectedUpdate: 0
                }
            ])('$scenario → updates $expectedUpdate', ({ existing, incoming, expectedUpdate }) => {
                const result = reconcileInhabitants(existing)(incoming)
                expect(result.update).toHaveLength(expectedUpdate)
            })
        })

        describe('complex scenarios', () => {
            it('handles mixed create/update/delete/idempotent', () => {
                const existing = [
                    createInhabitant({ heynaboId: 1, name: 'Unchanged' }),
                    createInhabitant({ heynaboId: 2, name: 'Will Update' }),
                    createInhabitant({ heynaboId: 3, name: 'Will Delete' })
                ]
                const incoming = [
                    createInhabitant({ heynaboId: 1, name: 'Unchanged' }),
                    createInhabitant({ heynaboId: 2, name: 'Updated Name' }),
                    createInhabitant({ heynaboId: 4, name: 'New Person' })
                ]

                const result = reconcileInhabitants(existing)(incoming)

                expect(result.idempotent).toHaveLength(1)
                expect(result.update).toHaveLength(1)
                expect(result.delete).toHaveLength(1)
                expect(result.create).toHaveLength(1)

                expect(result.delete[0]!.heynaboId).toBe(3)
                expect(result.create[0]!.heynaboId).toBe(4)
                expect(result.update[0]!.heynaboId).toBe(2)
            })
        })
    })
})
