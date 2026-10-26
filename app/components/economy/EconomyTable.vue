<script setup lang="ts" generic="T">
/**
 * EconomyTable - Smart table for economy views with date-column search/sort
 *
 * Encapsulates:
 * - Date column header with search input, sort toggle
 * - Internal filter/sort/pagination state
 * - Single-row expansion behavior
 *
 * Used by HouseholdEconomy and AdminEconomy for consistent table UX.
 *
 * ## Slot Passthrough Pattern
 * This component uses slot passthrough to allow parent components to customize
 * individual column cells while providing sensible defaults for common columns.
 *
 * Available slots (pass-through to UTable):
 * - #expand-cell: Expand/collapse button column
 * - #date-cell: Date column (has default formatting via dateAccessor)
 * - #totalAmount-cell: Total amount column (usually formatted with "kr")
 * - #amount-cell: Amount column (for individual amounts)
 * - #status-cell: Status badge column
 * - #period-cell: Date period column
 * - #billingPeriod-cell: Billing period string column
 * - #share-cell: Share link column
 * - #control-cell: Control sum column
 * - #expanded: Expanded row content
 * - #empty: Empty state content, once the data has answered with no rows
 *
 * While `loading`, UTable's loading bar runs under the column headers and the rows stay. A table without rows yet
 * renders the loading row (its `#loading` slot) instead of `#empty`:
 * ┌──────────┬──────────────────┬──────────┬──────────┐
 * │ Dato     │ Middag           │ Kuverter │ Beløb    │
 * ├──────────┴──────────────────┴──────────┴──────────┤   UTable's loading bar under the header
 * │     (sync, spinning)  Henter fremtidige bestillinger │   COMPONENTS.table.loadingRow, the text from loadingText
 * └───────────────────────────────────────────────────┘
 *
 * For columns without explicit slots (menuTitle, ticketCounts, householdCount, paymentMonth),
 * UTable renders the value from row.original[accessorKey] automatically.
 */
import {formatDate} from '~/utils/date'
import type {TableColumn} from '@nuxt/ui'
import {getPaginationRowModel, type Table} from '@tanstack/vue-table'

interface Props {
    /** Table data */
    data: T[]
    /** Column definitions - passed through to UTable */
    columns: TableColumn<T>[]
    /** UTable's getRowId: a row's id, so an open row stays open when the rows around it change */
    getRowId: (row: T) => string
    /** Extract date from item for filtering/sorting */
    dateAccessor: (item: T) => Date
    /** Loading state */
    loading?: boolean
    /** The line the loading row shows while the data is on the way */
    loadingText?: string
    /** Page size */
    pageSize?: number
    /** Placeholder for search input */
    searchPlaceholder?: string
    /** Default sort direction: true = descending (newest first), false = ascending (oldest first) */
    defaultSortDesc?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    loading: false,
    loadingText: 'Henter data',
    pageSize: 5,
    searchPlaceholder: 'Søg på dato',
    defaultSortDesc: false
})

const {COMPONENTS, ICONS, SIZES, PAGINATION, COLOR, NOISE} = useTheSlopeDesignSystem()

const table = useTemplateRef<{tableApi: Table<T>}>('table')

const search = ref('')
const sortDesc = ref(props.defaultSortDesc)
const pagination = ref({pageIndex: 0, pageSize: props.pageSize})
const {expanded} = useExpandableRow()

// Filter by date only, then sort
const filteredData = computed(() => {
    let result = props.data
    if (search.value) {
        const query = search.value.toLowerCase()
        result = result.filter(item =>
            formatDate(props.dateAccessor(item)).toLowerCase().includes(query)
        )
    }
    // Sort by date (ascending by default, descending if toggled)
    result = [...result].sort((a, b) => {
        const diff = props.dateAccessor(a).getTime() - props.dateAccessor(b).getTime()
        return sortDesc.value ? -diff : diff
    })
    return result
})

// Pagination display - use table API state when available
const totalRows = computed(() =>
    table.value?.tableApi.getFilteredRowModel().rows.length ?? filteredData.value.length
)
const showPagination = computed(() => totalRows.value > props.pageSize)
const currentPage = computed(() => {
    const pageIndex = table.value?.tableApi.getState().pagination.pageIndex ?? pagination.value.pageIndex
    return pageIndex + 1
})

const handlePageChange = (page: number) => {
    // Use table API directly for reliable pagination control
    table.value?.tableApi.setPageIndex(page - 1)
    pagination.value.pageIndex = page - 1  // Keep local state in sync
}

const toggleSort = () => {
    sortDesc.value = !sortDesc.value
}
</script>

<template>
  <div :class="COMPONENTS.economyTable.frame.stack">
    <!-- Header: search/sort + pagination -->
    <div :class="COMPONENTS.economyTable.frame.toolbar">
      <div :class="COMPONENTS.economyTable.frame.search">
        <UInput
            v-model="search"
            :placeholder="searchPlaceholder"
            :size="SIZES.small"
            :class="COMPONENTS.economyTable.frame.searchInput"
        />
        <UButton
            :variant="NOISE.quiet"
            :color="COLOR.neutral"
            :size="SIZES.standard"
            square
            :icon="sortDesc ? ICONS.sortDescending : ICONS.sortAscending"
            aria-label="Skift sortering"
            @click="toggleSort"
        />
      </div>
      <UPagination
          v-if="showPagination"
          :page="currentPage"
          :items-per-page="pageSize"
          :total="totalRows"
          :size="SIZES.standard"
          :sibling-count="PAGINATION.siblingCount.value"
          @update:page="handlePageChange"
      />
    </div>

    <UTable
        ref="table"
        v-model:expanded="expanded"
        v-model:pagination="pagination"
        :data="filteredData"
        :columns="columns"
        :ui="COMPONENTS.table.ui"
        :loading="loading"
        :pagination-options="{getPaginationRowModel: getPaginationRowModel()}"
        :get-row-id="getRowId"
    >

      <!-- Pass through all other slots -->
      <template #expand-cell="slotProps">
        <slot name="expand-cell" v-bind="slotProps"/>
      </template>

      <template #date-cell="slotProps">
        <slot name="date-cell" v-bind="slotProps">
          {{ formatDate(dateAccessor(slotProps.row.original)) }}
        </slot>
      </template>

      <template #menuTitle-cell="slotProps">
        <slot name="menuTitle-cell" v-bind="slotProps"/>
      </template>

      <template #ticketCounts-cell="slotProps">
        <slot name="ticketCounts-cell" v-bind="slotProps"/>
      </template>

      <template #totalAmount-cell="slotProps">
        <slot name="totalAmount-cell" v-bind="slotProps"/>
      </template>

      <template #amount-cell="slotProps">
        <slot name="amount-cell" v-bind="slotProps"/>
      </template>

      <template #status-cell="slotProps">
        <slot name="status-cell" v-bind="slotProps"/>
      </template>

      <template #period-cell="slotProps">
        <slot name="period-cell" v-bind="slotProps"/>
      </template>

      <template #billingPeriod-cell="slotProps">
        <slot name="billingPeriod-cell" v-bind="slotProps"/>
      </template>

      <template #share-cell="slotProps">
        <slot name="share-cell" v-bind="slotProps"/>
      </template>

      <template #control-cell="slotProps">
        <slot name="control-cell" v-bind="slotProps"/>
      </template>

      <template #householdCount-cell="slotProps">
        <slot name="householdCount-cell" v-bind="slotProps"/>
      </template>

      <template #paymentMonth-cell="slotProps">
        <slot name="paymentMonth-cell" v-bind="slotProps"/>
      </template>

      <template #expanded="slotProps">
        <slot name="expanded" v-bind="slotProps"/>
      </template>

      <template #loading>
        <div :class="COMPONENTS.table.loadingRow">
          <UIcon :name="ICONS.sync" :size="SIZES.smallIconSize" :class="COMPONENTS.table.loadingSpinner"/>
          {{ loadingText }}
        </div>
      </template>

      <template #empty>
        <slot name="empty"/>
      </template>
    </UTable>
  </div>
</template>
