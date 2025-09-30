import {defineEventHandler, readBody, setResponseStatus} from "h3"
import {saveInhabitant} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {h3eFromCatch} = eventHandlerHelper

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let inhabitantData, householdId
    try {
        const body = await readBody(event)
        inhabitantData = body
        householdId = body.householdId
        // TODO: Add Zod validation schema for inhabitant
        if (!householdId) {
            throw new Error('householdId is required')
        }
    } catch (error) {
        const h3e = h3eFromCatch('👩‍🏠 > INHABITANT > [PUT] Input validation error', error)
        console.error(`👩‍🏠 > INHABITANT > [PUT] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Database operations try-catch - separate concerns
    try {
        console.log(`👩‍🏠 > INHABITANT > [PUT] Creating inhabitant ${inhabitantData.name} for household ${householdId}`)
        const savedInhabitant = await saveInhabitant(d1Client, inhabitantData, householdId)
        console.info(`👩‍🏠 > INHABITANT > [PUT] Successfully created inhabitant ${savedInhabitant.name}`)
        setResponseStatus(event, 201)
        return savedInhabitant
    } catch (error) {
        const h3e = h3eFromCatch(`👩‍🏠 > INHABITANT > [PUT] Error creating inhabitant`, error)
        console.error(`👩‍🏠 > INHABITANT > [PUT] ${h3e.statusMessage}`, error)
        throw h3e
    }
})