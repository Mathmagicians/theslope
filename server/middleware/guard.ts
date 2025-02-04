import {defineEventHandler} from "h3"

// list of endpoints that we want dont need to protect
const unprotectedRoutes = ["/api/auth", "/api/calendar/feed"]
export default defineEventHandler( async(event) => {
    const url = getRequestURL(event)
    const {pathname} = new URL(url)
    // check if the pathname is in the list of protected routes
    const shouldBeProtected = pathname.startsWith("api") && !unprotectedRoutes.find((r) => (r===pathname))
    if (!shouldBeProtected) {
        console.log("🔒 > GUARD > Unprotected route: ", pathname)
    } else {
        console.log("🔒 > GUARD > Protected route: ", pathname)
        // ensure user is logged in before getting a response
        await requireUserSession(event)
    }
})
