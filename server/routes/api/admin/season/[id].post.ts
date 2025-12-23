import {defineEventHandler, getValidatedRouterParams, readValidatedBody, setResponseStatus} from "h3"
import {fetchSeason, updateSeason} from "~~/server/data/prismaRepository"
import {fetchDinnerEvents, saveDinnerEvents, deleteDinnerEvent} from "~~/server/data/financesRepository"
import {useSeasonValidation, type Season} from "~/composables/useSeasonValidation"
import {useSeason} from "~/composables/useSeason"
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
        const {getScheduleChangeDesiredEvents, reconcileDinnerEvents} = useSeason()

        // Fetch existing season to check if schedule changed
        const existingSeason = await fetchSeason(d1Client, id)
        if (!existingSeason) {
            return throwH3Error(`🌞 > SEASON > [POST] Season ${id} not found`, new Error('Not found'), 404)
        }

        // Check if schedule changed and get desired events (ADR-015: single computation)
        const desiredEvents = getScheduleChangeDesiredEvents(existingSeason, seasonData)

        // Update season first
        await updateSeason(d1Client, seasonData)

        // Then reconcile dinner events if schedule changed
        if (desiredEvents) {
            console.info(`🌞 > SEASON > [POST] Schedule changed for season ${id}, reconciling dinner events`)

            // Fetch existing dinner events
            const existingEvents = await fetchDinnerEvents(d1Client, id)

            // Reconcile using pruneAndCreate (ADR-015)
            const reconciliation = reconcileDinnerEvents(existingEvents)(desiredEvents)

            console.info(`🌞 > SEASON > [POST] Reconciliation: create=${reconciliation.create.length}, idempotent=${reconciliation.idempotent.length}, delete=${reconciliation.delete.length}`)

            // Create new events
            if (reconciliation.create.length > 0) {
                await saveDinnerEvents(d1Client, reconciliation.create)
                console.info(`🌞 > SEASON > [POST] Created ${reconciliation.create.length} new dinner events`)
            }

            // Delete removed events
            if (reconciliation.delete.length > 0) {
                const idsToDelete = reconciliation.delete.map(e => e.id)
                await deleteDinnerEvent(d1Client, idsToDelete)
                console.info(`🌞 > SEASON > [POST] Deleted ${reconciliation.delete.length} dinner events`)
            }
        }

        // Return full season with dinnerEvents (ADR-009: detail endpoint)
        const resultSeason = await fetchSeason(d1Client, id)
        setResponseStatus(event, 200)
        return resultSeason!
    } catch (error) {
        return throwH3Error(`🌞 > SEASON > [POST] Error updating season with id ${id}`, error)
    }
})
