import {defineEventHandler, readValidatedBody, setResponseStatus} from "h3"
import {saveInhabitant} from "~~/server/data/prismaRepository"
import {useCoreValidation} from "~/composables/useCoreValidation"
import type {InhabitantDetail} from "~/composables/useCoreValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper

export default defineEventHandler<Promise<InhabitantDetail>>(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let inhabitantData!: InhabitantDetail
    let householdId!: number
    try {
        const {InhabitantCreateSchema} = useCoreValidation()
        inhabitantData = await readValidatedBody(event, InhabitantCreateSchema.parse)
        householdId = inhabitantData.householdId
    } catch (error) {
        return throwH3Error('👩‍🏠 > INHABITANT > [PUT] Input validation error', error)
    }

    // Database operations try-catch - separate concerns
    try {
        console.info(`👩‍🏠 > INHABITANT > [PUT] Creating inhabitant ${inhabitantData.name} for household ${householdId}`)
        const savedInhabitant = await saveInhabitant(d1Client, inhabitantData, householdId)
        console.info(`👩‍🏠 > INHABITANT > [PUT] Successfully created inhabitant ${savedInhabitant.name}`)
        setResponseStatus(event, 201)
        return savedInhabitant
    } catch (error) {
        return throwH3Error(`👩‍🏠 > INHABITANT > [PUT] Error creating inhabitant`, error)
    }
})
