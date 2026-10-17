// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {h} from 'vue'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import CalendarLegend from '~/components/calendar/CalendarLegend.vue'
import type {CalendarLegendItem} from '~/components/calendar/CalendarLegend.vue'
import {mountWithTooltipProvider, findAllByTestId, findByTestId, resetStores} from '~~/tests/component/testHelpers'
import {ICONS} from '~/composables/useTheSlopeDesignSystem'

enableAutoUnmount(afterEach)

/**
 * The one legend every calendar renders: a row per item, and the item's kind decides the
 * sample on the left - a day circle, that circle wrapped in a chip, or a team badge. The
 * classes below are the spec's own inputs; the spec asserts that each kind binds what it is
 * given, never what a design-system token is worth.
 */
describe('CalendarLegend', () => {
    const chips = [
        {label: 'Ledige billetter', kind: 'chip', chipColor: 'yellow', circleClass: ['circle-future'], count: '1'},
        {label: 'Venteliste, ingen ledige billetter', kind: 'chip', chipColor: 'yellow', circleClass: ['circle-future'], icon: ICONS.waitlist},
        {label: 'Lukket for framelding', kind: 'chip', chipColor: 'error', circleClass: ['circle-future']}
    ] satisfies CalendarLegendItem[]
    const items: CalendarLegendItem[] = [
        {label: 'Planlagt fællesspisning', kind: 'circle', circleClass: ['circle-planned']},
        ...chips,
        {label: 'Madhold 1', kind: 'badge', badgeClass: 'band-one'}
    ]

    beforeEach(() => {
        resetStores()
    })

    it('is the Forklaring panel with one entry per item, each kind rendering its sample: the day circle, the chip around it, the badge with its band', async () => {
        const wrapper = await mountWithTooltipProvider(CalendarLegend, {props: {items}, isMd: true})

        expect(findByTestId(wrapper, 'calendar-legend').text()).toContain('Forklaring')
        const entries = findAllByTestId(wrapper, 'calendar-legend-entry')
        expect(entries).toHaveLength(items.length)
        items.forEach((item, index) => expect(entries[index]!.text()).toContain(item.label))

        expect(findByTestId(wrapper, 'calendar-legend-circle').classes()).toContain('circle-planned')
        expect(findByTestId(wrapper, 'calendar-legend-badge').classes()).toContain('band-one')

        // Each chip wraps its day circle in a chip reading its count, with its glyph
        chips.forEach(chip => {
            const entry = entries.find(candidate => candidate.text().includes(chip.label))!
            expect(entry.find('.circle-future').exists(), chip.label).toBe(true)
            // UChip passes attrs through to the slot, so the indicator is reached by its slot name
            const indicator = entry.find('[data-slot="base"]')
            expect(indicator.text(), chip.label).toBe('count' in chip ? chip.count : '')
            expect(wrapper.findAllComponents({name: 'UIcon'}).filter(icon => indicator.element.contains(icon.element)).map(icon => icon.props('name')), chip.label)
                .toEqual('icon' in chip ? [chip.icon] : [])
        })
    })

    it('hosts own entries in the default slot and the hint under them', async () => {
        const wrapper = await mountSuspended(CalendarLegend, {
            props: {hint: 'Klik på en celle'},
            slots: {default: () => h('span', {'data-testid': 'own-entry'}, 'Egen')}
        })
        expect(findByTestId(wrapper, 'own-entry').text()).toBe('Egen')
        expect(findAllByTestId(wrapper, 'calendar-legend-entry')).toHaveLength(0)
        expect(findByTestId(wrapper, 'calendar-legend').text()).toContain('Klik på en celle')
    })
})
