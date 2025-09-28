import {defineEventHandler, readValidatedBody, setResponseStatus, createError, getValidatedRouterParams} from "h3"
import {updateSeason} from "~~/server/data/prismaRepository"
import {useSeasonValidation} from "~/composables/useSeasonValidation"
import * as z from 'zod'
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
const {h3eFromCatch} = eventHandlerHelper

// Get the validation utilities from our composable
const {SerializedSeasonValidationSchema, serializeSeason} = useSeasonValidation()

// Schema for route parameters
const idSchema = z.object({
    id: z.coerce.number().int().positive('Season ID must be a positive integer')
})

// Create a function that returns a refined schema for POST operations with ID validation
const createPostSeasonSchema = (expectedId: number) =>
    SerializedSeasonValidationSchema
        .refine(season => season.id, {
            message: 'ID is required when updating an existing season. Use PUT to create a new season.',
            path: ['id']
        })
        .refine(season => !season.id || season.id === expectedId, {
            message: 'Season ID in URL does not match ID in request body',
            path: ['id']
        })

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch
    let id, seasonData
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        id = params.id
        seasonData = await readValidatedBody(event, createPostSeasonSchema(id).parse)
    } catch (error) {
        const h3e = h3eFromCatch('Validation error', error)
        console.error("🌞 > SEASON > [POST] Input validation error:", h3e.statusMessage)
        throw h3e
    }

    if (!seasonData.id || seasonData.id !== id) {
        const h3e = h3eFromCatch('Invalid input', new Error(`Season ID ${id} in URL must match ID in body ${seasonId.id}`))
        console.warn("🌞 > SEASON > [POST] ID mismatch:", h3e.statusMessage)
        throw h3e
    }
    // Database operations try-catch
    try {
        const updatedSeason = await updateSeason(d1Client, seasonData)
        setResponseStatus(event, 200)
        return updatedSeason
    } catch (error) {
        console.error("🌞 > SEASON > Error updating season:", error)
        throw createError({
            statusCode: 500,
            message: '🌞 > SEASON > Server Error',
            cause: error
        })
    }
})
