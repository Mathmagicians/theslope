import {defineEventHandler, getValidatedRouterParams, readValidatedBody, setResponseStatus} from "h3"
import {updateSeason} from "~~/server/data/prismaRepository"
import {useSeasonValidation, type Season} from "~/composables/useSeasonValidation"
import * as z from 'zod'
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper

// Get the validation utilities from our composable
const {SeasonSchema} = useSeasonValidation()

// Schema for route parameters
const idSchema = z.object({
    id: z.coerce.number().int().positive('Season ID must be a positive integer')
})

// Create a function that returns a refined schema for POST operations with ID validation
const createPostSeasonSchema = (expectedId: number) =>
    SeasonSchema
        .refine(season => season.id, {
            message: 'ID is required when updating an existing season. Use PUT to create a new season.',
            path: ['id']
        })
        .refine(season => !season.id || season.id === expectedId, {
            message: 'Season ID in URL does not match ID in request body',
            path: ['id']
        })

export default defineEventHandler(async (event): Promise<Season> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch
    let id!: number
    let seasonData!: Season
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        id = params.id
        seasonData = await readValidatedBody(event, createPostSeasonSchema(id).parse)
    } catch (error) {
        return throwH3Error('🌞 > SEASON > [POST] Validation error', error)
    }

    if (!seasonData.id || seasonData.id !== id) {
        return throwH3Error('🌞 > SEASON > [POST] ID mismatch', new Error(`Season ID ${id} in URL must match ID in body ${seasonData.id}`), 400)
    }
    // Database operations try-catch
    try {
        const updatedSeason = await updateSeason(d1Client, seasonData)
        setResponseStatus(event, 200)
        return updatedSeason
    } catch (error) {
        return throwH3Error(`🌞 > SEASON > [POST] Error updating season with id ${id}`, error)
    }
})
