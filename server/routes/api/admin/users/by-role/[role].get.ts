import {defineEventHandler, getValidatedRouterParams} from "h3"
import {fetchUsersByRole} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {SystemRoleSchema} from '~~/prisma/generated/zod'
import type {SystemRole, UserDisplay} from "~/composables/useUserValidation"
import * as z from 'zod'

const {h3eFromCatch} = eventHandlerHelper

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
        const h3e = h3eFromCatch('🪪 > USER > [GET] Input validation error', error)
        console.error(`🪪 > USER > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Fetch users by role from database
    try {
        console.info(`🪪 > USER > [GET] Fetching users with role ${role}`)
        const users = await fetchUsersByRole(d1Client, role)
        console.info(`🪪 > USER > [GET] Found ${users.length} users with role ${role}`)
        return users
    } catch (error) {
        const h3e = h3eFromCatch(`🪪 > USER > [GET] Error fetching users by role ${role}`, error)
        console.error(`🪪 > USER > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
