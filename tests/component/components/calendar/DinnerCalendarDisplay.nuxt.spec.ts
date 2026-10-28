// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {DOMWrapper, enableAutoUnmount} from '@vue/test-utils'
import {addDays, addMonths, endOfMonth, startOfMonth} from 'date-fns'
import DinnerCalendarDisplay from '~/components/calendar/DinnerCalendarDisplay.vue'
import {DEADLINE_LABELS, EMPTY_RELEASED_TICKET_COUNTS, type ReleasedTicketCounts} from '~/composables/useBooking'
import CalendarLegend from '~/components/calendar/CalendarLegend.vue'
import {BOOKING_WORDS} from '~/config/bookingWords'
import {DATE_WORDS} from '~/config/dateWords'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {findAllByTestId, findByTestId, iconNamesIn, mountWithTooltipProvider, resetStores} from '~~/tests/component/testHelpers'
import {CALENDAR, ICONS} from '~/composables/useTheSlopeDesignSystem'
import {DinnerState} from '~/composables/useBookingValidation'
import {WAITLIST_TEST_IDS} from '~~/tests/component/components/dinner/waitlistTestIds'

enableAutoUnmount(afterEach)

// A month two ahead of today: every dinner is upcoming and the one month view holds them all
const MONTH = startOfMonth(addMonths(new Date(), 2))

/**
 * The lock chip on a dinner past its booking deadline shows the dinner's supply: the tickets for sale counting up,
 * else the hourglass of the waiting list, else the closed chip alone. A dinner open for booking carries no chip.
 */
describe('DinnerCalendarDisplay lock chips', () => {
    const dinnerOn = (id: number, dayOfMonth: number) =>
        ({...DinnerEventFactory.defaultDinnerEventDisplay(), id, date: addDays(MONTH, dayOfMonth - 1)})
    const supply = (total: number, queued: number): ReleasedTicketCounts => ({...EMPTY_RELEASED_TICKET_COUNTS, total, formatted: total > 0 ? `${total}V` : '-', queued, queuedFormatted: queued > 0 ? `${queued}V` : '-'})

    const FOR_SALE = dinnerOn(1, 10)
    const QUEUED = dinnerOn(2, 11)
    const CLOSED = dinnerOn(3, 12)
    const OPEN = dinnerOn(4, 13)
    const lockStatus = new Map<number, ReleasedTicketCounts | null>([
        [FOR_SALE.id, supply(2, 0)],
        [QUEUED.id, supply(0, 3)],
        [CLOSED.id, supply(0, 0)]
    ])

    beforeEach(() => {
        resetStores()
    })

    const mountCalendar = () => mountWithTooltipProvider(DinnerCalendarDisplay, {
        props: {
            seasonDates: {start: MONTH, end: endOfMonth(MONTH)},
            holidays: [],
            dinnerEvents: [FOR_SALE, QUEUED, CLOSED, OPEN],
            lockStatus,
            selectedDate: MONTH,
            numberOfMonths: 1
        },
        isMd: true
    })

    type Mounted = Awaited<ReturnType<typeof mountCalendar>>

    // UChip hands its attributes to the day circle, so the chip's indicator sits beside the circle
    const chipOf = (wrapper: Mounted, date: Date): Element | null =>
        findByTestId(wrapper, `calendar-dinner-date-${date.getDate()}`).element.parentElement?.querySelector('[data-slot="base"]') ?? null

    it('each dinner past its deadline wears the chip of its supply, and a dinner open for booking wears none', async () => {
        const chips = [
            {desc: 'tickets for sale count up', dinner: FOR_SALE, text: '2', glyphs: []},
            {desc: 'a waiting list shows the hourglass without a number', dinner: QUEUED, text: '', glyphs: [ICONS.waitlist]},
            {desc: 'a closed dinner with neither shows the chip without a number', dinner: CLOSED, text: '', glyphs: []}
        ]
        const wrapper = await mountCalendar()

        chips.forEach(({desc, dinner, text, glyphs}) => {
            const chip = chipOf(wrapper, dinner.date)
            expect(chip?.textContent?.trim(), desc).toBe(text)
            expect(iconNamesIn(new DOMWrapper(chip!)), desc).toEqual(glyphs)
        })
        expect(chipOf(wrapper, OPEN.date)).toBeNull()

        // The hourglass carries the test id the waiting list flow reads, inside the day's chip
        const hourglass = findByTestId(wrapper, WAITLIST_TEST_IDS.calendarHourglass(QUEUED.date.getDate()))
        expect(chipOf(wrapper, QUEUED.date)?.contains(hourglass.element)).toBe(true)
    })

    it('the legend explains each chip', async () => {
        const legend = [
            {label: DEADLINE_LABELS.BOOKING_CLOSED.closedText, text: '', glyphs: []},
            {label: BOOKING_WORDS.calendarLegend.forSale, text: '1', glyphs: []},
            {label: BOOKING_WORDS.calendarLegend.waitlist, text: '', glyphs: [ICONS.waitlist]}
        ]
        const wrapper = await mountCalendar()

        legend.forEach(({label, text, glyphs}) => {
            const entry = findAllByTestId(wrapper, 'calendar-legend-entry').find(candidate => candidate.text().includes(label))
            const chip = entry?.find('[data-slot="base"]').element ?? null
            expect(chip?.textContent?.trim(), label).toBe(text)
            expect(iconNamesIn(new DOMWrapper(chip!)), label).toEqual(glyphs)
        })
    })
})

// A cancelled dinner's day reads as the chef calendar draws it: the past circle, struck through, explained in the legend
describe('DinnerCalendarDisplay cancelled dinners', () => {
    const CANCELLED_DINNER = {...DinnerEventFactory.defaultDinnerEventDisplay(), id: 5, date: addDays(MONTH, 13), state: DinnerState.CANCELLED}

    beforeEach(() => {
        resetStores()
    })

    const mountCalendar = () => mountWithTooltipProvider(DinnerCalendarDisplay, {
        props: {
            seasonDates: {start: MONTH, end: endOfMonth(MONTH)},
            holidays: [],
            dinnerEvents: [CANCELLED_DINNER],
            lockStatus: new Map<number, ReleasedTicketCounts | null>(),
            selectedDate: MONTH,
            numberOfMonths: 1
        },
        isMd: true
    })

    it('a cancelled dinner\'s day carries the past circle struck through', async () => {
        const wrapper = await mountCalendar()

        const day = findByTestId(wrapper, `calendar-dinner-date-${CANCELLED_DINNER.date.getDate()}`)
        expect(day.classes()).toEqual(expect.arrayContaining([...CALENDAR.day.past.split(' '), ...CALENDAR.day.cancelled.split(' ')]))
    })

    it('the legend names each day the calendar draws: the dinner circles, the cancelled dinner and the holiday, then the lock chips', async () => {
        const words = BOOKING_WORDS.calendarLegend
        const wrapper = await mountCalendar()

        expect(wrapper.findComponent(CalendarLegend).props('items')?.map(item => item.label)).toEqual([
            words.next, DATE_WORDS.calendarLegend.selected, words.planned, words.past, BOOKING_WORDS.cancelledDinner.legend,
            DATE_WORDS.calendarLegend.holiday, DEADLINE_LABELS.BOOKING_CLOSED.closedText, words.forSale, words.waitlist
        ])
    })
})

// The server renders the circles before the layout measures the viewport, so the circle's size steps at lg in its own
// classes: a circle reads alike whatever the md breakpoint says, and the browser picks the size per screen
describe('DinnerCalendarDisplay day circles', () => {
    const DINNER = {...DinnerEventFactory.defaultDinnerEventDisplay(), id: 6, date: addDays(MONTH, 9)}

    beforeEach(() => {
        resetStores()
    })

    const circleClasses = async (isMd: boolean | null) => {
        const wrapper = await mountWithTooltipProvider(DinnerCalendarDisplay, {
            props: {
                seasonDates: {start: MONTH, end: endOfMonth(MONTH)},
                holidays: [],
                dinnerEvents: [DINNER],
                selectedDate: MONTH,
                numberOfMonths: 1
            },
            isMd
        })
        return findByTestId(wrapper, `calendar-dinner-date-${DINNER.date.getDate()}`).classes()
    }

    it('a dinner circle binds the calendar circle size, alike on a phone, from md and before the layout measures', async () => {
        const phone = await circleClasses(false)

        expect(phone).toEqual(expect.arrayContaining(CALENDAR.day.size.split(' ')))
        expect(await circleClasses(true)).toEqual(phone)
        expect(await circleClasses(null)).toEqual(phone)
    })
})
