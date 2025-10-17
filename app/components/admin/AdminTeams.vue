<script setup lang="ts">
/**
 * AdminTeams Component - Master-Detail Pattern for Team Management
 *
 * EDIT MODE Layout:
 * ┌─────────────────┬──────────────────────────────┐
 * │ TEAMS (Left)    │ EDIT TEAM (Right)            │
 * │                 │                              │
 * │ □ Hold 1 [8]    │ ┌─ Hold 1 ────────────┐     │
 * │ ■ Hold 2 [6]    │ │ Name: [Hold 2      ]│     │
 * │ □ Hold 3 [0]    │ └─────────────────────┘     │
 * │ □ Hold 4 [5]    │                              │
 * │ ...             │ Current Members:             │
 * │                 │ 👤 Anna (Chef)               │
 * │                 │ 👤 Bob (Cook)                │
 * │                 │                              │
 * │                 │ Add Members: [search...]     │
 * │                 │ ☐ Charlie (available)        │
 * │                 │ ☐ Diana (available)          │
 * │                 │ ☑ Anna (in Hold 2)           │
 * └─────────────────┴──────────────────────────────┘
 */
import {FORM_MODES} from "~/types/form"
import {ADMIN_HELP_TEXTS} from "~/config/help-texts"
import type {CookingTeam} from "~/composables/useCookingTeamValidation"

const {getDefaultCookingTeam, getTeamColor} = useCookingTeam()
const store = usePlanStore()
const {
  isLoading,
  isNoSeasons,
  selectedSeason,
  seasons,
  disabledModes
} = storeToRefs(store)
const {createTeam, updateTeam, deleteTeam, onSeasonSelect, addTeamMember, removeTeamMember, assignTeamAffinities} = store

// Get teams from selected season - ALWAYS show live data
const teams = computed(() => selectedSeason.value?.CookingTeams ?? [])
const isNoTeams = computed(() => teams.value.length === 0)

// FORM MANAGEMENT - useEntityFormManager for URL/mode management only
const {formMode, onModeChange} = useEntityFormManager<CookingTeam[]>({
  getDefaultEntity: () => [], // Not used - component manages CREATE draft
  selectedEntity: computed(() => teams.value)
})

// CREATE MODE - Component owns draft (dynamic generation based on teamCount)
const teamCount = ref(1)
const createDraft = ref<CookingTeam[]>([])

// Watch component state to regenerate CREATE draft
watch([formMode, teamCount, selectedSeason, teams], () => {
  if (formMode.value === FORM_MODES.CREATE && selectedSeason.value) {
    const existingTeamCount = teams.value.length
    createDraft.value = Array.from({length: teamCount.value}, (_, index) =>
        getDefaultCookingTeam(
            selectedSeason.value.id!,
            selectedSeason.value.shortName ?? '',
            existingTeamCount + index + 1  // Start numbering from N+1
        )
    )
  }
}, {immediate: true})

// DISPLAYED TEAMS - Component-owned draft for CREATE, live data for EDIT/VIEW
// NOTE: Must be defined BEFORE selectedTeam and teamTabs that depend on it
const displayedTeams = computed(() => {
  if (formMode.value === FORM_MODES.CREATE) {
    return createDraft.value
  }
  return teams.value
})

// EDIT MODE - Team selection for master-detail pattern
const selectedTeamIndex = ref(0)
const selectedTeam = computed(() => {
  if (displayedTeams.value.length === 0) return null
  return displayedTeams.value[selectedTeamIndex.value] ?? null
})

// Team tabs for vertical navigation
const teamTabs = computed(() => {
  return displayedTeams.value.map((team, index) => ({
    label: team.name,
    value: index,
    icon: 'i-fluent-mdl2-team-favorite',
    badge: team.assignments?.length || 0,
    color: getTeamColor(index)
  }))
})

// Auto-select first team when entering EDIT mode or when teams change
watch([formMode, displayedTeams], () => {
  if (formMode.value === FORM_MODES.EDIT && displayedTeams.value.length > 0) {
    // Reset to first team if current selection is invalid
    if (selectedTeamIndex.value >= displayedTeams.value.length) {
      selectedTeamIndex.value = 0
    }
  }
}, {immediate: true})

// COMPUTED
const selectedSeasonId = computed({
  get: () => selectedSeason.value?.id ?? undefined,
  set: (id: number | undefined) => {
    if (id) {
      onSeasonSelect(id)
    }
  }
})

const showAdminTeams = computed(() => {
  return !isLoading.value && selectedSeason.value && (!isNoTeams.value || formMode.value === FORM_MODES.CREATE)
})

// UTILITY
const showSuccessToast = (title: string, description?: string) => {
  const toast = useToast()
  toast.add({
    title,
    description,
    icon: 'i-heroicons-check-circle',
    color: 'success'
  })
}

// BUSINESS LOGIC

// CREATE MODE: Batch create teams
const handleBatchCreateTeams = async () => {
  if (!createDraft.value.length || !selectedSeason.value?.id) return

  // Step 1: Create all teams
  for (const team of createDraft.value) {
    await createTeam(team)
  }

  // Step 2: Assign affinities to teams
  try {
    const result = await assignTeamAffinities(selectedSeason.value.id)
    showSuccessToast('Madhold oprettet', `${createDraft.value.length} madhold oprettet med madlavningsdage`)
  } catch (affinityError) {
    // Teams created but affinity assignment failed
    showSuccessToast('Madhold oprettet', 'Madlavningsdage kunne ikke tildeles automatisk')
  }

  await onModeChange(FORM_MODES.VIEW)
}

// EDIT MODE: Add new team (IMMEDIATE SAVE)
const handleAddTeam = async () => {
  if (!selectedSeason.value?.id) return

  const newTeam = getDefaultCookingTeam(
      selectedSeason.value.id,
      selectedSeason.value.shortName ?? '',
      teams.value.length + 1
  )

  // Step 1: Create the team
  await createTeam(newTeam)

  // Step 2: Assign affinities to all teams (recalculates rotation)
  try {
    await assignTeamAffinities(selectedSeason.value.id)
    showSuccessToast('Madhold tilføjet', 'Madlavningsdage tildelt automatisk')
  } catch (affinityError) {
    // Team created but affinity assignment failed
    showSuccessToast('Madhold tilføjet', 'Madlavningsdage kunne ikke tildeles automatisk')
  }

  // teams reactively updates from store refresh - no manual update needed
}

// EDIT MODE: Update team name (IMMEDIATE SAVE)
const handleUpdateTeamName = async (teamId: number, newName: string) => {
  const team = teams.value.find(t => t.id === teamId)
  if (!team) return

  await updateTeam({...team, name: newName}) // Immediate save to DB
  // No toast for individual name updates (too noisy)
  // teams reactively updates from store refresh - no manual update needed
}

// EDIT MODE: Update team affinity (IMMEDIATE SAVE)
const handleUpdateTeamAffinity = async (teamId: number, affinity: any) => {
  const team = teams.value.find(t => t.id === teamId)
  if (!team) return

  await updateTeam({...team, affinity}) // Immediate save to DB
  showSuccessToast('Madlavningsdage opdateret')
  // teams reactively updates from store refresh - no manual update needed
}

// EDIT MODE: Delete team (IMMEDIATE DELETE)
const handleDeleteTeam = async (teamId: number) => {
  await deleteTeam(teamId) // Immediate delete from DB
  showSuccessToast('Madhold slettet')
  // teams reactively updates from store refresh - no manual update needed
}

// Ref to InhabitantSelector for refreshing after operations
const inhabitantSelectorRef = ref<{ refresh: () => Promise<void> } | null>(null)

// EDIT MODE: Add member to team (IMMEDIATE SAVE)
const handleAddMember = async (inhabitantId: number, role: 'CHEF' | 'COOK' | 'JUNIORHELPER') => {
  if (!selectedTeam.value?.id) return

  await addTeamMember({
    cookingTeamId: selectedTeam.value.id,
    inhabitantId,
    role,
    allocationPercentage: 100
  })
  showSuccessToast('Medlem tilføjet til hold')
  // Refresh inhabitant selector after store refresh
  await inhabitantSelectorRef.value?.refresh()
}

// EDIT MODE: Remove member from team (IMMEDIATE DELETE)
const handleRemoveMember = async (assignmentId: number) => {
  await removeTeamMember(assignmentId)
  showSuccessToast('Medlem fjernet fra hold')
  // Refresh inhabitant selector after store refresh
  await inhabitantSelectorRef.value?.refresh()
}

const handleCancel = async () => {
  await onModeChange(FORM_MODES.VIEW)
}

// TABLE COLUMNS for VIEW mode
const columns = [
  {
    accessorKey: 'name',
    header: 'Madhold'
  },
  {
    accessorKey: 'affinity',
    header: 'Madlavningsdage'
  },
  {
    accessorKey: 'assignments',
    header: 'Medlemmer'
  }
]

</script>

<template>
  <UCard
      data-test-id="admin-teams"
      class="w-full px-0"
  >
    <template #header>
      <div class="flex flex-col md:flex-row items-center justify-between w-full gap-4">
        <div class="w-full md:w-auto flex flex-row items-center gap-2">
          <USelect
              arrow
              data-testid="season-selector"
              v-model="selectedSeasonId"
              color="warning"
              :loading="isLoading"
              :placeholder="seasons?.length > 0 ? 'Vælg sæson' : 'Ingen sæsoner'"
              :items="seasons?.map(s => ({ ...s, label: s.shortName }))"
              value-key="id"
          />
          <FormModeSelector v-model="formMode" :disabled-modes="disabledModes" @change="onModeChange"/>
        </div>
        <div class="w-full md:w-auto md:ml-auto">
          <HelpButton :text="ADMIN_HELP_TEXTS.planning.teams"/>
        </div>
      </div>
    </template>

    <template #default>
      <div v-if="showAdminTeams">
        <!-- CREATE MODE: Team count input + preview -->
        <div v-if="formMode === FORM_MODES.CREATE" class="px-4 pb-4 space-y-4">
          <div class="flex items-center gap-4">
            <label for="team-count" class="text-lg font-bold">
              <span v-if="teams.length > 0">Vi har allerede {{ teams.length }} madhold. Hvor mange nye vil du lave?</span>
              <span v-else>Hvor mange madhold skal vi have?</span>
            </label>
            <input
                id="team-count"
                v-model.number="teamCount"
                type="number"
                min="1"
                max="20"
                class="w-20 px-3 py-2 border rounded"
            />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="(team, index) in displayedTeams" :key="index" class="p-4 border rounded">
              <h3 class="font-semibold">{{ team.name }}</h3>
            </div>
          </div>
        </div>

        <!-- EDIT MODE: Master-Detail Layout -->
        <div v-else-if="formMode === FORM_MODES.EDIT" class="px-4 pb-4 space-y-6">
          <div class="flex flex-col lg:flex-row gap-6">
            <!-- LEFT PANEL: Vertical Team Tabs -->
            <div class="lg:w-1/5 space-y-3" data-testid="team-tabs-list">
              <h3 class="text-lg font-semibold mb-4">Madhold</h3>

              <UTabs
                  v-model="selectedTeamIndex"
                  orientation="vertical"
                  :items="teamTabs"
                  variant="link"
                  size="xl"
              >
                <template #item="{ item }">
                  <CookingTeamCard
                      :team-id="displayedTeams[item.value].id"
                      :team-number="item.value + 1"
                      :team-name="item.label"
                      :assignments="displayedTeams[item.value].assignments || []"
                      compact
                      :mode="FORM_MODES.VIEW"
                      :show-members="false"
                  />
                </template>
              </UTabs>
            </div>

            <!-- RIGHT PANEL: Edit Selected Team -->
            <div class="lg:w-4/5 space-y-4">
              <div v-if="selectedTeam" class="space-y-4">
                <CookingTeamCard
                    ref="cookingTeamCardRef"
                    :team-id="selectedTeam.id"
                    :team-number="displayedTeams.findIndex(t => t.id === selectedTeam.id) + 1"
                    :team-name="selectedTeam.name"
                    :season-id="selectedSeason?.id"
                    :assignments="selectedTeam.assignments || []"
                    :affinity="selectedTeam.affinity"
                    :season-cooking-days="selectedSeason?.cookingDays"
                    :mode="FORM_MODES.EDIT"
                    @update:team-name="(newName) => handleUpdateTeamName(selectedTeam.id!, newName)"
                    @update:affinity="(affinity) => handleUpdateTeamAffinity(selectedTeam.id!, affinity)"
                    @delete="handleDeleteTeam"
                    @add:member="handleAddMember"
                    @remove:member="handleRemoveMember"
                />
              </div>

              <div v-else
                   class="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg text-gray-500">
                <UIcon name="i-heroicons-arrow-left" class="text-4xl mb-2"/>
                <p>Vælg et madhold for at redigere</p>
              </div>
            </div>
          </div>
        </div>

        <!-- VIEW MODE: Table with team assignments -->
        <UTable
            v-else
            :columns="columns"
            :data="displayedTeams"
            :loading="isLoading"
            :ui="{ td: 'py-2' }"
        >
          <!-- Team name column with colored badge -->
          <template #name-cell="{ row }">
            <UBadge
                :color="getTeamColor(displayedTeams.findIndex(t => t.id === row.original.id))"
                variant="soft"
                size="md"
            >
              {{ row.original.name }}
            </UBadge>
          </template>

          <!-- Team affinity column with compact WeekDayMapDisplay -->
          <template #affinity-cell="{ row }">
            <WeekDayMapDisplay
                :model-value="row.original.affinity"
                :color="getTeamColor(displayedTeams.findIndex(t => t.id === row.original.id))"
                compact
            />
          </template>

          <!-- Team assignments column with compact CookingTeamCard -->
          <template #assignments-cell="{ row }">
            <CookingTeamCard
                :team-id="row.original.id"
                :team-number="displayedTeams.findIndex(t => t.id === row.original.id) + 1"
                :team-name="row.original.name"
                :assignments="row.original.assignments || []"
                compact
                :mode="FORM_MODES.VIEW"
            />
          </template>

          <template #empty-state>
            <div class="flex flex-col items-center justify-center py-6 gap-3">
              <UIcon name="i-heroicons-user-group" class="w-8 h-8 text-gray-400"/>
              <p data-testid="teams-empty-state" class="text-sm text-gray-500">Ingen madhold endnu. Opret nogle madhold
                for at komme i gang!</p>
              <UButton
                  v-if="!disabledModes.includes(FORM_MODES.CREATE)"
                  name="create-new-team"
                  color="secondary"
                  size="sm"
                  icon="i-heroicons-plus-circle"
                  @click="onModeChange(FORM_MODES.CREATE)"
              >
                Opret madhold
              </UButton>
            </div>
          </template>
        </UTable>
      </div>

      <Loader v-else-if="isLoading" text="Madhold"/>
      <div v-else-if="isNoSeasons"
           class="flex flex-col items-center justify-center space-y-4 p-8">
        <h3 class="text-lg font-semibold">Ingen sæson valgt</h3>
        <p>Vælg en sæson for at se madhold, eller opret en ny sæson under Planlægning.</p>
      </div>
    </template>

    <template #footer>
      <div v-if="formMode === FORM_MODES.CREATE" class="flex gap-2">
        <UButton color="secondary" @click="handleBatchCreateTeams">
          Opret madhold
        </UButton>
        <UButton color="neutral" variant="ghost" @click="handleCancel">
          Annuller
        </UButton>
      </div>

      <div v-else-if="formMode === FORM_MODES.EDIT" class="flex gap-2">
        <UButton
            data-testid="add-team-button"
            color="secondary"
            icon="i-heroicons-plus-circle"
            @click="handleAddTeam"
        >
          Tilføj madhold
        </UButton>
        <UButton color="gray" variant="ghost" @click="handleCancel">
          Færdig
        </UButton>
      </div>
    </template>
  </UCard>
</template>
