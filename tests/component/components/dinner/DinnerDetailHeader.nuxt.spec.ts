import {describe, it, expect} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import DinnerDetailHeader from '~/components/dinner/DinnerDetailHeader.vue'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'

describe('DinnerDetailHeader', () => {
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
