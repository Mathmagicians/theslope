// Returns dinner events in the households calendar for the specified dates - specified by query parameters from and to, if none specified defaults to current month
import {defineEventHandler} from "h3";

const LOG = '📆 > CALENDAR'

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const _d1Client = cloudflare.env.DB
    const date = getRouterParam(event, 'date')
    console.info(`${LOG} > GET ${date} fetching data`)
    // const today = await fetchToday(d1Client)
    console.info(`${LOG} > GET: returning stub`)
    return {
        date: date,
        result: {}
    }
})
