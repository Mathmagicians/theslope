// Returns dinner events in the households calendar for the specified dates - specified by query parameters from and to, if none specified defaults to current month
import {defineEventHandler} from "h3";
export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const date = getRouterParam(event, 'date')
    console.log(`📆 CALENDAR > GET ${date} fetching data`, d1Client)
   // const today = await fetchToday(d1Client)
    console.log("📆 CALENDAR > GET: ")
    return {
        date: date,
        result: {}
    }
})
