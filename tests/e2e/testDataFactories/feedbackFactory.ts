// Factory for the help button's feedback and the GitHub issue it becomes
import {useFeedbackValidation, type FeedbackCreate, type FeedbackIssue} from '~/composables/useFeedbackValidation'

const {FeedbackTypeSchema} = useFeedbackValidation()

export class FeedbackFactory {
    static readonly defaultFeedback = (overrides: Partial<FeedbackCreate> = {}): FeedbackCreate => ({
        type: FeedbackTypeSchema.enum.bug,
        description: 'Knappen gør ingenting',
        currentUrl: 'http://localhost:3000/',
        ...overrides
    })

    static readonly defaultIssue = (overrides: Partial<FeedbackIssue> = {}): FeedbackIssue => ({
        id: 1001,
        number: 42,
        html_url: 'https://github.com/Mathmagicians/theslope/issues/42',
        title: '🐛 Fejl: Knappen gør ingenting',
        state: 'open',
        ...overrides
    })
}
