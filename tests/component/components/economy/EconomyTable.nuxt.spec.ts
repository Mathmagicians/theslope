// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import EconomyTable from '~/components/economy/EconomyTable.vue'
import {nextTick, ref} from 'vue'

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

    type WrapperType = Awaited<ReturnType<typeof mountSuspended>>

    // Required dateAccessor for EconomyTable (typed as unknown for mountSuspended compatibility)
    const dateAccessor = (item: unknown) => (item as TestRow).date

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createWrapper = async (data: TestRow[] = createTestData(), pageSize = 5): Promise<any> => {
        return await mountSuspended(EconomyTable, {
            props: {
                data,
                columns: defaultColumns,
                rowKey: 'date',
                dateAccessor,
                pageSize
            },
            global: {
                provide: {
                    isMd: ref(true)
                }
            }
        })
    }

    const getSearchInput = (wrapper: WrapperType) =>
        wrapper.find('input[type="text"]')

    const getSortButton = (wrapper: WrapperType) =>
        wrapper.find('button[aria-label="Skift sortering"]')

    describe('Rendering', () => {
        it('renders with data', async () => {
            const wrapper = await createWrapper()
            expect(wrapper.exists()).toBe(true)
        })

        it('renders search input in expand column header', async () => {
            const wrapper = await createWrapper()
            const searchInput = getSearchInput(wrapper)
            expect(searchInput.exists()).toBe(true)
        })

        it('renders sort toggle button in expand column header', async () => {
            const wrapper = await createWrapper()
            const sortButton = getSortButton(wrapper)
            expect(sortButton.exists()).toBe(true)
        })

        it('renders custom search placeholder', async () => {
            const customPlaceholder = 'Søg måned...'
            const wrapper = await mountSuspended(EconomyTable, {
                props: {
                    data: createTestData(),
                    columns: defaultColumns,
                    rowKey: 'date',
                    dateAccessor,
                    searchPlaceholder: customPlaceholder
                },
                global: {
                    provide: {isMd: ref(true)}
                }
            })
            const searchInput = wrapper.find('input[type="text"]')
            expect(searchInput.attributes('placeholder')).toBe(customPlaceholder)
        })
    })

    describe('Date Filtering', () => {
        it('filters data by date string match', async () => {
            const wrapper = await createWrapper()
            const searchInput = getSearchInput(wrapper)

            // Format is dd/MM/yyyy, search for "/01/" (January)
            await searchInput.setValue('/01/')
            await nextTick()

            // Should filter to only January dates (3 items: Jan 10, 15, 20)
            const vm = wrapper.vm as unknown as EconomyTableVm
            expect(vm.filteredData.length).toBe(3)
        })

        it('filters by day number', async () => {
            const wrapper = await createWrapper()
            const searchInput = getSearchInput(wrapper)

            // Format is dd/MM/yyyy, search for day 15 (appears twice: Jan 15, Feb 15)
            await searchInput.setValue('15/')
            await nextTick()

            const vm = wrapper.vm as unknown as EconomyTableVm
            expect(vm.filteredData.length).toBe(2)
        })

        it('shows all data when search is empty', async () => {
            const wrapper = await createWrapper()
            const vm = wrapper.vm as unknown as EconomyTableVm
            expect(vm.filteredData.length).toBe(6)
        })

        it('shows empty when no match', async () => {
            const wrapper = await createWrapper()
            const searchInput = getSearchInput(wrapper)

            await searchInput.setValue('/12/')
            await nextTick()

            const vm = wrapper.vm as unknown as EconomyTableVm
            expect(vm.filteredData.length).toBe(0)
        })
    })

    describe('Sorting', () => {
        it('sorts descending by default (newest first)', async () => {
            const wrapper = await createWrapper()
            const vm = wrapper.vm as unknown as EconomyTableVm

            // First item should be latest date (Feb 15)
            expect(vm.filteredData[0]!.date.getDate()).toBe(15)
            expect(vm.filteredData[0]!.date.getMonth()).toBe(1) // February
        })

        it('toggles to ascending on click', async () => {
            const wrapper = await createWrapper()
            const sortButton = getSortButton(wrapper)

            await sortButton.trigger('click')
            await nextTick()

            const vm = wrapper.vm as unknown as EconomyTableVm
            // First item should be earliest date (Jan 10)
            expect(vm.filteredData[0]!.date.getDate()).toBe(10)
            expect(vm.filteredData[0]!.date.getMonth()).toBe(0) // January
        })

        it('toggles back to descending on second click', async () => {
            const wrapper = await createWrapper()
            const sortButton = getSortButton(wrapper)

            await sortButton.trigger('click')
            await sortButton.trigger('click')
            await nextTick()

            const vm = wrapper.vm as unknown as EconomyTableVm
            // Back to descending - first item is Feb 15
            expect(vm.filteredData[0]!.date.getDate()).toBe(15)
            expect(vm.filteredData[0]!.date.getMonth()).toBe(1)
        })
    })

    describe('Pagination', () => {
        it('shows pagination when data exceeds pageSize', async () => {
            const wrapper = await createWrapper(createTestData(), 5)
            const vm = wrapper.vm as unknown as EconomyTableVm
            expect(vm.showPagination).toBe(true)
        })

        it('hides pagination when data fits in one page', async () => {
            const wrapper = await createWrapper(createTestData().slice(0, 3), 5)
            const vm = wrapper.vm as unknown as EconomyTableVm
            expect(vm.showPagination).toBe(false)
        })

        it('hides pagination when data equals pageSize', async () => {
            const wrapper = await createWrapper(createTestData().slice(0, 5), 5)
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
        it('passes loading prop to UTable', async () => {
            const wrapper = await mountSuspended(EconomyTable, {
                props: {
                    data: createTestData(),
                    columns: defaultColumns,
                    rowKey: 'date',
                    dateAccessor,
                    loading: true
                },
                global: {
                    provide: {isMd: ref(true)}
                }
            })

            const table = wrapper.findComponent({name: 'UTable'})
            expect(table.props('loading')).toBe(true)
        })
    })

    describe('Empty State', () => {
        it('renders with empty data', async () => {
            const wrapper = await createWrapper([])
            expect(wrapper.exists()).toBe(true)
        })

        it('passes empty slot through', async () => {
            const wrapper = await mountSuspended(EconomyTable, {
                props: {
                    data: [],
                    columns: defaultColumns,
                    rowKey: 'date',
                    dateAccessor
                },
                slots: {
                    empty: '<div data-testid="custom-empty">No data</div>'
                },
                global: {
                    provide: {isMd: ref(true)}
                }
            })

            const emptySlot = wrapper.find('[data-testid="custom-empty"]')
            expect(emptySlot.exists()).toBe(true)
        })
    })

    describe('Filter + Sort Combined', () => {
        it('filters then sorts in correct order', async () => {
            const wrapper = await createWrapper()
            const searchInput = getSearchInput(wrapper)
            const sortButton = getSortButton(wrapper)

            // Filter to January only (format is dd/MM/yyyy)
            await searchInput.setValue('/01/')
            await nextTick()

            // Default is descending, toggle to ascending
            await sortButton.trigger('click')
            await nextTick()

            const vm = wrapper.vm as unknown as EconomyTableVm
            // Should have 3 January items, sorted ascending (10, 15, 20)
            expect(vm.filteredData.length).toBe(3)
            expect(vm.filteredData[0]!.date.getDate()).toBe(10)
            expect(vm.filteredData[1]!.date.getDate()).toBe(15)
            expect(vm.filteredData[2]!.date.getDate()).toBe(20)
        })
    })
})
