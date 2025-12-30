<script setup lang="ts">
/**
 * TableSearchPagination - Reusable search + sort toggle + pagination row for UTable
 *
 * Used with TanStack Table (UTable) for consistent search/sort/pagination UI.
 * Parent component handles filtering and sorting logic; this component handles UI only.
 *
 * Usage:
 * ```vue
 * <TableSearchPagination
 *   v-model:search-query="searchQuery"
 *   v-model:sort-descending="sortDescending"
 *   :table="table"
 *   :pagination="pagination"
 *   placeholder="Søg efter navn..."
 *   sort-label="Navn"
 *   test-id="user-search"
 * />
 * ```
 */

// TanStack Table API subset used by this component
interface TableApi {
  getFilteredRowModel: () => { rows: unknown[] }
  getState: () => { pagination: { pageIndex: number; pageSize: number } }
  setPageIndex: (index: number) => void
}

interface Props {
  placeholder?: string
  testId?: string
  sortLabel?: string
  table: { tableApi?: TableApi } | null
  pagination: { pageIndex: number; pageSize: number }
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Søg...',
  testId: undefined,
  sortLabel: undefined
})

const searchQuery = defineModel<string>('searchQuery', { default: '' })
const sortDescending = defineModel<boolean>('sortDescending', { default: false })

const { SIZES, PAGINATION, ICONS } = useTheSlopeDesignSystem()

// Toggle sort direction
const toggleSort = () => {
  sortDescending.value = !sortDescending.value
}

// Computed for cleaner template
const showPagination = computed(() => {
  const totalRows = props.table?.tableApi?.getFilteredRowModel().rows.length || 0
  return totalRows > props.pagination.pageSize
})

const currentPage = computed(() =>
  (props.table?.tableApi?.getState().pagination.pageIndex || 0) + 1
)

const itemsPerPage = computed(() =>
  props.table?.tableApi?.getState().pagination.pageSize || props.pagination.pageSize
)

const totalItems = computed(() =>
  props.table?.tableApi?.getFilteredRowModel().rows.length || 0
)

const handlePageChange = (page: number) => {
  props.table?.tableApi?.setPageIndex(page - 1)
}
</script>

<template>
  <div class="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
    <!-- Search -->
    <UInput
        v-model="searchQuery"
        trailing-icon="i-heroicons-magnifying-glass"
        :placeholder="placeholder"
        :data-testid="testId"
        class="flex-1 md:max-w-md"
    />

    <!-- Sort + Pagination -->
    <div class="flex items-center gap-2">
      <!-- Sort toggle -->
      <UButton
          v-if="sortLabel"
          variant="outline"
          color="neutral"
          :size="SIZES.standard"
          data-testid="sort-toggle"
          @click="toggleSort"
      >
        <template #leading>
          <UIcon
              :name="sortDescending ? ICONS.sortDescending : ICONS.sortAscending"
          />
        </template>
        {{ sortLabel }}
      </UButton>

      <!-- Pagination -->
      <UPagination
          v-if="showPagination"
          :default-page="currentPage"
          :items-per-page="itemsPerPage"
          :total="totalItems"
          :size="SIZES.standard"
          :sibling-count="PAGINATION.siblingCount.value"
          @update:page="handlePageChange"
      />
    </div>
  </div>
</template>
