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

// The delivery read's query (GET /api/admin/sender/delivery): one subject type and its subjects' ids, one or repeated
describe('DeliveryQuerySchema', () => {
    const {DeliveryQuerySchema, DeliverySubjectSchema} = useDeliveryValidation()
    const {BILLING_PERIOD} = DeliverySubjectSchema.enum

    it.each([
        {query: 'one id', given: {subjectType: BILLING_PERIOD, subjectIds: '7'}, ids: [7]},
        {query: 'repeated ids', given: {subjectType: BILLING_PERIOD, subjectIds: ['7', '8']}, ids: [7, 8]}
    ])('GIVEN $query WHEN parsed THEN it reads the ids as numbers', ({given, ids}) => {
        expect(DeliveryQuerySchema.parse(given)).toEqual({subjectType: BILLING_PERIOD, subjectIds: ids})
    })

    it.each([
        {query: 'an unknown subject type', given: {subjectType: 'NOT_A_SUBJECT', subjectIds: '7'}},
        {query: 'an id that is no number', given: {subjectType: BILLING_PERIOD, subjectIds: 'abc'}}
    ])('GIVEN $query WHEN parsed THEN it is refused', ({given}) => {
        expect(DeliveryQuerySchema.safeParse(given).success).toBe(false)
    })
})
