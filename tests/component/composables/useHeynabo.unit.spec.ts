import { describe, expect, it } from 'vitest'
import { reconcileHouseholds, reconcileInhabitants, reconcileUsers, mergeHouseholdForUpdate } from '~/composables/useHeynabo'
import type { HouseholdDisplay } from '~/composables/useCoreValidation'
import {
    householdReconciliationTestData,
    inhabitantReconciliationTestData,
    userReconciliationTestData
} from '~~/tests/e2e/testDataFactories/reconciliationTestData'

// Extract heynaboId from either InhabitantData (heynaboId) or UserDisplay (Inhabitant.heynaboId)
const getHeynaboId = (item: { heynaboId?: number, Inhabitant?: { heynaboId: number } | null }): number =>
    item.heynaboId ?? item.Inhabitant?.heynaboId ?? 0

const verifyReconciliation = <E, I>(
    result: { idempotent: E[], update: E[], delete: E[], create: I[] },
    expected: { idempotent: { heynaboIds: number[] }, update: { heynaboIds: number[] }, delete: { heynaboIds: number[] }, create: { heynaboIds: number[] } }
) => {
    const sorted = (arr: number[]) => [...arr].sort((a, b) => a - b)
    expect(sorted(result.idempotent.map(getHeynaboId))).toEqual(sorted(expected.idempotent.heynaboIds))
    expect(sorted(result.update.map(getHeynaboId))).toEqual(sorted(expected.update.heynaboIds))
    expect(sorted(result.delete.map(getHeynaboId))).toEqual(sorted(expected.delete.heynaboIds))
    expect(sorted(result.create.map(getHeynaboId))).toEqual(sorted(expected.create.heynaboIds))
}

describe('useHeynabo', () => {

    describe('reconcileHouseholds', () => {
        it('reconciles all 4 outcomes: idempotent, update, delete, create', () => {
            const { existing, incoming, expected } = householdReconciliationTestData
            const result = reconcileHouseholds(existing)(incoming)
            verifyReconciliation(result, expected)
        })
    })

    describe('reconcileInhabitants', () => {
        it('reconciles all 4 outcomes: idempotent, update, delete, create', () => {
            const { existing, incoming, expected } = inhabitantReconciliationTestData
            const result = reconcileInhabitants(existing)(incoming)
            verifyReconciliation(result, expected)
        })
    })

    describe('reconcileUsers', () => {
        it('reconciles all 4 outcomes: idempotent, update, delete, create', () => {
            const { existing, incoming, expected } = userReconciliationTestData
            const result = reconcileUsers(existing)(incoming)
            verifyReconciliation(result, expected)
        })
    })

    // ========================================================================
    // MERGE HOUSEHOLD FOR UPDATE - Preserves TheSlope-owned fields
    // ========================================================================

    describe('mergeHouseholdForUpdate', () => {
        it('preserves TheSlope-owned fields (pbsId, movedInDate, moveOutDate) from existing', () => {
            const { existing, incoming } = householdReconciliationTestData
            const existingHousehold = { ...existing[1], id: 1, shortName: 'ON' } as HouseholdDisplay
            const incomingHousehold = incoming[1]

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
