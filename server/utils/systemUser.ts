import type {D1Database} from "@cloudflare/workers-types"
import {fetchUsersByRole} from "~~/server/data/prismaRepository"
import {SystemRoleSchema} from '~~/prisma/generated/zod'

const LOG = '👤 > SYSTEM_USER >'

// Cached system user ID (similar to Heynabo's cachedSystemToken pattern - ADR-013)
let cachedSystemUserId: number | null = null

/**
 * Get system user ID for automated operations (cron, scaffolding, billing)
 * Caches the first ADMIN user ID from the database
 *
 * Pattern: ADR-013 (similar to getSystemToken in heynaboClient.ts)
 * Unlike tokens, user IDs don't expire - cache is cleared on server restart
 *
 * @throws Error if no ADMIN user exists in the database
 */
export async function getSystemUserId(d1Client: D1Database): Promise<number> {
    if (cachedSystemUserId !== null) {
        return cachedSystemUserId
    }

    const adminUsers = await fetchUsersByRole(d1Client, SystemRoleSchema.enum.ADMIN)
    if (adminUsers.length === 0) {
        throw new Error(`${LOG} No ADMIN user found - cannot perform system operation`)
    }

    cachedSystemUserId = adminUsers[0]!.id
    console.info(`${LOG} Cached system user ID: ${cachedSystemUserId}`)
    return cachedSystemUserId
}

/**
 * Clear cached system user (for testing)
 */
export function clearSystemUserCache(): void {
    cachedSystemUserId = null
}
