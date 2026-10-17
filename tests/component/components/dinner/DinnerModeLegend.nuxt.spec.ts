import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {resetStores} from '~~/tests/component/testHelpers'
import DinnerModeLegend from '~/components/dinner/DinnerModeLegend.vue'
import DinnerModeSelector from '~/components/dinner/DinnerModeSelector.vue'
import {DinnerMode} from '~/composables/useBookingValidation'
import {FORM_MODES} from '~/types/form'

enableAutoUnmount(afterEach)

beforeEach(() => {
    resetStores()
})

// The mode labels live in DinnerModeSelector, so the expected text is read from a real
// selector render rather than repeated here - a renamed label cannot pass both places
const labelFor = async (mode: DinnerMode) => {
    const selector = await mountSuspended(DinnerModeSelector, {
        props: {modelValue: mode, formMode: FORM_MODES.VIEW, showLabel: true}
    })
    return selector.text().trim()
}

const ALL_MODES = [DinnerMode.DINEIN, DinnerMode.DINEINLATE, DinnerMode.TAKEAWAY, DinnerMode.NONE]

describe('DinnerModeLegend', () => {
    it('explains every dinner mode by default', async () => {
        const wrapper = await mountSuspended(DinnerModeLegend)
        for (const mode of ALL_MODES) {
            expect(wrapper.text()).toContain(await labelFor(mode))
        }
    })

    it('renders only the configured modes', async () => {
        const wrapper = await mountSuspended(DinnerModeLegend, {
            props: {modes: [DinnerMode.DINEIN], showNoConsensus: false}
        })
        expect(wrapper.text()).toContain(await labelFor(DinnerMode.DINEIN))
        expect(wrapper.text()).not.toContain(await labelFor(DinnerMode.TAKEAWAY))
    })

    it('explains the mixed-preferences badge only when power mode is on the surface', async () => {
        const withConsensus = await mountSuspended(DinnerModeLegend)
        const without = await mountSuspended(DinnerModeLegend, {props: {showNoConsensus: false}})
        const mixedLabel = (await mountSuspended(DinnerModeSelector, {
            props: {modelValue: DinnerMode.DINEIN, formMode: FORM_MODES.VIEW, showLabel: true, consensus: false}
        })).text().trim()

        expect(withConsensus.text()).toContain(mixedLabel)
        expect(without.text()).not.toContain(mixedLabel)
    })

    it('shows the modified-cell marker and the grid hint only for the grid', async () => {
        const plain = await mountSuspended(DinnerModeLegend)
        const grid = await mountSuspended(DinnerModeLegend, {
            props: {showModified: true, hint: 'Klik på en celle for at ændre din booking.'}
        })

        expect(grid.find('[data-testid="dinner-mode-legend-modified"]').exists()).toBe(true)
        expect(grid.text()).toContain('Klik på en celle')
        expect(plain.find('[data-testid="dinner-mode-legend-modified"]').exists()).toBe(false)
    })

    it('explains the queue marker only where the surface shows queued cells', async () => {
        const plain = await mountSuspended(DinnerModeLegend)
        const grid = await mountSuspended(DinnerModeLegend, {props: {showWaitlist: true}})

        expect(grid.find('[data-testid="dinner-mode-legend-waitlist"]').text()).toContain('På venteliste')
        expect(grid.findAllComponents(DinnerModeSelector).some(selector => selector.props('ghost'))).toBe(true)
        expect(plain.find('[data-testid="dinner-mode-legend-waitlist"]').exists()).toBe(false)
    })
})
