<script setup lang="ts">
/**
 * InhabitantSelector - Reusable inhabitant finder with search, sort, pagination.
 *
 * Parent provides data (ADR-007) and domain-specific UI via scoped slots.
 *
 * Call-sites:
 * - CookingTeamCard: team badge in #status, role buttons in #actions
 * - HouseholdEditPanel: household badge in #status, move button in #actions
 */
import { getPaginationRowModel } from '@tanstack/vue-table'
import type { InhabitantDisplay } from '~/composables/useCoreValidation'

interface Props {
  inhabitants: InhabitantDisplay[]
  sortFn?: (rowA: { original: InhabitantDisplay }, rowB: { original: InhabitantDisplay }) => number
  searchPlaceholder?: string
  statusHeader?: string
  actionsHeader?: string
  emptyText?: string
  pageSize?: number
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  sortFn: undefined,
  searchPlaceholder: 'Søg efter navn...',
  statusHeader: 'Status',
  actionsHeader: 'Handling',
  emptyText: 'Ingen beboere tilgængelige',
  pageSize: 8,
  loading: false
})

const { SIZES, COMPONENTS } = useTheSlopeDesignSystem()

// Search + sort at data level (same pattern as AdminHouseholds, AdminUsers)
const searchQuery = ref('')
const sortDescending = ref(false)

const filteredInhabitants = computed(() => {
  let result = props.inhabitants

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(i =>
        `${i.name} ${i.lastName}`.toLowerCase().includes(q)
    )
  }

  if (props.sortFn) {
    result = [...result].sort((a, b) => {
      const cmp = props.sortFn!({original: a}, {original: b})
      return sortDescending.value ? -cmp : cmp
    })
  }

  return result
})

const columns = [
  { accessorKey: 'name', header: 'Navn' },
  { accessorKey: 'status', header: props.statusHeader },
  { accessorKey: 'actions', header: props.actionsHeader }
]

// Row expansion (parent controls which row is expanded via v-model)
const expanded = defineModel<Record<string, boolean>>('expanded', { default: () => ({}) })

// Pagination
const pagination = ref({ pageIndex: 0, pageSize: props.pageSize })
const table = useTemplateRef('table')
</script>

<template>
  <div class="space-y-3">
    <TableSearchPagination
        v-model:search-query="searchQuery"
        :table="table"
        :pagination="pagination"
        :placeholder="searchPlaceholder"
    />

    <UTable
        ref="table"
        v-model:pagination="pagination"
        v-model:expanded="expanded"
        sticky
        :columns="columns"
        :data="filteredInhabitants"
        :loading="loading"
        :ui="COMPONENTS.table.ui"
        :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
        class="flex-1"
    >
      <!-- Sort toggle in status column header -->
      <template v-if="sortFn" #status-header>
        <UButton
            variant="outline"
            :size="SIZES.standard"
            name="sort-by-status"
            @click="sortDescending = !sortDescending"
        >
          <template #leading>
            <UIcon
                :name="sortDescending ? 'i-lucide-arrow-down-wide-narrow' : 'i-lucide-arrow-up-narrow-wide'"
                :size="SIZES.standardIconSize"
            />
          </template>
          {{ statusHeader }}
        </UButton>
      </template>

      <!-- Name column: avatar + full name -->
      <template #name-cell="{ row }">
        <div class="flex items-center gap-3">
          <UAvatar
              :src="row.original.pictureUrl ?? undefined"
              :alt="`${row.original.name} ${row.original.lastName}`"
              icon="i-heroicons-user"
              size="sm"
          />
          <span class="font-medium">{{ row.original.name }} {{ row.original.lastName }}</span>
        </div>
      </template>

      <!-- Status + Actions: delegated to parent via scoped slots -->
      <template #status-cell="{ row }">
        <slot name="status" :row="row" />
      </template>

      <template #actions-cell="{ row }">
        <slot name="actions" :row="row" />
      </template>

      <!-- Expanded row: delegated to parent -->
      <template #expanded="{ row }">
        <slot name="expanded" :row="row" />
      </template>

      <template #empty-state>
        <div class="flex flex-col items-center justify-center py-6 gap-3">
          <UIcon name="i-heroicons-users" class="w-8 h-8 text-gray-400"/>
          <p class="text-sm text-gray-500">
            {{ searchQuery ? 'Ingen beboere fundet' : emptyText }}
          </p>
        </div>
      </template>
    </UTable>
  </div>
</template>
