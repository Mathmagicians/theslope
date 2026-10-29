// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {enableAutoUnmount} from '@vue/test-utils'
import UserListItem from '~/components/shared/UserListItem.vue'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {mountWithTooltipProvider, resetStores} from '~~/tests/component/testHelpers'
import {COMPONENTS, type UserListItemRing} from '~/composables/useTheSlopeDesignSystem'

enableAutoUnmount(afterEach)

const inhabitants = Array.from({length: 7}, (_, i) => ({
    ...HouseholdFactory.defaultInhabitantData(`user-list-item-${i}`),
    id: i + 1
}))
const fewInhabitants = inhabitants.slice(0, 3)

const mountItem = (props: Record<string, unknown>, isMd: boolean | null) =>
    mountWithTooltipProvider(UserListItem, {props, isMd})

describe('UserListItem', () => {
    beforeEach(() => {
        resetStores()
    })

    // The avatar size steps up from md through CSS, so a face, and a group within the phone's face count, render alike
    it.each([
        {mode: 'group', props: {inhabitants: fewInhabitants, showNames: false, linkToProfile: false}},
        {mode: 'group compact', props: {inhabitants: fewInhabitants, showNames: false, linkToProfile: false, compact: true}},
        {mode: 'single', props: {inhabitants: inhabitants[0], linkToProfile: false}}
    ])('$mode renders the same markup on phone and desktop', async ({props}) => {
        const phone = await mountItem(props, false)
        const desktop = await mountItem(props, true)

        expect(desktop.html()).toBe(phone.html())
    })

    // Before the layout measures (the server render and the hydration) the group shows the phone's count
    it.each([
        {faces: 'three faces before the layout measures', isMd: null, max: undefined, shown: 3},
        {faces: 'three faces on a phone', isMd: false, max: undefined, shown: 3},
        {faces: 'five faces from md', isMd: true, max: undefined, shown: 5},
        {faces: 'the given max from md', isMd: true, max: COMPONENTS.avatar.powerRowMax, shown: COMPONENTS.avatar.powerRowMax}
    ])('a group of seven shows $faces and counts the rest', async ({isMd, max, shown}) => {
        const wrapper = await mountItem({inhabitants, showNames: false, linkToProfile: false, max}, isMd)

        expect(wrapper.findAll('span[data-slot="root"]')).toHaveLength(shown)
        expect(wrapper.find('[data-slot="fallback"]').text()).toBe(`+${inhabitants.length - shown}`)
    })

    describe.each([
        {mode: 'group', inhabitants: fewInhabitants},
        {mode: 'single', inhabitants: inhabitants[0]}
    ])('$mode', ({inhabitants: shownInhabitants}) => {
        const RINGS = COMPONENTS.userListItem.ring
        const ringKeys = Object.keys(RINGS) as UserListItemRing[]
        const faceClasses = async (ring?: UserListItemRing) => {
            const wrapper = await mountItem({inhabitants: shownInhabitants, ring}, true)
            return wrapper.findAll('span[data-slot="root"]').map(face => face.classes())
        }

        it.each(ringKeys)('the %s ring puts its token on every face', async ring => {
            const faces = await faceClasses(ring)

            expect(faces.length).toBeGreaterThan(0)
            faces.forEach(classes => expect(classes).toEqual(expect.arrayContaining(RINGS[ring].split(' '))))
        })

        it('no ring puts no ring token on a face', async () => {
            const ringClasses = new Set(ringKeys.flatMap(key => RINGS[key].split(' ')))
            const faces = await faceClasses()

            expect(faces.length).toBeGreaterThan(0)
            faces.forEach(classes => expect(classes.filter(name => ringClasses.has(name))).toEqual([]))
        })
    })
})
