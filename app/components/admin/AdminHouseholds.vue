<script setup lang="ts">
import type {HouseholdDisplay} from '~/composables/useHouseholdValidation'

const householdsStore = useHouseholdsStore()
const {households, isHouseholdsLoading,isHouseholdsErrored, householdsError} = storeToRefs(householdsStore)

// Initialize without await for SSR hydration consistency
householdsStore.initHouseholdsStore()

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
    accessorKey: 'inhabitants',
    header: 'Inhabitants',
    cell: ({row}: {row: {original: HouseholdDisplay}}) =>
      h(resolveComponent('HouseholdListItem'), {
        household: row.original,
        compact: true
      })
  }
]
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
      Husstande på Skråningen
    </template>

    <UTable
        :columns="columns"
        :data="households"
        :loading="isHouseholdsLoading"
        :ui="{ td: 'py-2' }"
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

      <template #empty-state>
        <div class="flex flex-col items-center justify-center py-6 gap-3">
          <UIcon name="i-heroicons-home" class="w-8 h-8 text-gray-400"/>
          <p class="text-sm text-gray-500">💤 Ingen er flyttet ind i appen endnu. Vent lige, lad os se om der kommer nogen snart ...</p>
        </div>
      </template>
    </UTable>
  </UCard>
  </div>
</template>
