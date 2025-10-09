import {defineEventHandler, getValidatedQuery, setResponseStatus} from "h3"
import {fetchDinnerEvents} from "~~/server/data/prismaRepository"
import {z} from "zod"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import type {DinnerEvent} from "@prisma/client"

const {h3eFromCatch} = eventHandlerHelper

const querySchema = z.object({
    seasonId: z.coerce.number().int().positive().optional()
})

export default defineEventHandler(async (event): Promise<DinnerEvent[]> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let seasonId: number | undefined
    try {
        const query = await getValidatedQuery(event, querySchema.parse)
        seasonId = query.seasonId
    } catch (error) {
        const h3e = h3eFromCatch('Input validation error', error)
        console.warn("<} > DINNER_EVENT > [GET] ", h3e.message)
        throw h3e
    }

    // Business logic try-catch - separate concerns
    try {
        const dinnerEvents = await fetchDinnerEvents(d1Client, seasonId)
        console.info(`<} > DINNER_EVENT > [GET] Retrieved ${dinnerEvents.length} dinner events${seasonId ? ` for season ${seasonId}` : ''}`)
        setResponseStatus(event, 200)
        return dinnerEvents
    } catch (error) {
        const h3e = h3eFromCatch('Error fetching dinner events', error)
        console.error("<} > DINNER_EVENT > [GET] ", h3e.message)
        throw h3e
    }
})