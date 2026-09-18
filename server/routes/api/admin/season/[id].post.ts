import {defineEventHandler, getValidatedRouterParams, readValidatedBody, setResponseStatus} from "h3"
import {fetchSeason, updateSeason} from "~~/server/data/prismaRepository"
import {useSeasonValidation, type Season, type SeasonUpdateResponse} from "~/composables/useSeasonValidation"
import {useSeason} from "~/composables/useSeason"
import {reconcileDinnerEventsForSeason} from "~~/server/utils/reconcileDinnerEvents"
import {clipPreferences} from "~~/server/utils/initializePreferences"
import {scaffoldPrebookings} from "~~/server/utils/scaffoldPrebookings"
import * as z from 'zod'
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper

// Get the validation utilities from our composable
const {SeasonSchema, SeasonUpdateResponseSchema} = useSeasonValidation()

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

/**
 * POST /api/admin/season/[id]
 * Updates a season and reconciles its dinner events when the schedule changed.
 * Activation stays with POST /api/admin/season/active, so `isActive` in the body is ignored.
 * On the active season the save also runs the idempotent pair activation runs
 * (clipPreferences + scaffoldPrebookings, ADR-015), so bookings follow the new schedule.
 * Returns: SeasonUpdateResponse (ADR-009 operation result)
 */
export default defineEventHandler(async (event): Promise<SeasonUpdateResponse> => {
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
        const {getScheduleChangeDesiredEvents} = useSeason()

        // Fetch existing season to check if schedule changed
        const existingSeason = await fetchSeason(d1Client, id)
        if (!existingSeason) {
            return throwH3Error(`🌞 > SEASON > [POST] Season ${id} not found`, new Error('Not found'), 404)
        }

        // Activation is owned by POST /active - keep the stored flag
        const seasonToSave: Season = {...seasonData, isActive: existingSeason.isActive}

        // Check if schedule changed (ADR-015: avoid unnecessary reconciliation)
        const scheduleChanged = getScheduleChangeDesiredEvents(existingSeason, seasonToSave) !== null

        // Update season first
        await updateSeason(d1Client, seasonToSave)

        // Then reconcile dinner events if schedule changed
        let reconciliation = {created: 0, idempotent: 0, deleted: 0}
        if (scheduleChanged) {
            console.info(`🌞 > SEASON > [POST] Schedule changed for season ${id}, reconciling dinner events`)
            reconciliation = await reconcileDinnerEventsForSeason(d1Client, seasonToSave, '🌞 > SEASON > [POST]')
        }

        // A live season keeps its bookings in step with the new schedule right away
        // instead of waiting for the nightly job (ADR-015: both jobs are idempotent)
        let scaffold = null
        if (existingSeason.isActive && scheduleChanged) {
            const clipResult = await clipPreferences(d1Client, id)
            console.info(`🌞 > SEASON > [POST] Clipped ${clipResult.initialized} inhabitants`)

            scaffold = await scaffoldPrebookings(d1Client, {seasonId: id})
            console.info(`🌞 > SEASON > [POST] Scaffolded ${scaffold?.created ?? 0} orders`)
        }

        // Return full season with dinnerEvents (ADR-009: detail endpoint)
        const resultSeason = await fetchSeason(d1Client, id)
        setResponseStatus(event, 200)
        return SeasonUpdateResponseSchema.parse({season: resultSeason, reconciliation, scaffold})
    } catch (error) {
        return throwH3Error(`🌞 > SEASON > [POST] Error updating season with id ${id}`, error)
    }
})
