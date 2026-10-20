import {defineEventHandler, readValidatedBody} from 'h3'
import {createFeedbackIssue} from '~~/server/integration/github/githubClient'
import type {FeedbackPayload} from '~~/server/integration/github/githubClient'
import {useFeedbackValidation, type FeedbackCreate, type FeedbackIssue} from '~/composables/useFeedbackValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {getRequiredUser} from '~~/server/utils/authorizationHelper'

const {throwH3Error} = eventHandlerHelper
const LOG = '🐙 > FEEDBACK > [POST]'

const {FeedbackCreateSchema} = useFeedbackValidation()

/**
 * POST /api/feedback - a GitHub issue from a user's feedback, signed with the user's inhabitant name
 *
 * ADR Compliance:
 * - ADR-002: the session first (401), then validation (400), then business logic (500), each in its own block
 * - ADR-004: the logs carry the issue number and the user id, never the user object
 */
export default defineEventHandler(async (event): Promise<FeedbackIssue> => {
    // The issue is signed with the inhabitant's name, so a user without an inhabitant cannot give feedback
    const user = await getRequiredUser(event)
    const inhabitant = user.Inhabitant
    if (!inhabitant) {
        return throwH3Error(`${LOG} User ${user.id} has no inhabitant`, new Error('Du skal være logget ind for at give feedback'), 401)
    }

    // Validation - FAIL EARLY (400)
    let body!: FeedbackCreate
    try {
        body = await readValidatedBody(event, FeedbackCreateSchema.parse)
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error, 400)
    }

    const payload: FeedbackPayload = {
        type: body.type,
        description: body.description || '(Ingen beskrivelse)',
        currentUrl: body.currentUrl || `Ukendt side (${new Date().toISOString()})`,
        user: {firstName: inhabitant.name, userId: user.id}
    }

    // Business logic (500)
    try {
        const issue = await createFeedbackIssue(payload)
        console.info(`${LOG} Created issue #${issue.number}`)
        return issue
    } catch (error) {
        return throwH3Error(`${LOG} Failed to create issue`, error)
    }
})
