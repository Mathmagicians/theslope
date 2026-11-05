// @vitest-environment nuxt
import {describe, it, expect, vi, afterEach} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {createError} from 'h3'
import PublicBillingPage from '~/pages/public/billing/[token].vue'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import {mountWithTooltipProvider} from '~~/tests/component/testHelpers'
import {BOOKING_WORDS} from '~/config/bookingWords'

// The test environment has no router to land the accountant's link on
const {mockRoute, useRoute} = await vi.hoisted(async () =>
    (await import('~~/tests/component/hoistedMocks')).mockRouteAndNavigation({path: '/public/billing'}))
mockNuxtImport('useRoute', () => useRoute)

// Only HTTP is faked (testing.md Rule 6): one link answers its billing summary, the other is gone
const LINK = 'public-billing-link'
const GONE = 'public-billing-gone'
registerEndpoint(`/api/public/billing/${LINK}`, () => BillingFactory.defaultSummaryData('public-billing'))
registerEndpoint(`/api/public/billing/${GONE}`, () => {
    throw createError({statusCode: 404})
})

enableAutoUnmount(afterEach)

describe('public/billing/[token] - the accountant\'s link', () => {
    const {publicPage, summary, stats, titles, columns, sums} = BOOKING_WORDS.billing
    it.each([
        {link: LINK, standing: 'answers its billing period', words: [publicPage.title, publicPage.community, summary.billingPeriod, summary.cutoffDate,
            summary.paymentDate, stats.total, stats.households, stats.tickets, titles.invoices, columns.pbsId, columns.address, columns.amount, sums.total]},
        {link: GONE, standing: 'is gone', words: [publicPage.notFound.title, publicPage.notFound.description]}
    ])('GIVEN the link $standing THEN the page reads the billing words', async ({link, words}) => {
        mockRoute.params = {token: link}
        const wrapper = await mountWithTooltipProvider(PublicBillingPage)

        await vi.waitFor(() => expect(words.filter(word => !wrapper.text().includes(word))).toEqual([]))
    })
})
