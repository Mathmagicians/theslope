import {describe, it, expect, vi} from 'vitest'
import {chunkArray, groupBy, partition, pruneAndCreate, writeBatchOrEach} from '~/utils/batchUtils'
import {useBookingValidation} from '~/composables/useBookingValidation'

const {OrderStateSchema, DinnerModeSchema} = useBookingValidation()
const OrderState = OrderStateSchema.enum
const DinnerMode = DinnerModeSchema.enum

describe('batchUtils', () => {
    describe('chunkArray', () => {
        const chunkBy3 = chunkArray<number>(3)

        it.each([
            {input: [], size: 3, expected: []},
            {input: [1, 2], size: 3, expected: [[1, 2]]},
            {input: [1, 2, 3], size: 3, expected: [[1, 2, 3]]},
            {input: [1, 2, 3, 4, 5, 6, 7], size: 3, expected: [[1, 2, 3], [4, 5, 6], [7]]},
        ])('chunks array of $input.length items into batches of $size', ({input, expected}) => {
            expect(chunkBy3(input)).toEqual(expected)
        })
    })

    describe('partition', () => {
        const isEven = (n: number) => n % 2 === 0

        it.each([
            {input: [1, 2, 3, 4, 5], expected: [[2, 4], [1, 3, 5]]},
            {input: [], expected: [[], []]}
        ])('splits $input into the items that match and the rest, each in order', ({input, expected}) => {
            expect(partition(isEven)(input)).toEqual(expected)
        })
    })

    describe('groupBy', () => {
        interface Order { id: number; state: typeof OrderState[keyof typeof OrderState]; mode: typeof DinnerMode[keyof typeof DinnerMode] }

        const groupByState = groupBy<Order, string>(o => o.state)

        it('empty array → empty map', () => {
            expect(groupByState([]).size).toBe(0)
        })

        it('groups by state correctly', () => {
            const orders: Order[] = [
                { id: 1, state: OrderState.BOOKED, mode: DinnerMode.DINEIN },
                { id: 2, state: OrderState.RELEASED, mode: DinnerMode.DINEIN },
                { id: 3, state: OrderState.BOOKED, mode: DinnerMode.TAKEAWAY },
                { id: 4, state: OrderState.RELEASED, mode: DinnerMode.LATE }
            ]
            const result = groupByState(orders)

            expect(result.size).toBe(2)
            expect(result.get(OrderState.BOOKED)?.map(o => o.id)).toEqual([1, 3])
            expect(result.get(OrderState.RELEASED)?.map(o => o.id)).toEqual([2, 4])
        })
    })

    describe('pruneAndCreate', () => {
        interface Item { id?: number; value: string }

        const getKey = (item: Item) => item.id
        const isEqual = (a: Item, b: Item) => a.value === b.value
        const reconcile = pruneAndCreate<Item, Item, number | undefined>(getKey, isEqual)

        it.each([
            {
                scenario: 'unknown id → create + delete existing',
                existing: [{ id: 1, value: 'existing' }],
                incoming: [{ id: 99, value: 'new' }],
                expected: { create: 1, update: 0, idempotent: 0, delete: 1 }
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

        it('without isEqual → identical items categorized as update', () => {
            const reconcileNoEqual = pruneAndCreate<Item, Item, number | undefined>(getKey)
            const result = reconcileNoEqual([{ id: 1, value: 'same' }])([{ id: 1, value: 'same' }])

            expect(result.update).toHaveLength(1)
            expect(result.idempotent).toHaveLength(0)
        })
    })
})

describe('writeBatchOrEach', () => {
    const collect = () => {
        const done: number[] = []
        const failed: number[] = []
        return {done, failed, onDone: (items: number[]) => done.push(...items), onFailed: (item: number) => failed.push(item)}
    }

    it('writes a batch once and reports every item done', async () => {
        const write = vi.fn().mockResolvedValue(undefined)
        const {done, failed, onDone, onFailed} = collect()

        await writeBatchOrEach([1, 2, 3], write, onDone, onFailed)

        expect(write).toHaveBeenCalledTimes(1)
        expect({done, failed}).toEqual({done: [1, 2, 3], failed: []})
    })

    it('writes the items one by one when the batch fails, and reports only the failing item', async () => {
        const write = vi.fn(async (items: number[]) => {
            if (items.includes(2)) throw new Error('UNIQUE constraint failed')
        })
        const {done, failed, onDone, onFailed} = collect()

        await writeBatchOrEach([1, 2, 3], write, onDone, onFailed)

        expect(write).toHaveBeenCalledTimes(4)
        expect({done, failed}).toEqual({done: [1, 3], failed: [2]})
    })
})
