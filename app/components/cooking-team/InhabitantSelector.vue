<script setup lang="ts">
/**
 * InhabitantSelector Component - Assign inhabitants to cooking teams
 *
 * Features:
 * - Search/filter through 100-200 inhabitants
 * - Show assignment status with team badges
 * - Direct role action buttons (CHEF, COOK, JUNIORHELPER)
 * - Immediate save on add/remove
 * - UTable for consistent UI
 */

interface Inhabitant {
  id: number
  name: string
  lastName: string
  pictureUrl: string | null
  CookingTeamAssignment?: Array<{
    id: number
    role: 'CHEF' | 'COOK' | 'JUNIORHELPER'
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
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'add:member': [inhabitantId: number, role: 'CHEF' | 'COOK' | 'JUNIORHELPER']
  'remove:member': [assignmentId: number]
}>()

// Business logic: Fetch inhabitants with assignments (ADR-009 compliant)
const { useInhabitantsWithAssignments, getTeamColor } = useCookingTeam()
const { inhabitants: inhabitantsWithAssignments, pending, error, refresh } = await useInhabitantsWithAssignments()

// Expose refresh method to parent
defineExpose({
  refresh
})

// Search and filtering
const searchQuery = ref('')

const roleLabels = {
  CHEF: 'Chefkok',
  COOK: 'Kok',
  JUNIORHELPER: 'Kokkespire'
}

// Filter inhabitants
const filteredInhabitants = computed(() => {
  if (!inhabitantsWithAssignments.value) return []

  let filtered = inhabitantsWithAssignments.value.filter((inhabitant) => {
    const fullName = `${inhabitant.name} ${inhabitant.lastName}`.toLowerCase()
    return fullName.includes(searchQuery.value.toLowerCase())
  })

  // Sort by assignment status (available first, then current team, then other teams)
  filtered.sort((a, b) => {
    const aAssignment = a.CookingTeamAssignment?.[0]
    const bAssignment = b.CookingTeamAssignment?.[0]

    const aInCurrentTeam = aAssignment?.cookingTeamId === props.teamId
    const bInCurrentTeam = bAssignment?.cookingTeamId === props.teamId

    if (aInCurrentTeam && !bInCurrentTeam) return -1
    if (!aInCurrentTeam && bInCurrentTeam) return 1
    if (!aAssignment && bAssignment) return -1
    if (aAssignment && !bAssignment) return 1

    return a.name.localeCompare(b.name)
  })

  return filtered
})

// Helper functions to get team info from assignment
const getTeamInfo = (inhabitant: Inhabitant) => {
  const assignment = inhabitant.CookingTeamAssignment?.[0]

  if (!assignment) {
    return { type: 'available' as const, teamNumber: null, color: null, assignmentId: null }
  }

  if (assignment.cookingTeamId === props.teamId) {
    return {
      type: 'current' as const,
      teamNumber: props.teamNumber,
      color: props.teamColor,
      assignmentId: assignment.id
    }
  }

  // For other teams, we need to extract team number from name (e.g., "Hold 3" → 3)
  const teamNameMatch = assignment.cookingTeam.name.match(/Hold (\d+)/)
  const otherTeamNumber = teamNameMatch ? parseInt(teamNameMatch[1]) : 1
  const otherTeamColor = getTeamColor(otherTeamNumber - 1)

  return {
    type: 'other' as const,
    teamNumber: otherTeamNumber,
    color: otherTeamColor,
    assignmentId: assignment.id
  }
}

const handleAddMember = (inhabitantId: number, role: 'CHEF' | 'COOK' | 'JUNIORHELPER') => {
  emit('add:member', inhabitantId, role)
}

const handleRemoveMember = (assignmentId: number) => {
  emit('remove:member', assignmentId)
}

// Table columns - use template slots for better component compatibility
const columns = [
  { accessorKey: 'name', header: 'Navn' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'actions', header: 'Tilføj til team' }
]
</script>

<template>
  <div class="space-y-4">
    <!-- Search -->
    <UInput
      v-model="searchQuery"
      trailing-icon="i-heroicons-magnifying-glass"
      placeholder="Søg efter navn..."
    />

    <!-- Table -->
    <UTable
      :columns="columns"
      :data="filteredInhabitants"
      :loading="pending"
      :ui="{ td: 'py-2' }"
    >
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
            @click="handleAddMember(row.original.id, 'CHEF')"
          >
            Chef
          </UButton>
          <UButton
            color="primary"
            size="xs"
            icon="i-heroicons-plus"
            @click="handleAddMember(row.original.id, 'COOK')"
          >
            Kok
          </UButton>
          <UButton
            color="primary"
            size="xs"
            icon="i-heroicons-plus"
            @click="handleAddMember(row.original.id, 'JUNIORHELPER')"
          >
            Spire
          </UButton>
        </div>
        <UButton
          v-else-if="getTeamInfo(row.original).type === 'current'"
          color="red"
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
          <UIcon name="i-heroicons-users" class="w-8 h-8 text-gray-400" />
          <p class="text-sm text-gray-500">
            {{ searchQuery ? 'Ingen beboere fundet' : 'Ingen beboere tilgængelige' }}
          </p>
        </div>
      </template>

      <template #error-state>
        <div class="flex flex-col items-center justify-center py-6 gap-3">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-red-400" />
          <p class="text-sm text-red-600">Kunne ikke hente beboere. Prøv igen.</p>
        </div>
      </template>
    </UTable>
  </div>
</template>
