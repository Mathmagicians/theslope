import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {addDays, addMinutes} from 'date-fns'
import CountdownTimer, {COUNTDOWN_PALETTE, type CountdownPalette} from '~/components/calendar/CountdownTimer.vue'
import {CHEF_CALENDAR, DINNER_CALENDAR} from '~/composables/useTheSlopeDesignSystem'
import {BOOKING_WORDS} from '~/config/bookingWords'
import {DATE_WORDS} from '~/config/dateWords'
import {calculateCountdown, formatDanishWeekdayDate} from '~/utils/date'
import {resetStores, setClock} from '~~/tests/component/testHelpers'

/**
 * CountdownTimer: the title over the next event's weekday and date, the time left after the in-word and the start
 * hour after the event's time label; the now-word and a blinking dot while the event is under way; the empty text
 * without an event or once it has ended.
 */
enableAutoUnmount(afterEach)

const NOW = new Date(2025, 0, 11, 12, 0)
const START_HOUR = 18
const EVENT = {id: 4, date: addDays(NOW, 2)}
const {countdownTitle: title, countdownTimeLabel: timeLabel} = BOOKING_WORDS.calendar

const mountCountdown = (nextEvent: {id: number, date: Date} | null, palette: CountdownPalette = COUNTDOWN_PALETTE.dinner) =>
    mountSuspended(CountdownTimer, {
        props: {title, timeLabel, emptyText: DATE_WORDS.countdown.none, nextEvent, eventStartHour: START_HOUR, palette}
    })

const eventStart = () => useSeason().getDinnerTimeRange(EVENT.date, START_HOUR, 0).start

describe('CountdownTimer', () => {
    beforeEach(() => {
        resetStores()
        vi.useFakeTimers()
        setClock(NOW)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('GIVEN an event two days ahead THEN it reads its date, the time left after the in-word and its time label before the at-word', async () => {
        const wrapper = await mountCountdown(EVENT)

        expect(wrapper.text()).toContain(title)
        expect(wrapper.text()).toContain(formatDanishWeekdayDate(EVENT.date))
        expect(wrapper.text()).toContain(DATE_WORDS.countdown.in)
        expect(wrapper.text()).toContain(calculateCountdown(eventStart(), NOW).formatted)
        expect(wrapper.text()).toContain(`${timeLabel} ${DATE_WORDS.countdown.at}`)
        expect(wrapper.text()).not.toContain(DATE_WORDS.countdown.none)
    })

    it('GIVEN the event under way THEN it reads the now-word and the dot names the title as under way', async () => {
        setClock(addMinutes(eventStart(), 10))
        const wrapper = await mountCountdown(EVENT)

        expect(wrapper.text()).toContain(DATE_WORDS.countdown.now)
        expect(wrapper.text()).not.toContain(DATE_WORDS.countdown.in)
        expect(wrapper.find(`[aria-label="${DATE_WORDS.countdown.happeningNow(title)}"]`).exists()).toBe(true)
    })

    it.each([
        {when: 'without an event', nextEvent: null, minutesAfterStart: -60},
        {when: 'once the event has ended', nextEvent: EVENT, minutesAfterStart: 90}
    ])('GIVEN the countdown $when THEN it reads the empty text under the title', async ({nextEvent, minutesAfterStart}) => {
        setClock(addMinutes(eventStart(), minutesAfterStart))
        const wrapper = await mountCountdown(nextEvent)

        expect(wrapper.text()).toContain(title)
        expect(wrapper.text()).toContain(DATE_WORDS.countdown.none)
        expect(wrapper.text()).not.toContain(DATE_WORDS.countdown.in)
    })

    it.each([
        {palette: COUNTDOWN_PALETTE.dinner, styles: DINNER_CALENDAR.countdown},
        {palette: COUNTDOWN_PALETTE.chef, styles: CHEF_CALENDAR.countdown}
    ])('GIVEN the $palette palette THEN the box binds its border', async ({palette, styles}) => {
        const wrapper = await mountCountdown(EVENT, palette)

        expect(wrapper.classes()).toEqual(expect.arrayContaining(styles.border.split(' ')))
    })
})
