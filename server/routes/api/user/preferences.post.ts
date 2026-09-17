/**
 * POST /api/user/preferences - the session user's own notification channels and appearance.
 *
 * One save writes both columns of the logged-in user; there is no id in the path, so no other
 * user can be reached. The session snapshot is replaced with the saved user (keeping the Heynabo
 * token in passwordHash, as login.post.ts builds it) so the appearance applies on the next render.
 *
 * ADR Compliance:
 * - ADR-002: separate try-catch for validation (400) and business logic (500)
 * - ADR-009: a mutation returns Detail
 * - ADR-010: the repository owns serialization; the body and the response are domain types
 * - ADR-012: saveUser(delta, id) writes only the columns the body carried
 */
import {defineEventHandler, readValidatedBody, createError, setResponseStatus} from 'h3'
import {fetchUser, saveUser} from '~~/server/data/prismaRepository'
import {useCoreValidation, type UserCreate, type UserDetail, type UserSession} from '~/composables/useCoreValidation'
import {UserPreferencesUpdateSchema, type UserPreferencesUpdate} from '~/composables/useUserPreferenceValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error} = eventHandlerHelper
const LOG = '⚙️ > PREFERENCES > [POST]'

export default defineEventHandler(async (event): Promise<UserDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Session - 401 before anything else (the guard middleware answers first in practice)
    const session = await requireUserSession(event)
    const sessionUser = session.user as unknown as UserSession
    const userId = sessionUser.id

    // Validation - FAIL EARLY (400)
    let body!: UserPreferencesUpdate
    try {
        body = await readValidatedBody(event, UserPreferencesUpdateSchema.parse)
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error, 400)
    }

    // Business logic
    try {
        const existing = await fetchUser(d1Client, {id: userId})
        if (!existing) {
            throw createError({statusCode: 404, message: 'Bruger ikke fundet'})
        }

        // SMS needs a number to send to, and phone numbers come from Heynabo
        if (body.notificationChannels?.includes('SMS') && !existing.phone) {
            console.warn(`${LOG} SMS requested without a phone number (user id=${userId})`)
            throw createError({statusCode: 400, message: 'SMS kræver et telefonnummer'})
        }

        const delta: Partial<UserCreate> = {}
        if (body.notificationChannels !== undefined) delta.notificationChannels = body.notificationChannels
        if (body.appearance !== undefined) delta.appearance = body.appearance

        await saveUser(d1Client, delta, userId)

        // Detail for the response (saveUser returns the row without relations) and for the session snapshot
        const updated = await fetchUser(d1Client, {id: userId})
        if (!updated) {
            throw createError({statusCode: 404, message: 'Bruger ikke fundet'})
        }

        const {UserSessionSchema} = useCoreValidation()
        const refreshed = UserSessionSchema.parse({...updated, passwordHash: sessionUser.passwordHash})
        await replaceUserSession(event, {user: refreshed, loggedInAt: session.loggedInAt ?? new Date()})

        console.info(`${LOG} Saved preferences for user id=${userId} fields=[${Object.keys(delta).join(',')}]`)
        setResponseStatus(event, 200)
        return updated
    } catch (error) {
        return throwH3Error(`${LOG} Error saving preferences for user ${userId}`, error)
    }
})
