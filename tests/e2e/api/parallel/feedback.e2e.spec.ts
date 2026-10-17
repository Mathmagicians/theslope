import {test, expect} from '@playwright/test'
import testHelpers from '~~/tests/e2e/testHelpers'
import {FeedbackFactory} from '~~/tests/e2e/testDataFactories/feedbackFactory'

/**
 * POST /api/feedback: the help button's feedback becomes a GitHub issue. Only the refusals are tested here; an accepted
 * request creates a real issue in the repository.
 */
const {memberValidatedBrowserContext, headers} = testHelpers
const FEEDBACK_ENDPOINT = '/api/feedback'

test.describe('Feedback API', () => {
    test('GIVEN no session WHEN sending feedback THEN 401', async ({browser}) => {
        const anonymous = await browser.newContext()

        const response = await anonymous.request.post(FEEDBACK_ENDPOINT, {headers, data: FeedbackFactory.defaultFeedback()})

        expect(response.status()).toBe(401)
    })

    test('GIVEN a user WHEN sending feedback of an unknown type THEN 400', async ({browser}) => {
        const context = await memberValidatedBrowserContext(browser)

        const response = await context.request.post(FEEDBACK_ENDPOINT, {headers, data: {...FeedbackFactory.defaultFeedback(), type: 'complaint'}})

        expect(response.status()).toBe(400)
    })
})
