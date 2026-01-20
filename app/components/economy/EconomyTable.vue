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
 * - #empty: Empty state content
 *
 * For columns without explicit slots (menuTitle, ticketCounts, householdCount, paymentMonth),
 * UTable renders the value from row.original[accessorKey] automatically.
 */
import {formatDate} from '~/utils/date'
import {getPaginationRowModel} from '@tanstack/vue-table'

// Column definition matching UTable expectations
type ColumnDef = { id?: string; accessorKey?: string; header?: string }

interface Props {
    /** Table data */
    data: T[]
    /** Column definitions - passed through to UTable */
    columns: ColumnDef[]
    /** Unique row identifier field (string key from T) */
    rowKey: string
    /** Extract date from item for filtering/sorting */
    dateAccessor: (item: T) => Date
    /** Loading state */
    loading?: boolean
    /** Page size */
    pageSize?: number
    /** Placeholder for search input */
    searchPlaceholder?: string
    /** Default sort direction: true = descending (newest first), false = ascending (oldest first) */
    defaultSortDesc?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    loading: false,
    pageSize: 5,
    searchPlaceholder: 'Søg på dato',
    defaultSortDesc: false
})

const {COMPONENTS, ICONS, SIZES, PAGINATION} = useTheSlopeDesignSystem()

// Table ref for accessing TanStack table API
const tableRef = ref<{ tableApi?: { setPageIndex: (index: number) => void; getState: () => { pagination: { pageIndex: number; pageSize: number } }; getFilteredRowModel: () => { rows: unknown[] } } } | null>(null)

// Internal state
const search = ref('')
const sortDesc = ref(props.defaultSortDesc)  // Use prop for default direction
const pagination = ref({pageIndex: 0, pageSize: props.pageSize})
const {expanded} = useExpandableRow()

// Cast columns through unknown to match UTable's strict TableColumn type
// Runtime validation is handled by UTable itself
const tableColumns = computed(() => props.columns as unknown as Array<{ id: string } | { accessorKey: keyof T; header: string }>)

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
    tableRef.value?.tableApi?.getFilteredRowModel().rows.length ?? filteredData.value.length
)
const showPagination = computed(() => totalRows.value > props.pageSize)
const currentPage = computed(() => {
    const pageIndex = tableRef.value?.tableApi?.getState().pagination.pageIndex ?? pagination.value.pageIndex
    return pageIndex + 1
})

const handlePageChange = (page: number) => {
    // Use table API directly for reliable pagination control
    tableRef.value?.tableApi?.setPageIndex(page - 1)
    pagination.value.pageIndex = page - 1  // Keep local state in sync
}

const toggleSort = () => {
    sortDesc.value = !sortDesc.value
}
</script>

<template>
  <div class="space-y-2">
    <!-- Header: search/sort + pagination -->
    <div class="flex justify-between items-center gap-2">
      <div class="flex items-center gap-1">
        <UInput
            v-model="search"
            :placeholder="searchPlaceholder"
            :size="SIZES.small"
            class="w-28 md:w-36"
        />
        <UButton
            variant="ghost"
            color="neutral"
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
        ref="tableRef"
        v-model:expanded="expanded"
        v-model:pagination="pagination"
        :data="filteredData"
        :columns="tableColumns"
        :ui="COMPONENTS.table.ui"
        :loading="loading"
        :pagination-options="{getPaginationRowModel: getPaginationRowModel()}"
        :row-key="rowKey"
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

      <template #empty>
        <slot v-if="!loading" name="empty"/>
      </template>
    </UTable>
  </div>
</template>
