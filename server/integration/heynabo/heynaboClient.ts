import {z} from 'zod'
import {maskPassword} from '~/utils/utils'
import {useHeynaboValidation} from '~/composables/useHeynaboValidation'
import type {HeynaboMember, LoggedInHeynaboUser, HeynaboLocation} from '~/composables/useHeynaboValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

// Load environment variables - for some undocumented reason, they are not passed to nitro from .env automatically
import dotenv from 'dotenv'

const LOG = '🔑 > HEYNABO > '
const {h3eFromCatch} = eventHandlerHelper
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
        const h3e = h3eFromCatch(`Error fetching token from Heynabo API for username ${maskPassword(username)}: `, error)
        console.error(LOG, h3e.statusMessage, error)
        throw h3e
    }

    try {
        const validatedHeynaboUser = LoggedInHeynaboUserSchema.parse(heynaboUser)
        console.info(LOG, "TOKEN > Got Heynabo security token: ", maskPassword(validatedHeynaboUser.token))
        return validatedHeynaboUser
    } catch (e: unknown) {
        const h3e = h3eFromCatch(`Error no Heynabo token for username ${maskPassword(username)}: `, e)
        console.error(LOG, "TOKEN > ", h3e.statusMessage, e)
        throw h3e
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
        const h3e = h3eFromCatch('Error loading locations from HeyNabo API: ', error)
        console.error(LOG, "LOCATIONS >", h3e.statusMessage, error)
        throw h3e
    }

    try {
        console.info(LOG, `LOCATIONS > Loaded ${list?.length} locations from HeyNabo`)
        return z.array(HeynaboLocationSchema).parse(list)
    } catch (e: unknown) {
        const h3e = h3eFromCatch('Error validating locations from HeyNabo API: ', e)
        console.error(LOG, "LOCATIONS >", h3e.statusMessage, e)
        throw h3e
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
        const h3e = h3eFromCatch('Error loading members from HeyNabo API: ', error)
        console.error(LOG, "MEMBERS >", h3e.statusMessage, error)
        throw h3e
    }

    try {
        const {list} = response
        console.info(LOG, `MEMBERS > Loaded ${list?.length} members from HeyNabo`)
        return z.array(HeynaboMemberSchema).parse(list)
    } catch (e: unknown) {
        const h3e = h3eFromCatch('Error validating members from HeyNabo API: ', e)
        console.error(LOG, "MEMBERS > error validating members ", h3e.statusMessage, e)
        throw h3e
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