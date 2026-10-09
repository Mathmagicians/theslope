// @vitest-environment nuxt
/**
 * AllergyTypeDisplay - an allergy type's own icon or emoji in a UAvatar, optionally with its name.
 * Real component, real design system (testing.md Rule 6).
 */
import {describe, it, expect} from 'vitest'
import {ref, type ComponentPublicInstance} from 'vue'
import type {VueWrapper} from '@vue/test-utils'
import AllergyTypeDisplay from '~/components/allergy/AllergyTypeDisplay.vue'
import {ICONS, createResponsiveSizes} from '~/composables/useTheSlopeDesignSystem'
import {mountWithTooltipProvider} from '~~/tests/component/testHelpers'

type AvatarProps = {icon?: string, text?: string, size?: string}

const MILK = {name: 'Mælk', icon: '🥛'}
const NUTS = {name: 'Nødder', icon: 'i-mdi-peanut'}

const mountDisplay = async (props: Record<string, unknown>, isMd = true) => {
    const wrapper = await mountWithTooltipProvider(AllergyTypeDisplay, {props, isMd})
    const avatar = wrapper.findComponent({name: 'UAvatar'}) as VueWrapper<ComponentPublicInstance<AvatarProps>>
    return {wrapper, avatar}
}

describe('AllergyTypeDisplay', () => {
    describe.each([
        {face: 'compact', compact: true},
        {face: 'regular', compact: false}
    ])('$face', ({compact}) => {
        it('GIVEN a type with an iconify icon THEN the avatar carries it as its icon', async () => {
            const {avatar} = await mountDisplay({allergyType: NUTS, compact})
            expect(avatar.props('icon')).toBe(NUTS.icon)
            expect(avatar.props('text')).toBeUndefined()
        })

        it('GIVEN a type with an emoji THEN the avatar carries it as its text', async () => {
            const {avatar} = await mountDisplay({allergyType: MILK, compact})
            expect(avatar.props('text')).toBe(MILK.icon)
            expect(avatar.props('icon')).toBeUndefined()
        })

        it.each([
            {showName: true, shown: true},
            {showName: false, shown: false}
        ])('GIVEN show-name=$showName THEN the name renders: $shown', async ({showName, shown}) => {
            const {wrapper} = await mountDisplay({allergyType: MILK, compact, showName})
            expect(wrapper.text().includes(MILK.name)).toBe(shown)
        })

        it('GIVEN no type THEN it renders the no-allergy state', async () => {
            const {wrapper, avatar} = await mountDisplay({compact, showName: true})
            expect(wrapper.text()).toBe('Ingen')
            expect(avatar.props('icon')).toBe(ICONS.noAllergy)
        })

        it.each([true, false])('GIVEN isMd=%s THEN the avatar takes the size of its face', async isMd => {
            const {avatar} = await mountDisplay({allergyType: MILK, compact}, isMd)
            const sizes = createResponsiveSizes(ref(isMd))
            expect(avatar.props('size')).toBe(compact ? sizes.allergyAvatarCompact : sizes.allergyAvatar)
        })
    })
})
