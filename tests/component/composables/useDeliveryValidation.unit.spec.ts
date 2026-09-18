import {describe, expect, it} from 'vitest'
import {deliveredVersions, useDeliveryValidation} from '~/composables/useDeliveryValidation'

const {DeliveryKindSchema, DeliverySubjectSchema, DeliveredVersionsSchema} = useDeliveryValidation()

describe('deliveredVersions', () => {
    it.each([
        ['no rows', [], {ARCHIVE: 0, EMAIL: 0, SMS: 0}],
        ['one archive', [{kind: 'ARCHIVE', version: 1}], {ARCHIVE: 1, EMAIL: 0, SMS: 0}],
        ['several versions and a re-send', [{kind: 'ARCHIVE', version: 1}, {kind: 'EMAIL', version: 1}, {kind: 'ARCHIVE', version: 2}, {kind: 'EMAIL', version: 2}, {kind: 'EMAIL', version: 2}], {ARCHIVE: 2, EMAIL: 2, SMS: 0}]
    ] as const)('reduces %s to the highest version per kind', (_name, rows, expected) => {
        expect(deliveredVersions([...rows])).toEqual(expected)
    })
})

describe('enums', () => {
    it('re-exports the delivery kinds and subjects from the generated layer (ADR-001)', () => {
        expect(DeliveryKindSchema.options).toEqual(['ARCHIVE', 'EMAIL', 'SMS'])
        expect(DeliverySubjectSchema.options).toEqual(['BILLING_PERIOD'])
    })

    it('tracks a delivered version for every kind', () => {
        expect(Object.keys(DeliveredVersionsSchema.shape)).toEqual(DeliveryKindSchema.options)
    })
})
