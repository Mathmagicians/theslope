// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {ref, nextTick, h, defineComponent} from 'vue'
import AllergyCatalogTable from '~/components/allergy/AllergyCatalogTable.vue'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'

const mockAllergyTypes = AllergyFactory.createMockAllergyTypesWithInhabitants()

// One shared master table for the allergy catalog (bug-fix doc D1):
// - single mode: row click emits the id (AdminAllergies master)
// - multi mode: checkboxes emit id[] (AllergenMultiSelector / compare)
// It forwards UTable's expanded model + #expanded slot so the detail panel
// can dock under the selected row on mobile.
const mountTable = async (props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) => {
    const wrapper = await mountSuspended(defineComponent({
        components: {AllergyCatalogTable},
        setup: () => ({props, slots}),
        render() {
            return h(AllergyCatalogTable, {
                allergyTypes: mockAllergyTypes,
                mode: 'single',
                ...props
            }, slots)
        }
    }), {
        global: {provide: {isMd: ref(false)}}
    })
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
        it('renders every allergy type with count', async () => {
            const wrapper = await mountTable({mode})

            const html = wrapper.html()
            mockAllergyTypes.forEach(at => {
                expect(html).toContain(at.name)
            })
            expect(html).toContain('Antal')
        })

        it.each([
            {showNewBadge: true, expected: true},
            {showNewBadge: false, expected: false}
        ])('new column with showNewBadge=$showNewBadge', async ({showNewBadge, expected}) => {
            const wrapper = await mountTable({mode, showNewBadge})

            expect(wrapper.html().includes('Nyt')).toBe(expected)
        })
    })

    describe('single mode selection', () => {
        it('emits the clicked row id', async () => {
            const wrapper = await mountTable({mode: 'single'})

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

        it('renders no checkboxes', async () => {
            const wrapper = await mountTable({mode: 'single'})

            expect(wrapper.find('[role="checkbox"]').exists()).toBe(false)
        })
    })

    describe('multi mode selection', () => {
        it('renders a checkbox per row', async () => {
            const wrapper = await mountTable({mode: 'multi', modelValue: []})

            expect(wrapper.findAll('[role="checkbox"]')).toHaveLength(mockAllergyTypes.length)
        })

        it('emits the toggled id added to the selection', async () => {
            const wrapper = await mountTable({mode: 'multi', modelValue: [1]})

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
        it('renders the #expanded slot for the expanded row only', async () => {
            const wrapper = await mountTable(
                {mode: 'single', modelValue: 2, expanded: {1: true}},
                {expanded: () => h('div', {'data-testid': 'docked-detail'}, 'DETAIL HERE')}
            )

            expect(wrapper.findAll('[data-testid="docked-detail"]')).toHaveLength(1)
        })

        it('renders no expanded content when nothing is expanded', async () => {
            const wrapper = await mountTable(
                {mode: 'single', expanded: {}},
                {expanded: () => h('div', {'data-testid': 'docked-detail'})}
            )

            expect(wrapper.find('[data-testid="docked-detail"]').exists()).toBe(false)
        })
    })
})
