import {defineEventHandler, getValidatedRouterParams, readValidatedBody} from "h3"
import {fetchUser, saveUser} from "~~/server/data/prismaRepository"
import type {UserCreate, UserDetail} from "~/composables/useCoreValidation"
import {reconcileUserRoles, RoleOwner} from "~/composables/useUserRoles"
import {SystemRoleSchema} from '~~/prisma/generated/zod'
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from 'zod'

const {throwH3Error} = eventHandlerHelper
const LOG = '🪪 > USER > [POST]'

const idSchema = z.object({
    id: z.coerce.number().int().positive('User ID must be a positive integer')
})

// Partial update — admin may set any subset. systemRoles are TS-reconciled (HN-owned roles preserved).
const UpdateUserSchema = z.object({
    systemRoles: z.array(SystemRoleSchema).optional(),
    email:       z.string().email().optional(),
    phone:       z.union([z.string(), z.null()]).optional()
}).refine(b => b.systemRoles !== undefined || b.email !== undefined || b.phone !== undefined, {
    message: 'At least one of systemRoles, email, phone must be provided'
})

export default defineEventHandler(async (event): Promise<UserDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Validate input - fail early on invalid data
    let userId!: number
    let body!: z.infer<typeof UpdateUserSchema>
    try {
        userId = (await getValidatedRouterParams(event, idSchema.parse)).id
        body = await readValidatedBody(event, UpdateUserSchema.parse)
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error)
    }

    // Business logic
    try {
        const existingUser = await fetchUser(d1Client, {id: userId})
        if (!existingUser) {
            throw new Error(`User with ID ${userId} not found`)
        }

        // Build delta — only the fields the admin actually set (no merge with existing).
        const delta: Partial<UserCreate> = {}
        if (body.email !== undefined) delta.email = body.email
        if (body.phone !== undefined) delta.phone = body.phone
        if (body.systemRoles !== undefined) {
            // TS caller can only modify TS-owned roles; HN-owned roles preserved
            delta.systemRoles = reconcileUserRoles(existingUser.systemRoles, body.systemRoles, RoleOwner.TS).roles
        }

        console.info(`${LOG} Updating user id=${userId} fields=[${Object.keys(delta).join(',')}]`)
        return await saveUser(d1Client, delta, userId)
    } catch (error) {
        return throwH3Error(`${LOG} Error updating user ${userId}`, error)
    }
})
