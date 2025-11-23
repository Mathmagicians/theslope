import {defineEventHandler, sendRedirect} from "h3"
import {maskPassword} from "~/utils/utils"
import type {UserDetail} from "~/composables/useCoreValidation"

// list of endpoints that we want dont need to protect
const unprotectedRoutes = ["/api/auth", "/api/calendar/feed", "/login", "/api/_auth", "/api/_nuxt_icon"]

export default defineEventHandler(async (event) => {
    const url = getRequestURL(event)
    const {pathname} = new URL(url)

    // check if the pathname is in the list of protected routes
    const shouldNotBeProtected = pathname === "/" || unprotectedRoutes.find((r) => (pathname.startsWith(r)))

    if (shouldNotBeProtected) {
        console.info("🔒 > [GUARD] > Unprotected route: ", pathname)
        return // Continue to next handler
    }

    console.info("🔒 > [GUARD] > Protected route: ", pathname)

    // Check for user session - getUserSession returns null if no session exists
    const session = await getUserSession(event)

    if (!session) {
        // Handle API routes differently from page routes
        if (pathname.startsWith("/api/")) {
            // For API routes, return 401 Unauthorized
            return createError({
                statusCode: 401,
                statusMessage: "Unauthorized - Please login"
            })
        } else {
            // For page routes, redirect to login
            return sendRedirect(event, "/login", 302)
        }
    }

    // Type cast: Module augmentation doesn't expand UserDetail properties (see types/auth.d.ts)
    // Check if user exists in session before accessing properties
    if (session.user) {
        const user = session.user as UserDetail & {passwordHash: string}
        console.info(`🔒 > [GUARD] > Available User session data: token - ${maskPassword(user.passwordHash)}, mail - ${user.email}, roles - ${user.systemRoles}`)
    } else {
        console.warn("🔒 > [GUARD] > Session exists but no user data available, pathname:", pathname)
    }
})
