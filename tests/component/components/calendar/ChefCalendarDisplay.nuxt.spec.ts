import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {nextTick} from 'vue'
import {addDays, addMonths, endOfMonth, startOfMonth} from 'date-fns'
import ChefCalendarDisplay from '~/components/calendar/ChefCalendarDisplay.vue'
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'
import {CHEF_CALENDAR} from '~/composables/useTheSlopeDesignSystem'
import {TEAM_WORDS} from '~/config/teamWords'
import {findByTestId, clickByTestId, resetStores} from '~~/tests/component/testHelpers'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'

const TEST_IDS = {
    header: 'chef-calendar-header',
    toggle: 'chef-calendar-toggle',
    content: 'chef-calendar-content',
    legend: 'calendar-legend',
    ownDinner: (date: Date) => `calendar-dinner-date-${date.getDate()}`,
    otherTeamDinner: (date: Date) => `calendar-other-team-dinner-${date.getDate()}`
} as const

const TEAM_ID = 1
const team = SeasonFactory.defaultCookingTeamDisplay({id: TEAM_ID, name: 'Madhold 1'})
const OTHER_TEAM_ID = 2

// A month two ahead of today: the team's dinner there is its next, so the one month view focuses on it
const MONTH = startOfMonth(addMonths(new Date(), 2))

type ViewMode = 'agenda' | 'calendar'

// The next test's resetStores drops the datasets a still-mounted calendar reads
enableAutoUnmount(afterEach)

const mountCalendar = async ({viewMode = 'agenda', accordionOpen = true, showSelection = false, dinnerEvents = [], otherTeamDinners = []}: {
    viewMode?: ViewMode, accordionOpen?: boolean, showSelection?: boolean, dinnerEvents?: DinnerEventDisplay[], otherTeamDinners?: DinnerEventDisplay[]
} = {}) => {
    const {deadlinesForSeason} = useSeason()
    return await mountSuspended(ChefCalendarDisplay, {
        props: {
            seasonDates: {start: MONTH, end: endOfMonth(MONTH)},
            team,
            dinnerEvents,
            otherTeamDinners,
            deadlines: deadlinesForSeason({ticketIsCancellableDaysBefore: 4, diningModeIsEditableMinutesBefore: 0}, new Date()),
            viewMode,
            accordionOpen,
            showSelection
        }
    })
}

describe('ChefCalendarDisplay', () => {
    beforeEach(() => {
        resetStores()
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

    it.each([true, false])('accordion-open %s renders the content only when open, and the chevron emits update:accordion-open with the toggled value', async (open) => {
        const wrapper = await mountCalendar({accordionOpen: open})
        expect(findByTestId(wrapper, TEST_IDS.content).exists()).toBe(open)
        expect(findByTestId(wrapper, TEST_IDS.toggle).attributes('aria-expanded')).toBe(String(open))
        await clickByTestId(wrapper, TEST_IDS.toggle)
        expect(wrapper.emitted('update:accordion-open')).toEqual([[!open]])
    })

    it('tells the chef when the team has no dinners, under a header without a button inside a button', async () => {
        const wrapper = await mountCalendar()
        expect(wrapper.text()).toContain('Ingen fællesspisninger planlagt for dette hold')
        const header = findByTestId(wrapper, TEST_IDS.header)
        const buttons = header.findAll('button')
        expect(buttons.length, 'the header holds the two tabs and the chevron').toBe(3)
        expect(buttons.filter(button => button.element.parentElement?.closest('button'))).toEqual([])
        expect(header.element.closest('button'), 'the header row is no button itself').toBeNull()
    })
})

/**
 * The calendar shows the season's dinners of the other teams beside the team's own: a plain circle the chef can
 * select, explained in the legend. The team's own dinners keep their circles.
 */
describe('ChefCalendarDisplay other teams\' dinners', () => {
    const dinnerOn = (id: number, dayOfMonth: number, cookingTeamId: number): DinnerEventDisplay =>
        ({...DinnerEventFactory.defaultDinnerEventDisplay(), id, date: addDays(MONTH, dayOfMonth - 1), cookingTeamId})
    const OWN_DINNER = dinnerOn(1, 10, TEAM_ID)
    const OTHER_TEAM_DINNER = dinnerOn(2, 15, OTHER_TEAM_ID)

    beforeEach(() => {
        resetStores()
    })

    const mountMonth = () => mountCalendar({
        viewMode: 'calendar', accordionOpen: true, showSelection: true,
        dinnerEvents: [OWN_DINNER], otherTeamDinners: [OTHER_TEAM_DINNER]
    })
    type Mounted = Awaited<ReturnType<typeof mountMonth>>
    const otherTeamDayOf = (wrapper: Mounted) => {
        const day = findByTestId(wrapper, TEST_IDS.otherTeamDinner(OTHER_TEAM_DINNER.date))
        expect(day.exists(), 'the other team\'s dinner renders on its day').toBe(true)
        return day
    }

    it('another team\'s dinner day binds the otherTeam circle', async () => {
        const wrapper = await mountMonth()

        expect(otherTeamDayOf(wrapper).classes()).toEqual(expect.arrayContaining(CHEF_CALENDAR.day.otherTeam.split(' ')))
    })

    it('a click on another team\'s dinner selects that dinner', async () => {
        const wrapper = await mountMonth()

        await otherTeamDayOf(wrapper).trigger('click')
        await nextTick()

        expect(wrapper.emitted('select')).toEqual([[OTHER_TEAM_DINNER.id]])
    })

    it('the legend explains another team\'s dinner', async () => {
        const wrapper = await mountMonth()

        expect(findByTestId(wrapper, TEST_IDS.legend).text()).toContain(TEAM_WORDS.calendarLegend.otherTeam)
    })

    it('the team\'s own dinner in the same month keeps its own circle', async () => {
        const wrapper = await mountMonth()

        expect(findByTestId(wrapper, TEST_IDS.ownDinner(OWN_DINNER.date)).exists()).toBe(true)
        expect(findByTestId(wrapper, TEST_IDS.otherTeamDinner(OWN_DINNER.date)).exists()).toBe(false)
    })
})
