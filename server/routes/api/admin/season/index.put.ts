import {defineEventHandler, readValidatedBody, setResponseStatus} from "h3"
import {createSeason} from "~~/server/data/prismaRepository"
import {useSeasonValidation} from "~/composables/useSeasonValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {h3eFromCatch} = eventHandlerHelper

// Get the validation utilities from our composable
const {SeasonSchema} = useSeasonValidation()

// Create a refined schema for PUT operations that rejects any season with an ID
const PutSeasonSchema = SeasonSchema.refine(
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
        const h3e = h3eFromCatch('Input validation error', error)
        console.warn("🌞 > SEASON > [PUT] ", h3e.message)
        throw h3e
    }

    // Database operations try-catch - separate concerns
    try {
        const savedSeason = await createSeason(d1Client, seasonData)
        setResponseStatus(event, 201)
        return savedSeason
    } catch (error) {
        const h3e = h3eFromCatch('Error creating season', error)
        console.error("🌞 > SEASON > ", h3e.message)
        throw h3e
    }
})
