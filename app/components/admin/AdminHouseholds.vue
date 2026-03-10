<script setup lang="ts">
import { getPaginationRowModel } from '@tanstack/vue-table'
import type {HouseholdDisplay} from '~/composables/useCoreValidation'

// Props - canEdit from parent for authorization (unused for now - view-only component)
interface Props {
  canEdit?: boolean
}
withDefaults(defineProps<Props>(), {
  canEdit: false
})

const householdsStore = useHouseholdsStore()
const {households, isHouseholdsLoading,isHouseholdsErrored, householdsError} = storeToRefs(householdsStore)

// Initialize without await for SSR hydration consistency
householdsStore.initHouseholdsStore()

const { COMPONENTS, getResidencyDisplay } = useTheSlopeDesignSystem()

// Search/filter state
const searchQuery = ref('')
const sortDescending = ref(false)

// Filter and sort households
const filteredHouseholds = computed(() => {
  let result = households.value

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(household =>
      household.address?.toLowerCase().includes(query) ||
      household.shortName?.toLowerCase().includes(query) ||
      household.name?.toLowerCase().includes(query) ||
      household.inhabitants?.some((inhabitant) =>
        inhabitant.name?.toLowerCase().includes(query) ||
        inhabitant.lastName?.toLowerCase().includes(query)
      )
    )
  }

  // Sort: non-active residency status first (pending, leaving, moved-out), then by address
  result = [...result].sort((a, b) => {
    const aInteresting = getResidencyStatus(a.movedInDate, a.moveOutDate) !== 'active'
    const bInteresting = getResidencyStatus(b.movedInDate, b.moveOutDate) !== 'active'
    if (aInteresting !== bInteresting) return aInteresting ? -1 : 1
    return (a.address ?? '').localeCompare(b.address ?? '')
  })

  if (sortDescending.value) {
    result.reverse()
  }

  return result
})

const columns = [
  {
    accessorKey: 'shortName',
    header: 'Forkortelse'
  },
  {
    accessorKey: 'pbsId',
    header: 'PBS'
  },
  {
    accessorKey: 'address',
    header: 'Address'
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
         data-testid="admin-households">
    <template #header>
      <div>Husstande på Skråningen</div>
    </template>

    <!-- Search, Sort, and Pagination Row -->
    <div class="px-6 py-3">
      <TableSearchPagination
          v-model:search-query="searchQuery"
          v-model:sort-descending="sortDescending"
          :table="table"
          :pagination="pagination"
          placeholder="Søg efter adresse, navn eller person..."
          sort-label="Adresse"
          test-id="household-search"
      />
    </div>

    <UTable
        ref="table"
        v-model:pagination="pagination"
        :columns="columns"
        :data="filteredHouseholds"
        :loading="isHouseholdsLoading"
        :ui="COMPONENTS.table.ui"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel()
        }"
    >
      <!-- Custom shortName cell with link -->
      <template #shortName-cell="{ row }">
        <NuxtLink
            :to="getHouseholdUrl(row.original.shortName, row.original.pbsId)"
            class="text-primary hover:underline font-medium"
        >
          {{ row.original.shortName }}
        </NuxtLink>
      </template>

      <template #address-cell="{ row }">
        <span :data-testid="`household-address-${row.original.id}`">
          {{ row.original.address }}
        </span>
      </template>

      <template #pbsId-cell="{ row }">
        <div class="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
          <span>{{ row.original.pbsId }}</span>
          <template v-for="residency in [getResidencyDisplay(row.original.movedInDate, row.original.moveOutDate)]" :key="residency?.badgeText">
            <UBadge
              v-if="residency"
              :color="residency.color"
              :icon="residency.icon"
              variant="subtle"
              size="sm"
            >
              {{ residency.badgeText }}
            </UBadge>
          </template>
        </div>
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
