import {defineEventHandler, getValidatedRouterParams, readValidatedBody} from "h3"
import {fetchUser, saveUser} from "~~/server/data/prismaRepository"
import {useCoreValidation, type UserCreate, type UserDetail} from "~/composables/useCoreValidation"
import {reconcileUserRoles, RoleOwner} from "~/composables/useUserRoles"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from 'zod'

const {throwH3Error} = eventHandlerHelper
const LOG = '🪪 > USER > [POST]'

const idSchema = z.object({
    id: z.coerce.number().int().positive('User ID must be a positive integer')
})

export default defineEventHandler(async (event): Promise<UserDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Get schema inside handler to avoid circular dependency.
    // Reuse UserUpdateSchema validators so update validation stays consistent with create/login flows
    // (RFC 5322 "Display Name <email>" normalization, phone regex). ID comes from route params, not body.
    const {UserUpdateSchema} = useCoreValidation()
    const UpdateUserBodySchema = UserUpdateSchema
        .pick({systemRoles: true, email: true, phone: true})
        .refine(b => b.systemRoles !== undefined || b.email !== undefined || b.phone !== undefined, {
            message: 'At least one of systemRoles, email, phone must be provided'
        })

    // Validate input - fail early on invalid data
    let userId!: number
    let body!: z.infer<typeof UpdateUserBodySchema>
    try {
        userId = (await getValidatedRouterParams(event, idSchema.parse)).id
        body = await readValidatedBody(event, UpdateUserBodySchema.parse)
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
