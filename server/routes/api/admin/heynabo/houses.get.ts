import {defineEventHandler} from 'h3';
// Load environment variables
import dotenv from 'dotenv';
dotenv.config();
const heyNaboUserName = process.env.HEY_NABO_USERNAME;
const heyNaboPassword = process.env.HEY_NABO_PASSWORD;
const heyNaboApi = process.env.HEY_NABO_API;

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
    })
    const token = result.token
    console.log("Got token: ", token)
    return token
}

async function loadAdresses(from:string, token:string): Promise<string> {
    const url = `${from}/members/locations/`
    console.log("Loading adresses from: ", url)
    const result = await $fetch(url, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            ContentType: 'application/json'
        }
    })
    console.log("Got adresses: ", result)
    return result
}

export default defineEventHandler(async (event) => {
    const token = await getApiToken(heyNaboUserName, heyNaboPassword, heyNaboApi);
    const adresses = await loadAdresses(heyNaboApi, token);
    return adresses
})


// get array with adresses from heynabo
//async function loadAdresses(from): Promise<string>

// import adresses from heynabo

//import users from heynabo
