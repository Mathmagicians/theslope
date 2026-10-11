import {describe, it, expect, beforeEach} from 'vitest'
import {setActivePinia, createPinia} from 'pinia'
import {clearNuxtData} from '#app'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {nextTick} from 'vue'
import ChefCalendarDisplay from '~/components/calendar/ChefCalendarDisplay.vue'
import type {CookingTeamDisplay} from '~/composables/useCookingTeamValidation'
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'
import {findByTestId, clickByTestId} from '~~/tests/component/testHelpers'

const TEST_IDS = {
    header: 'chef-calendar-header',
    toggle: 'chef-calendar-toggle',
    content: 'chef-calendar-content'
} as const

const team = {
    id: 1,
    name: 'Madhold 1',
    seasonId: 1,
    affinity: null,
    assignments: [],
    cookingDaysCount: 0
} as unknown as CookingTeamDisplay

type ViewMode = 'agenda' | 'calendar'

const mountCalendar = async ({viewMode = 'agenda', accordionOpen = true, dinnerEvents = []}: {
    viewMode?: ViewMode, accordionOpen?: boolean, dinnerEvents?: DinnerEventDisplay[]
} = {}) => {
    const {deadlinesForSeason} = useSeason()
    return await mountSuspended(ChefCalendarDisplay, {
        props: {
            seasonDates: {start: new Date('2026-01-01'), end: new Date('2026-06-30')},
            team,
            dinnerEvents,
            deadlines: deadlinesForSeason({ticketIsCancellableDaysBefore: 4, diningModeIsEditableMinutesBefore: 0}),
            viewMode,
            accordionOpen
        }
    })
}

describe('ChefCalendarDisplay', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        clearNuxtData()
    })

    it('tells the chef when the team has no dinners', async () => {
        const wrapper = await mountCalendar()
        expect(wrapper.text()).toContain('Ingen fællesspisninger planlagt for dette hold')
    })

    it.each<{from: ViewMode, label: string, to: ViewMode}>([
        {from: 'agenda', label: 'Kalender', to: 'calendar'},
        {from: 'calendar', label: 'Agenda', to: 'agenda'}
    ])('a click on the $label tab emits tab-click with $to', async ({from, label, to}) => {
        const wrapper = await mountCalendar({viewMode: from})
        const tab = findByTestId(wrapper, TEST_IDS.header).findAll('[role="tab"]').find(t => t.text().includes(label))
        expect(tab, `the ${label} tab renders in the header`).toBeDefined()
        await tab!.trigger('mousedown', {button: 0})
        await nextTick()
        expect(wrapper.emitted('tab-click')).toEqual([[to]])
    })

    it.each([true, false])('the chevron with accordion-open %s emits update:accordion-open with the toggled value', async (open) => {
        const wrapper = await mountCalendar({accordionOpen: open})
        expect(findByTestId(wrapper, TEST_IDS.toggle).attributes('aria-expanded')).toBe(String(open))
        await clickByTestId(wrapper, TEST_IDS.toggle)
        expect(wrapper.emitted('update:accordion-open')).toEqual([[!open]])
    })

    it.each([true, false])('accordion-open %s renders the content when open and none when closed', async (open) => {
        const wrapper = await mountCalendar({accordionOpen: open})
        expect(findByTestId(wrapper, TEST_IDS.content).exists()).toBe(open)
    })

    it('renders the header without a button inside a button', async () => {
        const wrapper = await mountCalendar()
        const header = findByTestId(wrapper, TEST_IDS.header)
        const buttons = header.findAll('button')
        expect(buttons.length, 'the header holds the two tabs and the chevron').toBe(3)
        expect(buttons.filter(button => button.element.parentElement?.closest('button'))).toEqual([])
        expect(header.element.closest('button'), 'the header row is no button itself').toBeNull()
    })
})
