// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {enableAutoUnmount} from '@vue/test-utils'
import UserListItem from '~/components/shared/UserListItem.vue'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {mountWithTooltipProvider, resetStores} from '~~/tests/component/testHelpers'
import {COMPONENTS} from '~/composables/useTheSlopeDesignSystem'

enableAutoUnmount(afterEach)

const inhabitants = Array.from({length: COMPONENTS.avatar.max + 2}, (_, i) => ({
    ...HouseholdFactory.defaultInhabitantData(`user-list-item-${i}`),
    id: i + 1
}))

const mountItem = (props: Record<string, unknown>, isMd: boolean) =>
    mountWithTooltipProvider(UserListItem, {props, isMd})

describe('UserListItem', () => {
    beforeEach(() => {
        resetStores()
    })

    // The server renders with isMd false and the desktop client hydrates with isMd true: both must agree
    it.each([
        {mode: 'group', props: {inhabitants, showNames: false, linkToProfile: false}},
        {mode: 'group compact', props: {inhabitants, showNames: false, linkToProfile: false, compact: true}},
        {mode: 'single', props: {inhabitants: inhabitants[0], linkToProfile: false}}
    ])('$mode renders the same markup on phone and desktop', async ({props}) => {
        const phone = await mountItem(props, false)
        const desktop = await mountItem(props, true)

        expect(desktop.html()).toBe(phone.html())
    })

    // The markup is the same on both widths (above), so the count runs on one
    it.each([
        {faces: 'the avatar max', max: undefined, shown: COMPONENTS.avatar.max},
        {faces: 'the given max', max: COMPONENTS.avatar.powerRowMax, shown: COMPONENTS.avatar.powerRowMax}
    ])('group shows $faces avatars and counts the rest', async ({max, shown}) => {
        const wrapper = await mountItem({inhabitants, showNames: false, linkToProfile: false, max}, false)

        expect(wrapper.findAll('span[data-slot="root"]')).toHaveLength(shown)
        expect(wrapper.find('[data-slot="fallback"]').text()).toBe(`+${inhabitants.length - shown}`)
    })
})
