// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import InhabitantSelector from '~/components/shared/InhabitantSelector.vue'
import {nextTick, ref} from 'vue'
import type {InhabitantDisplay} from '~/composables/useCoreValidation'

describe('InhabitantSelector', () => {

    const makeInhabitant = (id: number, name: string, lastName: string): InhabitantDisplay => ({
        id, heynaboId: id * 10, householdId: 1, name, lastName,
        pictureUrl: null, birthDate: null, dinnerPreferences: null
    })

    const inhabitants: InhabitantDisplay[] = [
        makeInhabitant(1, 'Anna', 'Hansen'),
        makeInhabitant(2, 'Bo', 'Jensen'),
        makeInhabitant(3, 'Carl', 'Larsen')
    ]

    const dummySortFn = (a: {original: InhabitantDisplay}, b: {original: InhabitantDisplay}) =>
        a.original.name.localeCompare(b.original.name)

    const mount = (overrides: Record<string, unknown> = {}, slots?: Record<string, (props: {row: {original: InhabitantDisplay}}) => string>) =>
        mountSuspended(InhabitantSelector, {
            props: {inhabitants, ...overrides},
            global: {provide: {isMd: ref(true)}},
            ...(slots ? {slots} : {})
        })

    const typeSearch = async (wrapper: Awaited<ReturnType<typeof mount>>, query: string) => {
        await wrapper.find('input').setValue(query)
        await nextTick()
    }

    // ========== RENDERING ==========

    it.each([
        ['Anna Hansen'], ['Bo Jensen'], ['Carl Larsen']
    ])('renders inhabitant %s', async ([name]) => {
        const wrapper = await mount()
        expect(wrapper.text()).toContain(name)
    })

    it.each([
        ['statusHeader', 'Husstand', 'Husstand'],
        ['actionsHeader', 'Flyt', 'Flyt'],
        ['statusHeader', undefined, 'Status'],
        ['actionsHeader', undefined, 'Handling']
    ])('header %s=%s renders as "%s"', async (prop, value, expected) => {
        const wrapper = await mount(value !== undefined ? {[prop]: value} : {})
        expect(wrapper.text()).toContain(expected)
    })

    // ========== SEARCH ==========

    it.each([
        ['anna', ['Anna Hansen'], ['Bo Jensen', 'Carl Larsen']],
        ['larsen', ['Carl Larsen'], ['Anna Hansen', 'Bo Jensen']],
        ['ANNA', ['Anna Hansen'], ['Bo Jensen']],
        ['zzz', [], ['Anna Hansen', 'Bo Jensen', 'Carl Larsen']]
    ])('search "%s" shows %j and hides %j', async (query, visible, hidden) => {
        const wrapper = await mount()
        await typeSearch(wrapper, query)
        const text = wrapper.text()
        visible.forEach(name => expect(text).toContain(name))
        hidden.forEach(name => expect(text).not.toContain(name))
    })

    it.each([
        ['default', undefined, 'Søg efter navn'],
        ['custom', 'Find beboer...', 'Find beboer...']
    ])('search placeholder %s', async (_, placeholder, expected) => {
        const wrapper = await mount(placeholder ? {searchPlaceholder: placeholder} : {})
        expect(wrapper.find('input').attributes('placeholder')).toContain(expected)
    })

    // ========== EMPTY STATE ==========

    it.each([
        ['no inhabitants', [], undefined],
        ['search yields no results', inhabitants, 'zzz-no-match']
    ])('empty state: %s shows no inhabitant names', async (_, data, searchQuery) => {
        const wrapper = await mount({inhabitants: data})
        if (searchQuery) await typeSearch(wrapper, searchQuery)
        inhabitants.forEach(i =>
            expect(wrapper.text()).not.toContain(`${i.name} ${i.lastName}`)
        )
    })

    // ========== SORT TOGGLE ==========

    it.each([
        ['hidden when no sortFn', undefined, false],
        ['visible when sortFn provided', dummySortFn, true]
    ])('sort button %s', async (_, sortFn, shouldExist) => {
        const wrapper = await mount(sortFn ? {sortFn} : {})
        expect(wrapper.find('[name="sort-by-status"]').exists()).toBe(shouldExist)
    })

    it('sort button displays statusHeader text', async () => {
        const wrapper = await mount({sortFn: dummySortFn, statusHeader: 'Husstand'})
        expect(wrapper.find('[name="sort-by-status"]').text()).toContain('Husstand')
    })

    // ========== SCOPED SLOTS ==========

    it.each([
        ['status'],
        ['actions']
    ])('#%s slot renders per row', async (slotName) => {
        const wrapper = await mount({}, {
            [slotName]: ({row}: {row: {original: InhabitantDisplay}}) =>
                `slot-${slotName}-${row.original.id}`
        })
        const text = wrapper.text()
        inhabitants.forEach(i =>
            expect(text).toContain(`slot-${slotName}-${i.id}`)
        )
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
