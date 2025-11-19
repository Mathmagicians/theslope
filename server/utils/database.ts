import type {D1Database} from '@cloudflare/workers-types'
import {PrismaD1} from "@prisma/adapter-d1"
import {PrismaClient} from "@prisma/client"

/**
 * Shared database connection utility
 * Creates and connects a Prisma client for D1 database
 *
 * @param d1Client - Cloudflare D1 database instance
 * @returns Connected Prisma client
 */
export async function getPrismaClientConnection(d1Client: D1Database) {
    const adapter = new PrismaD1(d1Client)
    const prisma = new PrismaClient({adapter})
    await prisma.$connect()
    return prisma
}
