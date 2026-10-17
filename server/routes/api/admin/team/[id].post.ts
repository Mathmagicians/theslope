// POST /api/admin/teams/[id] - Update team and auto-reassign affinities + dinner events

import {defineEventHandler, createError, getValidatedRouterParams, readValidatedBody} from "h3"
import {updateTeamWithAssignments} from "~~/server/utils/teamService"
import type {CookingTeamDetail, CookingTeamUpdate} from "~/composables/useCookingTeamValidation"
import {useCookingTeamValidation} from "~/composables/useCookingTeamValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {idParams} from '~/composables/useCoreValidation'

const {throwH3Error} = eventHandlerHelper

// Define schema for ID parameter
const paramSchema = idParams('id')

// Get the validation schema from composable (ADR-009)
const {CookingTeamUpdateSchema} = useCookingTeamValidation()

// Create schema for POST operations (CookingTeamUpdate without id in body, id comes from URL)
const PostTeamSchema = CookingTeamUpdateSchema.omit({ id: true })

export default defineEventHandler(async (event): Promise<CookingTeamDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id!: number
    let teamData!: CookingTeamUpdate
    try {
        const params = await getValidatedRouterParams(event, paramSchema.parse)
        id = params.id
        const bodyData = await readValidatedBody(event, PostTeamSchema.parse)
        // Construct CookingTeamUpdate with id from URL
        teamData = { ...bodyData, id }
    } catch (error) {
        console.error("👥 > TEAM > [POST] Input validation error:", error)
        throw createError({
            statusCode: 400,
            message: 'Invalid input data',
            cause: error
        })
    }

    // Database operations try-catch - separate concerns
    try {
        console.info(`👥 > TEAM > [POST] Updating team ${id} with auto-reassignment`)
        const result = await updateTeamWithAssignments(d1Client, id, teamData)
        const updatedTeam = result.teams[0]
        if (!updatedTeam) {
            return throwH3Error(`👥 > TEAM > [POST] Team ${id} not found after update`, new Error('Team not found'), 404)
        }
        console.info(`👥 > TEAM > [POST] Updated team ${updatedTeam.name}, reassigned ${result.eventsAssigned} events`)
        return updatedTeam
    } catch (error) {
        return throwH3Error(`👥 > TEAM > [POST] Error updating team with id ${id}`, error)
    }
})
