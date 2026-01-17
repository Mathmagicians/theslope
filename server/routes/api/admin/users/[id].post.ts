import {defineEventHandler, getValidatedRouterParams, readValidatedBody} from "h3"
import {fetchUser, saveUser} from "~~/server/data/prismaRepository"
import type {UserDetail, SystemRole} from "~/composables/useCoreValidation"
import {reconcileUserRoles, RoleOwner} from "~/composables/useUserRoles"
import {SystemRoleSchema} from '~~/prisma/generated/zod'
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from 'zod'

const {throwH3Error} = eventHandlerHelper

const idSchema = z.object({
    id: z.coerce.number().int().positive('User ID must be a positive integer')
})

const UpdateUserRolesSchema = z.object({
    systemRoles: z.array(SystemRoleSchema)
})

export default defineEventHandler(async (event): Promise<UserDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Validate input - fail early on invalid data
    let userId!: number
    let incomingRoles!: SystemRole[]
    try {
        const {id} = await getValidatedRouterParams(event, idSchema.parse)
        userId = id
        const body = await readValidatedBody(event, UpdateUserRolesSchema.parse)
        incomingRoles = body.systemRoles
    } catch (error) {
        return throwH3Error('🪪 > USER > [POST] Input validation error', error)
    }

    // Business logic
    try {
        console.info(`🪪 > USER > [POST] Updating roles for user ID ${userId}`)

        // Fetch existing user
        const existingUser = await fetchUser(d1Client, {id: userId})
        if (!existingUser) {
            throw new Error(`User with ID ${userId} not found`)
        }

        // Reconcile roles - TS caller can only modify TS-owned roles
        const result = reconcileUserRoles(existingUser.systemRoles, incomingRoles, RoleOwner.TS)
        console.info(`🪪 > USER > [POST] Reconciled roles: [${result.roles}]`)

        // Save with reconciled roles
        const updatedUser = await saveUser(d1Client, {
            email: existingUser.email,
            phone: existingUser.phone,
            passwordHash: 'preserved',  // saveUser upserts, password preserved
            systemRoles: result.roles
        })

        return updatedUser
    } catch (error) {
        return throwH3Error(`🪪 > USER > [POST] Error updating user ${userId}`, error)
    }
})
