import {describe, it, expect, vi, beforeEach} from 'vitest'
import {mountSuspended, mockNuxtImport} from '@nuxt/test-utils/runtime'
import DinnerDetailHeader from '~/components/dinner/DinnerDetailHeader.vue'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'

// Mock useRuntimeConfig to provide HEY_NABO_API
mockNuxtImport('useRuntimeConfig', () => () => ({
    public: {
        HEY_NABO_API: 'https://test.heynabo.com/api'
    }
}))

describe('DinnerDetailHeader', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders date, state badge, and heynabo link', async () => {
        const dinnerEvent = {...DinnerEventFactory.defaultDinnerEventDetail(), heynaboEventId: 123}
        const wrapper = await mountSuspended(DinnerDetailHeader, {
            props: {dinnerEvent}
        })

        expect(wrapper.text()).toContain('Planlagt')
        expect(wrapper.find('[name="heynabo-event-link"]').exists()).toBe(true)
    })

    it('hides heynabo link when no heynaboEventId', async () => {
        const dinnerEvent = {...DinnerEventFactory.defaultDinnerEventDetail(), heynaboEventId: null}
        const wrapper = await mountSuspended(DinnerDetailHeader, {
            props: {dinnerEvent}
        })

        expect(wrapper.find('[name="heynabo-event-link"]').exists()).toBe(false)
    })
})
