import {defineEventHandler, readBody, H3Error, setResponseStatus, createError} from "h3"
import {createSeason} from "~/server/data/prismaRepository"
import {useSeasonValidation} from "~/composables/useSeasonValidation"

// Get the validation utilities from our composable
const {deserializeSeason, SeasonSchema} = useSeasonValidation()

// Create a refined schema for PUT operations that rejects any season with an ID
const PutSeasonSchema = SeasonSchema.refine(
    season => !season.id,
    {
        message: 'Cannot provide an ID when creating a new season. Use POST to update an existing season.',
        path: ['id']
    }
)

export default defineEventHandler(async (event) => {
    try {
        const {cloudflare} = event.context
        const d1Client = cloudflare.env.DB
        
        // Read the raw body
        let rawBody = await readBody(event)
        
        // Deserialize the data
        let seasonData
        try {
           seasonData = deserializeSeason(rawBody)
        } catch (err) {
            console.error("🌞 > SEASON > [PUT] Deserialization error:", err)
            throw createError({
                statusCode: 400,
                message: 'Error deserializing season data in PUT request',
                cause: err
            })
        }
        
        // Validate the deserialized data using the application schema
        // Use the refined schema that also checks for ID
        const validationResult = PutSeasonSchema.safeParse(seasonData)
        if (!validationResult.success) {
            console.error("🌞 > SEASON > [PUT] Validation error:", JSON.stringify(validationResult.error.format()))
            throw createError({
                statusCode: 400,
                message: 'Invalid season data',
                data: validationResult.error
            })
        }
        
        // Create a new season
        const savedSeason = await createSeason(d1Client, rawBody)
        
        // Return the saved season with 201 Created status
        setResponseStatus(event, 201)
        return savedSeason
    } catch (error) {
        console.error("🌞 > SEASON > Error saving season:", error)
        
        // If it's a validation error (H3Error), return 400 Bad Request
        if (error instanceof H3Error) {
            console.error("🌞 > SEASON > Validation Error:", error.data, error)
            // Include more detailed error information for debugging
            const errorData = error.data || error
            console.error("🌞 > SEASON > [PUT] H3Error details:", JSON.stringify(errorData))
            throw createError({
                statusCode: 400,
                message: 'Forkert sæson input',
                data: errorData
            })
        } else {
            // Otherwise return 500 Internal Server Error
            console.error("🌞 > SEASON > [PUT] Server error:", error)
            throw createError({
                statusCode: 500,
                message: '🌞 > SEASON > Server Error',
                cause: error
            })
        }
    }
})
