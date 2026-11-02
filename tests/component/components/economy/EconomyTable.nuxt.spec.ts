// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {mountWithTooltipProvider, findByTestId, resetStores, findLoadingRow, isTableLoading, itemAt} from '~~/tests/component/testHelpers'
import EconomyTableGeneric from '~/components/economy/EconomyTable.vue'
import {h, nextTick, ref, type DefineComponent} from 'vue'
import type {Row} from '@tanstack/vue-table'
import {rowIdOf} from '~/utils/utils'

// A generic component's type is a function; the mount helper keys on a constructor
const EconomyTable = EconomyTableGeneric as unknown as DefineComponent

enableAutoUnmount(afterEach)

interface TestRow {
    id: number
    date: Date
    menuTitle: string
    totalAmount: number
}

// Component instance type for vm access
interface EconomyTableVm {
    filteredData: TestRow[]
    showPagination: boolean
    pagination: { pageIndex: number; pageSize: number }
    currentPage: number
    handlePageChange: (page: number) => void
}

describe('EconomyTable', () => {
    // Test data with dates
    const createTestData = (): TestRow[] => [
        {id: 1, date: new Date(2025, 0, 15), menuTitle: 'Pasta', totalAmount: 100},
        {id: 2, date: new Date(2025, 0, 10), menuTitle: 'Pizza', totalAmount: 200},
        {id: 3, date: new Date(2025, 0, 20), menuTitle: 'Salad', totalAmount: 150},
        {id: 4, date: new Date(2025, 1, 5), menuTitle: 'Soup', totalAmount: 80},
        {id: 5, date: new Date(2025, 1, 10), menuTitle: 'Steak', totalAmount: 250},
        {id: 6, date: new Date(2025, 1, 15), menuTitle: 'Fish', totalAmount: 180}
    ]

    const defaultColumns = [
        {id: 'expand'},
        {accessorKey: 'date', header: 'Dato'},
        {accessorKey: 'menuTitle', header: 'Menu'},
        {accessorKey: 'totalAmount', header: 'Beløb'}
    ]

    const dateAccessor = (item: TestRow) => item.date

    beforeEach(() => {
        resetStores()
    })

    const createWrapper = (props: Record<string, unknown> = {}) => mountWithTooltipProvider(EconomyTable, {
        props: {data: createTestData(), columns: defaultColumns, getRowId: rowIdOf, dateAccessor, pageSize: 5, ...props},
        isMd: true
    })

    type WrapperType = Awaited<ReturnType<typeof createWrapper>>

    const vmOf = (wrapper: WrapperType) => wrapper.vm as unknown as EconomyTableVm

    const getSearchInput = (wrapper: WrapperType) =>
        wrapper.find('input[type="text"]')

    const getSortButton = (wrapper: WrapperType) =>
        wrapper.find('button[aria-label="Skift sortering"]')

    describe('Rendering', () => {
        it('renders the search input and the sort toggle in the expand column header, and every row while the search is empty', async () => {
            const wrapper = await createWrapper()
            expect(getSearchInput(wrapper).exists()).toBe(true)
            expect(getSortButton(wrapper).exists()).toBe(true)
            const vm = vmOf(wrapper)
            expect(vm.filteredData.length).toBe(6)
        })

        it('renders custom search placeholder', async () => {
            const customPlaceholder = 'Søg måned...'
            const wrapper = await createWrapper({searchPlaceholder: customPlaceholder})
            const searchInput = wrapper.find('input[type="text"]')
            expect(searchInput.attributes('placeholder')).toBe(customPlaceholder)
        })
    })

    describe('Sorting', () => {
        it('sorts descending when defaultSortDesc=true', async () => {
            const wrapper = await createWrapper({defaultSortDesc: true})
            const vm = vmOf(wrapper)

            // First item should be latest date (Feb 15)
            expect(itemAt(vm.filteredData, 0).date.getDate()).toBe(15)
            expect(itemAt(vm.filteredData, 0).date.getMonth()).toBe(1) // February
        })

        it('toggles to descending on click', async () => {
            const wrapper = await createWrapper()
            const sortButton = getSortButton(wrapper)

            await sortButton.trigger('click')
            await nextTick()

            const vm = vmOf(wrapper)
            // First item should be latest date (Feb 15)
            expect(itemAt(vm.filteredData, 0).date.getDate()).toBe(15)
            expect(itemAt(vm.filteredData, 0).date.getMonth()).toBe(1) // February
        })
    })

    describe('Pagination', () => {
        it('shows pagination when data exceeds pageSize', async () => {
            const wrapper = await createWrapper({data: createTestData(), pageSize: 5})
            const vm = vmOf(wrapper)
            expect(vm.showPagination).toBe(true)
        })

        it('hides pagination when data equals pageSize', async () => {
            const wrapper = await createWrapper({data: createTestData().slice(0, 5), pageSize: 5})
            const vm = vmOf(wrapper)
            expect(vm.showPagination).toBe(false)
        })

        it('handles page change', async () => {
            const wrapper = await createWrapper()
            const vm = vmOf(wrapper)

            vm.handlePageChange(2)
            await nextTick()

            expect(vm.pagination.pageIndex).toBe(1) // 0-indexed
            expect(vm.currentPage).toBe(2)
        })
    })

    describe('Loading State', () => {
        // Slots go through the root mount alone
        const mountEmpty = (loading: boolean) => mountSuspended(EconomyTable, {
            props: {data: [], columns: defaultColumns, getRowId: rowIdOf, dateAccessor, loading, loadingText: 'Henter fremtidige bestillinger'},
            slots: {empty: '<div data-testid="custom-empty">No data</div>'},
            global: {provide: {isMd: ref(true)}}
        })

        it('while loading with no rows, shows the loading row with its text and not the empty state', async () => {
            const wrapper = await mountEmpty(true)

            const loadingRow = findLoadingRow(wrapper)
            expect(loadingRow.exists()).toBe(true)
            expect(loadingRow.text()).toContain('Henter fremtidige bestillinger')
            expect(findByTestId(wrapper, 'custom-empty').exists()).toBe(false)
        })

        it('once loaded with no rows, shows the empty state and no loading row', async () => {
            const wrapper = await mountEmpty(false)

            expect(findByTestId(wrapper, 'custom-empty').exists()).toBe(true)
            expect(findLoadingRow(wrapper).exists()).toBe(false)
        })

        // While the data loads the loading row fills the table, so a re-read shows no row of the earlier answer
        it('GIVEN rows and loading=true THEN the table receives it, the rows go and the loading row shows', async () => {
            const wrapper = await createWrapper({loading: true, loadingText: 'Henter fremtidige bestillinger'})

            expect(isTableLoading(wrapper)).toBe(true)
            expect(wrapper.text()).not.toContain('Pasta')
            expect(findLoadingRow(wrapper).text()).toContain('Henter fremtidige bestillinger')
        })

        it('GIVEN rows and loading=false THEN the rows show and there is no loading row', async () => {
            const wrapper = await createWrapper({loading: false, loadingText: 'Henter fremtidige bestillinger'})

            expect(isTableLoading(wrapper)).toBe(false)
            expect(wrapper.text()).toContain('Pasta')
            expect(findLoadingRow(wrapper).exists()).toBe(false)
        })

        it('GIVEN an open row WHEN the data reloads THEN the row goes with the rows and reopens by its id once loading ends', async () => {
            const wrapper = await mountSuspended(EconomyTable, {
                props: {data: createTestData(), columns: defaultColumns, getRowId: rowIdOf, dateAccessor, loading: false},
                slots: {
                    'expand-cell': ({row}: {row: Row<TestRow>}) => h('button', {'data-testid': `open-${row.id}`, 'onClick': () => row.toggleExpanded()}),
                    'expanded': ({row}: {row: Row<TestRow>}) => h('div', {'data-testid': 'open-row'}, row.original.menuTitle)
                },
                global: {provide: {isMd: ref(true)}}
            })
            await findByTestId(wrapper, 'open-1').trigger('click')
            await vi.waitFor(() => expect(findByTestId(wrapper, 'open-row').text()).toBe('Pasta'))

            await wrapper.setProps({loading: true})
            await vi.waitFor(() => expect(findByTestId(wrapper, 'open-row').exists()).toBe(false))

            await wrapper.setProps({loading: false, data: createTestData()})
            await vi.waitFor(() => expect(findByTestId(wrapper, 'open-row').text()).toBe('Pasta'))
        })
    })

    describe('Filter + Sort Combined', () => {
        it('filters by the date string, then sorts ascending by default', async () => {
            const wrapper = await createWrapper()
            const searchInput = getSearchInput(wrapper)

            // Filter to January only (format is dd/MM/yyyy)
            await searchInput.setValue('/01/')
            await nextTick()

            const vm = vmOf(wrapper)
            // Should have 3 January items, default is ascending (10, 15, 20)
            expect(vm.filteredData.length).toBe(3)
            expect(itemAt(vm.filteredData, 0).date.getDate()).toBe(10)
            expect(itemAt(vm.filteredData, 1).date.getDate()).toBe(15)
            expect(itemAt(vm.filteredData, 2).date.getDate()).toBe(20)
        })
    })
})
