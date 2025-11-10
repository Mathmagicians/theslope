import {Prisma as PrismaFromClient} from "@prisma/client"
import HouseholdCreateInput = PrismaFromClient.HouseholdCreateInput

// Load environment variables - for some undocumented reason, they are not passed to nitro from .env automatically
import dotenv from 'dotenv'
import {z} from 'zod'
import InhabitantCreateInput = Prisma.InhabitantCreateInput;
import HouseholdCreateNestedOneWithoutInhabitantsInput = Prisma.HouseholdCreateNestedOneWithoutInhabitantsInput;
import {maskPassword} from "~/utils/utils";
import type {UserCreate} from "~/composables/useUserValidation"
import {useHeynaboValidation} from "~/composables/useHeynaboValidation"
import type {HeynaboMember, HeynaboUser, LoggedInHeynaboUser, HeynaboLocation} from "~/composables/useHeynaboValidation"
// Import SystemRole enum from generated schemas (ADR-001 compliance)
// Note: server integration files execute at module load time, so import directly from generated schemas
import {SystemRoleSchema} from '~~/prisma/generated/zod'
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper";

const SystemRole = SystemRoleSchema.enum

const LOG = '🔑 > HEYNABO > '
const {h3eFromCatch} = eventHandlerHelper
const {
    LoggedInHeynaboUserSchema,
    HeynaboMemberSchema,
    HeynaboLocationSchema
} = useHeynaboValidation()

/* ==== INITIALIZATION ==== */
dotenv.config()
const heyNaboUserName = process.env.HEY_NABO_USERNAME as string; //will give runtime error if env variable is undefined - this is intentional
const heyNaboPassword = process.env.HEY_NABO_PASSWORD as string;
const heyNaboApi = process.env.HEY_NABO_API as string;

// curl -X POST https://demo.spaces.heynabo.com/api/login "Content-Type: application/json"  -d '{"email": "$(HEY_NABO_USERNAME)","password": "$(HEY_NABO_PASSWORD)
// grab bearer token from heynabo /login endpoint


async function getTokenFromHeynaboApi(username: string | undefined, password: string | undefined, api: string | undefined): Promise<LoggedInHeynaboUser> {
    if (!username || !password || !api) throw createError({
        statusCode: 400,
        statusMessage: "Heyabo integration not configured properly - missing env variables"
    })
    console.info(LOG, "TOKEN >", "Getting token for username: ", username)

    let heynaboUser: LoggedInHeynaboUser

    try {
        heynaboUser = await $fetch<LoggedInHeynaboUser>(`${api}/login`, {
            method: 'POST',
            body: {email: username, password: password},
            headers: {ContentType: 'application/json'}
        })
    } catch (error: any) {
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
    console.info("> 🤖 > HEYNABO > LOCATIONS > Loading locations from: ", url)

    let list: HeynaboLocation[]
    try {
        list = await $fetch<HeynaboLocation[]>(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                ContentType: 'application/json'
            }
        }) || []
    } catch (error: any) {
        const h3e = h3eFromCatch('> 🤖 > HEYNABO > LOCATIONS > Error loading locations from HeyNabo API: ', error)
        console.error(LOG, h3e.statusMessage, error)
        throw h3e
    }

    try {
        console.info(`> 🤖 > HEYNABO > LOCATIONS > Loaded ${list?.length} locations from HeyNabo`)
        return z.array(HeynaboLocationSchema).parse(list)
    } catch (e: unknown) {
        const h3e = h3eFromCatch('> 🤖 > HEYNABO > LOCATIONS > Error validating locations from HeyNabo API: ', e)
        console.error(LOG, h3e.statusMessage, e)
        throw h3e
    }
}

interface HeynaboAPIMembers {
    list: HeynaboMember[]
}

async function loadMembers(from: string, token: string): Promise<HeynaboMember[]> {
    const url = `${from}/admin/users/`
    console.info(`> 🤖 > HEYNABO > MEMBERS > Loading members from ${url}, token ${maskPassword(token)}`)

    let response: HeynaboAPIMembers
    try {
        response = await $fetch<HeynaboAPIMembers>(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                ContentType: 'application/json'
            }
        })
    } catch (error: any) {
        const h3e = h3eFromCatch('> 🤖 > HEYNABO > MEMBERS > Error loading members from HeyNabo API: ', error)
        console.error(LOG, h3e.statusMessage, error)
        throw h3e
    }

    try {
        const {list} = response
        console.info(`> 🤖 > HEYNABO > MEMBERS > Loaded ${list?.length} members from HeyNabo`)
        return z.array(HeynaboMemberSchema).parse(list)
    } catch (e: unknown) {
        const h3e = h3eFromCatch('> 🤖 > HEYNABO > MEMBERS > Error validating members from HeyNabo API: ', e)
        console.error(LOG, " MEMBERS > error validating members ", h3e.statusMessage, e)
        throw h3e
    }
}

async function importFromHeyNaboForSystemUser(user: string, password: string, api: string) {
    const token = await getApiToken(user, password, api)
    const [locations, members] = await Promise.all([loadLocations(heyNaboApi, token),
        loadMembers(heyNaboApi, token)])
    return {locations, members}
}

export async function importFromHeyNabo() {
    return await importFromHeyNaboForSystemUser(heyNaboUserName, heyNaboPassword, heyNaboApi)
}

type HeyNaboRoles = 'admin' | 'full' | 'limited'

function inhabitantFromMember(locationId: number, member: HeynaboMember): InhabitantCreateInput {
    console.log(`>>>> 👩‍ Found inhabitant ${member.firstName} ${member.lastName} with role ${member.role} for location ${locationId}`)

    const inhabitant = {
        heynaboId: member.id,
        pictureUrl: member.avatar,
        name: member.firstName,
        lastName: member.lastName,
        birthDate: member.dateOfBirth ? new Date(member.dateOfBirth).toISOString() : null,
        household: {} as HouseholdCreateNestedOneWithoutInhabitantsInput
    } satisfies InhabitantCreateInput

    if (member.email && member.role !== 'limited') {
        // Domain format - saveUser in repository will serialize (ADR-010 pattern)
        const userDomain: UserCreate = {
            email: member.email,
            phone: member.phone,
            passwordHash: 'removeme',
            systemRoles: ['admin', 'full'].includes(member.role) && member?.role === 'admin' ? [SystemRole.ADMIN] : []
        }
        inhabitant.user = userDomain
    }


    return inhabitant
}

function findInhabitantsByLocation(id: number, members: HeynaboMember[]): InhabitantCreateInput[] {
    return members
        .filter(member => member.locationId === id)
        .map(member => inhabitantFromMember(id, member))
}

export function createHouseholdsFromImport(d1Client: D1Database, locations: HeynaboLocation[], members: HeynaboMember[]): HouseholdCreateInput[] {
    console.log(">> 🤖 1. I will collect household data from heynabo imported locations")
    const households = locations.map(location => {
        console.log(`>>> 🏗️ IMPORT > Processsing location id ${location.id} `)
        const newHousehold: HouseholdCreateInput = {
            heynaboId: location.id,
            movedInDate: new Date('2019-06-25').toISOString(),
            pbsId: location.id, //FIXME - import pbs from csv file
            name: location.address.replace(/[^a-zA-Z]*/g, location.address.substring(0, 1)),
            address: location.address,
            inhabitants: findInhabitantsByLocation(location.id, members)
        }
        return newHousehold
    })

    console.log(">> 🏠 IMPORT > CREATE > Created households: ", households.length)
    return households
}
