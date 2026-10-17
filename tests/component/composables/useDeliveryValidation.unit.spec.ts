import {describe, expect, it} from 'vitest'
import {deliveredVersions, useDeliveryValidation} from '~/composables/useDeliveryValidation'

const {DeliveryKindSchema, DeliveredVersionsSchema} = useDeliveryValidation()
const {ARCHIVE, EMAIL, SMS} = DeliveryKindSchema.enum

describe('deliveredVersions', () => {
    it.each([
        ['no rows', [], {[ARCHIVE]: 0, [EMAIL]: 0, [SMS]: 0}],
        ['several versions and a re-send', [{kind: ARCHIVE, version: 1}, {kind: EMAIL, version: 1}, {kind: ARCHIVE, version: 2}, {kind: EMAIL, version: 2}, {kind: EMAIL, version: 2}], {[ARCHIVE]: 2, [EMAIL]: 2, [SMS]: 0}]
    ] as const)('reduces %s to the highest version per kind', (_name, rows, expected) => {
        expect(deliveredVersions([...rows])).toEqual(expected)
    })
})

describe('DeliveredVersionsSchema', () => {
    it('tracks a delivered version for every kind', () => {
        expect(Object.keys(DeliveredVersionsSchema.shape)).toEqual(DeliveryKindSchema.options)
    })
})
