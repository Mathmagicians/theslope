import type {D1Database} from '@cloudflare/workers-types'
import {PrismaD1} from "@prisma/adapter-d1"
import {PrismaClient} from "@prisma/client"
import type {Prisma} from "@prisma/client"

/**
 * Shared database connection utility
 * Creates and connects a Prisma client for D1 database
 *
 * @param d1Client - Cloudflare D1 database instance
 * @returns Connected Prisma client
 */

const log: Prisma.LogLevel[] = process.env.NODE_ENV === 'production'
    ? ['error']
    : ['warn', 'error']

export async function getPrismaClientConnection(d1Client: D1Database) {
    const adapter = new PrismaD1(d1Client)
    const prisma = new PrismaClient({adapter, log})
    await prisma.$connect()
    return prisma
}
