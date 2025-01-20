import {defineEventHandler} from 'h3';
// Load environment variables - for some undocumented reason, they are not passed to nitro from .env automatically
import dotenv from 'dotenv';
dotenv.config();
const heyNaboUserName = process.env.HEY_NABO_USERNAME as string; //will give runtime error if env variable is undefined - this is intentional
const heyNaboPassword = process.env.HEY_NABO_PASSWORD as string;
const heyNaboApi = process.env.HEY_NABO_API as string;

// curl -X POST https://demo.spaces.heynabo.com/api/login "Content-Type: application/json"  -d '{"email": "$(HEY_NABO_USERNAME)","password": "$(HEY_NABO_PASSWORD)
// grab bearer token from heynabo /login endpoint
async function getApiToken(username:string|undefined, password:string|undefined, api:string|undefined): Promise<string> {
    console.log("Getting token for username: ", username);
    const result = await $fetch(`${api}/login`, {
        method: 'POST',
        body: {email: username, password: password},
        headers: {
            ContentType: 'application/json'
        }
    }) satisfies {token: string};
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
async function loadLocations(from:string, token:string): Promise<HeynaboLocation[]> {
    const url = `${from}/members/locations/`
    console.log("Loading locations from: ", url)
    const result = await $fetch(url, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            ContentType: 'application/json'
        }
    }) satisfies string[];
    console.log("Got locations: ", result.length)
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

    async function loadMembers(from:string, token:string): Promise<HeynaboMember[]> {
    const url = `${from}/admin/users/`
    console.log("Loading members from: ", url)
    const result = await $fetch(url, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            ContentType: 'application/json'
        }
    }) satisfies string[]
    console.log("Got members from Heynabo: ", result.length)
    return result
}

async function importFromHeyNabo(user, password, api) {
    const token = await getApiToken(user, password, api)
    const locations = await loadLocations(heyNaboApi, token)
    const members = await loadMembers(heyNaboApi, token)
    return { locations: locations, members: members }
}

// Returns imported locations and members from HeyNabo
export default defineEventHandler(async (event) => {
    const imported = await importFromHeyNabo(heyNaboUserName, heyNaboPassword,heyNaboApi)
    const result = createHouseholdsFromImport(imported.locations, imported.members)
    return result
})
