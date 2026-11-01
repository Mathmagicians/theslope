import {describe, it, expect} from 'vitest'
import {krToOre, sumAmounts} from '~/utils/ledger'

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

describe('krToOre', () => {
    it.each([
        {desc: 'whole kroner', amountKr: 40, expected: 4000},
        {desc: 'kroner and øre', amountKr: 17.5, expected: 1750},
        {desc: 'an amount whose times 100 lands off the whole øre', amountKr: 19.99, expected: 1999},
        {desc: 'a sum of floats', amountKr: 0.1 + 0.2, expected: 30},
        {desc: 'nothing', amountKr: 0, expected: 0},
        {desc: 'a refund', amountKr: -12.25, expected: -1225}
    ])('GIVEN $desc WHEN converting THEN returns the whole øre', ({amountKr, expected}) => {
        expect(krToOre(amountKr)).toBe(expected)
    })
})
