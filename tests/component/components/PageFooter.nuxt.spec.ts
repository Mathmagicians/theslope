// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {ref} from 'vue'
import {enableAutoUnmount} from '@vue/test-utils'
import {mountWithTooltipProvider, resetStores, VIEWPORTS} from '~~/tests/component/testHelpers'
import PageFooter from '~/components/PageFooter.vue'
import {createResponsiveIcons} from '~/composables/useTheSlopeDesignSystem'

enableAutoUnmount(afterEach)

describe('PageFooter screen size indicator', () => {
    beforeEach(() => {
        resetStores()
    })

    it.each(VIEWPORTS)('$viewport: binds the screen icon of its viewport', async ({isMd}) => {
        const wrapper = await mountWithTooltipProvider(PageFooter, {isMd})
        const indicator = wrapper.findAllComponents({name: 'UButton'})
            .find(button => button.attributes('aria-label') === 'Screen size indicator')
        expect(indicator?.props('icon')).toBe(createResponsiveIcons(ref(isMd)).screen)
    })
})
