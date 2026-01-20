import {describe, it, expect} from 'vitest'
import {chunkArray, groupBy, pruneAndCreate} from '~/utils/batchUtils'

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

    describe('groupBy', () => {
        // Use enum-like constants matching ADR-001 pattern
        const OrderState = { BOOKED: 'BOOKED', RELEASED: 'RELEASED' } as const
        const DinnerMode = { DINEIN: 'DINEIN', TAKEAWAY: 'TAKEAWAY', LATE: 'LATE', NONE: 'NONE' } as const

        type OrderStateType = typeof OrderState[keyof typeof OrderState]
        type DinnerModeType = typeof DinnerMode[keyof typeof DinnerMode]

        interface Order { id: number; state: OrderStateType; mode: DinnerModeType }

        const groupByState = groupBy<Order, string>(o => o.state)
        const groupByMode = groupBy<Order, string>(o => o.mode)

        it.each([
            {
                scenario: 'empty array → empty map',
                input: [] as Order[],
                keyFn: (o: Order) => o.state,
                expectedSize: 0
            },
            {
                scenario: 'single item → single group',
                input: [{ id: 1, state: OrderState.BOOKED, mode: DinnerMode.DINEIN }],
                keyFn: (o: Order) => o.state,
                expectedSize: 1
            },
            {
                scenario: 'same key → single group with multiple items',
                input: [
                    { id: 1, state: OrderState.BOOKED, mode: DinnerMode.DINEIN },
                    { id: 2, state: OrderState.BOOKED, mode: DinnerMode.TAKEAWAY }
                ],
                keyFn: (o: Order) => o.state,
                expectedSize: 1
            },
            {
                scenario: 'different keys → multiple groups',
                input: [
                    { id: 1, state: OrderState.BOOKED, mode: DinnerMode.DINEIN },
                    { id: 2, state: OrderState.RELEASED, mode: DinnerMode.DINEIN },
                    { id: 3, state: OrderState.BOOKED, mode: DinnerMode.TAKEAWAY }
                ],
                keyFn: (o: Order) => o.state,
                expectedSize: 2
            }
        ])('$scenario', ({ input, keyFn, expectedSize }) => {
            const grouper = groupBy<Order, string>(keyFn)
            const result = grouper(input)
            expect(result.size).toBe(expectedSize)
        })

        it('groups by state correctly', () => {
            const orders: Order[] = [
                { id: 1, state: OrderState.BOOKED, mode: DinnerMode.DINEIN },
                { id: 2, state: OrderState.RELEASED, mode: DinnerMode.DINEIN },
                { id: 3, state: OrderState.BOOKED, mode: DinnerMode.TAKEAWAY },
                { id: 4, state: OrderState.RELEASED, mode: DinnerMode.LATE }
            ]
            const result = groupByState(orders)

            expect(result.get(OrderState.BOOKED)?.map(o => o.id)).toEqual([1, 3])
            expect(result.get(OrderState.RELEASED)?.map(o => o.id)).toEqual([2, 4])
        })

        it('groups by mode correctly', () => {
            const orders: Order[] = [
                { id: 1, state: OrderState.BOOKED, mode: DinnerMode.DINEIN },
                { id: 2, state: OrderState.RELEASED, mode: DinnerMode.DINEIN },
                { id: 3, state: OrderState.BOOKED, mode: DinnerMode.TAKEAWAY }
            ]
            const result = groupByMode(orders)

            expect(result.get(DinnerMode.DINEIN)?.map(o => o.id)).toEqual([1, 2])
            expect(result.get(DinnerMode.TAKEAWAY)?.map(o => o.id)).toEqual([3])
        })

        it('groups by composite key (ADR-014 order update signature)', () => {
            interface UpdateSpec { orderId: number; state: OrderStateType; mode: DinnerModeType; priceId: number | null }
            const getSignature = (u: UpdateSpec) => `${u.state}-${u.mode}-${u.priceId ?? 'same'}`
            const groupBySignature = groupBy<UpdateSpec, string>(getSignature)

            const updates: UpdateSpec[] = [
                { orderId: 1, state: OrderState.BOOKED, mode: DinnerMode.DINEIN, priceId: null },
                { orderId: 2, state: OrderState.BOOKED, mode: DinnerMode.DINEIN, priceId: null },
                { orderId: 3, state: OrderState.BOOKED, mode: DinnerMode.TAKEAWAY, priceId: null },
                { orderId: 4, state: OrderState.RELEASED, mode: DinnerMode.NONE, priceId: null },
                { orderId: 5, state: OrderState.BOOKED, mode: DinnerMode.DINEIN, priceId: 100 }
            ]

            const result = groupBySignature(updates)

            expect(result.size).toBe(4)
            expect(result.get(`${OrderState.BOOKED}-${DinnerMode.DINEIN}-same`)?.map(u => u.orderId)).toEqual([1, 2])
            expect(result.get(`${OrderState.BOOKED}-${DinnerMode.TAKEAWAY}-same`)?.map(u => u.orderId)).toEqual([3])
            expect(result.get(`${OrderState.RELEASED}-${DinnerMode.NONE}-same`)?.map(u => u.orderId)).toEqual([4])
            expect(result.get(`${OrderState.BOOKED}-${DinnerMode.DINEIN}-100`)?.map(u => u.orderId)).toEqual([5])
        })

        it('returns curried function', () => {
            const grouper = groupBy<Order, string>(o => o.state)
            expect(typeof grouper).toBe('function')
        })
    })

    describe('pruneAndCreate', () => {
        interface Item { id?: number; value: string }

        const getKey = (item: Item) => item.id
        const isEqual = (a: Item, b: Item) => a.value === b.value
        const reconcile = pruneAndCreate<Item, Item, number | undefined>(getKey, isEqual)

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
            const reconcileNoEqual = pruneAndCreate<Item, Item, number | undefined>(getKey)
            const result = reconcileNoEqual([{ id: 1, value: 'same' }])([{ id: 1, value: 'same' }])

            expect(result.update).toHaveLength(1)
            expect(result.idempotent).toHaveLength(0)
        })
    })
})
