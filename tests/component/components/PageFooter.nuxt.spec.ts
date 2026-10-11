// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {ref} from 'vue'
import {mountWithTooltipProvider, VIEWPORTS} from '~~/tests/component/testHelpers'
import PageFooter from '~/components/PageFooter.vue'
import {createResponsiveIcons} from '~/composables/useTheSlopeDesignSystem'

describe('PageFooter screen size indicator', () => {
    it.each(VIEWPORTS)('$viewport: binds the screen icon of its viewport', async ({isMd}) => {
        const wrapper = await mountWithTooltipProvider(PageFooter, {isMd})
        const indicator = wrapper.findAllComponents({name: 'UButton'})
            .find(button => button.attributes('aria-label') === 'Screen size indicator')
        expect(indicator?.props('icon')).toBe(createResponsiveIcons(ref(isMd)).screen)
    })
})
