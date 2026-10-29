// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {enableAutoUnmount} from '@vue/test-utils'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {findByTestId, resetStores, iconNamesIn} from '~~/tests/component/testHelpers'
import CookingTeamBadges from '~/components/shared/CookingTeamBadges.vue'
import {useTheSlopeDesignSystem} from '~/composables/useTheSlopeDesignSystem'

const {ICONS} = useTheSlopeDesignSystem()

enableAutoUnmount(afterEach)

beforeEach(() => {
    resetStores()
})

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
            expect(iconNamesIn(badge)).toEqual([ICONS.joker])
        })

        it.each(VARIANTS)('size=$size renders no joker badge for a team without slots', async ({size}) => {
            const wrapper = await mountBadges(size, 0)
            expect(findByTestId(wrapper, JOKER_BADGE).exists()).toBe(false)
        })
    })
})
