import {z} from 'zod'
import {createFeedbackIssue} from '~~/server/integration/github/githubClient'
import type {FeedbackPayload, GitHubIssueResponse} from '~~/server/integration/github/githubClient'
import type {UserDetail} from '~/composables/useCoreValidation'

const LOG = '🐙 > FEEDBACK > '

const FeedbackBodySchema = z.object({
    type: z.enum(['bug', 'idea', 'question']),
    description: z.string().optional(),
    currentUrl: z.string().optional()
})

/**
 * POST /api/feedback
 * Create a GitHub issue from user feedback
 * Requires authentication with valid inhabitant
 * ADR-002: Separate validation and business logic try-catch
 */
export default defineEventHandler(async (event): Promise<GitHubIssueResponse> => {
    // Auth check - must be logged in with valid inhabitant
    const session = await getUserSession(event)
    const user = session?.user as UserDetail | undefined
    if (!user?.Inhabitant) {
        throw createError({statusCode: 401, message: 'Du skal være logget ind for at give feedback'})
    }

    // Validation - FAIL EARLY (400)
    let body: z.infer<typeof FeedbackBodySchema>
    try {
        body = await readValidatedBody(event, FeedbackBodySchema.parse)
    } catch (error) {
        console.warn(LOG, 'POST > Validation failed', error)
        throw createError({statusCode: 400, message: 'Invalid feedback data', cause: error})
    }

    const payload: FeedbackPayload = {
        type: body.type,
        description: body.description || '(Ingen beskrivelse)',
        currentUrl: body.currentUrl || `Ukendt side (${new Date().toISOString()})`,
        user: {firstName: user.Inhabitant.name, userId: user.id}
    }

    // Business logic (500)
    try {
        const issue = await createFeedbackIssue(payload)
        console.info(LOG, 'POST > Created issue #', issue.number)
        return issue
    } catch (error) {
        console.error(LOG, 'POST > Failed to create issue', error)
        throw createError({statusCode: 500, message: 'Failed to create feedback issue', cause: error})
    }
})
