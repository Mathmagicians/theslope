import {beforeAll, beforeEach, describe, expect, it, vi} from 'vitest'
import {createError} from 'h3'
import {DatabaseSync, type SQLInputValue} from 'node:sqlite'
import {readdirSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import {
    countReleasedTicketsByType, createOrders, deleteOrder, fetchDinnerEventsByIds, fetchOrders, recordDeliveries, updateOrdersBatch
} from '~~/server/data/financesRepository'
import {useDeliveryValidation, type DeliveryCreate} from '~/composables/useDeliveryValidation'
import {useBookingValidation, OrderAuditAction} from '~/composables/useBookingValidation'
import type {HouseholdDetail} from '~/composables/useCoreValidation'
import {callsInFlight, statementsInCallOrder} from '~~/tests/component/data/fakePrismaClient'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'

// The repository builds its errors with createError from the Nitro auto-import scope the unit runtime lacks
vi.stubGlobal('createError', createError)

// The unit runtime has no D1: a client standing for the binding answers each statement from the test
const {fakePrisma, rawQuery} = await vi.hoisted(async () => ({
    fakePrisma: (await import('~~/tests/component/data/fakePrismaClient')).fakePrismaClient({
        inhabitant: ['findMany'],
        order: ['createManyAndReturn', 'findMany', 'updateMany', 'deleteMany'],
        orderHistory: ['createMany'],
        dinnerEvent: ['findMany'],
        ticketPrice: ['findMany'],
        delivery: ['createManyAndReturn']
    }),
    rawQuery: vi.fn()
}))
vi.mock('~~/server/utils/database', () => ({getPrismaClientConnection: async () => ({...fakePrisma, $queryRawUnsafe: rawQuery})}))

const {TicketTypeSchema, OrderStateSchema, DinnerModeSchema, OrderAuditChangeSchema, OrderAuditSourceSchema, readOrderAudit} = useBookingValidation()
const CORRECTION = OrderAuditSourceSchema.enum['admin-correction']
const {ADULT, CHILD} = TicketTypeSchema.enum
const d1Client = {} as D1Database

// A person as the history rows name them: the name and the household's address the short name comes from
const holderOf = (person: HouseholdDetail['inhabitants'][number], household: HouseholdDetail) =>
    ({id: person.id, name: person.name, lastName: person.lastName, householdId: household.id, household: {address: household.address}})
const historyRows = () => fakePrisma.orderHistory.createMany.mock.calls.flatMap(([{data}]) => data)

beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fakePrisma.orderHistory.createMany.mockImplementation(async ({data}: {data: unknown[]}) => ({count: data.length}))
})

describe('createOrders', () => {
    it('GIVEN orders for two people WHEN the insert hands its rows back in reverse THEN each history row pairs its order id with its own order, and the ids come back in insert order', async () => {
        const household = HouseholdFactory.defaultHouseholdDetail()
        const people = household.inhabitants
        fakePrisma.inhabitant.findMany.mockResolvedValue(people.map(person => holderOf(person, household)))
        // SQLite numbers the rows in insert order; its RETURNING hands them back in an order of its own
        fakePrisma.order.createManyAndReturn.mockImplementation(async ({data}: {data: unknown[]}) => data.map((_, index) => ({id: 101 + index})).reverse())
        const orders = people.map(person => OrderFactory.defaultOrderCreateWithPrice(household.id, {inhabitantId: person.id}))

        const {createdIds} = await createOrders(d1Client, household.id, orders, OrderFactory.defaultAuditContext())

        expect(createdIds).toEqual([101, 102])
        expect(historyRows().map(row => [row.orderId, row.inhabitantId])).toEqual([[101, people[0]!.id], [102, people[1]!.id]])
    })
})

// A member cancels two of the household's booked orders: the delete comes first, the history rows after it
describe('deleteOrder', () => {
    const givenBooked = () => {
        const household = HouseholdFactory.defaultHouseholdDetail()
        const rows = household.inhabitants.map((person, index) => ({
            ...OrderFactory.defaultOrder(undefined, {id: 201 + index, inhabitantId: person.id}),
            ticketPrice: {ticketType: ADULT}, dinnerEvent: {seasonId: 3}, inhabitant: holderOf(person, household)
        }))
        fakePrisma.order.findMany.mockResolvedValue(rows)
        return rows.map(({id}) => id)
    }

    it('GIVEN booked orders WHEN an admin\'s correction cancels them THEN they are read, deleted, then one CANCEL row each names no order, keeps the order in its snapshot and names the run\'s source', async () => {
        const orderIds = givenBooked()
        fakePrisma.order.deleteMany.mockResolvedValue({count: orderIds.length})

        await deleteOrder(d1Client, orderIds, 7, CORRECTION)

        expect(statementsInCallOrder(fakePrisma)).toEqual(['order.findMany', 'order.deleteMany', 'orderHistory.createMany'])
        expect(historyRows().map(row => ({orderId: row.orderId, action: row.action, audit: readOrderAudit(row)})))
            .toEqual(orderIds.map(orderId => ({
                orderId: null, action: OrderAuditAction.USER_CANCELLED,
                audit: expect.objectContaining({orderId, change: OrderAuditChangeSchema.enum.CANCEL, source: CORRECTION})
            })))
    })

    it('GIVEN a delete the database refuses WHEN a member cancels THEN no CANCEL row is written', async () => {
        const orderIds = givenBooked()
        fakePrisma.order.deleteMany.mockRejectedValue(new Error('D1 down'))

        await expect(deleteOrder(d1Client, orderIds, 7)).rejects.toThrow('D1 down')
        expect(fakePrisma.orderHistory.createMany).not.toHaveBeenCalled()
    })
})

// A batch update's history row keeps its order as the update left it
describe('updateOrdersBatch', () => {
    it('GIVEN a release in an admin\'s correction WHEN written THEN its history row names the change and the run\'s source in its audit data', async () => {
        const household = HouseholdFactory.defaultHouseholdDetail()
        const person = household.inhabitants[0]!
        const order = {...OrderFactory.defaultOrder(undefined, {id: 301, inhabitantId: person.id, state: OrderStateSchema.enum.RELEASED}), inhabitant: holderOf(person, household)}
        fakePrisma.order.updateMany.mockResolvedValue({count: 1})
        fakePrisma.order.findMany.mockResolvedValue([order])

        await updateOrdersBatch()(d1Client, [{
            orderId: order.id, state: OrderStateSchema.enum.RELEASED, dinnerMode: DinnerModeSchema.enum.NONE, ticketPriceId: null, priceAtBooking: null, isNewRelease: true,
            audit: {
                action: OrderAuditAction.USER_CANCELLED, change: OrderAuditChangeSchema.enum.RELEASE, source: CORRECTION,
                performedByUserId: 7, inhabitantId: person.id, dinnerEventId: order.dinnerEventId, seasonId: 3
            }
        }])

        const [row] = historyRows()
        expect(readOrderAudit(row)).toEqual(expect.objectContaining({orderId: order.id, change: OrderAuditChangeSchema.enum.RELEASE, source: CORRECTION}))
        // The source lives in the audit data; the row holds the history table's columns
        expect(row).not.toHaveProperty('source')
    })
})

// A read over a list of ids takes the whole list and sends its chunks one after another, 90 ids each (ADR-014)
describe.each([
    {
        reader: 'fetchOrders', read: (ids: number[]) => fetchOrders(d1Client, ids),
        statement: rawQuery, idsOf: (call: unknown[]) => call.slice(1)
    },
    {
        reader: 'fetchDinnerEventsByIds', read: (ids: number[]) => fetchDinnerEventsByIds(d1Client, ids),
        statement: fakePrisma.dinnerEvent.findMany, idsOf: ([{where}]: [{where: {id: {in: number[]}}}]) => where.id.in
    },
    {
        reader: 'the history read of updateOrdersBatch',
        read: (ids: number[]) => {
            fakePrisma.order.updateMany.mockImplementation(async ({where}: {where: {id: {in: number[]}}}) => ({count: where.id.in.length}))
            return updateOrdersBatch()(d1Client, ids.map(orderId => ({
                orderId, state: OrderStateSchema.enum.RELEASED, dinnerMode: DinnerModeSchema.enum.DINEIN, ticketPriceId: null, priceAtBooking: null, isNewRelease: true,
                audit: {action: OrderAuditAction.SYSTEM_UPDATED, change: OrderAuditChangeSchema.enum.RELEASE, performedByUserId: 1, inhabitantId: 1, dinnerEventId: 5, seasonId: 3}
            })))
        },
        statement: fakePrisma.order.findMany, idsOf: ([{where}]: [{where: {id: {in: number[]}}}]) => where.id.in
    }
])('$reader', ({read, statement, idsOf}) => {
    it('GIVEN 100 ids WHEN read THEN it reads 90, then the other 10, one read in flight at a time', async () => {
        const reads = callsInFlight()
        reads.answer(statement, async () => [])

        await read(Array.from({length: 100}, (_, index) => index + 1))

        expect(statement.mock.calls.map(call => idsOf(call as never).length)).toEqual([90, 10])
        expect(reads.peak).toBe(1)
    })
})

// D1 is SQLite: the read's raw statement runs on an in-memory SQLite built from the migrations, whose plan shows how
// the statement reaches the order history
describe('fetchOrders with provenance', () => {
    const {createOrderAuditData} = useBookingValidation()
    const {USER_BOOKED, USER_CANCELLED, USER_CLAIMED} = OrderAuditAction
    const DINNER_ID = 5
    const MIGRATIONS_DIR = join(process.cwd(), 'migrations')
    const at = (hour: number): string => new Date(Date.UTC(2026, 9, 1, hour)).toISOString()
    // An order's history row naming the household its snapshot keeps
    const historyRow = (id: number, orderId: number, action: OrderAuditAction, householdShortname: string, hour: number) => ({
        id, orderId, action, timestamp: at(hour),
        auditData: createOrderAuditData(action === USER_CLAIMED ? OrderAuditChangeSchema.enum.BUY : OrderAuditChangeSchema.enum.RELEASE,
            OrderFactory.defaultOrderSnapshot({id: orderId, dinnerEventId: DINNER_ID, householdShortname}))
    })
    // Order 1 is claimed twice and released after; order 2 is claimed twice at one moment; order 3 is booked, never claimed
    const history = [
        historyRow(1, 1, USER_CLAIMED, 'AR_1', 10), historyRow(2, 1, USER_CLAIMED, 'AR_2', 11), historyRow(3, 1, USER_CANCELLED, 'AR_9', 12),
        historyRow(4, 2, USER_CLAIMED, 'AR_3', 10), historyRow(5, 2, USER_CLAIMED, 'AR_4', 10),
        historyRow(6, 3, USER_BOOKED, 'AR_5', 10)
    ]
    let db: DatabaseSync
    beforeAll(() => {
        db = new DatabaseSync(':memory:')
        readdirSync(MIGRATIONS_DIR).filter(name => /^\d{4}_.*\.sql$/.test(name)).sort()
            .forEach(name => db.exec(readFileSync(join(MIGRATIONS_DIR, name), 'utf8')))
        // The rows stand alone: the dinner, the household and the users they name are left out
        db.exec('PRAGMA foreign_keys = OFF')
        // One regular order per inhabitant and dinner: order n is inhabitant n's
        const insertInhabitant = db.prepare('INSERT INTO Inhabitant (id, heynaboId, householdId, name, lastName) VALUES (?, ?, 1, ?, ?)')
        const insertOrder = db.prepare(`INSERT INTO "Order" (id, dinnerEventId, inhabitantId, priceAtBooking, dinnerMode, state, isGuestTicket, createdAt, updatedAt)
            VALUES (?, ${DINNER_ID}, ?, 4000, ?, ?, 0, ?, ?)`)
        for (const orderId of [1, 2, 3]) {
            insertInhabitant.run(orderId, orderId, `Anna ${orderId}`, 'Hansen')
            insertOrder.run(orderId, orderId, DinnerModeSchema.enum.DINEIN, OrderStateSchema.enum.BOOKED, at(orderId), at(orderId))
        }
        const insertHistory = db.prepare('INSERT INTO OrderHistory (id, orderId, action, auditData, timestamp) VALUES (?, ?, ?, ?, ?)')
        for (const row of history) insertHistory.run(row.id, row.orderId, row.action, row.auditData, row.timestamp)
    })
    beforeEach(() => {
        rawQuery.mockImplementation(async (sql: string, ...params: SQLInputValue[]) => db.prepare(sql).all(...params))
    })

    const readWithProvenance = () => fetchOrders(d1Client, [DINNER_ID], undefined, undefined, 'createdAt', true)

    it('GIVEN orders with their history WHEN read with their provenance THEN each order\'s history is searched on the order\'s id, never scanned', async () => {
        await readWithProvenance()

        const [[sql, ...params]] = rawQuery.mock.calls
        const plan = db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...params).map(({detail}) => String(detail))
        expect(plan.filter(step => step.includes('OrderHistory'))).toEqual([expect.stringMatching(/^SEARCH \w+ USING INDEX OrderHistory_orderId_idx \(orderId=\?\)$/)])
    })

    it('GIVEN orders claimed twice, claimed twice at one moment and never claimed WHEN read with their provenance THEN each claimed order names the household of its latest claim, by time then by row', async () => {
        const orders = await readWithProvenance()

        expect(orders.map(({id, provenanceHousehold}) => ({id, provenanceHousehold}))).toEqual([
            {id: 1, provenanceHousehold: 'AR_2'}, {id: 2, provenanceHousehold: 'AR_4'}, {id: 3, provenanceHousehold: undefined}
        ])
    })
})

describe('countReleasedTicketsByType', () => {
    it('GIVEN released tickets of two adult prices and a child price on a dinner WHEN counted THEN one statement answers every ticket type', async () => {
        fakePrisma.ticketPrice.findMany.mockResolvedValue([
            {ticketType: ADULT, _count: {orders: 2}}, {ticketType: ADULT, _count: {orders: 1}}, {ticketType: CHILD, _count: {orders: 1}}
        ])

        const counts = await countReleasedTicketsByType(d1Client, 5)

        expect(counts).toEqual(new Map([[ADULT, 3], [CHILD, 1]]))
        expect(statementsInCallOrder(fakePrisma)).toEqual(['ticketPrice.findMany'])
        expect(fakePrisma.ticketPrice.findMany).toHaveBeenCalledWith(expect.objectContaining({
            select: expect.objectContaining({_count: {select: {orders: {where: {dinnerEventId: 5, state: OrderStateSchema.enum.RELEASED}}}}})
        }))
    })
})

describe('recordDeliveries', () => {
    const {DeliverySubjectSchema, DeliveryKindSchema} = useDeliveryValidation()
    // A Delivery row of a mail about an order; the run's id when the mail went in a job run
    const rowOf = (orderId: number, jobRunId?: number): DeliveryCreate => ({
        subjectType: DeliverySubjectSchema.enum.ORDER, subjectId: orderId, version: 1, kind: DeliveryKindSchema.enum.EMAIL, reference: `TICKET_SOLD:EMAIL:user-${orderId}/a***@e***.com:id`, jobRunId
    })

    it('GIVEN the rows of a run\'s mails WHEN recorded THEN one statement writes them all, a row sent outside a job run with its job run null', async () => {
        fakePrisma.delivery.createManyAndReturn.mockImplementation(async ({data}: {data: object[]}) => data.map((row, index) => ({...row, id: index + 1, deliveredAt: new Date()})))

        const recorded = await recordDeliveries(d1Client, [rowOf(77), rowOf(78, 5)])

        expect(statementsInCallOrder(fakePrisma)).toEqual(['delivery.createManyAndReturn'])
        expect(fakePrisma.delivery.createManyAndReturn.mock.calls[0]![0].data.map((row: DeliveryCreate) => row.jobRunId)).toEqual([null, 5])
        expect(recorded.map(row => row.subjectId)).toEqual([77, 78])
    })

    it('GIVEN no rows WHEN recorded THEN nothing is written', async () => {
        expect(await recordDeliveries(d1Client, [])).toEqual([])
        expect(statementsInCallOrder(fakePrisma)).toEqual([])
    })
})
