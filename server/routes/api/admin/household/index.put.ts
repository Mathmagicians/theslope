import {defineEventHandler, readValidatedBody, setResponseStatus} from "h3";
import {saveHousehold} from "~~/server/data/prismaRepository";
import {useCoreValidation} from "~/composables/useCoreValidation";
import type {HouseholdCreate, HouseholdDetail} from "~/composables/useCoreValidation";
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper

export default defineEventHandler<Promise<HouseholdDetail>>(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let householdData!: HouseholdCreate
    try {
        const {HouseholdCreateSchema} = useCoreValidation()
        householdData = await readValidatedBody(event, HouseholdCreateSchema.parse)
    } catch (error) {
        return throwH3Error('🏠 > HOUSEHOLD > [PUT] Input validation error', error)
    }

    // Database operations try-catch - separate concerns
    try {
        console.info(`🏠 > HOUSEHOLD > [PUT] Creating household ${householdData.name}`)
        const savedHousehold = await saveHousehold(d1Client, householdData)
        console.info(`🏠 > HOUSEHOLD > [PUT] Successfully created household ${savedHousehold.name}`)
        setResponseStatus(event, 201)
        return savedHousehold
    } catch (error) {
        return throwH3Error('🏠 > HOUSEHOLD > [PUT] Error creating household', error)
    }
})
