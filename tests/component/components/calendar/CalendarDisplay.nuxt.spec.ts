// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {ref} from 'vue'
import type {VueWrapper} from '@vue/test-utils'
import CalendarDisplay from '~/components/calendar/CalendarDisplay.vue'
import {CALENDAR, PLANNING_CALENDAR, createResponsiveSizes} from '~/composables/useTheSlopeDesignSystem'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {mountWithTooltipProvider, expectSharedCalendarGrid} from '~~/tests/component/testHelpers'

const IS_MD = true
const {calendarCircle} = createResponsiveSizes(ref(IS_MD))
const {createDefaultWeekdayMap} = useWeekDayMapValidation()

// January 2025 starts on a Wednesday, so its Mondays are the 6th, 13th, 20th and 27th
const MONDAYS_ONLY = createDefaultWeekdayMap([true, false, false, false, false, false, false])
const jan = (day: number) => new Date(2025, 0, day)
const GENERATED_DAY = '2025-01-06'
const HOLIDAY_DAY = '2025-01-13'
const POTENTIAL_DAY = '2025-01-20'

const mountDisplay = async () => await mountWithTooltipProvider(CalendarDisplay, {
    props: {
        seasonDates: {start: jan(1), end: jan(31)},
        holidays: [{start: jan(13), end: jan(13)}],
        cookingDays: MONDAYS_ONLY,
        dinnerEvents: [{...DinnerEventFactory.defaultDinnerEventDisplay(), date: jan(6)}]
    },
    isMd: IS_MD
})

/** Every class of every token must land on the day cell's circle */
const expectDayTokens = (wrapper: VueWrapper, isoDate: string, tokens: string[]) => {
    const cell = wrapper.find(`[data-value="${isoDate}"]`)
    expect(cell.exists()).toBe(true)
    const classes = cell.find('div').classes()
    tokens.flatMap(token => token.split(' ')).forEach(cls => expect(classes).toContain(cls))
}

describe('CalendarDisplay', () => {

    describe.each([
        {name: 'generated dinner event', isoDate: GENERATED_DAY, palette: PLANNING_CALENDAR.day.generated},
        {name: 'potential cooking day', isoDate: POTENTIAL_DAY, palette: PLANNING_CALENDAR.day.potential},
        {name: 'holiday', isoDate: HOLIDAY_DAY, palette: CALENDAR.holiday}
    ])('$name', ({isoDate, palette}) => {
        it('renders the design-system circle with its palette', async () => {
            const wrapper = await mountDisplay()
            expectDayTokens(wrapper, isoDate, [calendarCircle, CALENDAR.day.shape, palette])
        })
    })

    it('configures its calendar from the shared design-system grid token', async () => {
        const wrapper = await mountDisplay()
        expectSharedCalendarGrid(wrapper)
    })
})
