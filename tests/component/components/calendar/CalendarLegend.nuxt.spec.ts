// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {h} from 'vue'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import CalendarLegend from '~/components/calendar/CalendarLegend.vue'
import type {CalendarLegendItem} from '~/components/calendar/CalendarLegend.vue'
import {mountWithTooltipProvider, findAllByTestId, findByTestId} from '~~/tests/component/testHelpers'
import {ICONS} from '~/composables/useTheSlopeDesignSystem'

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

    const mount = () => mountWithTooltipProvider(CalendarLegend, {
        props: {items},
        isMd: true
    })

    it('is the Forklaring panel', async () => {
        const wrapper = await mount()
        expect(findByTestId(wrapper, 'calendar-legend').text()).toContain('Forklaring')
    })

    it('renders one entry per item, with its label', async () => {
        const wrapper = await mount()
        const entries = findAllByTestId(wrapper, 'calendar-legend-entry')
        expect(entries).toHaveLength(items.length)
        items.forEach((item, index) => expect(entries[index]!.text()).toContain(item.label))
    })

    it('a circle item renders its day circle', async () => {
        const wrapper = await mount()
        expect(findByTestId(wrapper, 'calendar-legend-circle').classes()).toContain('circle-planned')
    })

    it.each(chips.map(chip => ({label: chip.label, text: 'count' in chip ? chip.count : '', glyphs: 'icon' in chip ? [chip.icon] : []})))(
        'the chip item "$label" wraps its day circle in a chip reading "$text" with the glyphs $glyphs', async ({label, text, glyphs}) => {
            const wrapper = await mount()
            const entry = findAllByTestId(wrapper, 'calendar-legend-entry').find(candidate => candidate.text().includes(label))!
            expect(entry.find('.circle-future').exists()).toBe(true)
            // UChip passes attrs through to the slot, so the indicator is reached by its slot name
            const chip = entry.find('[data-slot="base"]')
            expect(chip.text()).toBe(text)
            expect(wrapper.findAllComponents({name: 'UIcon'}).filter(icon => chip.element.contains(icon.element)).map(icon => icon.props('name'))).toEqual(glyphs)
        })

    it('a badge item renders the badge with its band', async () => {
        const wrapper = await mount()
        expect(findByTestId(wrapper, 'calendar-legend-badge').classes()).toContain('band-one')
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
