<script setup lang="ts">
/**
 * AdminHouseholds - the admin's households: search, the create form above the table, a household's residency badge
 * beside its PBS number, the edit panel under its row. Households moving in, leaving or moved out sort first.
 *
 * Visual check: /admin/households with a household moving in, one leaving and one moved out, a search without a
 * match and the create form open, phone and desktop.
 */
import { getPaginationRowModel } from '@tanstack/vue-table'
import type {HouseholdDisplay, HouseholdCreate, HouseholdMoveOut} from '~/composables/useCoreValidation'
import {HOUSEHOLD_WORDS} from '~/config/householdWords'

interface Props {
  canEdit?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  canEdit: false
})

const householdsStore = useHouseholdsStore()
const {households, isHouseholdsLoading, isHouseholdsErrored, householdsError} = storeToRefs(householdsStore)

const {COMPONENTS, SIZES, BUTTONS, ICONS, TYPOGRAPHY, TEXT, getResidencyDisplay, NOISE} = useTheSlopeDesignSystem()
const now = useClock()
const WORDS = HOUSEHOLD_WORDS.adminList

// The open edit panels, keyed by the household's row id
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

const handleCreateHousehold = async (household: HouseholdCreate, prevOwnerMoveOutUpdates: HouseholdMoveOut[]) => {
  const created = await householdsStore.createHousehold(household, prevOwnerMoveOutUpdates)
  if (created) isCreateFormOpen.value = false
}

const searchQuery = ref('')
const sortDescending = ref(false)

const filteredHouseholds = computed(() => {
  let result = households.value

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

  // The households moving in, leaving or moved out come first, then by address
  result = [...result].sort((a, b) => {
    const aInteresting = getResidencyStatus(a.movedInDate, a.moveOutDate, now.value) !== ResidencyStatus.active
    const bInteresting = getResidencyStatus(b.movedInDate, b.moveOutDate, now.value) !== ResidencyStatus.active
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
    header: WORDS.columns.shortName
  },
  {
    accessorKey: 'pbsId',
    header: WORDS.columns.pbs
  },
  {
    accessorKey: 'address',
    header: WORDS.columns.address
  },
  {
    accessorKey: 'inhabitants',
    header: WORDS.columns.inhabitants,
    cell: ({row}: {row: {original: HouseholdDisplay}}) =>
      h(resolveComponent('HouseholdListItem'), {
        household: row.original,
        compact: true
      })
  }
]

// The search row pages through the table's own API
const table = useTemplateRef('table')

const pagination = ref({
  pageIndex: 0,
  pageSize: 10
})
</script>

<template>
  <div>
    <ViewError
      v-if="isHouseholdsErrored"
      :text="WORDS.failed"
      :error="householdsError?.statusCode"
      :cause="householdsError"
    />

  <UCard :class="COMPONENTS.adminHouseholds.card" data-testid="admin-households">
    <template #header>
      <div :class="COMPONENTS.adminHouseholds.headerRow">
        <span>{{ WORDS.title }}</span>
        <UButton
            v-if="props.canEdit && !isCreateFormOpen"
            v-bind="BUTTONS.save"
            data-testid="open-create-household"
            @click="isCreateFormOpen = true"
        >
          <template #leading>
            <UIcon :name="ICONS.plusCircle" />
          </template>
          {{ WORDS.create }}
        </UButton>
      </div>
    </template>

    <!-- Inline create form (above table) -->
    <div v-if="isCreateFormOpen" :class="COMPONENTS.adminHouseholds.section">
      <HouseholdCreateForm
          :existing-households="households"
          @create="handleCreateHousehold"
          @cancel="isCreateFormOpen = false"
      />
    </div>

    <div :class="COMPONENTS.adminHouseholds.section">
      <TableSearchPagination
          v-model:search-query="searchQuery"
          v-model:sort-descending="sortDescending"
          :table="table"
          :pagination="pagination"
          :placeholder="WORDS.search"
          :sort-label="WORDS.sort"
          test-id="household-search"
      />
    </div>

    <UTable
        ref="table"
        v-model:pagination="pagination"
        v-model:expanded="expanded"
        :get-row-id="rowIdOf"
        :columns="columns"
        :data="filteredHouseholds"
        :loading="isHouseholdsLoading"
        :ui="COMPONENTS.table.ui"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel()
        }"
    >
      <template #shortName-cell="{ row }">
        <NuxtLink
            :to="getHouseholdUrl(row.original.shortName, row.original.pbsId, HOUSEHOLD_TAB.bookings)"
            :class="COMPONENTS.adminHouseholds.shortNameLink"
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
        <div :class="COMPONENTS.adminHouseholds.pbsCell">
          <span>{{ row.original.pbsId }}</span>
          <template v-for="residency in [getResidencyDisplay(row.original.movedInDate, row.original.moveOutDate, now)]" :key="residency?.badgeText">
            <UBadge
              v-if="residency"
              :color="residency.color"
              :icon="residency.icon"
              :variant="NOISE.subtle"
              :size="SIZES.sm"
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

      <template #expanded="{ row }">
        <HouseholdEditPanel
            :household="row.original"
            :all-households="households"
            @move:inhabitant="(inhabitantId) => handleMoveInhabitant(inhabitantId, row.original.id)"
            @delete="handleDeleteHousehold(row.original.id)"
            @close="row.toggleExpanded()"
        />
      </template>

      <template #loading>
        <div :class="COMPONENTS.table.loadingRow">
          <UIcon :name="ICONS.sync" :size="SIZES.smallIconSize" :class="COMPONENTS.table.loadingSpinner" />
          Henter husstande...
        </div>
      </template>

      <template #empty>
        <div :class="COMPONENTS.adminHouseholds.empty">
          <UIcon :name="ICONS.household" :class="[COMPONENTS.adminHouseholds.emptyIcon, TEXT.gray[400]]"/>
          <p v-if="searchQuery" :class="[TYPOGRAPHY.bodyTextSmall, TEXT.gray[500]]">Ingen husstande matcher søgningen "{{ searchQuery }}"</p>
          <p v-else :class="[TYPOGRAPHY.bodyTextSmall, TEXT.gray[500]]">{{ HOUSEHOLD_WORDS.page.noHouseholds }}</p>
        </div>
      </template>
    </UTable>
  </UCard>
  </div>
</template>
