import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {resetStores} from '~~/tests/component/testHelpers'
import DinnerDetailHeader from '~/components/dinner/DinnerDetailHeader.vue'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {DINNER_STATE_BADGES} from '~/composables/useTheSlopeDesignSystem'
import {BUTTON_WORDS} from '~/config/buttonWords'

enableAutoUnmount(afterEach)

// HEY_NABO_API comes from the nuxt project's runtimeConfig override (vitest.config.ts):
// a useRuntimeConfig mock replaces the whole config and breaks the test runtime boot

describe('DinnerDetailHeader', () => {
    beforeEach(() => {
        resetStores()
    })

    it('renders the dinner state\'s badge and the link to its Heynabo event', async () => {
        const dinnerEvent = {...DinnerEventFactory.defaultDinnerEventDetail(), heynaboEventId: 123}
        const wrapper = await mountSuspended(DinnerDetailHeader, {
            props: {dinnerEvent}
        })

        expect(wrapper.text()).toContain(DINNER_STATE_BADGES[dinnerEvent.state].label)
        expect(wrapper.find('[name="heynabo-event-link"]').text()).toBe(BUTTON_WORDS.heynabo.openEvent)
    })

    it('hides heynabo link when no heynaboEventId', async () => {
        const dinnerEvent = {...DinnerEventFactory.defaultDinnerEventDetail(), heynaboEventId: null}
        const wrapper = await mountSuspended(DinnerDetailHeader, {
            props: {dinnerEvent}
        })

        expect(wrapper.find('[name="heynabo-event-link"]').exists()).toBe(false)
    })
})
