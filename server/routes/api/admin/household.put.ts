import {defineEventHandler, readBody, setResponseStatus} from "h3";
import {saveHousehold} from "~~/server/data/prismaRepository";
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {h3eFromCatch} = eventHandlerHelper

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let householdData
    try {
        householdData = await readBody(event)
        // TODO: Add Zod validation schema for household
    } catch (error) {
        const h3e = h3eFromCatch('🏠 > HOUSEHOLD > [PUT] Input validation error', error)
        console.error(`🏠 > HOUSEHOLD > [PUT] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Database operations try-catch - separate concerns
    try {
        console.log(`🏠 > HOUSEHOLD > [PUT] Creating household ${householdData.name}`)
        const savedHousehold = await saveHousehold(d1Client, householdData)
        console.info(`🏠 > HOUSEHOLD > [PUT] Successfully created household ${savedHousehold.name}`)
        setResponseStatus(event, 201)
        return savedHousehold
    } catch (error) {
        const h3e = h3eFromCatch(`🏠 > HOUSEHOLD > [PUT] Error creating household`, error)
        console.error(`🏠 > HOUSEHOLD > [PUT] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
