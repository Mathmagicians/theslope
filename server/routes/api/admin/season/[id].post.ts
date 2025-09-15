import {defineEventHandler, readBody, H3Error, setResponseStatus, createError, getRouterParam} from "h3"
import {updateSeason} from "~~/server/data/prismaRepository"
import {useSeasonValidation} from "~/composables/useSeasonValidation"

// Get the validation utilities from our composable
const {deserializeSeason, SeasonSchema} = useSeasonValidation()

// Create a refined schema for POST operations that requires an ID
const PostSeasonSchema = SeasonSchema.refine(
    season => season.id,
    {
        message: 'ID is required when updating an existing season. Use PUT to create a new season.',
        path: ['id']
    }
)

export default defineEventHandler(async (event) => {
    try {
        const {cloudflare} = event.context
        const d1Client = cloudflare.env.DB

        // Get the ID from the route parameter
        const seasonId = getRouterParam(event, 'id')
        if (!seasonId) {
            throw createError({
                statusCode: 400,
                message: 'Season ID is required'
            })
        }

        // Read the raw body
        let rawBody = await readBody(event)

        // Deserialize the data
        let seasonData
        try {
           seasonData = deserializeSeason(rawBody)
        } catch (err) {
            console.error("🌞per > SEASON > [POST] Deserialization error:", err)
            throw createError({
                statusCode: 400,
                message: 'Error deserializing season data in POST request',
                cause: err
            })
        }

        // Ensure the ID from the route matches the ID in the body
        if (seasonData.id && seasonData.id.toString() !== seasonId) {
            throw createError({
                statusCode: 400,
                message: 'Season ID in URL does not match ID in request body'
            })
        }

        // Set the ID from the route if not present in body
        if (!seasonData.id) {
            seasonData.id = parseInt(seasonId)
        }

        // Validate the deserialized data using the application schema
        const validationResult = PostSeasonSchema.safeParse(seasonData)
        if (!validationResult.success) {
            console.error("🌞 > SEASON > [POST] Validation error:", JSON.stringify(validationResult.error.format()))
            throw createError({
                statusCode: 400,
                message: 'Invalid season data',
                data: validationResult.error
            })
        }

        // Update the existing season
        const updatedSeason = await updateSeason(d1Client, rawBody)

        // Return the updated season with 200 OK status
        setResponseStatus(event, 200)
        return updatedSeason
    } catch (error) {
        console.error("🌞 > SEASON > Error updating season:", error)

        // If it's a validation error (H3Error), return 400 Bad Request
        if (error instanceof H3Error) {
            console.error("🌞 > SEASON > Validation Error:", error.data, error)
            // Include more detailed error information for debugging
            const errorData = error.data || error
            console.error("🌞 > SEASON > [POST] H3Error details:", JSON.stringify(errorData))
            throw createError({
                statusCode: 400,
                message: 'Invalid season input',
                data: errorData
            })
        } else {
            // Otherwise return 500 Internal Server Error
            console.error("🌞 > SEASON > [POST] Server error:", error)
            throw createError({
                statusCode: 500,
                message: '🌞 > SEASON > Server Error',
                cause: error
            })
        }
    }
})
