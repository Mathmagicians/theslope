import {defineEventHandler, getQuery} from "h3"
import {fetchAllergiesForInhabitant, fetchAllergiesForHousehold} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {h3eFromCatch} = eventHandlerHelper

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    const query = getQuery(event)
    const householdId = query.householdId ? Number(query.householdId) : undefined
    const inhabitantId = query.inhabitantId ? Number(query.inhabitantId) : undefined

    // If inhabitantId query parameter is provided, fetch allergies for that inhabitant
    if (inhabitantId) {
        console.info(`🏥 > ALLERGY > [GET] Fetching allergies for inhabitant ${inhabitantId}`)
        try {
            const allergies = await fetchAllergiesForInhabitant(d1Client, inhabitantId)
            console.info(`🏥 > ALLERGY > [GET] Found ${allergies.length} allergies for inhabitant ${inhabitantId}`)
            return allergies
        } catch (error) {
            const h3e = h3eFromCatch(`🏥 > ALLERGY > [GET] Error fetching allergies for inhabitant ${inhabitantId}`, error)
            console.error(`🏥 > ALLERGY > [GET] ${h3e.statusMessage}`, error)
            throw h3e
        }
    }

    // If householdId query parameter is provided, fetch allergies for that household
    if (householdId) {
        console.info(`🏥 > ALLERGY > [GET] Fetching allergies for household ${householdId}`)
        try {
            const allergies = await fetchAllergiesForHousehold(d1Client, householdId)
            console.info(`🏥 > ALLERGY > [GET] Found ${allergies.length} allergies for household ${householdId}`)
            return allergies
        } catch (error) {
            const h3e = h3eFromCatch(`🏥 > ALLERGY > [GET] Error fetching allergies for household ${householdId}`, error)
            console.error(`🏥 > ALLERGY > [GET] ${h3e.statusMessage}`, error)
            throw h3e
        }
    }

    // Neither householdId nor inhabitantId provided
    throw createError({
        statusCode: 400,
        message: 'Either householdId or inhabitantId query parameter is required'
    })
})
