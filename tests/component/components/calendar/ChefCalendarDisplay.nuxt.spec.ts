import {describe, it, expect, beforeEach} from 'vitest'
import {setActivePinia, createPinia} from 'pinia'
import {clearNuxtData} from '#app'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import ChefCalendarDisplay from '~/components/calendar/ChefCalendarDisplay.vue'
import type {CookingTeamDisplay} from '~/composables/useCookingTeamValidation'
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'

/**
 * The agenda table's #empty slot: Nuxt UI 4 renders it only when data is empty, and it was
 * dead until the v2 slot name `#empty-state` was renamed. This holds the rename in place.
 */

const team = {
    id: 1,
    name: 'Madhold 1',
    seasonId: 1,
    affinity: null,
    assignments: [],
    cookingDaysCount: 0
} as unknown as CookingTeamDisplay

const mountAgenda = async (dinnerEvents: DinnerEventDisplay[] = []) => {
    const {deadlinesForSeason} = useSeason()
    return await mountSuspended(ChefCalendarDisplay, {
        props: {
            seasonDates: {start: new Date('2026-01-01'), end: new Date('2026-06-30')},
            team,
            dinnerEvents,
            deadlines: deadlinesForSeason({ticketIsCancellableDaysBefore: 4, diningModeIsEditableMinutesBefore: 0}),
            viewMode: 'agenda' as const,
            accordionOpen: true
        }
    })
}

describe('ChefCalendarDisplay agenda', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        clearNuxtData()
    })

    it('tells the chef when the team has no dinners', async () => {
        const wrapper = await mountAgenda()
        expect(wrapper.text()).toContain('Ingen fællesspisninger planlagt for dette hold')
    })
})
