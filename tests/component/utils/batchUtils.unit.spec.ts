import {describe, it, expect} from 'vitest'
import {chunkArray} from '~/utils/batchUtils'

describe('batchUtils', () => {
    describe('chunkArray', () => {
        const chunkBy3 = chunkArray<number>(3)
        const chunkBy5 = chunkArray<string>(5)

        it.each([
            {input: [], size: 3, expected: []},
            {input: [1], size: 3, expected: [[1]]},
            {input: [1, 2], size: 3, expected: [[1, 2]]},
            {input: [1, 2, 3], size: 3, expected: [[1, 2, 3]]},
            {input: [1, 2, 3, 4], size: 3, expected: [[1, 2, 3], [4]]},
            {input: [1, 2, 3, 4, 5, 6], size: 3, expected: [[1, 2, 3], [4, 5, 6]]},
            {input: [1, 2, 3, 4, 5, 6, 7], size: 3, expected: [[1, 2, 3], [4, 5, 6], [7]]},
        ])('chunks array of $input.length items into batches of $size', ({input, expected}) => {
            expect(chunkBy3(input)).toEqual(expected)
        })

        it('works with different types', () => {
            expect(chunkBy5(['a', 'b', 'c', 'd', 'e', 'f'])).toEqual([['a', 'b', 'c', 'd', 'e'], ['f']])
        })

        it('returns curried function', () => {
            const chunkBy2 = chunkArray<number>(2)
            expect(typeof chunkBy2).toBe('function')
            expect(chunkBy2([1, 2, 3, 4, 5])).toEqual([[1, 2], [3, 4], [5]])
        })
    })
})
