import {defineEventHandler, readValidatedBody, setResponseStatus} from "h3"
import {createSeason} from "~~/server/data/prismaRepository"
import {useSeasonValidation, type Season} from "~/composables/useSeasonValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper

// Get the validation utilities from our composable
const {SeasonSchema} = useSeasonValidation()

// Create a refined schema for PUT operations that rejects any season with an ID
const PutSeasonSchema = SeasonSchema.refine(
    (season: Season) => !season.id,
    {
        message: 'Cannot provide an ID when creating a new season. Use POST to update an existing season.',
        path: ['id']
    }
)

export default defineEventHandler(async (event): Promise<Season> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let seasonData!: Season
    try {
        seasonData = await readValidatedBody(event, PutSeasonSchema.parse)
    } catch (error) {
        return throwH3Error('🌞 > SEASON > [PUT] Input validation error', error)
    }

    // Database operations try-catch - separate concerns
    try {
        const savedSeason = await createSeason(d1Client, seasonData)
        setResponseStatus(event, 201)
        return savedSeason
    } catch (error) {
        return throwH3Error('🌞 > SEASON > [PUT] Error creating season', error)
    }
})
