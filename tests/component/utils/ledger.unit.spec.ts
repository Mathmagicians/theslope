import {describe, it, expect} from 'vitest'
import {sumAmounts} from '~/utils/ledger'

describe('sumAmounts', () => {
    it.each([
        {desc: 'two rows', rows: [{amount: 101200}, {amount: 29800}], expected: 131000},
        {desc: 'one row', rows: [{amount: 500}], expected: 500},
        {desc: 'no rows', rows: [], expected: 0},
        {desc: 'a missing relation', rows: undefined, expected: 0},
        {desc: 'a null relation', rows: null, expected: 0}
    ])('GIVEN $desc WHEN summing THEN returns the øre total', ({rows, expected}) => {
        expect(sumAmounts(rows)).toBe(expected)
    })
})
