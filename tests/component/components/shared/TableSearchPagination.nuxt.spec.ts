// @vitest-environment nuxt
import {describe, it, expect, vi} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import TableSearchPagination from '~/components/shared/TableSearchPagination.vue'
import {nextTick} from 'vue'

describe('TableSearchPagination', () => {

    // Factory for mock TanStack Table API
    const createMockTable = (rowCount: number, pageSize = 10, pageIndex = 0) => ({
        tableApi: {
            getFilteredRowModel: () => ({rows: Array(rowCount).fill({})}),
            getState: () => ({pagination: {pageIndex, pageSize}}),
            setPageIndex: vi.fn()
        }
    })

    const defaultPagination = {pageIndex: 0, pageSize: 10}

    // Mounting helper - reduces boilerplate
    const mount = (overrides: Record<string, unknown> = {}) =>
        mountSuspended(TableSearchPagination, {
            props: {table: createMockTable(5), pagination: defaultPagination, ...overrides}
        })

    describe('search input', () => {
        it('renders with placeholder containing Søg', async () => {
            const wrapper = await mount()
            expect(wrapper.find('input').attributes('placeholder')).toContain('Søg')
        })

        it('emits update:searchQuery when typing', async () => {
            const wrapper = await mount()
            await wrapper.find('input').setValue('test')
            await nextTick()
            expect(wrapper.emitted('update:searchQuery')).toBeTruthy()
        })

        it('applies custom testId', async () => {
            const wrapper = await mount({testId: 'user-search'})
            expect(wrapper.find('[data-testid="user-search"]').exists()).toBe(true)
        })
    })

    describe('sort toggle', () => {
        it.each([
            {sortLabel: undefined, shouldExist: false, desc: 'hidden when no label'},
            {sortLabel: 'Navn', shouldExist: true, desc: 'visible when label provided'}
        ])('$desc', async ({sortLabel, shouldExist}) => {
            const wrapper = await mount({sortLabel})
            expect(wrapper.find('[data-testid="sort-toggle"]').exists()).toBe(shouldExist)
        })

        it('emits update:sortDescending on click', async () => {
            const wrapper = await mount({sortLabel: 'Navn', sortDescending: false})
            await wrapper.find('[data-testid="sort-toggle"]').trigger('click')
            await nextTick()
            expect(wrapper.emitted('update:sortDescending')).toBeTruthy()
        })
    })

    describe('pagination visibility', () => {
        it.each([
            {rowCount: 5, pageSize: 10, shouldShow: false, desc: 'hidden when rows fit'},
            {rowCount: 25, pageSize: 10, shouldShow: true, desc: 'visible when rows exceed page'}
        ])('$desc', async ({rowCount, pageSize, shouldShow}) => {
            const wrapper = await mountSuspended(TableSearchPagination, {
                props: {table: createMockTable(rowCount, pageSize), pagination: {pageIndex: 0, pageSize}}
            })
            expect(wrapper.findComponent({name: 'UPagination'}).exists()).toBe(shouldShow)
        })
    })

    it('handles null table gracefully', async () => {
        const wrapper = await mount({table: null})
        expect(wrapper.find('input').exists()).toBe(true)
    })
})
