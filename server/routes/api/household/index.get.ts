// return data for all households

import {defineEventHandler} from "h3";
import {fetchHouseholds} from "~/server/data/prismaRepository";

export default defineEventHandler(async (event) => {
   const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB


    try {
        const households = await fetchHouseholds(d1Client)
        console.info(`>>>  🏠GET > Found  ${ households.length}  households:.`)
       return households
    } catch (e) {
        console.error( "🏠 Error fetching households: ", e)
        return {error: e, status: 500}
    }
})
