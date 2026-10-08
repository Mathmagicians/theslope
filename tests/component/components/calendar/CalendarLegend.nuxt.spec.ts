// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import CalendarLegend from '~/components/calendar/CalendarLegend.vue'
import type {CalendarLegendItem} from '~/components/calendar/CalendarLegend.vue'
import {mountWithTooltipProvider, findAllByTestId, findByTestId} from '~~/tests/component/testHelpers'

/**
 * The one legend every calendar renders: a row per item, and the item's kind decides the
 * sample on the left - a day circle, that circle wrapped in a chip, or a team badge. The
 * classes below are the spec's own inputs; the spec asserts that each kind binds what it is
 * given, never what a design-system token is worth.
 */
describe('CalendarLegend', () => {
    const items: CalendarLegendItem[] = [
        {label: 'Planlagt fællesspisning', kind: 'circle', circleClass: ['circle-planned']},
        {label: 'Ledige billetter', kind: 'chip', chipColor: 'yellow', circleClass: ['circle-future'], showCount: true},
        {label: 'Lukket for framelding', kind: 'chip', chipColor: 'error', circleClass: ['circle-future']},
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

    it('a chip item wraps its day circle in a chip, counting only when asked', async () => {
        const wrapper = await mount()
        const entries = findAllByTestId(wrapper, 'calendar-legend-entry')
        // UChip passes attrs through to the slot, so the indicator is reached by its slot name
        const chipIndicator = (entry: NonNullable<typeof entries[number]>) => entry.find('[data-slot="base"]')
        expect(entries[1]!.find('.circle-future').exists()).toBe(true)
        expect(chipIndicator(entries[1]!).text()).toBe('1')
        expect(entries[2]!.find('.circle-future').exists()).toBe(true)
        expect(chipIndicator(entries[2]!).text()).toBe('')
    })

    it('a badge item renders the badge with its band', async () => {
        const wrapper = await mount()
        expect(findByTestId(wrapper, 'calendar-legend-badge').classes()).toContain('band-one')
    })

})
