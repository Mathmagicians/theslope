import {requireRoutePermission} from '~~/server/utils/authorizationHelper'

/**
 * Authorization Middleware - runs AFTER 1.guard.ts
 *
 * guard.ts handles authentication (protected vs unprotected).
 * No session = unprotected route (guard.ts approved it).
 */
export default defineEventHandler(async (event) => {
    const url = getRequestURL(event)
    const {pathname} = url

    if (!pathname.startsWith('/api/')) return

    const session = await getUserSession(event)
    if (!session?.user) return

    await requireRoutePermission(event, pathname, event.method)
})
