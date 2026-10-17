// @vitest-environment nuxt
/**
 * AllergyTypeDisplay - an allergy type's own icon or emoji in a UAvatar, optionally with its name.
 * Real component, real design system (testing.md Rule 6).
 */
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {ref, type ComponentPublicInstance} from 'vue'
import {enableAutoUnmount, type VueWrapper} from '@vue/test-utils'
import AllergyTypeDisplay from '~/components/allergy/AllergyTypeDisplay.vue'
import {COMPONENTS, ICONS, createResponsiveSizes} from '~/composables/useTheSlopeDesignSystem'
import {mountWithTooltipProvider, resetStores} from '~~/tests/component/testHelpers'

type AvatarProps = {icon?: string, text?: string, size?: string, ui?: Record<string, string>}

const MILK = {name: 'Mælk', icon: '🥛'}
const NUTS = {name: 'Nødder', icon: 'i-mdi-peanut'}

enableAutoUnmount(afterEach)

beforeEach(() => {
    resetStores()
})

const mountDisplay = async (props: Record<string, unknown>, isMd = true) => {
    const wrapper = await mountWithTooltipProvider(AllergyTypeDisplay, {props, isMd})
    const avatar = wrapper.findComponent({name: 'UAvatar'}) as VueWrapper<ComponentPublicInstance<AvatarProps>>
    return {wrapper, avatar}
}

// Each face is its own template branch binding the avatar, so every case runs on both
describe('AllergyTypeDisplay', () => {
    describe.each([
        {face: 'compact', compact: true},
        {face: 'regular', compact: false}
    ])('$face', ({compact}) => {
        it('GIVEN a type with an iconify icon THEN the avatar carries it as its icon, keeps its own icon ink, and takes the md size of its face', async () => {
            const {avatar} = await mountDisplay({allergyType: NUTS, compact})
            expect(avatar.props('icon')).toBe(NUTS.icon)
            expect(avatar.props('text')).toBeUndefined()
            expect(avatar.props('ui')).toBeUndefined()
            const sizes = createResponsiveSizes(ref(true))
            expect(avatar.props('size')).toBe(compact ? sizes.allergyAvatarCompact : sizes.allergyAvatar)
        })

        it('GIVEN a type with an emoji THEN the avatar carries it as its text and keeps its own icon ink', async () => {
            const {avatar} = await mountDisplay({allergyType: MILK, compact})
            expect(avatar.props('text')).toBe(MILK.icon)
            expect(avatar.props('icon')).toBeUndefined()
            expect(avatar.props('ui')).toBeUndefined()
        })

        it('GIVEN show-name=false THEN the name does not render', async () => {
            const {wrapper} = await mountDisplay({allergyType: MILK, compact, showName: false})
            expect(wrapper.text().includes(MILK.name)).toBe(false)
        })

        it('GIVEN no type THEN it renders the no-allergy state by name, and the avatar binds the no-allergy ink its icon renders', async () => {
            const {wrapper, avatar} = await mountDisplay({compact, showName: true})
            expect(wrapper.text()).toBe('Ingen')
            expect(avatar.props('icon')).toBe(ICONS.noAllergy)
            const noneUi = COMPONENTS.allergyTypeDisplay.noneAvatarUi
            expect(avatar.props('ui')).toEqual(noneUi)
            expect(avatar.find('[data-slot="icon"]').classes()).toEqual(expect.arrayContaining(noneUi.icon.split(' ')))
        })

        it('GIVEN the phone THEN the avatar takes the phone size of its face', async () => {
            const {avatar} = await mountDisplay({allergyType: MILK, compact}, false)
            const sizes = createResponsiveSizes(ref(false))
            expect(avatar.props('size')).toBe(compact ? sizes.allergyAvatarCompact : sizes.allergyAvatar)
        })
    })
})
