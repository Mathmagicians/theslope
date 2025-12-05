<script setup lang="ts">
/**
 * InhabitantSelector Component - Assign inhabitants to cooking teams
 *
 * Features:
 * - Search/filter through 100-200 inhabitants
 * - Pagination for large datasets
 * - Show assignment status with team badges
 * - Direct role action buttons (CHEF, COOK, JUNIORHELPER)
 * - Immediate save on add/remove
 * - UTable for consistent UI
 */
import { getPaginationRowModel } from '@tanstack/vue-table'
import type { TeamRole } from '~/composables/useCookingTeamValidation'

interface Inhabitant {
  id: number
  name: string
  lastName: string
  pictureUrl: string | null
  CookingTeamAssignment?: Array<{
    id: number
    role: TeamRole
    cookingTeamId: number
    cookingTeam: {
      id: number
      name: string
    }
  }>
}

interface Props {
  teamId: number
  teamName: string
  teamColor: string   // For color matching
  teams?: Array<{ id: number, name: string }>  // All teams in season for lookup
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'add:member': [inhabitantId: number, role: TeamRole]
  'remove:member': [assignmentId: number]
}>()

// Design system
const { SIZES, PAGINATION, COMPONENTS } = useTheSlopeDesignSystem()

// Business logic: Fetch inhabitants with assignments (ADR-009 compliant)
const {useInhabitantsWithAssignments, getTeamColor} = useCookingTeam()

// Call composable to get promise
const inhabitantsPromise = useInhabitantsWithAssignments()

// Capture refresh function for exposure (before await)
// eslint-disable-next-line prefer-const
let refreshFunc: (() => Promise<void>) | undefined

// Expose refresh method to parent (must be before any await)
defineExpose({
  refresh: () => refreshFunc?.()
})

// Now await the promise after defineExpose
const {inhabitants: inhabitantsWithAssignments, pending, error, refresh} = await inhabitantsPromise
refreshFunc = refresh

// Status-derived computeds (ADR-007)
const isErrored = computed(() => !!error.value)

// Import Role enum for use in template (ADR-001 compliance)
const { TeamRoleSchema } = useCookingTeamValidation()
const Role = TeamRoleSchema.enum

// Search and filtering
const searchQuery = ref('')

// Filter inhabitants by search query
const filteredInhabitants = computed(() => {
  if (!inhabitantsWithAssignments.value) return []

  return inhabitantsWithAssignments.value.filter((inhabitant) => {
    const fullName = `${inhabitant.name} ${inhabitant.lastName}`.toLowerCase()
    return fullName.includes(searchQuery.value.toLowerCase())
  })
})

// Helper functions to get team info from assignment
const getTeamInfo = (inhabitant: Inhabitant) => {
  const assignment = inhabitant.CookingTeamAssignment?.[0]

  if (!assignment) {
    return {type: 'available' as const, teamName: null, color: null, assignmentId: null}
  }

  if (assignment.cookingTeamId === props.teamId) {
    return {
      type: 'current' as const,
      teamName: props.teamName,
      color: props.teamColor,
      assignmentId: assignment.id
    }
  }

  // For other teams, use the actual team name from the assignment (not computed from index)
  // Color is computed from current index for visual distinction only
  const teamIndex = props.teams?.findIndex(t => t.id === assignment.cookingTeamId) ?? -1
  const otherTeamColor = teamIndex >= 0 ? getTeamColor(teamIndex) : 'neutral'

  return {
    type: 'other' as const,
    teamName: assignment.cookingTeam.name,
    color: otherTeamColor,
    assignmentId: assignment.id
  }
}

// Custom sort function for status column
const sortByStatusTeamAndName = (rowA: { original: Inhabitant }, rowB: { original: Inhabitant }): number => {
  const a = rowA.original
  const b = rowB.original

  const aInfo = getTeamInfo(a)
  const bInfo = getTeamInfo(b)

  // Available (no assignment) comes first
  if (aInfo.type === 'available' && bInfo.type !== 'available') return -1
  if (aInfo.type !== 'available' && bInfo.type === 'available') return 1

  // Current team comes before other teams
  if (aInfo.type === 'current' && bInfo.type === 'other') return -1
  if (aInfo.type === 'other' && bInfo.type === 'current') return 1

  // Secondary sort by name for equal status
  return `${a.name} ${a.lastName}`.localeCompare(`${b.name} ${b.lastName}`)
}

const handleAddMember = (inhabitantId: number, role: TeamRole) => {
  emit('add:member', inhabitantId, role)
}

const handleRemoveMember = (assignmentId: number) => {
  emit('remove:member', assignmentId)
}

// Table columns - simplified configuration
const columns = [
  {
    accessorKey: 'name',
    header: 'Navn',
    enableSorting: false
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableSorting: true,
    sortingFn: sortByStatusTeamAndName
  },
  {
    accessorKey: 'actions',
    header: 'Tilføj til team',
    enableSorting: false
  }
]

const sorting = ref([
  {
    id: 'status',
    desc: true
  }
])

// Toggle sort order
const toggleSortOrder = () => {
  sorting.value[0].desc = !sorting.value[0].desc
}

// Pagination
const pagination = ref({
  pageIndex: 0,
  pageSize: 8
})

const table = useTemplateRef('table')


</script>

<template>
  <!-- Error state -->
  <ViewError v-if="isErrored" :error="error?.statusCode" :cause="error" />

  <!-- Main content (UTable handles loading state) -->
  <div v-else class="space-y-3">
    <!-- Search and Pagination Row -->
    <div class="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
      <!-- Search -->
      <UInput
          v-model="searchQuery"
          trailing-icon="i-heroicons-magnifying-glass"
          placeholder="Søg efter navn..."
          class="flex-1 md:max-w-md"
      />
      <!-- Pagination - only show when more than one page -->
      <UPagination
          v-if="(table?.tableApi?.getFilteredRowModel().rows.length || 0) > pagination.pageSize"
          :default-page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
          :items-per-page="table?.tableApi?.getState().pagination.pageSize"
          :total="table?.tableApi?.getFilteredRowModel().rows.length"
          :size="SIZES.standard"
          :sibling-count="PAGINATION.siblingCount.value"
          @update:page="(p) => table?.tableApi?.setPageIndex(p - 1)"
      />
    </div>

    <!-- Table -->
    <UTable
        ref="table"
        v-model:sorting="sorting"
        v-model:pagination="pagination"
        sticky
        :columns="columns"
        :data="filteredInhabitants"
        :loading="pending"
        :ui="COMPONENTS.table.ui"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel()
        }"
        class="flex-1"
    >
      <!-- Custom header for status column with sort button -->
      <template #status-header>
        <UButton
            variant="outline"
            :size="SIZES.standard"
            name="sort-by-status"
            @click="toggleSortOrder"
        >
          <template #leading>
            <UIcon
                :name="sorting[0].desc ? 'i-lucide-arrow-down-wide-narrow' : 'i-lucide-arrow-up-narrow-wide'"
                :size="SIZES.standardIconSize"
            />
          </template>
          Status
        </UButton>
      </template>

      <!-- Name column with avatar -->
      <template #name-cell="{ row }">
        <div class="flex items-center gap-3">
          <UAvatar
              :src="row.original.pictureUrl"
              :alt="`${row.original.name} ${row.original.lastName}`"
              icon="i-heroicons-user"
              size="sm"
          />
          <span class="font-medium">{{ row.original.name }} {{ row.original.lastName }}</span>
        </div>
      </template>

      <!-- Status column with colored badge -->
      <template #status-cell="{ row }">
        <template v-for="(info, idx) in [getTeamInfo(row.original)]" :key="idx">
          <UBadge
              v-if="info.type === 'available'"
              color="success"
              variant="outline"
              size="sm"
          >
            LEDIG
          </UBadge>
          <UBadge
              v-else
              :color="info.color"
              variant="solid"
              size="sm"
          >
            {{ info.teamName }}
          </UBadge>
        </template>
      </template>

      <!-- Actions column with role buttons or remove button -->
      <template #actions-cell="{ row }">
        <template v-for="(info, idx) in [getTeamInfo(row.original)]" :key="idx">
          <div v-if="info.type === 'available'" class="flex gap-1">
            <UButton
                color="primary"
                size="xs"
                icon="i-heroicons-plus"
                @click="handleAddMember(row.original.id, Role.CHEF)"
            >
              Chef
            </UButton>
            <UButton
                color="primary"
                size="xs"
                icon="i-heroicons-plus"
                @click="handleAddMember(row.original.id, Role.COOK)"
            >
              Kok
            </UButton>
            <UButton
                color="primary"
                size="xs"
                icon="i-heroicons-plus"
                @click="handleAddMember(row.original.id, Role.JUNIORHELPER)"
            >
              Spire
            </UButton>
          </div>
          <UButton
              v-else-if="info.type === 'current'"
              color="error"
              variant="ghost"
              size="sm"
              icon="i-heroicons-x-mark"
              @click="handleRemoveMember(info.assignmentId!)"
          >
            Fjern
          </UButton>
          <span v-else class="text-xs text-gray-500">I andet hold</span>
        </template>
      </template>

      <template #empty-state>
        <div class="flex flex-col items-center justify-center py-6 gap-3">
          <UIcon name="i-heroicons-users" class="w-8 h-8 text-gray-400"/>
          <p class="text-sm text-gray-500">
            {{ searchQuery ? 'Ingen beboere fundet' : 'Ingen beboere tilgængelige' }}
          </p>
        </div>
      </template>

      <template #error-state>
        <div class="flex flex-col items-center justify-center py-6 gap-3">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-red-400"/>
          <p class="text-sm text-red-600">Kunne ikke hente beboere. Prøv igen.</p>
        </div>
      </template>
    </UTable>
    
  </div>
</template>
