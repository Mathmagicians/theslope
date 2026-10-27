// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {mountWithTooltipProvider, findByTestId, resetStores, findLoadingRow, isTableLoading} from '~~/tests/component/testHelpers'
import EconomyTableGeneric from '~/components/economy/EconomyTable.vue'
import {nextTick, ref, type DefineComponent} from 'vue'
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

    // Required dateAccessor for EconomyTable (typed as unknown for mount compatibility)
    const dateAccessor = (item: unknown) => (item as TestRow).date

    beforeEach(() => {
        resetStores()
    })

    const createWrapper = (props: Record<string, unknown> = {}) => mountWithTooltipProvider(EconomyTable, {
        props: {data: createTestData(), columns: defaultColumns, getRowId: rowIdOf, dateAccessor, pageSize: 5, ...props},
        isMd: true
    })

    type WrapperType = Awaited<ReturnType<typeof createWrapper>>

    const getSearchInput = (wrapper: WrapperType) =>
        wrapper.find('input[type="text"]')

    const getSortButton = (wrapper: WrapperType) =>
        wrapper.find('button[aria-label="Skift sortering"]')

    describe('Rendering', () => {
        it('renders the search input and the sort toggle in the expand column header, and every row while the search is empty', async () => {
            const wrapper = await createWrapper()
            expect(getSearchInput(wrapper).exists()).toBe(true)
            expect(getSortButton(wrapper).exists()).toBe(true)
            const vm = wrapper.vm as unknown as EconomyTableVm
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
            const vm = wrapper.vm as unknown as EconomyTableVm

            // First item should be latest date (Feb 15)
            expect(vm.filteredData[0]!.date.getDate()).toBe(15)
            expect(vm.filteredData[0]!.date.getMonth()).toBe(1) // February
        })

        it('toggles to descending on click', async () => {
            const wrapper = await createWrapper()
            const sortButton = getSortButton(wrapper)

            await sortButton.trigger('click')
            await nextTick()

            const vm = wrapper.vm as unknown as EconomyTableVm
            // First item should be latest date (Feb 15)
            expect(vm.filteredData[0]!.date.getDate()).toBe(15)
            expect(vm.filteredData[0]!.date.getMonth()).toBe(1) // February
        })
    })

    describe('Pagination', () => {
        it('shows pagination when data exceeds pageSize', async () => {
            const wrapper = await createWrapper({data: createTestData(), pageSize: 5})
            const vm = wrapper.vm as unknown as EconomyTableVm
            expect(vm.showPagination).toBe(true)
        })

        it('hides pagination when data equals pageSize', async () => {
            const wrapper = await createWrapper({data: createTestData().slice(0, 5), pageSize: 5})
            const vm = wrapper.vm as unknown as EconomyTableVm
            expect(vm.showPagination).toBe(false)
        })

        it('handles page change', async () => {
            const wrapper = await createWrapper()
            const vm = wrapper.vm as unknown as EconomyTableVm

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

        // With rows, UTable runs its loading bar over them: the rows stay, the loading row is for a table without rows
        it.each([true, false])('GIVEN rows and loading=%s THEN the table receives it and the rows stay', async (loading) => {
            const wrapper = await createWrapper({loading, loadingText: 'Henter fremtidige bestillinger'})

            expect(isTableLoading(wrapper)).toBe(loading)
            expect(wrapper.text()).toContain('Pasta')
            expect(findLoadingRow(wrapper).exists()).toBe(false)
        })
    })

    describe('Filter + Sort Combined', () => {
        it('filters by the date string, then sorts ascending by default', async () => {
            const wrapper = await createWrapper()
            const searchInput = getSearchInput(wrapper)

            // Filter to January only (format is dd/MM/yyyy)
            await searchInput.setValue('/01/')
            await nextTick()

            const vm = wrapper.vm as unknown as EconomyTableVm
            // Should have 3 January items, default is ascending (10, 15, 20)
            expect(vm.filteredData.length).toBe(3)
            expect(vm.filteredData[0]!.date.getDate()).toBe(10)
            expect(vm.filteredData[1]!.date.getDate()).toBe(15)
            expect(vm.filteredData[2]!.date.getDate()).toBe(20)
        })
    })
})
