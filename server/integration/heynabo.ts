import {Prisma, Prisma as PrismaFromClient} from "@prisma/client"
import HouseholdCreateInput = PrismaFromClient.HouseholdCreateInput

// Load environment variables - for some undocumented reason, they are not passed to nitro from .env automatically
import dotenv from 'dotenv';
import { z } from 'zod'
import InhabitantCreateInput = Prisma.InhabitantCreateInput;
import UserCreateInput = Prisma.UserCreateInput;
import HouseholdCreateNestedOneWithoutInhabitantsInput = Prisma.HouseholdCreateNestedOneWithoutInhabitantsInput;

dotenv.config();
const heyNaboUserName = process.env.HEY_NABO_USERNAME as string; //will give runtime error if env variable is undefined - this is intentional
const heyNaboPassword = process.env.HEY_NABO_PASSWORD as string;
const heyNaboApi = process.env.HEY_NABO_API as string;

// curl -X POST https://demo.spaces.heynabo.com/api/login "Content-Type: application/json"  -d '{"email": "$(HEY_NABO_USERNAME)","password": "$(HEY_NABO_PASSWORD)
// grab bearer token from heynabo /login endpoint

/*
{
    "id": 153,
    "type": "user",
    "email": "agata@m.dk",
    "firstName": "Skraaningen",
    "lastName": "API",
    "phone": "12345678",
    "emergencyContact": null,
    "dateOfBirth": null,
    "description": "<p>Dette er en robot der bruges til at teste modul til fællesspisning.</p>",
    "uiStorage": "{\"tryOurApp\":true,\"welcome\":{\"calendar\":true}}",
    "role": "admin",
    "roles": [],
    "avatar": "https://prod-space.s3.fr-par.scw.cloud/demo/AVATAR/67896247d11fb.jpg",
    "alias": null,
    "locationId": 2,
    "isFirstLogin": false,
    "lastLogin": "2025-02-02T00:11:37.155541Z",
    "inviteSent": "2025-01-14T10:49:53+00:00",
    "created": "2025-01-14T10:49:53+00:00",
    "token": "300e1068fdd7e628cc7cf6d8b893b1c1"
}
*/
const heynaboUserSchema = z.object({
    id: z.number(),
    type: z.string(),
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string().nullable(),
    emergencyContact: z.string().nullable(),
    dateOfBirth: z.string().nullable(),
    description: z.string(),
    uiStorage: z.string(),
    role: z.string(),
    roles: z.array(z.string()),
    avatar: z.string().url(),
    alias: z.string().nullable(),
    locationId: z.number(),
    isFirstLogin: z.boolean(),
    lastLogin: z.string(),
    inviteSent: z.string(),
    created: z.string(),
    token: z.string().nonempty()
});

type HeynaboUser = z.infer<typeof heynaboUserSchema>

async function getTokenFromHeynaboApi(username: string | undefined, password: string | undefined, api: string | undefined): Promise<HeynaboUser> {
    console.log("🔑 > HEYNABO > Getting token for username: ", username);
    try {

        const heynaboUser = await $fetch(`${api}/login`, {
            method: 'POST',
            body: {email: username, password: password},
            headers: {ContentType: 'application/json'}
        }) satisfies  HeynaboUser
        const validatedHeynaboUser = heynaboUserSchema.parse(heynaboUser)
        console.log("🔑 > HEYNABO > Got Heynabo security token: ", heynaboUser?.token)
        return heynaboUser
    } catch (e:unknown) {
        if (e instanceof z.ZodError && e.format()?.token ) {
            throw createError({
                statusCode: 404,
                statusMessage: "Invalid Heynabo credentials - cant login"
            })
        } else {
            throw(e) //rethrow error
        }

    }
}

export async function getApiToken(username: string, password: string, api: string): Promise<string> {
    console.log("🔑 > HEYNABO > Getting API token for username: ", username);
    const result = await getTokenFromHeynaboApi(username, password, api)
    console.log("🔑 > HEYNABO > Got Heynabo security token: ", result?.token)
    return result.token
}

export async function loginUserIntoHeynabo(username: string, password: string): Promise<HeynaboUser> {
    console.log("🔑 > HEYNABO > Logging into Heynabo for username: ", username)
    const result = getTokenFromHeynaboApi(username, password, heyNaboApi)
    return result
}

const heyNaboLocationExample = {
    "id": 2,
    "type": "location",
    "address": "Heynabo! ",
    "street": "Heynabo!",
    "streetNumber": "",
    "floor": null,
    "ext": null,
    "map": null,
    "city": "",
    "zipCode": "",
    "typeId": 1,
    "hidden": true
}
type HeynaboLocation = typeof heyNaboLocationExample

async function loadLocations(from: string, token: string): Promise<HeynaboLocation[]> {
    const url = `${from}/members/locations/`
    console.log("Loading locations from: ", url)
    const result = await $fetch(url, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            ContentType: 'application/json'
        }
    }) satisfies HeynaboLocation[];
    return result
}

const henaboMemberExample = {
    "id": 130,
    "type": "user",
    "email": "karin.thoby@gmail.com",
    "firstName": "Karin",
    "lastName": "Thoby",
    "phone": "29261868",
    "emergencyContact": null,
    "dateOfBirth": null,
    "description": "",
    "uiStorage": "{\"welcome\":{\"notifications\":true,\"calendar\":true,\"bulletin_board\":true},\"setNotifications\":true,\"selectedGroupIds\":[]}",
    "role": "full",
    "roles": [],
    "avatar": "https://prod-space.s3.fr-par.scw.cloud/demo/AVATAR/66d8a3239eabe.jpeg",
    "alias": "",
    "locationId": 48,
    "isFirstLogin": false,
    "lastLogin": "2024-10-09T16:37:43.000000Z",
    "inviteSent": "2024-08-31T17:11:06+00:00",
    "created": "2024-08-31T17:11:00+00:00"
}
type  HeynaboMember = typeof henaboMemberExample

async function loadMembers(from: string, token: string): Promise<HeynaboMember[]> {
    const url = `${from}/admin/users/`
    console.log(`Loading members from ${url}, token ${token}`)
    const {list} = await $fetch(url, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            ContentType: 'application/json'
        }
    }) satisfies HeynaboMember[]
    return list
}

async function importFromHeyNaboForSystemUser(user: string, password: string, api: string) {
    const token = await getApiToken(user, password, api)
    const locations = await loadLocations(heyNaboApi, token)
    console.log(">>>🤖 Imported locations heynabo: ", locations.length)
    const members = await loadMembers(heyNaboApi, token)
    console.log(">>>🤖 Imported members from heynabo: ", members.length)
    return {locations: locations, members: members}
}

export async function importFromHeyNabo() {
    const imported = await importFromHeyNaboForSystemUser(heyNaboUserName, heyNaboPassword, heyNaboApi)
    return imported
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

    if (member.email && 'member.role' !== 'limited') {
        const user: UserCreateInput = {
            email: member.email,
            phone: member.phone,
            passwordHash: 'removeme',
            systemRole: ['admin', 'full'].includes(member.role) && member?.role === 'admin' ? 'ADMIN' : 'USER'
        }
        inhabitant.user = user
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
