import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount, type BaseWrapper} from '@vue/test-utils'
import {findByTestId, resetStores} from '~~/tests/component/testHelpers'
import DinnerModeLegend from '~/components/dinner/DinnerModeLegend.vue'
import DinnerModeSelector from '~/components/dinner/DinnerModeSelector.vue'
import {DinnerMode} from '~/composables/useBookingValidation'
import {MODE_WORDS} from '~/composables/useBookingUi'
import {COMPONENTS, ICONS, TYPOGRAPHY} from '~/composables/useTheSlopeDesignSystem'
import {BOOKING_WORDS} from '~/config/bookingWords'

enableAutoUnmount(afterEach)

beforeEach(() => {
    resetStores()
})

const ALL_MODES = [DinnerMode.DINEIN, DinnerMode.DINEINLATE, DinnerMode.TAKEAWAY, DinnerMode.NONE]
const GRID_HINT = 'Klik på en celle for at ændre din booking.'

describe('DinnerModeLegend', () => {
    it('explains every dinner mode by default', async () => {
        const wrapper = await mountSuspended(DinnerModeLegend)
        for (const mode of ALL_MODES) {
            expect(wrapper.text()).toContain(MODE_WORDS[mode].label)
        }
    })

    it('renders only the configured modes', async () => {
        const wrapper = await mountSuspended(DinnerModeLegend, {
            props: {modes: [DinnerMode.DINEIN], showNoConsensus: false}
        })
        expect(wrapper.text()).toContain(MODE_WORDS[DinnerMode.DINEIN].label)
        expect(wrapper.text()).not.toContain(MODE_WORDS[DinnerMode.TAKEAWAY].label)
    })

    it('explains the mixed-preferences badge only when power mode is on the surface', async () => {
        const withConsensus = await mountSuspended(DinnerModeLegend)
        const without = await mountSuspended(DinnerModeLegend, {props: {showNoConsensus: false}})

        expect(withConsensus.text()).toContain(BOOKING_WORDS.mixedModes)
        expect(without.text()).not.toContain(BOOKING_WORDS.mixedModes)
    })

    it('lists every entry as one row of the panel\'s list, its sample in the sample column and its explanation beside it, the hint under the rows', async () => {
        const wrapper = await mountSuspended(DinnerModeLegend, {
            props: {showModified: true, showWaitlist: true, hint: GRID_HINT}
        })
        const list = findByTestId(wrapper, 'calendar-legend-list')
        const rows = Array.from(list.element.children)

        expect(list.classes()).toEqual(COMPONENTS.legend.list.split(' '))
        expect(rows.map(row => row.lastElementChild?.textContent?.trim())).toEqual([
            ...ALL_MODES.map(mode => MODE_WORDS[mode].label),
            BOOKING_WORDS.mixedModes,
            BOOKING_WORDS.legend.modified,
            BOOKING_WORDS.legend.waitlist,
            BOOKING_WORDS.expectedBooking
        ])
        for (const row of rows) {
            const [sample, explanation] = Array.from(row.children)
            expect(row.children).toHaveLength(2)
            expect(Array.from(row.classList)).toEqual(COMPONENTS.legend.entry.split(' '))
            expect(Array.from(sample!.classList)).toEqual(COMPONENTS.legend.sample.split(' '))
            expect(sample!.querySelector('[data-testid="dinner-mode-selector"]')).not.toBeNull()
            expect(sample!.textContent?.trim()).toBe('')
            expect(Array.from(explanation!.classList)).toEqual(expect.arrayContaining(TYPOGRAPHY.finePrint.split(' ')))
        }
        expect(list.text()).not.toContain(GRID_HINT)
        expect(wrapper.text().trim().endsWith(GRID_HINT)).toBe(true)
    })

    it('shows the modified-cell marker and the grid hint only for the grid', async () => {
        const plain = await mountSuspended(DinnerModeLegend)
        const grid = await mountSuspended(DinnerModeLegend, {
            props: {showModified: true, hint: GRID_HINT}
        })

        expect(grid.find('[data-testid="dinner-mode-legend-modified"]').exists()).toBe(true)
        expect(grid.text()).toContain(GRID_HINT)
        expect(plain.find('[data-testid="dinner-mode-legend-modified"]').exists()).toBe(false)
    })

    it('explains the queue marker only where the surface shows queued cells', async () => {
        const plain = await mountSuspended(DinnerModeLegend)
        const grid = await mountSuspended(DinnerModeLegend, {props: {showWaitlist: true}})

        expect(grid.find('[data-testid="dinner-mode-legend-waitlist"]').text()).toContain(BOOKING_WORDS.legend.waitlist)
        expect(grid.findAllComponents(DinnerModeSelector).some(selector => selector.props('ghost'))).toBe(true)
        expect(plain.find('[data-testid="dinner-mode-legend-waitlist"]').exists()).toBe(false)
    })

    // The expected booking is a standing entry: a surface explains it whether or not one of its rows is expected now
    it('explains the expected booking with the sliders beside the expected mode on every surface', async () => {
        const wrapper = await mountSuspended(DinnerModeLegend)
        const entry: BaseWrapper<Node> = findByTestId(wrapper, 'dinner-mode-legend-expected')
        const sliders = entry.findAllComponents({name: 'UIcon'}).find(icon => icon.props('name') === ICONS.preferences)

        expect(entry.text()).toContain(BOOKING_WORDS.expectedBooking)
        expect(sliders?.classes()).toEqual(expect.arrayContaining(COMPONENTS.ticket.stateIcon.expected.split(' ')))
        expect(entry.findAllComponents(DinnerModeSelector).some(selector => selector.props('expected'))).toBe(true)
    })
})
