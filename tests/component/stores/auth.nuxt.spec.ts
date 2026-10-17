// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {readBody, type H3Event} from 'h3'
import {useAuthStore} from '~/stores/auth'
import {resetStores} from '~~/tests/component/testHelpers'
import {FeedbackFactory} from '~~/tests/e2e/testDataFactories/feedbackFactory'

// The test runtime has no session cookie and no /api/_auth endpoint, so the session is the one thing faked
const {useUserSession} = await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).mockSession())
mockNuxtImport('useUserSession', () => useUserSession)

const feedbackEndpoint = vi.fn()
registerEndpoint('/api/feedback', {method: 'POST', handler: async (event: H3Event) => feedbackEndpoint(await readBody(event))})

const toastTitles = () => useToast().toasts.value.map(toast => String(toast.title))

describe('Auth store - submitFeedback', () => {
    beforeEach(() => {
        resetStores()
        feedbackEndpoint.mockReset()
        useToast().clear()
    })

    it('files the feedback and returns the issue it became', async () => {
        const feedback = FeedbackFactory.defaultFeedback()
        feedbackEndpoint.mockReturnValue({...FeedbackFactory.defaultIssue(), labels: ['bug']})

        const issue = await useAuthStore().submitFeedback(feedback)

        expect(feedbackEndpoint).toHaveBeenCalledWith(feedback)
        expect(issue).toEqual(FeedbackFactory.defaultIssue())
    })

    it('reports a failure in one toast and rethrows it', async () => {
        feedbackEndpoint.mockImplementation(() => {
            throw createError({statusCode: 500})
        })

        await expect(useAuthStore().submitFeedback(FeedbackFactory.defaultFeedback())).rejects.toThrow()

        expect(toastTitles()).toHaveLength(1)
    })
})
