/**
 * Health Check Endpoint
 *
 * Returns system information for monitoring and smoke tests.
 * Public endpoint - no authentication required.
 */
export default defineEventHandler(async () => {
    const config = useRuntimeConfig()

    return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: config.public.COMMIT_ID || 'development'
    }
})
