import {PrismaD1} from "@prisma/adapter-d1"
import {PrismaClient} from "~~/prisma/generated/client/client"
import type {Prisma} from "~~/prisma/generated/client/client"

const defaultLog: Prisma.LogLevel[] = process.env.NODE_ENV === 'production'
    ? ['error']
    : ['warn', 'error']

const connect = async (d1Client: D1Database): Promise<PrismaClient> => {
    const prisma = new PrismaClient({adapter: new PrismaD1(d1Client), log: defaultLog})
    await prisma.$connect()
    return prisma
}

// Keyed by the binding object: a client lives as long as the binding it was made for
const clients = new WeakMap<D1Database, Promise<PrismaClient>>()

/**
 * The connected Prisma client of a D1 binding, made at the binding's first read and shared by the reads after it;
 * a failed connect is dropped, so the next read connects afresh
 */
export const getPrismaClientConnection = (d1Client: D1Database): Promise<PrismaClient> => {
    const existing = clients.get(d1Client)
    if (existing) return existing
    const connecting = connect(d1Client)
    clients.set(d1Client, connecting)
    connecting.catch(() => clients.delete(d1Client))
    return connecting
}
