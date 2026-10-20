import {maskPassword} from '~/utils/utils'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {useFeedbackValidation, type FeedbackIssue, type FeedbackType} from '~/composables/useFeedbackValidation'

const LOG = '🐙 > GITHUB > '
const {throwH3Error} = eventHandlerHelper
const {FeedbackTypeSchema, FeedbackIssueSchema} = useFeedbackValidation()
const Feedback = FeedbackTypeSchema.enum

/* ==== TYPES ==== */

export interface FeedbackUser {
    firstName: string
    userId: number
}

export interface FeedbackPayload {
    type: FeedbackType
    description: string
    currentUrl: string
    user?: FeedbackUser
}

/* ==== HELPER FUNCTIONS ==== */

function getFeedbackLabel(type: FeedbackType): string {
    switch (type) {
        case Feedback.bug: return 'bug'
        case Feedback.idea: return 'enhancement'
        case Feedback.question: return 'question'
    }
}

function getFeedbackEmoji(type: FeedbackType): string {
    switch (type) {
        case Feedback.bug: return '🐛'
        case Feedback.idea: return '💡'
        case Feedback.question: return '❓'
    }
}

function getFeedbackPrefix(type: FeedbackType): string {
    switch (type) {
        case Feedback.bug: return 'Fejl'
        case Feedback.idea: return 'Forslag'
        case Feedback.question: return 'Spørgsmål'
    }
}

function buildIssueTitle(payload: FeedbackPayload): string {
    const emoji = getFeedbackEmoji(payload.type)
    const prefix = getFeedbackPrefix(payload.type)
    const shortDesc = payload.description.substring(0, 50) + (payload.description.length > 50 ? '...' : '')
    return `${emoji} ${prefix}: ${shortDesc}`
}

function buildIssueBody(payload: FeedbackPayload): string {
    const userInfo = payload.user
        ? `**Rapporteret af:** ${payload.user.firstName} (bruger #${payload.user.userId})`
        : '**Rapporteret af:** Anonym'

    return `## Feedback fra bruger

${userInfo}

**Side:** ${payload.currentUrl}

---

## Beskrivelse

${payload.description}

---
*Oprettet automatisk via Skrånerappen*`
}

/* ==== API FUNCTIONS ==== */

/**
 * Create a GitHub issue from user feedback
 * Uses Personal Access Token for authentication
 * @param payload - Feedback data from user
 * @returns Created issue with URL
 */
export async function createFeedbackIssue(payload: FeedbackPayload): Promise<FeedbackIssue> {
    const config = useRuntimeConfig()
    const {GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO} = config

    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
        throw createError({
            statusCode: 500,
            statusMessage: 'GitHub integration not configured - missing runtimeConfig'
        })
    }

    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`
    console.info(LOG, 'ISSUE CREATE > Creating issue for', payload.type, 'url:', url, 'token:', maskPassword(GITHUB_TOKEN, 12))

    const body = {
        title: buildIssueTitle(payload),
        body: buildIssueBody(payload),
        labels: [getFeedbackLabel(payload.type), 'user-feedback']
    }

    let response: FeedbackIssue
    try {
        response = await $fetch<FeedbackIssue>(url, {
            method: 'POST',
            body,
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                Accept: 'application/vnd.github+json',
                'User-Agent': 'theslope-app'
            }
        })
    } catch (error: unknown) {
        return throwH3Error(`${LOG}ISSUE CREATE > Error creating issue`, error)
    }

    try {
        const validated = FeedbackIssueSchema.parse(response)
        console.info(LOG, 'ISSUE CREATE > Created issue #', validated.number, validated.html_url)
        return validated
    } catch (error: unknown) {
        return throwH3Error(`${LOG}ISSUE CREATE > Error validating response`, error)
    }
}
