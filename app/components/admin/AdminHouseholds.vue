<script setup lang="ts">
import { getPaginationRowModel } from '@tanstack/vue-table'
import type {HouseholdDisplay} from '~/composables/useCoreValidation'

interface Props {
  canEdit?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  canEdit: false
})

const householdsStore = useHouseholdsStore()
const {households, isHouseholdsLoading, isHouseholdsErrored, householdsError} = storeToRefs(householdsStore)

householdsStore.initHouseholdsStore()

const {COMPONENTS, SIZES, BUTTONS, ICONS, getResidencyDisplay} = useTheSlopeDesignSystem()

// Row expansion for edit panel
const expanded = ref<Record<string, boolean>>({})

// Event handlers — store owns API calls, toasts, error handling
const handleMoveInhabitant = async (inhabitantId: number, householdId: number) => {
  await householdsStore.moveInhabitant(inhabitantId, householdId)
}

const handleDeleteHousehold = async (householdId: number) => {
  await householdsStore.deleteHousehold(householdId)
  expanded.value = {}
}

const isCreateFormOpen = ref(false)

const handleCreateHousehold = async (payload: {
  pbsId: number
  address: string
  movedInDate: Date
  heynaboId: number
  name: string
  prevOwnerMoveOutUpdates: {id: number, moveOutDate: Date}[]
}) => {
  const created = await householdsStore.createHousehold(payload)
  if (created) isCreateFormOpen.value = false
}

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
  ...(props.canEdit ? [{id: 'expand'}] : []),
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
    header: 'Adresse'
  },
  {
    accessorKey: 'inhabitants',
    header: 'Beboere',
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
      <div class="flex items-center justify-between">
        <span>Husstande på Skråningen</span>
        <UButton
            v-if="props.canEdit && !isCreateFormOpen"
            v-bind="BUTTONS.save"
            :size="SIZES.standard"
            data-testid="open-create-household"
            @click="isCreateFormOpen = true"
        >
          <template #leading>
            <UIcon :name="ICONS.plusCircle" />
          </template>
          Ny husstand
        </UButton>
      </div>
    </template>

    <!-- Inline create form (above table) -->
    <div v-if="isCreateFormOpen" class="px-6 py-3">
      <HouseholdCreateForm
          :existing-households="households"
          @create="handleCreateHousehold"
          @cancel="isCreateFormOpen = false"
      />
    </div>

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
        v-model:expanded="expanded"
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

      <!-- Edit button (admin only) -->
      <template v-if="props.canEdit" #expand-cell="{ row }">
        <UButton
            v-bind="BUTTONS.edit"
            :size="SIZES.small"
            @click="row.toggleExpanded()"
        />
      </template>

      <!-- Expanded row: HouseholdEditPanel -->
      <template #expanded="{ row }">
        <HouseholdEditPanel
            :household="row.original"
            :all-households="households"
            @move:inhabitant="(inhabitantId) => handleMoveInhabitant(inhabitantId, row.original.id)"
            @delete="handleDeleteHousehold(row.original.id)"
            @close="row.toggleExpanded()"
        />
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
