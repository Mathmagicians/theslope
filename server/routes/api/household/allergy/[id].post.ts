import {defineEventHandler, getValidatedRouterParams, readValidatedBody, setResponseStatus} from "h3"
import {updateAllergy} from "~~/server/data/allergyRepository"
import {useAllergyValidation, type AllergyDetail, type AllergyUpdate} from "~/composables/useAllergyValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from 'zod'
import {idParams} from '~/composables/useCoreValidation'

const {throwH3Error} = eventHandlerHelper

// Define schema for ID parameter
const paramSchema = idParams('id')

export default defineEventHandler(async (event): Promise<AllergyDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const {AllergyUpdateSchema} = useAllergyValidation()

    // Validate input - fail early on invalid data
    let allergyId!: number
    let allergyData!: AllergyUpdate
    try {
        const {id} = await getValidatedRouterParams(event, paramSchema.parse)
        allergyId = id

        const body = await readValidatedBody(event, z.looseObject({}).parse)
        allergyData = AllergyUpdateSchema.parse({...body, id: allergyId})
    } catch (error) {
        return throwH3Error('🏥 > ALLERGY > [POST] Input validation error', error)
    }

    // Update allergy in database
    try {
        console.info(`🏥 > ALLERGY > [POST] Updating allergy with ID ${allergyId}`)
        const updatedAllergy = await updateAllergy(d1Client, allergyData)
        console.info(`🏥 > ALLERGY > [POST] Updated allergy with ID ${updatedAllergy.id}`)
        setResponseStatus(event, 200)
        return updatedAllergy
    } catch (error) {
        return throwH3Error(`🏥 > ALLERGY > [POST] Error updating allergy with ID ${allergyId}`, error)
    }
})
