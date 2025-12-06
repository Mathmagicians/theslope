import {describe, it, expect} from 'vitest'
import {chunkArray, pruneAndCreate} from '~/utils/batchUtils'

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

    describe('pruneAndCreate', () => {
        interface Item { id?: number; value: string }

        const getKey = (item: Item) => item.id
        const isEqual = (a: Item, b: Item) => a.value === b.value
        const reconcile = pruneAndCreate<Item, number>(getKey, isEqual)

        it.each([
            {
                scenario: 'new items without id → create',
                existing: [],
                incoming: [{ value: 'new1' }, { value: 'new2' }],
                expected: { create: 2, update: 0, idempotent: 0, delete: 0 }
            },
            {
                scenario: 'unknown id → create + delete existing',
                existing: [{ id: 1, value: 'existing' }],
                incoming: [{ id: 99, value: 'new' }],
                expected: { create: 1, update: 0, idempotent: 0, delete: 1 }
            },
            {
                scenario: 'unchanged items → idempotent',
                existing: [{ id: 1, value: 'same' }],
                incoming: [{ id: 1, value: 'same' }],
                expected: { create: 0, update: 0, idempotent: 1, delete: 0 }
            },
            {
                scenario: 'changed items → update',
                existing: [{ id: 1, value: 'old' }],
                incoming: [{ id: 1, value: 'new' }],
                expected: { create: 0, update: 1, idempotent: 0, delete: 0 }
            },
            {
                scenario: 'missing items → delete',
                existing: [{ id: 1, value: 'a' }, { id: 2, value: 'b' }],
                incoming: [{ id: 1, value: 'a' }],
                expected: { create: 0, update: 0, idempotent: 1, delete: 1 }
            },
            {
                scenario: 'mixed: all categories',
                existing: [{ id: 1, value: 'unchanged' }, { id: 2, value: 'will-change' }, { id: 3, value: 'will-delete' }],
                incoming: [{ id: 1, value: 'unchanged' }, { id: 2, value: 'changed' }, { value: 'brand-new' }],
                expected: { create: 1, update: 1, idempotent: 1, delete: 1 }
            }
        ])('$scenario', ({ existing, incoming, expected }) => {
            const result = reconcile(existing)(incoming)

            expect(result.create).toHaveLength(expected.create)
            expect(result.update).toHaveLength(expected.update)
            expect(result.idempotent).toHaveLength(expected.idempotent)
            expect(result.delete).toHaveLength(expected.delete)
        })

        it('returns curried function', () => {
            const withExisting = reconcile([{ id: 1, value: 'a' }])
            expect(typeof withExisting).toBe('function')
        })

        it('without isEqual → identical items categorized as update', () => {
            const reconcileNoEqual = pruneAndCreate<Item, number>(getKey)
            const result = reconcileNoEqual([{ id: 1, value: 'same' }])([{ id: 1, value: 'same' }])

            expect(result.update).toHaveLength(1)
            expect(result.idempotent).toHaveLength(0)
        })
    })
})
