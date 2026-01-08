import { describe, expect, it } from 'vitest'
import { reconcileHouseholds, reconcileInhabitants, reconcileUsers, mergeHouseholdForUpdate } from '~/composables/useHeynabo'
import type { HouseholdDisplay } from '~/composables/useCoreValidation'
import {
    householdReconciliationTestData,
    inhabitantReconciliationTestData,
    userReconciliationTestData
} from '~~/tests/e2e/testDataFactories/reconciliationTestData'

// Matches PruneAndCreateResult<E, I>: delete is E[], everything else is I[]
const verifyReconciliation = <E, I>(
    result: { idempotent: I[], update: I[], delete: E[], create: I[] },
    expected: { idempotent: number[], update: number[], delete: number[], create: number[] },
    getDeleteKey: (e: E) => number,
    getKey: (i: I) => number = getDeleteKey as unknown as (i: I) => number
) => {
    expect(result.idempotent.map(getKey).sort()).toEqual(expected.idempotent.sort())
    expect(result.update.map(getKey).sort()).toEqual(expected.update.sort())
    expect(result.delete.map(getDeleteKey).sort()).toEqual(expected.delete.sort())
    expect(result.create.map(getKey).sort()).toEqual(expected.create.sort())
}

describe('useHeynabo', () => {

    describe('reconcileHouseholds', () => {
        it('reconciles all 4 outcomes: idempotent, update, delete, create', () => {
            const { existing, incoming, expected } = householdReconciliationTestData
            const result = reconcileHouseholds(existing)(incoming)
            const expectedKeys = {
                idempotent: expected.idempotent.heynaboIds,
                update: expected.update.heynaboIds,
                delete: expected.delete.heynaboIds,
                create: expected.create.heynaboIds
            }
            verifyReconciliation(result, expectedKeys, h => h.heynaboId)
        })
    })

    describe('reconcileInhabitants', () => {
        it('reconciles all 4 outcomes: idempotent, update, delete, create', () => {
            const { existing, incoming, expected } = inhabitantReconciliationTestData
            const result = reconcileInhabitants(existing)(incoming)
            const expectedKeys = {
                idempotent: expected.idempotent.heynaboIds,
                update: expected.update.heynaboIds,
                delete: expected.delete.heynaboIds,
                create: expected.create.heynaboIds
            }
            verifyReconciliation(result, expectedKeys, i => i.heynaboId)
        })
    })

    describe('reconcileUsers', () => {
        it('reconciles all 4 outcomes: idempotent, update, delete, create', () => {
            const { existing, incoming, expected } = userReconciliationTestData
            const result = reconcileUsers(existing)(incoming)
            const expectedKeys = {
                idempotent: expected.idempotent.heynaboIds,
                update: expected.update.heynaboIds,
                delete: expected.delete.heynaboIds,
                create: expected.create.heynaboIds
            }
            verifyReconciliation(result, expectedKeys, u => u.Inhabitant?.heynaboId ?? 0, i => i.heynaboId)
        })
    })

    // ========================================================================
    // MERGE HOUSEHOLD FOR UPDATE - Preserves TheSlope-owned fields
    // ========================================================================

    describe('mergeHouseholdForUpdate', () => {
        it('preserves TheSlope-owned fields (pbsId, movedInDate, moveOutDate) from existing', () => {
            const { existing, incoming } = householdReconciliationTestData
            const existingHousehold = { ...existing[1]!, id: 1, shortName: 'ON' } as HouseholdDisplay
            const incomingHousehold = incoming[1]!

            const result = mergeHouseholdForUpdate(incomingHousehold, existingHousehold)

            // Heynabo-owned fields come from incoming
            expect(result.name).toBe(incomingHousehold.name)
            expect(result.address).toBe(incomingHousehold.address)
            expect(result.heynaboId).toBe(incomingHousehold.heynaboId)

            // TheSlope-owned fields preserved from existing
            expect(result.pbsId).toBe(existingHousehold.pbsId)
            expect(result.movedInDate).toEqual(existingHousehold.movedInDate)
            expect(result.moveOutDate).toEqual(existingHousehold.moveOutDate)
        })
    })
})
