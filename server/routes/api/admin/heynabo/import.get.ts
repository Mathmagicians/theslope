import {defineEventHandler} from 'h3';
import {createHouseholdsFromImport, importFromHeyNabo} from "~~/server/integration/heynabo";
import {saveHousehold} from "~~/server/data/prismaRepository";


// Returns imported locations and members from HeyNabo
export default defineEventHandler(async (event) => {
    const { locations, members } = await importFromHeyNabo()
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const households = createHouseholdsFromImport(d1Client, locations, members)

    try {
        console.log("🏠> IMPORT > Saving households: ", households ? households.length: 0 )
        const result = await  Promise.all(  households.map(  household => saveHousehold(d1Client, household) ))
        return result
    } catch (e) {
        console.error("🏠 > IMPORT > Error saving households: ", e)
        createError({cause: e, statusMessage: "🏠 >IMPORT Error saving households", statusCode: 500})
    }
})
