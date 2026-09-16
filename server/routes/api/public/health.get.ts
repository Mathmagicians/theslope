/**
 * Health Check Endpoint
 *
 * Returns system information for monitoring and smoke tests — the report every worker answers with
 * (workers/common/health.ts; the sender serves it at /sender/health).
 * Public endpoint - no authentication required.
 */
import {buildHealthReport} from '~~/workers/common/health'

export default defineEventHandler(async () => {
    const config = useRuntimeConfig()
    return buildHealthReport(config.public)
})
