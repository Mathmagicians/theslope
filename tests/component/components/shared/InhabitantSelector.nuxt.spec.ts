// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import InhabitantSelector from '~/components/shared/InhabitantSelector.vue'
import {nextTick, ref, h, type VNodeChild} from 'vue'
import type {InhabitantDisplay} from '~/composables/useCoreValidation'
import {mountWithTooltipProvider, resetStores, findLoadingRow, findOpenRows, clickByTestId} from '~~/tests/component/testHelpers'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'

enableAutoUnmount(afterEach)

describe('InhabitantSelector', () => {

    const makeInhabitant = (id: number, name: string, lastName: string): InhabitantDisplay =>
        ({...HouseholdFactory.defaultInhabitantData(`inhabitant-selector-${id}`), id, name, lastName})

    const inhabitants: InhabitantDisplay[] = [
        makeInhabitant(1, 'Anna', 'Hansen'),
        makeInhabitant(2, 'Bo', 'Jensen'),
        makeInhabitant(3, 'Carl', 'Larsen')
    ]

    const dummySortFn = (a: {original: InhabitantDisplay}, b: {original: InhabitantDisplay}) =>
        a.original.name.localeCompare(b.original.name)

    beforeEach(() => {
        resetStores()
    })

    const mount = (overrides: Record<string, unknown> = {}) =>
        mountWithTooltipProvider(InhabitantSelector, {props: {inhabitants, ...overrides}, isMd: true})
    // The row the slots receive: the inhabitant, and the toggle of its expanded row
    type SlotRow = {original: InhabitantDisplay, toggleExpanded: () => void}
    // Slots go through the root mount alone
    const mountWithSlots = (slots: Record<string, (props: {row: SlotRow}) => VNodeChild>, props: Record<string, unknown> = {inhabitants}) =>
        mountSuspended(InhabitantSelector, {props, global: {provide: {isMd: ref(true)}}, slots})

    const typeSearch = async (wrapper: Awaited<ReturnType<typeof mount>>, query: string) => {
        await wrapper.find('input').setValue(query)
        await nextTick()
    }

    // ========== RENDERING ==========

    it('renders every inhabitant under the default headers, with the default search placeholder', async () => {
        const wrapper = await mount()
        const text = wrapper.text()
        inhabitants.forEach(i => expect(text).toContain(`${i.name} ${i.lastName}`))
        expect(text).toContain('Status')
        expect(text).toContain('Handling')
        expect(wrapper.find('input').attributes('placeholder')).toContain('Søg efter navn')
    })

    it('renders the given status and actions headers', async () => {
        const wrapper = await mount({statusHeader: 'Husstand', actionsHeader: 'Flyt'})
        expect(wrapper.text()).toContain('Husstand')
        expect(wrapper.text()).toContain('Flyt')
    })

    // ========== SEARCH ==========

    it.each([
        ['larsen', ['Carl Larsen'], ['Anna Hansen', 'Bo Jensen']],
        ['ANNA', ['Anna Hansen'], ['Bo Jensen']]
    ])('search "%s" shows %j and hides %j', async (query, visible, hidden) => {
        const wrapper = await mount()
        await typeSearch(wrapper, query)
        const text = wrapper.text()
        visible.forEach(name => expect(text).toContain(name))
        hidden.forEach(name => expect(text).not.toContain(name))
    })

    // ========== EMPTY STATE ==========

    // The table's own empty text renders through UTable's #empty slot
    it.each([
        ['no inhabitants', [], undefined, 'Ingen beboere tilgængelige'],
        ['search yields no results', inhabitants, 'zzz-no-match', 'Ingen beboere fundet']
    ])('empty state: %s shows the empty text instead of inhabitant names', async (_, data, searchQuery, emptyText) => {
        const wrapper = await mount({inhabitants: data})
        if (searchQuery) await typeSearch(wrapper, searchQuery)
        expect(wrapper.text()).toContain(emptyText)
        inhabitants.forEach(i =>
            expect(wrapper.text()).not.toContain(`${i.name} ${i.lastName}`)
        )
    })

    // Until the inhabitants answer, the table's loading row stands where the empty text would
    it.each([
        {loading: true, loadingRow: true, emptyText: false},
        {loading: false, loadingRow: false, emptyText: true}
    ])('GIVEN no inhabitants yet and loading=$loading THEN the loading row shows: $loadingRow, the empty text: $emptyText', async ({loading, loadingRow, emptyText}) => {
        const wrapper = await mount({inhabitants: [], loading})
        expect(findLoadingRow(wrapper).exists()).toBe(loadingRow)
        expect(wrapper.text().includes('Henter beboere...')).toBe(loadingRow)
        expect(wrapper.text().includes('Ingen beboere tilgængelige')).toBe(emptyText)
    })

    // ========== SORT TOGGLE ==========

    it('sort button hidden when no sortFn', async () => {
        const wrapper = await mount()
        expect(wrapper.find('[name="sort-by-status"]').exists()).toBe(false)
    })

    it('sort button visible when sortFn provided, displaying the statusHeader text', async () => {
        const wrapper = await mount({sortFn: dummySortFn, statusHeader: 'Husstand'})
        expect(wrapper.find('[name="sort-by-status"]').text()).toContain('Husstand')
    })

    // ========== SCOPED SLOTS ==========

    it.each([
        ['status'],
        ['actions']
    ])('#%s slot renders per row', async (slotName) => {
        const wrapper = await mountWithSlots({
            [slotName]: ({row}: {row: {original: InhabitantDisplay}}) =>
                `slot-${slotName}-${row.original.id}`
        })
        const text = wrapper.text()
        inhabitants.forEach(i =>
            expect(text).toContain(`slot-${slotName}-${i.id}`)
        )
    })

    // ========== EXPANDED ROW ==========

    // The parent opens a row through the row its #actions slot receives
    it('GIVEN Bo\'s row open WHEN an inhabitant arrives above it THEN the #expanded slot stays under Bo\'s row', async () => {
        const [anna, bo, carl] = inhabitants
        const wrapper = await mountWithSlots({
            actions: ({row}) => h('button', {'data-testid': `open-${row.original.id}`, onClick: () => row.toggleExpanded()}),
            expanded: ({row}) => `detail-${row.original.id}`
        }, {inhabitants: [bo, carl]})
        await clickByTestId(wrapper, `open-${bo!.id}`)

        await wrapper.setProps({inhabitants: [anna, bo, carl]})

        const open = findOpenRows(wrapper)
        expect(open.map(({row}) => row.text())).toEqual([expect.stringContaining(`${bo!.name} ${bo!.lastName}`)])
        expect(open[0]!.detail.text()).toBe(`detail-${bo!.id}`)
    })

    // ========== PAGINATION ==========

    it.each([
        ['5 items, pageSize 3: page 1 shows first 3', 5, 3, 'Person1', 'Person4'],
        ['9 items, default pageSize 8: page 1 shows first 8', 9, undefined, 'Person1', 'Person9']
    ])('%s', async (_, count, pageSize, shouldContain, shouldNotContain) => {
        const data = Array.from({length: count}, (_, i) => makeInhabitant(i + 1, `Person${i + 1}`, 'Test'))
        const wrapper = await mount({inhabitants: data, ...(pageSize ? {pageSize} : {})})
        const text = wrapper.text()
        expect(text).toContain(shouldContain)
        expect(text).not.toContain(shouldNotContain)
    })
})
