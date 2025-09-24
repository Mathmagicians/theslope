import {defineEventHandler, readValidatedBody, setResponseStatus, createError} from "h3"
import {createSeason} from "~~/server/data/prismaRepository"
import {useSeasonValidation} from "~/composables/useSeasonValidation"

// Get the validation utilities from our composable
const {SerializedSeasonValidationSchema} = useSeasonValidation()

// Create a refined schema for PUT operations that rejects any season with an ID
const PutSeasonSchema = SerializedSeasonValidationSchema.refine(
    (season: any) => !season.id,
    {
        message: 'Cannot provide an ID when creating a new season. Use POST to update an existing season.',
        path: ['id']
    }
)

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let seasonData
    try {
        seasonData = await readValidatedBody(event, PutSeasonSchema.parse)
    } catch (error) {
        console.error("🌞 > SEASON > [PUT] Input validation error:", error)
        throw createError({
            statusCode: 400,
            message: 'Invalid input data',
            cause: error
        })
    }

    // Database operations try-catch - separate concerns
    try {
        const savedSeason = await createSeason(d1Client, seasonData)
        setResponseStatus(event, 201)
        return savedSeason
    } catch (error) {
        console.error("🌞 > SEASON > Error creating season:", error)
        throw createError({
            statusCode: 500,
            message: '🌞 > SEASON > Server Error',
            cause: error
        })
    }
})
