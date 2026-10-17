import {describe, it, expect, afterEach} from 'vitest'
import {ref} from 'vue'
import {getRandomEmptyMessage, EMPTY_STATE_MESSAGES, createResponsiveAlerts, createColumnVisibility, createBreakpoint, createMasterDetail, getTicketState, getOrderStateColor, ORDER_STATE_COLORS, COMPONENTS} from '~/composables/useTheSlopeDesignSystem'

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

describe('createColumnVisibility', () => {
    const isMd = ref(false)
    const columnVisibility = createColumnVisibility(isMd)

    afterEach(() => {
        isMd.value = false
    })

    it.each([
        [false, {id: false, phone: false}],
        [true, {}]
    ] as const)('isMd=%s → UTable column visibility %j', (md, visibility) => {
        isMd.value = md
        expect(columnVisibility(['id', 'phone'])).toEqual(visibility)
    })

    it.each([
        [false, {durationMs: false}],
        [true, {expand: false}]
    ] as const)('isMd=%s with an expand column hidden from md → %j', (md, visibility) => {
        isMd.value = md
        expect(columnVisibility(['durationMs'], ['expand'])).toEqual(visibility)
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

describe('getTicketState', () => {
    // A released ticket reads released even when claimed; the waiting list shows on a ticket in neither state
    it.each([
        {isReleased: false, isClaimed: false, isQueued: false, state: 'normal'},
        {isReleased: true, isClaimed: true, isQueued: false, state: 'released'},
        {isReleased: false, isClaimed: true, isQueued: true, state: 'claimed'},
        {isReleased: false, isClaimed: false, isQueued: true, state: 'queued'}
    ] as const)('released $isReleased, claimed $isClaimed, queued $isQueued → $state', ({isReleased, isClaimed, isQueued, state}) => {
        expect(getTicketState(isReleased, isClaimed, isQueued)).toBe(state)
    })

    it.each([[true, false], [false, true]] as const)(
        'released %s, claimed %s → the order state colour of that ticket state', (isReleased, isClaimed) => {
            expect(getOrderStateColor(isReleased, isClaimed)).toBe(ORDER_STATE_COLORS[getTicketState(isReleased, isClaimed)])
        })

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
