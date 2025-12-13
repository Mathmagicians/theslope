import {defineEventHandler, readValidatedBody, setResponseStatus} from "h3"
import {createSeason, fetchSeason} from "~~/server/data/prismaRepository"
import {saveDinnerEvents} from "~~/server/data/financesRepository"
import {useSeasonValidation, type Season} from "~/composables/useSeasonValidation"
import {useSeason} from "~/composables/useSeason"
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

/**
 * PUT /api/admin/season - Create a new season with dinner events
 *
 * Orchestrates:
 * 1. Create the season record
 * 2. Generate dinner events based on seasonDates, cookingDays, and holidays
 * 3. Return complete season with dinnerEvents populated
 *
 * Note: Prisma's SQLite adapter automatically batches createManyAndReturn
 * when models have @default(autoincrement()), so no manual chunking needed.
 */
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

    // Business logic try-catch - orchestrates season + dinner events
    try {
        // Step 1: Create the season
        const savedSeason = await createSeason(d1Client, seasonData)
        console.info(`🌞 > SEASON > [PUT] Created season ${savedSeason.shortName} (ID: ${savedSeason.id})`)

        // Step 2: Generate dinner events for the season
        const {generateDinnerEventDataForSeason} = useSeason()
        const dinnerEventData = generateDinnerEventDataForSeason(savedSeason)

        if (dinnerEventData.length > 0) {
            const savedEvents = await saveDinnerEvents(d1Client, dinnerEventData)
            console.info(`🌞 > SEASON > [PUT] Generated ${savedEvents.length} dinner events for season ${savedSeason.id}`)
        } else {
            console.info(`🌞 > SEASON > [PUT] No dinner events to generate for season ${savedSeason.id}`)
        }

        // Step 3: Fetch and return the complete season with dinner events
        const completeSeason = await fetchSeason(d1Client, savedSeason.id!)
        if (!completeSeason) {
            return throwH3Error(`🌞 > SEASON > [PUT] Failed to fetch created season ${savedSeason.id}`, new Error('Season not found after creation'), 500)
        }

        setResponseStatus(event, 201)
        return completeSeason
    } catch (error) {
        return throwH3Error('🌞 > SEASON > [PUT] Error creating season', error)
    }
})
