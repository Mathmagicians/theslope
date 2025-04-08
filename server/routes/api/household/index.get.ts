// return data for all households

import {defineEventHandler} from "h3";
import {fetchHouseholds} from "~/server/data/prismaRepository";

export default defineEventHandler(async (event) => {
   const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB


    try {
        const households = await fetchHouseholds(d1Client)
        console.info(`>>>  🏠GET > Found  ${ households ? households.length: 0}  households.`)
       return households
    } catch (e) {
        console.error( "🏠 > GET > Error fetching households: ", e)
        createError({cause: e, statusCode: 500, statusMessage: "Error fetching households" })
    }
})
