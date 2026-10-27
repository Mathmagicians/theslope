import {describe, it, expect} from 'vitest'
import {findRowById, rowIdOf} from '~/utils/utils'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'

const allergyTypes = AllergyFactory.createMockAllergyTypesWithInhabitants()
const [, peanuts] = allergyTypes
// The booking form's rows beside the people carry string ids
const bookingRows = [{id: 'power-mode'}, {id: 'guest-group-1'}]
const [, guestGroup] = bookingRows

describe('findRowById', () => {
    it.each([
        {among: 'the allergy types', rows: allergyTypes, rowId: rowIdOf(peanuts!), finds: 'Jordnødder', expected: peanuts},
        {among: 'the booking rows', rows: bookingRows, rowId: rowIdOf(guestGroup!), finds: 'the guest group', expected: guestGroup},
        {among: 'the allergy types', rows: allergyTypes, rowId: rowIdOf(guestGroup!), finds: 'none', expected: undefined},
        {among: 'no rows', rows: [], rowId: rowIdOf(peanuts!), finds: 'none', expected: undefined}
    ])('among $among the row id $rowId finds $finds', ({rows, rowId, expected}) => {
        expect(findRowById(rows, rowId)).toBe(expected)
    })
})
