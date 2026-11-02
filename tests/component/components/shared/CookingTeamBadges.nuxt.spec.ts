// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {enableAutoUnmount, type BaseWrapper} from '@vue/test-utils'
import {ref, type ComponentPublicInstance} from 'vue'
import type {BadgeProps} from '@nuxt/ui'
import {findByTestId, resetStores, iconNamesIn, mountWithTooltipProvider} from '~~/tests/component/testHelpers'
import CookingTeamBadges from '~/components/shared/CookingTeamBadges.vue'
import {ICONS, createResponsiveSizes, type NuxtUISize} from '~/composables/useTheSlopeDesignSystem'

// The sizes at the desktop breakpoint the row mounts with
const SIZES = createResponsiveSizes(ref(true))

enableAutoUnmount(afterEach)

beforeEach(() => {
    resetStores()
})

const JOKER_BADGE = 'team-badge-jokers'

// The compact row (master table, team tabs) and the large header row (team card), each at the size its site binds
const VARIANTS = [{row: 'compact', size: SIZES.small}, {row: 'header', size: SIZES.large}]

const mountBadges = (size: NuxtUISize | undefined, jokerSlotCount: number) =>
    mountWithTooltipProvider(CookingTeamBadges, {
        props: {teamNumber: 1, teamName: 'Madhold 3', chefCount: 1, memberCount: 5, cookingDaysCount: 12, jokerSlotCount, size},
        isMd: true
    })

const badgeSizesIn = (wrapper: BaseWrapper<Node>) =>
    wrapper.findAllComponents<ComponentPublicInstance<BadgeProps>>({name: 'UBadge'}).map(badge => badge.props('size'))

describe('CookingTeamBadges', () => {
    describe('badge size', () => {
        it.each(VARIANTS)('the $row row renders every badge at the size its site binds', async ({size}) => {
            const wrapper = await mountBadges(size, 1)
            // Name, chefs, members, jokers and cooking days
            expect(badgeSizesIn(wrapper)).toEqual(Array(5).fill(size))
        })

        it('a row without a size renders every badge at the standard size', async () => {
            const wrapper = await mountBadges(undefined, 0)
            expect(badgeSizesIn(wrapper)).toEqual(Array(4).fill(SIZES.standard))
        })
    })

    describe('joker count badge', () => {
        it.each(VARIANTS)('the $row row renders the joker count with the joker icon', async ({size}) => {
            const wrapper = await mountBadges(size, 2)
            const badge = findByTestId(wrapper, JOKER_BADGE)

            expect(badge.exists()).toBe(true)
            expect(badge.text()).toBe('2')
            expect(iconNamesIn(badge)).toEqual([ICONS.joker])
        })

        it.each(VARIANTS)('the $row row renders no joker badge for a team without slots', async ({size}) => {
            const wrapper = await mountBadges(size, 0)
            expect(findByTestId(wrapper, JOKER_BADGE).exists()).toBe(false)
        })
    })
})
