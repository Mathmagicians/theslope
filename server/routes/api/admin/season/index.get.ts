import {defineEventHandler} from "h3"
import {fetchSeasons} from "~~/server/data/prismaRepository";
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {h3eFromCatch} = eventHandlerHelper

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    try {
        console.log("👨‍💻 > SEASON > [GET]")
        const seasons = await fetchSeasons(d1Client)
        console.info(`👨‍💻 > SEASON > Returning seasons ${seasons?.length}`)
        return seasons ? seasons : []
    } catch (error) {
        const h3e = h3eFromCatch("👨‍💻 > SEASON > [GET] Error fetching seasons", error)
        console.error(`👨‍💻 > SEASON > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
