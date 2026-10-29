import {describe, it, expect, afterEach} from 'vitest'
import {ref} from 'vue'
import {getRandomEmptyMessage, EMPTY_STATE_MESSAGES, createResponsiveAlerts, createBreakpoint, createMasterDetail, ORDER_STATE_COLORS, COMPONENTS, CALENDAR, CHEF_CALENDAR, DINNER_CALENDAR, dayColorClass} from '~/composables/useTheSlopeDesignSystem'
import {TEMPORAL_CATEGORY} from '~/utils/season'

const contexts = Object.keys(EMPTY_STATE_MESSAGES) as Array<keyof typeof EMPTY_STATE_MESSAGES>

describe('getRandomEmptyMessage', () => {
    // Danish evening: the local date (UTC+2) is already the 20th while UTC is still the 19th —
    // the seed must follow UTC so an SSR render (UTC server) and the browser pick the same message
    const danishEveningInstant = new Date('2026-08-19T22:30:00Z')
    const sameUtcDayMorning = new Date('2026-08-19T06:00:00Z')
    const utcSeed = 20260819

    it('every context seeds by UTC date, independent of the runtime timezone', () => {
        const misses = contexts.filter(context =>
            getRandomEmptyMessage(context, danishEveningInstant) !== EMPTY_STATE_MESSAGES[context][utcSeed % EMPTY_STATE_MESSAGES[context].length])
        expect(misses).toEqual([])
    })

    it('every context picks the same message on every render of the same UTC day', () => {
        const misses = contexts.filter(context =>
            getRandomEmptyMessage(context, sameUtcDayMorning) !== getRandomEmptyMessage(context, danishEveningInstant))
        expect(misses).toEqual([])
    })
})

describe('createResponsiveAlerts', () => {
    const isMd = ref(false)
    const ALERTS = createResponsiveAlerts(isMd)

    afterEach(() => {
        isMd.value = false
    })

    // The only branch in the factory - the kinds themselves are design values, not behaviour
    it.each([[false, 'vertical'], [true, 'horizontal']] as const)('withActions: isMd=%s → actions %s', (md, orientation) => {
        isMd.value = md
        expect(ALERTS.withActions.orientation).toBe(orientation)
    })
})

describe('createBreakpoint', () => {
    it.each([
        [null, false],
        [false, true]
    ] as const)('isMd=%s → measured %s', (md, measured) => {
        expect(createBreakpoint(ref(md)).measured.value).toBe(measured)
    })
})

describe('ORDER_STATE_COLORS', () => {
    it('the waiting list ghost badge and chip wear the queued state colour', () => {
        expect([COMPONENTS.waitlist.ghostBadge.color, COMPONENTS.waitlist.chip.color])
            .toEqual([ORDER_STATE_COLORS.queued, ORDER_STATE_COLORS.queued])
    })
})

describe('createMasterDetail', () => {
    // An unmeasured viewport renders the phone's dock, as the server render does
    it.each([
        [null, false],
        [true, true]
    ] as const)('isMd=%s → detail renders as a pane: %s', (md, asPane) => {
        expect(createMasterDetail(ref(md)).detailAsPane).toBe(asPane)
    })
})

describe('dayColorClass', () => {
    it.each([
        {calendar: 'dinner', palette: DINNER_CALENDAR},
        {calendar: 'chef', palette: CHEF_CALENDAR}
    ])('the $calendar calendar colours its next and future days from its palette and a past day from the shared past', ({palette}) => {
        expect(dayColorClass(palette, TEMPORAL_CATEGORY.next)).toBe(palette.day.next)
        expect(dayColorClass(palette, TEMPORAL_CATEGORY.future)).toBe(palette.day.future)
        expect(dayColorClass(palette, TEMPORAL_CATEGORY.past)).toBe(CALENDAR.day.past)
    })
})
