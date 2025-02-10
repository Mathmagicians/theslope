import {defineEventHandler} from "h3"
import {maskPassword} from "~/composables/utils";

// list of endpoints that we want dont need to protect
const unprotectedRoutes = ["/api/auth", "/api/calendar/feed", "/login", "/api/_auth", "/api/_nuxt_icon"]
export default defineEventHandler( async(event) => {
    const url = getRequestURL(event)
    const {pathname} = new URL(url)
    // check if the pathname is in the list of protected routes
    const shouldNotBeProtected = pathname === "/" || unprotectedRoutes.find((r) => (pathname.startsWith(r)))
    if (shouldNotBeProtected) {
        console.log("🔒 > GUARD > Unprotected route: ", pathname)
    } else {
        console.log("🔒 > GUARD > Protected route: ", pathname)
        // ensure user is logged in before getting a response
        const session = await requireUserSession(event)
        console.log(`🔒 > GUARD > Available User session data: token - ${maskPassword(session.user.passwordHash)}, mail - ${session.user.email}, role - ${session.user.systemRole}`)
    }
})
