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
import { getPaginationRowModel, getSortedRowModel } from '@tanstack/vue-table'
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
  seasonId: number
  teamNumber: number  // For color matching
  teamColor: string   // For color matching
  teams?: Array<{ id: number, name: string }>  // All teams in season for lookup
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'add:member': [inhabitantId: number, role: TeamRole]
  'remove:member': [assignmentId: number]
}>()

// Business logic: Fetch inhabitants with assignments (ADR-009 compliant)
const {useInhabitantsWithAssignments, getTeamColor} = useCookingTeam()
const {inhabitants: inhabitantsWithAssignments, pending, error, refresh} = await useInhabitantsWithAssignments()

// Expose refresh method to parent
defineExpose({
  refresh
})

// Inject responsive breakpoint from parent
const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)

// Import Role enum for use in template (ADR-001 compliance)
const { TeamRoleSchema } = useCookingTeamValidation()
const Role = TeamRoleSchema.enum

// Search and filtering
const searchQuery = ref('')

const roleLabels = {
  [Role.CHEF]: 'Chefkok',
  [Role.COOK]: 'Kok',
  [Role.JUNIORHELPER]: 'Kokkespire'
}

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
    return {type: 'available' as const, teamNumber: null, color: null, assignmentId: null}
  }

  if (assignment.cookingTeamId === props.teamId) {
    return {
      type: 'current' as const,
      teamNumber: props.teamNumber,
      color: props.teamColor,
      assignmentId: assignment.id
    }
  }

  // For other teams, look up by ID to get the correct index (and thus correct number/color)
  const teamIndex = props.teams?.findIndex(t => t.id === assignment.cookingTeamId) ?? -1
  const otherTeamNumber = teamIndex >= 0 ? teamIndex + 1 : 1  // 1-based display number
  const otherTeamColor = teamIndex >= 0 ? getTeamColor(teamIndex) : 'neutral'

  return {
    type: 'other' as const,
    teamNumber: otherTeamNumber,
    color: otherTeamColor,
    assignmentId: assignment.id
  }
}

// Custom sort function for status column
const sortByStatusTeamAndName = (rowA: any, rowB: any): number => {
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
  <div class="space-y-3">
    <!-- Search and Pagination Row -->
    <div class="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
      <!-- Search -->
      <UInput
          v-model="searchQuery"
          trailing-icon="i-heroicons-magnifying-glass"
          placeholder="Søg efter navn..."
          class="flex-1 md:max-w-md"
      />
      <!-- Pagination -->
      <UPagination
          :default-page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
          :items-per-page="table?.tableApi?.getState().pagination.pageSize"
          :total="table?.tableApi?.getFilteredRowModel().rows.length"
          :size="getIsMd ? 'md' : 'sm'"
          :sibling-count="getIsMd ? 2 : 0"
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
        :ui="{ td: 'py-2' }"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel()
        }"
        class="flex-1"
    >
      <!-- Custom header for status column with sort button -->
      <template #status-header>
        <UButton
            variant="outline"
            size="md"
            name="sort-by-status"
            @click="toggleSortOrder"
        >
          <template #leading>
            <UIcon
                :name="sorting[0].desc ? 'i-lucide-arrow-down-wide-narrow' : 'i-lucide-arrow-up-narrow-wide'"
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
        <UBadge
            v-if="getTeamInfo(row.original).type === 'available'"
            color="success"
            variant="outline"
            size="sm"
        >
          LEDIG
        </UBadge>
        <UBadge
            v-else
            :color="getTeamInfo(row.original).color"
            variant="solid"
            size="sm"
        >
          Madhold {{ getTeamInfo(row.original).teamNumber }}
        </UBadge>
      </template>

      <!-- Actions column with role buttons or remove button -->
      <template #actions-cell="{ row }">
        <div v-if="getTeamInfo(row.original).type === 'available'" class="flex gap-1">
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
            v-else-if="getTeamInfo(row.original).type === 'current'"
            color="error"
            variant="ghost"
            size="sm"
            icon="i-heroicons-x-mark"
            @click="handleRemoveMember(getTeamInfo(row.original).assignmentId!)"
        >
          Fjern
        </UButton>
        <span v-else class="text-xs text-gray-500">I andet hold</span>
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
