import {z} from 'zod'
import {maskPassword} from '~/utils/utils'
import {useHeynaboValidation} from '~/composables/useHeynaboValidation'
import type {HeynaboMember, LoggedInHeynaboUser, HeynaboLocation} from '~/composables/useHeynaboValidation'
import {useBookingValidation} from '~/composables/useBookingValidation'
import type {HeynaboEventCreate, HeynaboEventResponse} from '~/composables/useBookingValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

// Load environment variables - for some undocumented reason, they are not passed to nitro from .env automatically
import dotenv from 'dotenv'

const LOG = '🔑 > HEYNABO > '
const {throwH3Error} = eventHandlerHelper
const {
    LoggedInHeynaboUserSchema,
    HeynaboMemberSchema,
    HeynaboLocationSchema
} = useHeynaboValidation()

/* ==== INITIALIZATION ==== */
dotenv.config()
const heyNaboUserName = process.env.HEY_NABO_USERNAME as string // will give runtime error if env variable is undefined - this is intentional
const heyNaboPassword = process.env.HEY_NABO_PASSWORD as string
const heyNaboApi = process.env.HEY_NABO_API as string

/**
 * Heynabo HTTP Client
 * Pure HTTP/API communication functions - no business logic or transformations
 */

async function getTokenFromHeynaboApi(username: string | undefined, password: string | undefined, api: string | undefined): Promise<LoggedInHeynaboUser> {
    if (!username || !password || !api) throw createError({
        statusCode: 400,
        statusMessage: "Heynabo integration not configured properly - missing env variables"
    })
    console.info(LOG, "TOKEN >", "Getting token for username: ", username)

    let heynaboUser: LoggedInHeynaboUser

    try {
        heynaboUser = await $fetch<LoggedInHeynaboUser>(`${api}/login`, {
            method: 'POST',
            body: {email: username, password: password},
            headers: {ContentType: 'application/json'}
        })
    } catch (error: unknown) {
        return throwH3Error(`${LOG}TOKEN > Error fetching token for ${maskPassword(username)}`, error)
    }

    try {
        const validatedHeynaboUser = LoggedInHeynaboUserSchema.parse(heynaboUser)
        console.info(LOG, "TOKEN > Got Heynabo security token: ", maskPassword(validatedHeynaboUser.token))
        return validatedHeynaboUser
    } catch (error: unknown) {
        return throwH3Error(`${LOG}TOKEN > No token for ${maskPassword(username)}`, error)
    }
}

export async function getApiToken(username: string, password: string, api: string): Promise<string> {
    const {token} = await getTokenFromHeynaboApi(username, password, api)
    console.info(LOG, "TOKEN > Got Heynabo security token: ", token ? "🔑" : "❌")
    return token
}

export async function loginUserIntoHeynabo(username: string, password: string): Promise<LoggedInHeynaboUser> {
    const result = await getTokenFromHeynaboApi(username, password, heyNaboApi)
    console.info(LOG, "LOGIN > Logged into Heynabo for username: ", username, result?.token.length > 0 ? "🔑" : "❌")
    return result
}

async function loadLocations(from: string, token: string): Promise<HeynaboLocation[]> {
    const url = `${from}/members/locations/`
    console.info(LOG, "LOCATIONS > Loading locations from: ", url)

    let list: HeynaboLocation[]
    try {
        list = await $fetch<HeynaboLocation[]>(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                ContentType: 'application/json'
            }
        }) || []
    } catch (error: unknown) {
        return throwH3Error(`${LOG}LOCATIONS > Error loading locations`, error)
    }

    try {
        console.info(LOG, `LOCATIONS > Loaded ${list?.length} locations from HeyNabo`)
        return z.array(HeynaboLocationSchema).parse(list)
    } catch (error: unknown) {
        return throwH3Error(`${LOG}LOCATIONS > Error validating locations`, error)
    }
}

interface HeynaboAPIMembers {
    list: HeynaboMember[]
}

async function loadMembers(from: string, token: string): Promise<HeynaboMember[]> {
    const url = `${from}/admin/users/`
    console.info(LOG, `MEMBERS > Loading members from ${url}, token ${maskPassword(token)}`)

    let response: HeynaboAPIMembers
    try {
        response = await $fetch<HeynaboAPIMembers>(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                ContentType: 'application/json'
            }
        })
    } catch (error: unknown) {
        return throwH3Error(`${LOG}MEMBERS > Error loading members`, error)
    }

    try {
        const {list} = response
        console.info(LOG, `MEMBERS > Loaded ${list?.length} members from HeyNabo`)
        return z.array(HeynaboMemberSchema).parse(list)
    } catch (error: unknown) {
        return throwH3Error(`${LOG}MEMBERS > Error validating members`, error)
    }
}

async function importFromHeyNaboForSystemUser(user: string, password: string, api: string) {
    const token = await getApiToken(user, password, api)
    const [locations, members] = await Promise.all([
        loadLocations(api, token),
        loadMembers(api, token)
    ])
    return {locations, members}
}

/**
 * Import all locations and members from Heynabo using configured system credentials
 * @returns Object containing locations and members arrays
 */
export async function importFromHeynabo() {
    return await importFromHeyNaboForSystemUser(heyNaboUserName, heyNaboPassword, heyNaboApi)
}

/* ==== EVENT MANAGEMENT (ADR-013) ==== */

const {HeynaboEventResponseSchema} = useBookingValidation()

/**
 * Create a new event in Heynabo (POST /members/events/)
 * @param token - User's Heynabo auth token (chef owns the event)
 * @param payload - Event data conforming to HeynaboEventCreate schema
 * @returns Created event with id
 */
export async function createHeynaboEvent(token: string, payload: HeynaboEventCreate): Promise<HeynaboEventResponse> {
    const url = `${heyNaboApi}/members/events/`

    let response: HeynaboEventResponse
    try {
        response = await $fetch<HeynaboEventResponse>(url, {
            method: 'POST',
            body: payload,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
    } catch (error: unknown) {
        return throwH3Error(`${LOG}EVENT CREATE > Error creating event`, error)
    }

    try {
        return HeynaboEventResponseSchema.parse(response)
    } catch (error: unknown) {
        return throwH3Error(`${LOG}EVENT CREATE > Error validating response`, error)
    }
}

/**
 * Update an existing event in Heynabo (PATCH /members/events/{id})
 * NOTE: Heynabo uses PATCH for partial updates, PUT returns 501 Not Implemented
 * @param token - User's Heynabo auth token
 * @param eventId - Heynabo event ID
 * @param payload - Updated event data (partial update supported)
 * @returns Updated event
 */
export async function updateHeynaboEvent(token: string, eventId: number, payload: HeynaboEventCreate): Promise<HeynaboEventResponse> {
    const url = `${heyNaboApi}/members/events/${eventId}`

    let response: HeynaboEventResponse
    try {
        response = await $fetch<HeynaboEventResponse>(url, {
            method: 'PATCH',
            body: payload,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
    } catch (error: unknown) {
        return throwH3Error(`${LOG}EVENT UPDATE > Error updating event ${eventId}`, error)
    }

    try {
        return HeynaboEventResponseSchema.parse(response)
    } catch (error: unknown) {
        return throwH3Error(`${LOG}EVENT UPDATE > Error validating response`, error)
    }
}

/**
 * Cancel an event in Heynabo (sets status to CANCELED)
 * NOTE: Heynabo uses American spelling "CANCELED" (one L), not "CANCELLED"
 * @param token - User's Heynabo auth token
 * @param eventId - Heynabo event ID
 * @param currentPayload - Current event data (PATCH supports partial update)
 * @returns Cancelled event
 */
export async function cancelHeynaboEvent(token: string, eventId: number, currentPayload: HeynaboEventCreate): Promise<HeynaboEventResponse> {
    return updateHeynaboEvent(token, eventId, {...currentPayload, status: 'CANCELED'})
}

/**
 * Default dinner pictures for Heynabo events (random rotation)
 */
const DEFAULT_DINNER_PICTURES = [
    'fællesspisning_0.jpeg',
    'fællesspisning_1.jpeg'
]

/**
 * Get a random default dinner picture filename
 */
export function getRandomDefaultDinnerPicture(): string {
    const index = Math.floor(Math.random() * DEFAULT_DINNER_PICTURES.length)
    return DEFAULT_DINNER_PICTURES[index]!
}

/**
 * Upload image to a Heynabo event (POST /members/events/{id}/files)
 * @param token - User's Heynabo auth token
 * @param eventId - Heynabo event ID
 * @param imageBlob - Image data as Blob
 * @param filename - Filename for the upload
 * @returns Uploaded file info with CDN URL
 */
export async function uploadHeynaboEventImage(
    token: string,
    eventId: number,
    imageBlob: Blob,
    filename: string
): Promise<{id: number, url: string}> {
    const url = `${heyNaboApi}/members/events/${eventId}/files`

    const formData = new FormData()
    formData.append('file', imageBlob, filename)

    let response: {list: Array<{id: number, url: string}>}
    try {
        response = await $fetch(url, {
            method: 'POST',
            body: formData,
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
    } catch (error: unknown) {
        return throwH3Error(`${LOG}EVENT IMAGE > Error uploading image to event ${eventId}`, error)
    }

    if (!response.list?.[0]) {
        throw createError({statusCode: 500, message: 'Heynabo image upload returned empty response'})
    }

    console.info(LOG, 'EVENT IMAGE > Uploaded to event', eventId, 'url:', response.list[0].url)
    return response.list[0]
}

/**
 * Fetch an event from Heynabo (GET /members/events/{id})
 * Used for lazy-fetching picture URL
 * @param token - User's Heynabo auth token
 * @param eventId - Heynabo event ID
 * @returns Event with imageUrl
 */
export async function fetchHeynaboEvent(token: string, eventId: number): Promise<HeynaboEventResponse> {
    const url = `${heyNaboApi}/members/events/${eventId}`

    let response: HeynaboEventResponse
    try {
        response = await $fetch<HeynaboEventResponse>(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
    } catch (error: unknown) {
        return throwH3Error(`${LOG}EVENT FETCH > Error fetching event ${eventId}`, error)
    }

    try {
        return HeynaboEventResponseSchema.parse(response)
    } catch (error: unknown) {
        return throwH3Error(`${LOG}EVENT FETCH > Error validating response`, error)
    }
}

/**
 * Delete events from Heynabo (for test cleanup)
 * @param token - System token with admin permissions
 * @param eventIds - Array of event IDs to delete
 * @returns Number of successfully deleted events
 */
export async function deleteHeynaboEvents(token: string, eventIds: number[]): Promise<number> {
    const results = await Promise.all(
        eventIds.map(async (eventId) => {
            try {
                await $fetch(`${heyNaboApi}/members/events/${eventId}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })
                return true
            } catch {
                console.warn(LOG, 'EVENT CLEANUP > Failed to delete event', eventId)
                return false
            }
        })
    )
    return results.filter(Boolean).length
}

/* ==== SYSTEM CREDENTIAL OPERATIONS (ADR-013: for admin endpoints) ==== */

/**
 * Get system Heynabo token (cached for reuse)
 */
let cachedSystemToken: string | null = null
let tokenExpiry: number = 0

async function getSystemToken(): Promise<string> {
    const now = Date.now()
    if (cachedSystemToken && now < tokenExpiry) {
        return cachedSystemToken
    }
    cachedSystemToken = await getApiToken(heyNaboUserName, heyNaboPassword, heyNaboApi)
    tokenExpiry = now + 50 * 60 * 1000 // 50 minutes
    return cachedSystemToken
}

/**
 * Update Heynabo event using system credentials (admin update)
 */
export async function updateHeynaboEventAsSystem(eventId: number, payload: HeynaboEventCreate): Promise<HeynaboEventResponse> {
    const token = await getSystemToken()
    return updateHeynaboEvent(token, eventId, payload)
}

/**
 * Delete Heynabo event using system credentials (admin delete)
 */
export async function deleteHeynaboEventAsSystem(eventId: number): Promise<void> {
    const token = await getSystemToken()
    await $fetch(`${heyNaboApi}/members/events/${eventId}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
}