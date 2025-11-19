import {defineEventHandler, getValidatedRouterParams} from "h3"
import {fetchUsersByRole} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {SystemRoleSchema} from '~~/prisma/generated/zod'
import type {SystemRole, UserDisplay} from "~/composables/useCoreValidation"
import * as z from 'zod'

const {throwH3Error} = eventHandlerHelper

// Define schema for role parameter
const roleParamSchema = z.object({
    role: SystemRoleSchema
})

export default defineEventHandler(async (event): Promise<UserDisplay[]> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Validate input - fail early on invalid data
    let role: SystemRole
    try {
        const params = await getValidatedRouterParams(event, roleParamSchema.parse)
        role = params.role
    } catch (error) {
        throwH3Error('🪪 > USER > [GET] Input validation error', error)
    }

    // Fetch users by role from database
    try {
        console.info(`🪪 > USER > [GET] Fetching users with role ${role}`)
        const users = await fetchUsersByRole(d1Client, role)
        console.info(`🪪 > USER > [GET] Found ${users.length} users with role ${role}`)
        return users
    } catch (error) {
        throwH3Error(`🪪 > USER > [GET] Error fetching users by role ${role}`, error)
    }
})
