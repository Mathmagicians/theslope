<script setup lang="ts">
import { getPaginationRowModel } from '@tanstack/vue-table'
import type {HouseholdDisplay} from '~/composables/useCoreValidation'

const householdsStore = useHouseholdsStore()
const {households, isHouseholdsLoading,isHouseholdsErrored, householdsError} = storeToRefs(householdsStore)

// Initialize without await for SSR hydration consistency
householdsStore.initHouseholdsStore()

// Design system
const { SIZES, PAGINATION } = useTheSlopeDesignSystem()

// Search/filter state
const searchQuery = ref('')

// Filter households by search query (same pattern as InhabitantSelector)
const filteredHouseholds = computed(() => {
  if (!searchQuery.value) return households.value

  const query = searchQuery.value.toLowerCase()
  return households.value.filter(household =>
    household.address?.toLowerCase().includes(query) ||
    household.shortName?.toLowerCase().includes(query) ||
    household.name?.toLowerCase().includes(query) ||
    household.inhabitants?.some((inhabitant) =>
      inhabitant.name?.toLowerCase().includes(query) ||
      inhabitant.lastName?.toLowerCase().includes(query)
    )
  )
})

const columns = [
  {
    accessorKey: 'shortName',
    header: 'Forkortelse'
  },
  {
    accessorKey: 'address',
    header: 'Address'
  },
  {
    accessorKey: 'pbsId',
    header: 'PBS'
  },
  {
    accessorKey: 'inhabitants',
    header: 'Inhabitants',
    cell: ({row}: {row: {original: HouseholdDisplay}}) =>
      h(resolveComponent('HouseholdListItem'), {
        household: row.original,
        compact: true
      })
  }
]

// Table ref for pagination control (same pattern as InhabitantSelector)
const table = useTemplateRef('table')

// Pagination - initial state, controlled via table API
const pagination = ref({
  pageIndex: 0,
  pageSize: 10
})
</script>

<template>
  <div>
    <ViewError
v-if="isHouseholdsErrored"
               text="Kan ikke hente data for husstande"
               :error="householdsError?.statusCode"
      :cause="householdsError"
    />

  <UCard
class="w-full px-0"
         data-test-id="admin-households">
    <template #header>
      <div>Husstande på Skråningen</div>
    </template>

    <!-- Search and Pagination Row -->
    <div class="flex flex-col md:flex-row gap-4 md:items-center md:justify-between px-6 py-3">
      <!-- Search -->
      <UInput
          v-model="searchQuery"
          trailing-icon="i-heroicons-magnifying-glass"
          placeholder="Søg efter adresse, navn eller person..."
          data-test-id="household-search"
          class="flex-1 md:max-w-md"
      />
      <!-- Pagination - controlled via table API (same pattern as InhabitantSelector) -->
      <UPagination
          v-if="(table?.tableApi?.getFilteredRowModel().rows.length || 0) > pagination.pageSize"
          :default-page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
          :items-per-page="table?.tableApi?.getState().pagination.pageSize"
          :total="table?.tableApi?.getFilteredRowModel().rows.length"
          :size="SIZES.standard"
          :sibling-count="PAGINATION.siblingCount.value"
          @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)"
      />
    </div>

    <UTable
        ref="table"
        v-model:pagination="pagination"
        :columns="columns"
        :data="filteredHouseholds"
        :loading="isHouseholdsLoading"
        :ui="{ td: 'py-2' }"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel()
        }"
    >
      <!-- Custom shortName cell with link -->
      <template #shortName-cell="{ row }">
        <NuxtLink
            :to="`/household/${encodeURIComponent(row.original.shortName)}`"
            class="text-primary hover:underline font-medium"
        >
          {{ row.original.shortName }}
        </NuxtLink>
      </template>

      <!-- Custom address cell with test-id for easier test selection -->
      <template #address-cell="{ row }">
        <span :data-test-id="`household-address-${row.original.id}`">
          {{ row.original.address }}
        </span>
      </template>

      <template #empty-state>
        <div class="flex flex-col items-center justify-center py-6 gap-3">
          <UIcon name="i-heroicons-home" class="w-8 h-8 text-gray-400"/>
          <p v-if="searchQuery" class="text-sm text-gray-500">Ingen husstande matcher søgningen "{{ searchQuery }}"</p>
          <p v-else class="text-sm text-gray-500">💤 Ingen er flyttet ind i appen endnu. Vent lige, lad os se om der kommer nogen snart ...</p>
        </div>
      </template>
    </UTable>
  </UCard>
  </div>
</template>
