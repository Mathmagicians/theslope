import {z} from 'zod'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const LOG = '🐙 > GITHUB > '
const {throwH3Error} = eventHandlerHelper

/* ==== TYPES ==== */

export interface FeedbackUser {
    firstName: string
    userId: number
}

export interface FeedbackPayload {
    type: 'bug' | 'idea' | 'question'
    description: string
    currentUrl: string
    user?: FeedbackUser
}

const GitHubIssueResponseSchema = z.object({
    id: z.number(),
    number: z.number(),
    html_url: z.string(),
    title: z.string(),
    state: z.string()
})

export type GitHubIssueResponse = z.infer<typeof GitHubIssueResponseSchema>

/* ==== HELPER FUNCTIONS ==== */

function getFeedbackLabel(type: FeedbackPayload['type']): string {
    switch (type) {
        case 'bug': return 'bug'
        case 'idea': return 'enhancement'
        case 'question': return 'question'
    }
}

function getFeedbackEmoji(type: FeedbackPayload['type']): string {
    switch (type) {
        case 'bug': return '🐛'
        case 'idea': return '💡'
        case 'question': return '❓'
    }
}

function getFeedbackPrefix(type: FeedbackPayload['type']): string {
    switch (type) {
        case 'bug': return 'Fejl'
        case 'idea': return 'Forslag'
        case 'question': return 'Spørgsmål'
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
export async function createFeedbackIssue(payload: FeedbackPayload): Promise<GitHubIssueResponse> {
    const config = useRuntimeConfig()
    const {GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO} = config

    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
        throw createError({
            statusCode: 500,
            statusMessage: 'GitHub integration not configured - missing runtimeConfig'
        })
    }

    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`
    console.info(LOG, 'ISSUE CREATE > Creating issue for', payload.type)

    const body = {
        title: buildIssueTitle(payload),
        body: buildIssueBody(payload),
        labels: [getFeedbackLabel(payload.type), 'user-feedback']
    }

    let response: GitHubIssueResponse
    try {
        response = await $fetch<GitHubIssueResponse>(url, {
            method: 'POST',
            body,
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                Accept: 'application/vnd.github+json'
            }
        })
    } catch (error: unknown) {
        return throwH3Error(`${LOG}ISSUE CREATE > Error creating issue`, error)
    }

    try {
        const validated = GitHubIssueResponseSchema.parse(response)
        console.info(LOG, 'ISSUE CREATE > Created issue #', validated.number, validated.html_url)
        return validated
    } catch (error: unknown) {
        return throwH3Error(`${LOG}ISSUE CREATE > Error validating response`, error)
    }
}
