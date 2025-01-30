import {defineEventHandler} from 'h3';
import {saveHousehold} from "~/server/data/prismaRepository";
import type {InhabitantCreate, UserCreate, RoleAssignmentCreate} from "~/server/data/prismaRepository";
// Load environment variables - for some undocumented reason, they are not passed to nitro from .env automatically
import dotenv from 'dotenv';


dotenv.config();
const heyNaboUserName = process.env.HEY_NABO_USERNAME as string; //will give runtime error if env variable is undefined - this is intentional
const heyNaboPassword = process.env.HEY_NABO_PASSWORD as string;
const heyNaboApi = process.env.HEY_NABO_API as string;

// curl -X POST https://demo.spaces.heynabo.com/api/login "Content-Type: application/json"  -d '{"email": "$(HEY_NABO_USERNAME)","password": "$(HEY_NABO_PASSWORD)
// grab bearer token from heynabo /login endpoint
async function getApiToken(username: string | undefined, password: string | undefined, api: string | undefined): Promise<string> {
    console.log("Getting token for username: ", username);
    const result = await $fetch(`${api}/login`, {
        method: 'POST',
        body: {email: username, password: password},
        headers: {
            ContentType: 'application/json'
        }
    }) satisfies { token: string };
    const token = result.token
    console.log("Got Heynabo security token: ", token)
    return token
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
    const { list } = await $fetch(url, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            ContentType: 'application/json'
        }
    }) satisfies HeynaboMember[]
    return list
}

async function importFromHeyNabo(user, password, api) {
    const token = await getApiToken(user, password, api)
    const locations = await loadLocations(heyNaboApi, token)
    console.log(">>>🤖 Imported locations heynabo: ", locations.length)
    const members = await loadMembers(heyNaboApi, token)
    console.log(">>>🤖 Imported members from heynabo: ", members.length)
    return {locations: locations, members: members}

}

type HeyNaboRoles = 'admin' | 'full' | 'limited'
function inhabitantFromMember(locationId:number, member: HeynaboMember): InhabitantCreate {
    console.log(`>>>> 👩‍ Found inhabitant ${member.firstName} ${member.lastName} with role ${member.role} for location ${locationId}`)
    const inhabitant = {
        heynaboId: member.id,
        pictureUrl: member.avatar || '', //Fixme - should be nullable instead!
        name: member.firstName,
        lastName: member.lastName,
        birthDate: member.dateOfBirth ? new Date(member.dateOfBirth).toISOString() : new Date('2000-01-01').toISOString(), //Fixme - should be nullable instead!
    } satisfies InhabitantCreate
    if( ['admin', 'full'].includes(member.role) ) {
        const roleAssignment: RoleAssignmentCreate = {
            role: member?.role === 'admin' ? 'ADMIN': 'USER'
        }
        const user: UserCreate = {
            email: member.email,
            phone: member.phone,
            roleAssignments: [ roleAssignment ]
        }
        inhabitant.user = user
    }
    return inhabitant

}
function findInhabitantsByLocation(id: number, members: HeynaboMember[]): InhabitantCreate[] {
    return members
        .filter(member => member.locationId === id)
        .map(member => inhabitantFromMember(id, member))
}
function createHouseholdsFromImport(d1Client: D1Database, locations: HeynaboLocation[], members: HeynaboMember[]): HouseholdCreate[] {
    console.log(">> 🤖 1. I will create households from heynabo imported locations")
    const households = locations.map( location =>  {
        console.log(`>>> 🏗️ IMPORT > Processsing location id ${location.id} `)
        const newHousehold:HouseholdCreate = {
            heynaboId: location.id,
            movedInDate: new Date('2019-06-25').toISOString(),
            moveOutDate: new Date('9999-06-25').toISOString(),
            pbsId: 0,
            name: location.address.replace(/[^a-zA-Z]*/g, location.address.substring(0,1)),
            address: location.address,
            inhabitants: findInhabitantsByLocation(location.id, members)
        }
        return newHousehold
    })

    console.log(">> 🏠 IMPORT > CREATE > Created households: ", households.length)
   return households
}

// Returns imported locations and members from HeyNabo
export default defineEventHandler(async (event) => {
    const imported = await importFromHeyNabo(heyNaboUserName, heyNaboPassword, heyNaboApi)
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const households = await createHouseholdsFromImport(d1Client, imported.locations, imported.members)
    console.log(">>>🏠 Saving households: ", households.length)
    console.log(">>>🏠 Data in first household: ", households[0])
    try {
        const result = await saveHousehold(d1Client, households[0]) //try with just 1!
        return {result: result, status: 200}
    } catch (e) {
        console.error("Error saving households: ", e)
        return {error: e, status: 500}
    }
})
