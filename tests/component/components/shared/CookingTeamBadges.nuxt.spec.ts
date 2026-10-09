// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import type {ComponentPublicInstance} from 'vue'
import type {VueWrapper} from '@vue/test-utils'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {findByTestId} from '~~/tests/component/testHelpers'
import CookingTeamBadges from '~/components/shared/CookingTeamBadges.vue'
import {useTheSlopeDesignSystem} from '~/composables/useTheSlopeDesignSystem'

const {ICONS} = useTheSlopeDesignSystem()

type IconWrapper = VueWrapper<ComponentPublicInstance<{name: string}>>

const JOKER_BADGE = 'team-badge-jokers'

// The compact row (master table, team tabs) and the large header row (team card)
const VARIANTS = [{size: 'small'}, {size: 'large'}] as const

const mountBadges = (size: 'small' | 'large', jokerSlotCount: number) =>
    mountSuspended(CookingTeamBadges, {
        props: {teamNumber: 1, teamName: 'Madhold 3', chefCount: 1, memberCount: 5, cookingDaysCount: 12, jokerSlotCount, size}
    })

describe('CookingTeamBadges', () => {
    describe('joker count badge', () => {
        it.each(VARIANTS)('size=$size renders the joker count with the joker icon', async ({size}) => {
            const wrapper = await mountBadges(size, 2)
            const badge = findByTestId(wrapper, JOKER_BADGE)

            expect(badge.exists()).toBe(true)
            expect(badge.text()).toBe('2')
            const icons = (wrapper.findAllComponents({name: 'UIcon'}) as IconWrapper[])
                .filter(icon => badge.element.contains(icon.element))
                .map(icon => icon.props('name'))
            expect(icons).toEqual([ICONS.joker])
        })

        it.each(VARIANTS)('size=$size renders no joker badge for a team without slots', async ({size}) => {
            const wrapper = await mountBadges(size, 0)
            expect(findByTestId(wrapper, JOKER_BADGE).exists()).toBe(false)
        })
    })
})
