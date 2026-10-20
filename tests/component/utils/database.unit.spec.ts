import {beforeEach, describe, expect, it, vi} from 'vitest'
import {getPrismaClientConnection} from '~~/server/utils/database'

// The unit runtime has no D1 and no query engine: the client and its adapter are stand-ins that record their construction
const {PrismaClient, connect} = vi.hoisted(() => {
    const connect = vi.fn(async () => {})
    return {connect, PrismaClient: vi.fn(class {$connect = connect})}
})
vi.mock('~~/prisma/generated/client/client', () => ({PrismaClient}))
vi.mock('@prisma/adapter-d1', () => ({PrismaD1: class {}}))

describe('getPrismaClientConnection', () => {
    beforeEach(() => vi.clearAllMocks())
    const binding = () => ({}) as D1Database

    it.each([
        {calls: 'one after another', connectTwice: async (d1Client: D1Database) => [await getPrismaClientConnection(d1Client), await getPrismaClientConnection(d1Client)]},
        {calls: 'at once', connectTwice: (d1Client: D1Database) => Promise.all([getPrismaClientConnection(d1Client), getPrismaClientConnection(d1Client)])}
    ])('GIVEN one D1 binding WHEN two reads connect $calls THEN they share one client, constructed once', async ({connectTwice}) => {
        const [first, second] = await connectTwice(binding())

        expect(second).toBe(first)
        expect(PrismaClient).toHaveBeenCalledOnce()
    })

    it('GIVEN two D1 bindings WHEN each connects THEN each gets a client of its own', async () => {
        const first = await getPrismaClientConnection(binding())
        const second = await getPrismaClientConnection(binding())

        expect(second).not.toBe(first)
        expect(PrismaClient).toHaveBeenCalledTimes(2)
    })

    it('GIVEN a connect that fails WHEN the next read on the binding connects THEN it connects a fresh client', async () => {
        const d1Client = binding()
        connect.mockRejectedValueOnce(new Error('D1 down'))

        await expect(getPrismaClientConnection(d1Client)).rejects.toThrow('D1 down')
        await getPrismaClientConnection(d1Client)

        expect(PrismaClient).toHaveBeenCalledTimes(2)
    })
})
