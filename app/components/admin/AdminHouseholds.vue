<script setup lang="ts">
const householdsStore = useHouseholdsStore()
const {households, isLoading, error, isNoHouseholds} = storeToRefs(householdsStore)

// Top-level await - SSR compatible
await householdsStore.initHouseholdsStore()

const columns = [
  {
    accessorKey: 'address',
    header: 'Address'
  },
  {
    accessorKey: 'inhabitants',
    header: 'Inhabitants',
    cell: ({row}: any) =>
      h(resolveComponent('HouseholdHouseholdListItem'), {
        household: row.original,
        compact: true
      })
  }
]
</script>

<template>
  <UCard class="w-full px-0"
         data-test-id="admin-households">
    <template #header>
      Husstande på Skråningen
    </template>
    <UAlert
        v-if="error"
        color="red"
        variant="soft"
        title="Error loading households"
        :description="error"
        class="mb-4"
    />

    <UTable
        :columns="columns"
        :data="households"
        :loading="isLoading"
        :ui="{ td: 'py-2' }"
    >
      <template #empty-state>
        <div class="flex flex-col items-center justify-center py-6 gap-3">
          <UIcon name="i-heroicons-home" class="w-8 h-8 text-gray-400"/>
          <p class="text-sm text-gray-500">Ingen er flyttet ind i appen endnu. Vent lige, lad os se om de kommer ...</p>
        </div>
      </template>
    </UTable>
  </UCard>
</template>
