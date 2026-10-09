// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import UserListItem from '~/components/shared/UserListItem.vue'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {mountWithTooltipProvider} from '~~/tests/component/testHelpers'

const SHOWN_AVATARS = 5

const inhabitants = Array.from({length: SHOWN_AVATARS + 2}, (_, i) => ({
    ...HouseholdFactory.defaultInhabitantData(`user-list-item-${i}`),
    id: i + 1
}))

const mountItem = (props: Record<string, unknown>, isMd: boolean) =>
    mountWithTooltipProvider(UserListItem, {props, isMd})

describe('UserListItem', () => {

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

    describe.each([false, true])('group with isMd %s', (isMd) => {
        it(`shows ${SHOWN_AVATARS} avatars and counts the rest`, async () => {
            const wrapper = await mountItem({inhabitants, showNames: false, linkToProfile: false}, isMd)

            expect(wrapper.findAll('span[data-slot="root"]')).toHaveLength(SHOWN_AVATARS)
            expect(wrapper.find('[data-slot="fallback"]').text()).toBe(`+${inhabitants.length - SHOWN_AVATARS}`)
        })
    })
})
