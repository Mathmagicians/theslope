// todays dinner event
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
