// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {h} from 'vue'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import CalendarLegend from '~/components/calendar/CalendarLegend.vue'
import {LEGEND_KIND, type CalendarLegendItem} from '~/components/calendar/CalendarLegend.vue'
import {mountWithTooltipProvider, findAllByTestId, findByTestId, resetStores, iconNamesIn, itemAt} from '~~/tests/component/testHelpers'
import {COLOR, COMPONENTS, ICONS} from '~/composables/useTheSlopeDesignSystem'
import {DATE_WORDS} from '~/config/dateWords'

enableAutoUnmount(afterEach)

/**
 * The one legend every calendar renders: a row per item, and the item's kind decides the
 * sample on the left - a day circle, that circle wrapped in a chip, or a team badge. The
 * classes below are the spec's own inputs; the spec asserts that each kind binds what it is
 * given, never what a design-system token is worth.
 */
describe('CalendarLegend', () => {
    const chips = [
        {label: 'Ledige billetter', kind: LEGEND_KIND.chip, chipColor: COLOR.yellow, circleClass: ['circle-future'], count: '1'},
        {label: 'Venteliste, ingen ledige billetter', kind: LEGEND_KIND.chip, chipColor: COLOR.yellow, circleClass: ['circle-future'], icon: ICONS.waitlist},
        {label: 'Lukket for framelding', kind: LEGEND_KIND.chip, chipColor: COLOR.error, circleClass: ['circle-future']}
    ] satisfies CalendarLegendItem[]
    const items: CalendarLegendItem[] = [
        {label: 'Planlagt fællesspisning', kind: LEGEND_KIND.circle, circleClass: ['circle-planned']},
        ...chips,
        {label: 'Madhold 1', kind: LEGEND_KIND.badge, badgeClass: 'band-one'}
    ]
    const HINT = 'Klik på en celle'

    beforeEach(() => {
        resetStores()
    })

    it('is the Forklaring panel with one entry per item, each kind rendering its sample: the day circle, the chip around it, the badge with its band', async () => {
        const wrapper = await mountWithTooltipProvider(CalendarLegend, {props: {items}, isMd: true})

        expect(findByTestId(wrapper, 'calendar-legend').text()).toContain(DATE_WORDS.calendarLegend.title)
        const entries = findAllByTestId(wrapper, 'calendar-legend-entry')
        expect(entries).toHaveLength(items.length)
        items.forEach((item, index) => expect(itemAt(entries, index).text()).toContain(item.label))

        expect(findByTestId(wrapper, 'calendar-legend-circle').classes()).toContain('circle-planned')
        expect(findByTestId(wrapper, 'calendar-legend-badge').classes()).toContain('band-one')

        // Each chip wraps its day circle in a chip reading its count, with its glyph
        chips.forEach(chip => {
            const entry = entries.find(candidate => candidate.text().includes(chip.label))
            if (!entry) throw new Error(`No legend entry for ${chip.label}`)
            expect(entry.find('.circle-future').exists(), chip.label).toBe(true)
            // UChip passes attrs through to the slot, so the indicator is reached by its slot name
            const indicator = entry.find('[data-slot="base"]')
            expect(indicator.text(), chip.label).toBe(chip.count ?? '')
            expect(iconNamesIn(indicator), chip.label).toEqual(chip.icon ? [chip.icon] : [])
        })
    })

    it('stands every entry as a row of one list, the sample in the sample column and the name beside it: the items first, the slot\'s rows under them, the hint last', async () => {
        const wrapper = await mountSuspended(CalendarLegend, {
            props: {items, hint: HINT},
            slots: {default: () => [h('div', {'data-testid': 'own-entry'}, 'Egen'), h('div', {'data-testid': 'own-entry'}, 'Anden')]}
        })
        const list = findByTestId(wrapper, 'calendar-legend-list')
        const rows = Array.from(list.element.children)

        expect(list.classes()).toEqual(COMPONENTS.legend.list.split(' '))
        expect(rows.map(row => row.getAttribute('data-testid'))).toEqual([...items.map(() => 'calendar-legend-entry'), 'own-entry', 'own-entry'])
        expect(rows.slice(items.length).map(row => row.textContent)).toEqual(['Egen', 'Anden'])
        rows.slice(0, items.length).forEach((row, index) => {
            const cells = Array.from(row.children)
            expect(cells).toHaveLength(2)
            expect(Array.from(row.classList)).toEqual(COMPONENTS.legend.entry.split(' '))
            expect(Array.from(itemAt(cells, 0).classList)).toEqual(COMPONENTS.legend.sample.split(' '))
            expect(itemAt(cells, 1).textContent).toBe(itemAt(items, index).label)
        })
        expect(list.text()).not.toContain(HINT)
        expect(findByTestId(wrapper, 'calendar-legend').text().trim().endsWith(HINT)).toBe(true)
    })

    it('hosts own entries in the default slot and the hint under them', async () => {
        const wrapper = await mountSuspended(CalendarLegend, {
            props: {hint: HINT},
            slots: {default: () => h('span', {'data-testid': 'own-entry'}, 'Egen')}
        })
        expect(findByTestId(wrapper, 'own-entry').text()).toBe('Egen')
        expect(findAllByTestId(wrapper, 'calendar-legend-entry')).toHaveLength(0)
        expect(findByTestId(wrapper, 'calendar-legend').text()).toContain(HINT)
    })
})
