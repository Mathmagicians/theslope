// POST /api/admin/teams/[id] - Update team, only if season is not in the past

import {defineEventHandler, createError, getValidatedRouterParams, readValidatedBody} from "h3"
import {updateTeam} from "~~/server/data/prismaRepository"
import type {CookingTeamDetail, CookingTeamUpdate} from "~/composables/useCookingTeamValidation"
import {useCookingTeamValidation} from "~/composables/useCookingTeamValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from 'zod'

const {throwH3Error} = eventHandlerHelper

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('Team ID must be a positive integer')
})

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
        const params = await getValidatedRouterParams(event, idSchema.parse)
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
        console.log(`👥 > TEAM > [POST] Updating team with id ${id}`)
        const updatedTeam = await updateTeam(d1Client, id, teamData)
        console.info(`👥 > TEAM > [POST] Successfully updated team ${updatedTeam.name}`)
        return updatedTeam
    } catch (error) {
        throwH3Error(`👥 > TEAM > [POST] Error updating team with id ${id}`, error)
        return undefined as never
    }
})
