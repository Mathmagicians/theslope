import {defineEventHandler, sendRedirect} from "h3"
import {maskPassword} from "~/utils/utils"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {getSessionUser} = eventHandlerHelper

// list of endpoints that we want dont need to protect
const unprotectedRoutes = ["/api/auth", "/api/calendar/feed", "/login", "/api/_auth", "/api/_nuxt_icon", "/api/public", "/public"]

/**
 * Authentication Guard Middleware
 *
 * Protects routes from unauthorized access:
 * - API routes (/api/*): Returns 401 Unauthorized error
 * - Page routes: Redirects to /login with 302 status
 *
 * Unprotected routes:
 * - / (home/landing page)
 * - /login
 * - /public/* (public billing pages)
 * - /api/auth, /api/calendar/feed, /api/_auth, /api/_nuxt_icon, /api/public
 */
export default defineEventHandler(async (event) => {
    const url = getRequestURL(event)
    const {pathname} = new URL(url)

    // check if the pathname is in the list of protected routes
    const shouldNotBeProtected = pathname === "/" || unprotectedRoutes.find((r) => (pathname.startsWith(r)))

    if (shouldNotBeProtected) {
        console.info(`🔒 > [GUARD] > Unprotected route: ${pathname}`)
        return // Continue to next handler
    }

    console.info(`🔒 > [GUARD] > Protected route: ${pathname}`)

    // Check for user session - getUserSession returns empty object if no session exists
    const session = await getUserSession(event)
    const user = await getSessionUser(event)

    if (!user || !session.secure?.heynaboToken) {
        // A session user the schema rejects, or a session without the Heynabo token, which cannot act in Heynabo
        // (ADR-013): the session is cleared and signs in again
        if (session.user) await clearUserSession(event)

        // Handle API routes differently from page routes
        if (pathname.startsWith("/api/")) {
            // For API routes, throw 401 Unauthorized
            throw createError({
                statusCode: 401,
                statusMessage: "Unauthorized - Please login"
            })
        } else {
            // The login page follows ?redirect back to the page the guard stopped
            return sendRedirect(event, `/login?redirect=${encodeURIComponent(pathname + url.search)}`, 302)
        }
    }

    console.info(`🔒 > [GUARD] > User session: mail=${maskPassword(user.email)}, roles=${JSON.stringify(user.systemRoles)}`)
})
