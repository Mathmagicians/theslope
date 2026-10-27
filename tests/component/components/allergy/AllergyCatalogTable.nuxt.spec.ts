// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {enableAutoUnmount} from '@vue/test-utils'
import {mountWithTooltipProvider, findByTestId, findAllByTestId, resetStores, findLoadingRow, findOpenRows} from '~~/tests/component/testHelpers'
import {nextTick, h, defineComponent, shallowReactive} from 'vue'
import AllergyCatalogTable from '~/components/allergy/AllergyCatalogTable.vue'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {rowIdOf} from '~/utils/utils'
import {ALLERGY_TEST_IDS} from './allergyTestIds'

const mockAllergyTypes = AllergyFactory.createMockAllergyTypesWithInhabitants()

enableAutoUnmount(afterEach)

beforeEach(() => {
    resetStores()
})

// One shared master table for the allergy catalog:
// - single mode: row click emits the id (AdminAllergies master)
// - multi mode: checkboxes emit id[] (AllergenMultiSelector / compare)
// It forwards UTable's expanded model + #expanded slot so the detail panel
// can dock under the selected row on mobile.
// A host renders the table, so the cases hand it slots; the wrapper is the host's
const mountTable = async (props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) => {
    const wrapper = await mountWithTooltipProvider(defineComponent({
        components: {AllergyCatalogTable},
        setup: () => ({props, slots}),
        render() {
            return h(AllergyCatalogTable, {
                allergyTypes: mockAllergyTypes,
                mode: 'single',
                ...props
            }, slots)
        }
    }), {isMd: false})
    await nextTick()
    return wrapper
}

type Wrapper = Awaited<ReturnType<typeof mountTable>>

const clickName = async (wrapper: Wrapper, name: string) => {
    const cell = wrapper.findAll('[data-testid^="allergy-row-"]').find(c => c.text().includes(name))
    await cell!.trigger('click')
    await nextTick()
}

describe('AllergyCatalogTable', () => {
    describe.each(['single', 'multi'] as const)('%s mode', (mode) => {
        it.each([
            {showNewBadge: true, expected: true},
            {showNewBadge: false, expected: false}
        ])('renders every allergy type with count, and the new column with showNewBadge=$showNewBadge', async ({showNewBadge, expected}) => {
            const wrapper = await mountTable({mode, showNewBadge})

            const html = wrapper.html()
            mockAllergyTypes.forEach(at => {
                expect(html).toContain(at.name)
            })
            expect(html).toContain('Antal')
            expect(html.includes('Nyt')).toBe(expected)
        })
    })

    describe('single mode selection', () => {
        it('renders no checkboxes and emits the clicked row id', async () => {
            const wrapper = await mountTable({mode: 'single'})
            expect(wrapper.find('[role="checkbox"]').exists()).toBe(false)

            await clickName(wrapper, 'Jordnødder')

            const table = wrapper.findComponent(AllergyCatalogTable)
            const emitted = table.emitted('update:modelValue')
            expect(emitted?.at(-1)).toEqual([2])
        })

        it('highlights the selected row', async () => {
            const wrapper = await mountTable({mode: 'single', modelValue: 2})

            const selected = wrapper.findAll('[data-selected="true"]')
            expect(selected.length).toBeGreaterThan(0)
            expect(selected[0]!.text()).toContain('Jordnødder')
        })
    })

    describe('multi mode selection', () => {
        it('renders a checkbox per row and emits the toggled id added to the selection', async () => {
            const wrapper = await mountTable({mode: 'multi', modelValue: [1]})
            expect(wrapper.findAll('[role="checkbox"]')).toHaveLength(mockAllergyTypes.length)

            await clickName(wrapper, 'Gluten')

            const table = wrapper.findComponent(AllergyCatalogTable)
            const emitted = table.emitted('update:modelValue')
            expect(emitted?.at(-1)).toEqual([[1, 3]])
        })

        it('emits the toggled id removed from the selection', async () => {
            const wrapper = await mountTable({mode: 'multi', modelValue: [1, 3]})

            await clickName(wrapper, 'Gluten')

            const table = wrapper.findComponent(AllergyCatalogTable)
            const emitted = table.emitted('update:modelValue')
            expect(emitted?.at(-1)).toEqual([[1]])
        })

        it('emits nothing when readonly', async () => {
            const wrapper = await mountTable({mode: 'multi', modelValue: [], readonly: true})

            await clickName(wrapper, 'Gluten')

            const table = wrapper.findComponent(AllergyCatalogTable)
            expect(table.emitted('update:modelValue')).toBeFalsy()
        })
    })

    describe('expanded slot forwarding', () => {
        const [milk, peanuts, gluten] = mockAllergyTypes

        // The expanded model is keyed by the row's id (rowIdOf); Jordnødder's id differs from its row's position
        it.each([
            {when: 'as mounted', mounted: mockAllergyTypes},
            {when: 'after a type arrives above its row', mounted: [peanuts!, gluten!]}
        ])('GIVEN the expanded model keyed by Jordnødder\'s id THEN the #expanded slot renders under Jordnødder\'s row only, $when', async ({mounted}) => {
            const props = shallowReactive<Record<string, unknown>>({mode: 'single', modelValue: peanuts!.id, allergyTypes: mounted, expanded: {[rowIdOf(peanuts!)]: true}})
            const wrapper = await mountTable(props, {expanded: () => h('div', {'data-testid': 'docked-detail'})})

            props.allergyTypes = [milk!, peanuts!, gluten!]
            await nextTick()

            const open = findOpenRows(wrapper)
            expect(open.map(({row}) => findByTestId(row, ALLERGY_TEST_IDS.row(peanuts!.id)).exists())).toEqual([true])
            expect(findAllByTestId(open[0]!.detail, 'docked-detail')).toHaveLength(1)
        })

        it('renders no expanded content when nothing is expanded', async () => {
            const wrapper = await mountTable(
                {mode: 'single', expanded: {}},
                {expanded: () => h('div', {'data-testid': 'docked-detail'})}
            )

            expect(findByTestId(wrapper, 'docked-detail').exists()).toBe(false)
        })
    })

    // The consumer owns the empty state (AdminAllergies shows a create CTA);
    // the table forwards it to UTable's #empty slot
    describe('empty slot forwarding', () => {
        const emptySlot = {empty: () => h('div', {'data-testid': 'catalog-empty'}, 'INTET KATALOG')}

        it.each([
            {when: 'there are no allergy types', allergyTypes: [], expected: true},
            {when: 'rows exist', allergyTypes: mockAllergyTypes, expected: false}
        ])('renders the #empty slot when $when', async ({allergyTypes, expected}) => {
            const wrapper = await mountTable({mode: 'single', allergyTypes}, emptySlot)

            expect(findByTestId(wrapper, 'catalog-empty').exists()).toBe(expected)
        })

        // Until the catalog answers, the loading row stands where the consumer's empty state would
        it.each([
            {loading: true, loadingRow: true, empty: false},
            {loading: false, loadingRow: false, empty: true}
        ])('GIVEN no allergy types yet and loading=$loading THEN the loading row shows: $loadingRow, the #empty slot: $empty', async ({loading, loadingRow, empty}) => {
            const wrapper = await mountTable({mode: 'single', allergyTypes: [], loading}, emptySlot)

            expect(findLoadingRow(wrapper).exists()).toBe(loadingRow)
            expect(wrapper.text().includes('Henter allergier...')).toBe(loadingRow)
            expect(findByTestId(wrapper, 'catalog-empty').exists()).toBe(empty)
        })
    })
})
