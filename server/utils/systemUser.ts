import {fetchUser} from "~~/server/data/prismaRepository"
import {systemAccountEmail} from "~~/server/integration/heynabo/heynaboClient"

const LOG = '👤 > SYSTEM_USER >'

// Cached system user ID (similar to Heynabo's cachedSystemToken pattern - ADR-013)
let cachedSystemUserId: number | null = null

/**
 * Get system user ID for automated operations (cron, scaffolding, billing)
 * Caches the id of the seeded system account: the user whose email is the account the Heynabo integration logs in with
 *
 * Pattern: ADR-013 (similar to getSystemToken in heynaboClient.ts)
 * Unlike tokens, user IDs don't expire - cache is cleared on server restart
 *
 * @throws Error if no user carries the system account's email (HEY_NABO_USERNAME)
 */
export async function getSystemUserId(d1Client: D1Database): Promise<number> {
    if (cachedSystemUserId !== null) {
        return cachedSystemUserId
    }

    const email = systemAccountEmail()
    const systemUser = email ? await fetchUser(d1Client, {email}) : null
    if (!systemUser) {
        throw new Error(`${LOG} No user with the system account's email (HEY_NABO_USERNAME) - cannot perform system operation`)
    }

    cachedSystemUserId = systemUser.id
    console.info(`${LOG} Cached system user ID: ${cachedSystemUserId}`)
    return cachedSystemUserId
}

/**
 * Clear cached system user (for testing)
 */
export function clearSystemUserCache(): void {
    cachedSystemUserId = null
}
