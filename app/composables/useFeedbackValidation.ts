import {z} from 'zod'

/**
 * Validation schemas for the user's feedback and the GitHub issue it becomes (ADR-001); isomorphic, the server imports it (ADR-017)
 */
export const useFeedbackValidation = () => {
    const FeedbackTypeSchema = z.enum(['bug', 'idea', 'question'])

    const FeedbackCreateSchema = z.object({
        type: FeedbackTypeSchema,
        description: z.string().optional(),
        currentUrl: z.string().optional()
    })

    // The fields of GitHub's issue response the app reads
    const FeedbackIssueSchema = z.object({
        id: z.number(),
        number: z.number(),
        html_url: z.string(),
        title: z.string(),
        state: z.string()
    })

    return {
        FeedbackTypeSchema,
        FeedbackCreateSchema,
        FeedbackIssueSchema
    }
}

export type FeedbackType = z.infer<ReturnType<typeof useFeedbackValidation>['FeedbackTypeSchema']>
export type FeedbackCreate = z.infer<ReturnType<typeof useFeedbackValidation>['FeedbackCreateSchema']>
export type FeedbackIssue = z.infer<ReturnType<typeof useFeedbackValidation>['FeedbackIssueSchema']>
