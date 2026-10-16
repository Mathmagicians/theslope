// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {addDays, addMonths, endOfMonth, startOfMonth} from 'date-fns'
import DinnerCalendarDisplay from '~/components/calendar/DinnerCalendarDisplay.vue'
import type {ReleasedTicketCounts} from '~/composables/useBooking'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {findAllByTestId, findByTestId, mountWithTooltipProvider} from '~~/tests/component/testHelpers'

/**
 * The lock chip on a dinner past its booking deadline shows the dinner's supply: the tickets for sale counting up,
 * else the waiting list counting down, else the closed chip alone. A dinner open for booking carries no chip.
 */
describe('DinnerCalendarDisplay lock chips', () => {
    // A month two ahead of today: every dinner is upcoming and the one month view holds them all
    const MONTH = startOfMonth(addMonths(new Date(), 2))
    const dinnerOn = (id: number, dayOfMonth: number) =>
        ({...DinnerEventFactory.defaultDinnerEventDisplay(), id, date: addDays(MONTH, dayOfMonth - 1)})
    const supply = (total: number, queued: number): ReleasedTicketCounts => ({total, formatted: total > 0 ? `${total}V` : '-', queued})

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

    // UChip hands its attributes to the day circle, so the chip's number sits beside the circle
    const chipText = (wrapper: Awaited<ReturnType<typeof mountCalendar>>, date: Date): string | undefined =>
        findByTestId(wrapper, `calendar-dinner-date-${date.getDate()}`).element.parentElement
            ?.querySelector('[data-slot="base"]')?.textContent?.trim()

    it.each([
        {desc: 'tickets for sale count up', dinner: FOR_SALE, text: '2'},
        {desc: 'a waiting list counts down', dinner: QUEUED, text: '-3'},
        {desc: 'a closed dinner with neither shows the chip without a number', dinner: CLOSED, text: ''},
        {desc: 'a dinner open for booking has no chip', dinner: OPEN, text: undefined}
    ])('$desc', async ({dinner, text}) => {
        const wrapper = await mountCalendar()
        expect(chipText(wrapper, dinner.date)).toBe(text)
    })

    it.each([
        {label: 'Lukket for framelding', text: ''},
        {label: 'Ledige billetter', text: '1'},
        {label: '3 på venteliste, ingen ledige billetter', text: '-3'}
    ])('the legend explains the chip reading "$text": $label', async ({label, text}) => {
        const wrapper = await mountCalendar()
        const entry = findAllByTestId(wrapper, 'calendar-legend-entry').find(candidate => candidate.text().includes(label))
        expect(entry?.find('[data-slot="base"]').text()).toBe(text)
    })
})
