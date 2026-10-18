import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createError} from 'h3'
import {subMinutes} from 'date-fns'
import {Prisma} from '~~/prisma/generated/client/client'
import {deleteWaitlistEntries, fetchWaitlistForDinners, updateWaitlistEntryOrders} from '~~/server/data/waitlistRepository'
import {useBookingValidation, OrderAuditAction} from '~/composables/useBookingValidation'
import {useWaitlistValidation} from '~/composables/useWaitlistValidation'
import {callsInFlight, statementsInCallOrder} from '~~/tests/component/data/fakePrismaClient'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'

// The repository builds its errors with createError from the Nitro auto-import scope the unit runtime lacks
vi.stubGlobal('createError', createError)

// The unit runtime has no D1: a client standing for the binding answers each statement from the test
const fakePrisma = await vi.hoisted(async () => (await import('~~/tests/component/data/fakePrismaClient')).fakePrismaClient({
    ticketWaitlist: ['findMany', 'deleteMany', 'update'],
    orderHistory: ['createMany']
}))
vi.mock('~~/server/utils/database', () => ({getPrismaClientConnection: async () => fakePrisma}))

const {DinnerModeSchema, OrderAuditChangeSchema, createOrderAuditData} = useBookingValidation()
const {serializeTicketWaitlist} = useWaitlistValidation()
const d1Client = {} as D1Database
const SEASON_ID = 3
const historyRows = () => fakePrisma.orderHistory.createMany.mock.calls.flatMap(([{data}]) => data)

// Anna's and Bo's places on dinner 5, each with the snapshot the run built from the household it holds
const places = [21, 22].map((id, index) => {
    const entry = WaitlistFactory.defaultEntry({id, inhabitantId: 41 + index, dinnerEventId: 5, dinnerMode: DinnerModeSchema.enum.TAKEAWAY})
    return {id, entry, snapshot: OrderFactory.defaultOrderSnapshot({id: null, inhabitantId: entry.inhabitantId, dinnerEventId: 5, dinnerMode: DinnerModeSchema.enum.TAKEAWAY})}
})

beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fakePrisma.orderHistory.createMany.mockImplementation(async ({data}: {data: unknown[]}) => ({count: data.length}))
})

describe('fetchWaitlistForDinners', () => {
    it('GIVEN the queues of 100 dinners WHEN read THEN it reads 90 dinners, then the other 10, one read in flight at a time, and the entries come back first joined first across both reads', async () => {
        const dinnerIds = Array.from({length: 100}, (_, index) => index + 1)
        // One entry per dinner; the later the dinner, the earlier its entry joined
        const rows = dinnerIds.map(id => serializeTicketWaitlist(WaitlistFactory.defaultEntry({id, dinnerEventId: id, inhabitantId: id, createdAt: subMinutes(new Date(), id)})))
        const reads = callsInFlight()
        reads.answer(fakePrisma.ticketWaitlist.findMany, ({where}: {where: {dinnerEventId: {in: number[]}}}) => rows
            .filter(row => where.dinnerEventId.in.includes(row.dinnerEventId))
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()))

        const entries = await fetchWaitlistForDinners(d1Client, dinnerIds)

        expect(fakePrisma.ticketWaitlist.findMany.mock.calls.map(([{where}]) => where.dinnerEventId.in.length)).toEqual([90, 10])
        expect(reads.peak).toBe(1)
        expect(entries.map(entry => entry.id)).toEqual([...dinnerIds].reverse())
    })
})

// A refused write fails the household's batch and writes no history row: the write comes first, the row after it
const serverError = () => new Error('D1 down')

describe('deleteWaitlistEntries', () => {
    const leaves = places.map(({id, snapshot}) => ({id, snapshot}))

    it.each([
        {run: 'a member\'s', audit: {action: OrderAuditAction.USER_CANCELLED, performedByUserId: 7, seasonId: SEASON_ID}, performedByUserId: 7},
        {run: 'the system\'s', audit: {action: OrderAuditAction.SYSTEM_DELETED, performedByUserId: 1, seasonId: SEASON_ID}, performedByUserId: null}
    ])('GIVEN $run leave of the household\'s places WHEN written THEN one delete takes them off the waiting list, then one LEAVE row each names the person and the dinner', async ({audit, performedByUserId}) => {
        fakePrisma.ticketWaitlist.deleteMany.mockResolvedValue({count: leaves.length})

        await deleteWaitlistEntries(d1Client, leaves, audit)

        expect(statementsInCallOrder(fakePrisma)).toEqual(['ticketWaitlist.deleteMany', 'orderHistory.createMany'])
        expect(fakePrisma.ticketWaitlist.deleteMany).toHaveBeenCalledWith({where: {id: {in: leaves.map(({id}) => id)}, placingAt: null}})
        expect(historyRows()).toEqual(leaves.map(({snapshot}) => ({
            orderId: null, inhabitantId: snapshot.inhabitantId, dinnerEventId: snapshot.dinnerEventId, seasonId: SEASON_ID, performedByUserId,
            action: audit.action, auditData: createOrderAuditData(OrderAuditChangeSchema.enum.LEAVE, snapshot)
        })))
    })

    it.each([
        {refusal: 'a place a run holds', statusCode: 409, refuse: () => fakePrisma.ticketWaitlist.deleteMany.mockResolvedValue({count: leaves.length - 1})},
        {refusal: 'a server error', statusCode: 500, refuse: () => fakePrisma.ticketWaitlist.deleteMany.mockRejectedValue(serverError())}
    ])('GIVEN $refusal WHEN the household\'s places leave THEN the batch fails with $statusCode and no LEAVE row is written', async ({statusCode, refuse}) => {
        refuse()

        await expect(deleteWaitlistEntries(d1Client, leaves, {action: OrderAuditAction.USER_CANCELLED, performedByUserId: 7, seasonId: SEASON_ID}))
            .rejects.toMatchObject({statusCode})
        expect(fakePrisma.orderHistory.createMany).not.toHaveBeenCalled()
    })
})

describe('updateWaitlistEntryOrders', () => {
    const audit = {action: OrderAuditAction.USER_BOOKED, performedByUserId: 7, seasonId: SEASON_ID}
    const requeues = places.map(({id, entry, snapshot}) => ({id, order: entry.order, snapshot}))

    it('GIVEN two rewritten places WHEN written THEN each place gets its own wish, one write in flight at a time, then one REQUEUE row each', async () => {
        const writes = callsInFlight()
        writes.answer(fakePrisma.ticketWaitlist.update, () => ({}))

        await updateWaitlistEntryOrders(d1Client, requeues, audit)

        expect(statementsInCallOrder(fakePrisma)).toEqual(['ticketWaitlist.update', 'ticketWaitlist.update', 'orderHistory.createMany'])
        expect(fakePrisma.ticketWaitlist.update.mock.calls.map(([write]) => write))
            .toEqual(requeues.map(({id, order}) => ({where: {id, placingAt: null}, data: serializeTicketWaitlist({order})})))
        expect(writes.peak).toBe(1)
        expect(historyRows()).toEqual(requeues.map(({snapshot}) => ({
            orderId: null, ...audit, inhabitantId: snapshot.inhabitantId, dinnerEventId: snapshot.dinnerEventId,
            auditData: createOrderAuditData(OrderAuditChangeSchema.enum.REQUEUE, snapshot)
        })))
    })

    it.each([
        // The update's where holds `placingAt: null`: a place a run holds is no record to update
        {refusal: 'a place a run holds', statusCode: 409, error: () => new Prisma.PrismaClientKnownRequestError('No record was found for an update.', {code: 'P2025', clientVersion: 'test'})},
        {refusal: 'a server error', statusCode: 500, error: serverError}
    ])('GIVEN $refusal on the second place WHEN the places are rewritten THEN the batch fails with $statusCode and no REQUEUE row is written', async ({statusCode, error}) => {
        fakePrisma.ticketWaitlist.update.mockResolvedValueOnce({}).mockRejectedValueOnce(error())

        await expect(updateWaitlistEntryOrders(d1Client, requeues, audit)).rejects.toMatchObject({statusCode})
        expect(fakePrisma.orderHistory.createMany).not.toHaveBeenCalled()
    })
})
