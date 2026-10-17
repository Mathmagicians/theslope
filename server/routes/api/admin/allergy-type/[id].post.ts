import {defineEventHandler, getValidatedRouterParams, readValidatedBody, setResponseStatus} from "h3"
import {updateAllergyType} from "~~/server/data/allergyRepository"
import {useAllergyValidation} from "~/composables/useAllergyValidation"
import type {AllergyTypeDisplay, AllergyTypeUpdate} from "~/composables/useAllergyValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {idParams} from '~/composables/useCoreValidation'

const {throwH3Error} = eventHandlerHelper

// Define schema for ID parameter
const paramSchema = idParams('id')

export default defineEventHandler(async (event): Promise<AllergyTypeDisplay> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const {AllergyTypeUpdateSchema} = useAllergyValidation()

    // Input validation - FAIL EARLY
    let id!: number
    let requestData!: AllergyTypeUpdate
    try {
        const params = await getValidatedRouterParams(event, paramSchema.parse)
        id = params.id
        requestData = await readValidatedBody(event, (body) =>
            AllergyTypeUpdateSchema.parse({...(body as object), id})
        )
    } catch (error) {
        return throwH3Error('🏥 > ALLERGY_TYPE > [POST] Input validation error', error)
    }

    // Business logic
    try {
        console.info(`🏥 > ALLERGY_TYPE > [POST] Updating allergy type with ID ${id}`)
        const updatedAllergyType = await updateAllergyType(d1Client, requestData)
        console.info(`🏥 > ALLERGY_TYPE > [POST] Successfully updated allergy type ${updatedAllergyType.name}`)
        setResponseStatus(event, 200)
        return updatedAllergyType
    } catch (error) {
        return throwH3Error(`🏥 > ALLERGY_TYPE > [POST] Error updating allergy type with ID ${id}`, error)
    }
})
