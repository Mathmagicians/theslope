// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import WeekDayMapDisplay from '~/components/calendar/WeekDayMapDisplay.vue'
import {ref} from 'vue'
import {WEEKDAYS, createDefaultWeekdayMap} from '~/types/dateTypes'

describe('WeekDayMapDisplay', () => {

    const allDays = createDefaultWeekdayMap(true)
    const monWedFri = createDefaultWeekdayMap([true, false, true, false, true, false, false])
    const noDays = createDefaultWeekdayMap(false)

    const mount = (props: Record<string, unknown> = {}) =>
        mountSuspended(WeekDayMapDisplay, {
            props: {modelValue: allDays, ...props},
            global: {provide: {isMd: ref(true)}}
        })

    // ========== COMPACT VIEW ==========

    describe('compact view', () => {
        it.each([
            ['all days', allDays, WEEKDAYS.length],
            ['3 days', monWedFri, 3],
        ])('%s shows correct badge count', async (_, modelValue, expected) => {
            const wrapper = await mount({modelValue, compact: true})
            expect(wrapper.findAll('.capitalize').length).toBe(expected)
        })

        it('shows sleep emoji when no days selected', async () => {
            const wrapper = await mount({modelValue: noDays, compact: true})
            expect(wrapper.text()).toContain('💤')
        })

        it('shows abbreviated day names', async () => {
            const wrapper = await mount({modelValue: monWedFri, compact: true})
            const text = wrapper.text()
            expect(text).toContain('man')
            expect(text).toContain('ons')
            expect(text).toContain('fre')
            expect(text).not.toContain('tirsdag')
        })
    })

    // ========== FULL VIEW ==========

    describe('full view', () => {
        it('shows all 7 days', async () => {
            const wrapper = await mount()
            WEEKDAYS.forEach(day => expect(wrapper.text()).toContain(day))
        })

        it('renders label', async () => {
            const wrapper = await mount({label: 'Madlavningsdage'})
            expect(wrapper.text()).toContain('Madlavningsdage')
        })
    })

    // ========== hideRestricted ==========

    describe('hideRestricted', () => {
        it.each([
            ['shows all days when false', false, WEEKDAYS.length],
            ['hides restricted days when true', true, 3]
        ])('%s', async (_, hideRestricted, expectedCount) => {
            const wrapper = await mount({parentRestriction: monWedFri, hideRestricted})
            const visibleDays = WEEKDAYS.filter(day => wrapper.text().includes(day))
            expect(visibleDays.length).toBe(expectedCount)
        })

        it('only shows unrestricted days', async () => {
            const wrapper = await mount({parentRestriction: monWedFri, hideRestricted: true})
            const text = wrapper.text()
            expect(text).toContain('mandag')
            expect(text).toContain('onsdag')
            expect(text).toContain('fredag')
            expect(text).not.toContain('tirsdag')
            expect(text).not.toContain('torsdag')
        })
    })
})
