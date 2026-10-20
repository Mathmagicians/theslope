// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {enableAutoUnmount} from '@vue/test-utils'
import WeekDayMapDisplay from '~/components/calendar/WeekDayMapDisplay.vue'
import {WEEKDAYS, createDefaultWeekdayMap} from '~/types/dateTypes'
import {mountWithTooltipProvider, resetStores} from '~~/tests/component/testHelpers'

enableAutoUnmount(afterEach)

describe('WeekDayMapDisplay', () => {

    const allDays = createDefaultWeekdayMap(true)
    const monWedFri = createDefaultWeekdayMap([true, false, true, false, true, false, false])
    const noDays = createDefaultWeekdayMap(false)

    beforeEach(() => {
        resetStores()
    })

    const mount = (props: Record<string, unknown> = {}) =>
        mountWithTooltipProvider(WeekDayMapDisplay, {props: {modelValue: allDays, ...props}, isMd: true})

    // ========== COMPACT VIEW ==========

    describe('compact view', () => {
        it('shows one badge per selected day, with abbreviated day names', async () => {
            const wrapper = await mount({modelValue: monWedFri, compact: true})
            expect(wrapper.findAll('.capitalize').length).toBe(3)
            const text = wrapper.text()
            expect(text).toContain('man')
            expect(text).toContain('ons')
            expect(text).toContain('fre')
            expect(text).not.toContain('tirsdag')
        })

        it('shows sleep emoji when no days selected', async () => {
            const wrapper = await mount({modelValue: noDays, compact: true})
            expect(wrapper.text()).toContain('💤')
        })
    })

    // ========== FULL VIEW ==========

    describe('full view', () => {
        it('renders the label and all 7 days', async () => {
            const wrapper = await mount({label: 'Madlavningsdage'})
            expect(wrapper.text()).toContain('Madlavningsdage')
            WEEKDAYS.forEach(day => expect(wrapper.text()).toContain(day))
        })
    })

    // ========== hideRestricted ==========

    describe('hideRestricted', () => {
        it('shows all days when false', async () => {
            const wrapper = await mount({parentRestriction: monWedFri, hideRestricted: false})
            const visibleDays = WEEKDAYS.filter(day => wrapper.text().includes(day))
            expect(visibleDays.length).toBe(WEEKDAYS.length)
        })

        it('only shows the unrestricted days when true', async () => {
            const wrapper = await mount({parentRestriction: monWedFri, hideRestricted: true})
            const visibleDays = WEEKDAYS.filter(day => wrapper.text().includes(day))
            expect(visibleDays.length).toBe(3)
            const text = wrapper.text()
            expect(text).toContain('mandag')
            expect(text).toContain('onsdag')
            expect(text).toContain('fredag')
            expect(text).not.toContain('tirsdag')
            expect(text).not.toContain('torsdag')
        })
    })
})
