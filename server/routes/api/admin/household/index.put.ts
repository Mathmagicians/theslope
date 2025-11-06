import {defineEventHandler, readValidatedBody, setResponseStatus} from "h3";
import {saveHousehold} from "~~/server/data/prismaRepository";
import {useHouseholdValidation} from "~/composables/useHouseholdValidation";
import type {HouseholdCreate, Household} from "~/composables/useHouseholdValidation";
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {h3eFromCatch} = eventHandlerHelper

export default defineEventHandler<Promise<Household>>(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let householdData: HouseholdCreate
    try {
        const {HouseholdCreateSchema} = useHouseholdValidation()
        householdData = await readValidatedBody(event, HouseholdCreateSchema.parse)
    } catch (error) {
        const h3e = h3eFromCatch('🏠 > HOUSEHOLD > [PUT] Input validation error', error)
        console.warn(`🏠 > HOUSEHOLD > [PUT] ${h3e.statusMessage}`)
        throw h3e
    }

    // Database operations try-catch - separate concerns
    try {
        console.info(`🏠 > HOUSEHOLD > [PUT] Creating household ${householdData.name}`)
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
