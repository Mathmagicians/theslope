<script setup lang="ts" generic="T">
/**
 * EconomyTable - Smart table for economy views with date-column search/sort
 *
 * Encapsulates:
 * - Date column header with calendar icon, search input, sort toggle
 * - Internal filter/sort/pagination state
 * - Single-row expansion behavior
 *
 * Used by HouseholdEconomy and AdminEconomy for consistent table UX.
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
    /** Unique row identifier field */
    rowKey: keyof T
    /** Extract date from item for filtering/sorting */
    dateAccessor: (item: T) => Date
    /** Loading state */
    loading?: boolean
    /** Page size */
    pageSize?: number
    /** Placeholder for search input */
    searchPlaceholder?: string
}

const props = withDefaults(defineProps<Props>(), {
    loading: false,
    pageSize: 5,
    searchPlaceholder: 'Søg på dato'
})

const {COMPONENTS, ICONS, SIZES} = useTheSlopeDesignSystem()


// Internal state
const search = ref('')
const sortDesc = ref(true)  // Default to descending (newest first)
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

// Pagination display
const showPagination = computed(() => filteredData.value.length > props.pageSize)
const currentPage = computed(() => pagination.value.pageIndex + 1)

const handlePageChange = (page: number) => {
    pagination.value.pageIndex = page - 1
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
          :default-page="currentPage"
          :items-per-page="pageSize"
          :total="filteredData.length"
          :size="SIZES.standard"
          @update:page="handlePageChange"
      />
    </div>

    <UTable
        v-model:expanded="expanded"
        v-model:pagination="pagination"
        :data="filteredData"
        :columns="tableColumns"
        :ui="COMPONENTS.table.ui"
        :loading="loading"
        :pagination-options="{getPaginationRowModel: getPaginationRowModel()}"
        :row-key="rowKey as string"
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
        <slot name="empty"/>
      </template>
    </UTable>
  </div>
</template>
