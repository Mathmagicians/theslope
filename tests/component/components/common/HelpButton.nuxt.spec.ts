// @vitest-environment nuxt
/**
 * HelpButton - the help popover in the page header and its feedback form.
 *
 * Real component, real auth store; only HTTP is faked. The popover teleports to the body, so the
 * form is read from the document.
 */
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {DOMWrapper, enableAutoUnmount, flushPromises} from '@vue/test-utils'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {readBody, type H3Event} from 'h3'
import HelpButton from '~/components/common/HelpButton.vue'
import {mountWithTooltipProvider, openPopover, findByTestId, clickByTestId, resetStores} from '~~/tests/component/testHelpers'
import {FeedbackFactory} from '~~/tests/e2e/testDataFactories/feedbackFactory'

enableAutoUnmount(afterEach)

const feedbackEndpoint = vi.fn()
registerEndpoint('/api/feedback', {method: 'POST', handler: async (event: H3Event) => feedbackEndpoint(await readBody(event))})

const TEST_IDS = {
    toggle: 'help-feedback-toggle',
    description: 'help-feedback-description',
    submit: 'help-feedback-submit',
    success: 'help-feedback-success'
} as const

const page = () => new DOMWrapper(document.body)
const toastTitles = () => useToast().toasts.value.map(toast => String(toast.title))

const sendFeedback = async (description: string) => {
    const wrapper = await mountWithTooltipProvider(HelpButton)
    await openPopover(wrapper)
    await clickByTestId(page(), TEST_IDS.toggle)
    await findByTestId(page(), TEST_IDS.description).setValue(description)
    await clickByTestId(page(), TEST_IDS.submit)
    await flushPromises()
    return wrapper
}

describe('HelpButton - feedback', () => {
    beforeEach(() => {
        resetStores()
        feedbackEndpoint.mockReset()
        useToast().clear()
        document.body.innerHTML = ''
    })

    it('files the feedback with the page it was sent from and links the issue it became', async () => {
        const issue = FeedbackFactory.defaultIssue()
        feedbackEndpoint.mockReturnValue(issue)

        await sendFeedback('Knappen gør ingenting')

        await vi.waitFor(() => expect(findByTestId(page(), TEST_IDS.success).exists()).toBe(true))
        expect(feedbackEndpoint).toHaveBeenCalledWith(expect.objectContaining({
            type: FeedbackFactory.defaultFeedback().type, description: 'Knappen gør ingenting', currentUrl: expect.any(String)
        }))
        const success = findByTestId(page(), TEST_IDS.success)
        expect(success.text()).toContain(`Se issue #${issue.number}`)
        expect(success.find(`a[href="${issue.html_url}"]`).exists()).toBe(true)
    })

    it('reports a failure once, in the toast, and keeps the draft for another try', async () => {
        feedbackEndpoint.mockImplementation(() => {
            throw createError({statusCode: 500})
        })

        await sendFeedback('Knappen gør ingenting')

        await vi.waitFor(() => expect(toastTitles()).toHaveLength(1))
        await flushPromises()
        expect(page().text()).not.toContain('Kunne ikke sende feedback')
        expect((findByTestId(page(), TEST_IDS.description).element as HTMLTextAreaElement).value).toBe('Knappen gør ingenting')
    })
})
