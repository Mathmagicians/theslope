// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {addDays, addMonths, endOfMonth, startOfMonth} from 'date-fns'
import DinnerCalendarDisplay from '~/components/calendar/DinnerCalendarDisplay.vue'
import {EMPTY_RELEASED_TICKET_COUNTS, type ReleasedTicketCounts} from '~/composables/useBooking'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {findAllByTestId, findByTestId, mountWithTooltipProvider} from '~~/tests/component/testHelpers'
import {ICONS} from '~/composables/useTheSlopeDesignSystem'
import {WAITLIST_TEST_IDS} from '~~/tests/component/components/dinner/waitlistTestIds'

/**
 * The lock chip on a dinner past its booking deadline shows the dinner's supply: the tickets for sale counting up,
 * else the hourglass of the waiting list, else the closed chip alone. A dinner open for booking carries no chip.
 */
describe('DinnerCalendarDisplay lock chips', () => {
    // A month two ahead of today: every dinner is upcoming and the one month view holds them all
    const MONTH = startOfMonth(addMonths(new Date(), 2))
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
    const glyphsIn = (wrapper: Mounted, element: Element | null): string[] =>
        wrapper.findAllComponents({name: 'UIcon'}).filter(icon => element?.contains(icon.element)).map(icon => icon.props('name') as string)

    it.each([
        {desc: 'tickets for sale count up', dinner: FOR_SALE, text: '2', glyphs: []},
        {desc: 'a waiting list shows the hourglass without a number', dinner: QUEUED, text: '', glyphs: [ICONS.waitlist]},
        {desc: 'a closed dinner with neither shows the chip without a number', dinner: CLOSED, text: '', glyphs: []}
    ])('$desc', async ({dinner, text, glyphs}) => {
        const wrapper = await mountCalendar()
        const chip = chipOf(wrapper, dinner.date)
        expect(chip?.textContent?.trim()).toBe(text)
        expect(glyphsIn(wrapper, chip)).toEqual(glyphs)
    })

    it('a dinner open for booking has no chip', async () => {
        const wrapper = await mountCalendar()
        expect(chipOf(wrapper, OPEN.date)).toBeNull()
    })

    it('the hourglass carries the test id the waiting list flow reads, inside the day\'s chip', async () => {
        const wrapper = await mountCalendar()
        const hourglass = findByTestId(wrapper, WAITLIST_TEST_IDS.calendarHourglass(QUEUED.date.getDate()))
        expect(chipOf(wrapper, QUEUED.date)?.contains(hourglass.element)).toBe(true)
    })

    it.each([
        {label: 'Lukket for framelding', text: '', glyphs: []},
        {label: 'Billetter til salg', text: '1', glyphs: []},
        {label: 'Venteliste, ingen billetter til salg', text: '', glyphs: [ICONS.waitlist]}
    ])('the legend explains the chip: $label', async ({label, text, glyphs}) => {
        const wrapper = await mountCalendar()
        const entry = findAllByTestId(wrapper, 'calendar-legend-entry').find(candidate => candidate.text().includes(label))
        const chip = entry?.find('[data-slot="base"]').element ?? null
        expect(chip?.textContent?.trim()).toBe(text)
        expect(glyphsIn(wrapper, chip)).toEqual(glyphs)
    })
})
