<script setup lang="ts">
import {FORM_MODES} from "~/types/form"
import {ADMIN_HELP_TEXTS} from "~/config/help-texts"
import type {CookingTeam} from "~/composables/useCookingTeamValidation"

const {getDefaultCookingTeam} = useCookingTeam()
const store = usePlanStore()
const {
  isLoading,
  isNoSeasons,
  selectedSeason,
  seasons,
  disabledModes
} = storeToRefs(store)
const {createTeam, updateTeam, deleteTeam, onSeasonSelect} = store

// Get teams from selected season - ALWAYS show live data
const teams = computed(() => selectedSeason.value?.CookingTeams ?? [])
const isNoTeams = computed(() => teams.value.length === 0)

// FORM MANAGEMENT - useEntityFormManager for URL/mode management only
const { formMode, onModeChange } = useEntityFormManager<CookingTeam[]>({
  getDefaultEntity: () => [], // Not used - component manages CREATE draft
  selectedEntity: computed(() => teams.value)
})

// CREATE MODE - Component owns draft (dynamic generation based on teamCount)
const teamCount = ref(1)
const createDraft = ref<CookingTeam[]>([])

// Watch component state to regenerate CREATE draft
watch([formMode, teamCount, selectedSeason], () => {
  if (formMode.value === FORM_MODES.CREATE && selectedSeason.value) {
    createDraft.value = Array.from({length: teamCount.value}, (_, index) =>
      getDefaultCookingTeam(
        selectedSeason.value.id!,
        selectedSeason.value.shortName ?? '',
        index + 1
      )
    )
  }
}, { immediate: true })

// DISPLAYED TEAMS - Component-owned draft for CREATE, live data for EDIT/VIEW
const displayedTeams = computed(() => {
  if (formMode.value === FORM_MODES.CREATE) {
    return createDraft.value
  }
  return teams.value
})

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
  if (!createDraft.value.length) return

  try {
    for (const team of createDraft.value) {
      await createTeam(team)
    }
    showSuccessToast('Madhold oprettet', `${createDraft.value.length} madhold oprettet`)
    await onModeChange(FORM_MODES.VIEW)
  } catch (error) {
    // Error toast already shown by handleApiError
  }
}

// EDIT MODE: Add new team (IMMEDIATE SAVE)
const handleAddTeam = async () => {
  if (!selectedSeason.value) return

  try {
    const newTeam = getDefaultCookingTeam(
      selectedSeason.value.id!,
      selectedSeason.value.shortName ?? '',
      teams.value.length + 1
    )
    await createTeam(newTeam) // Immediate save to DB
    showSuccessToast('Madhold tilføjet')
    // teams reactively updates from store refresh - no manual update needed
  } catch (error) {
    // Error toast already shown by handleApiError
  }
}

// EDIT MODE: Update team (IMMEDIATE SAVE)
const handleUpdateTeam = async (team: CookingTeam) => {
  try {
    await updateTeam(team) // Immediate save to DB
    // No toast for individual name updates (too noisy)
    // teams reactively updates from store refresh - no manual update needed
  } catch (error) {
    // Error toast already shown by handleApiError
  }
}

// EDIT MODE: Delete team (IMMEDIATE DELETE)
const handleDeleteTeam = async (teamId: number) => {
  try {
    await deleteTeam(teamId) // Immediate delete from DB
    showSuccessToast('Madhold slettet')
    // teams reactively updates from store refresh - no manual update needed
  } catch (error) {
    // Error toast already shown by handleApiError
  }
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
    accessorKey: 'assignments',
    header: 'Medlemmer',
    cell: ({row}: any) => {
      const teamIndex = teams.value.findIndex(t => t.id === row.original.id)
      return h(resolveComponent('CookingTeamAssignments'), {
        teamId: row.original.id,
        teamNumber: teamIndex + 1,
        assignments: row.original.assignments || [],
        compact: true
      })
    }
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
        <div v-if="formMode === FORM_MODES.CREATE" class="p-4 space-y-4">
          <div class="flex items-center gap-4">
            <label for="team-count" class="text-sm font-medium">Antal madhold:</label>
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
          <div class="flex gap-2">
            <UButton color="primary" @click="handleBatchCreateTeams">Opret madhold</UButton>
            <UButton color="gray" @click="handleCancel">Annuller</UButton>
          </div>
        </div>

        <!-- EDIT MODE: Live data with immediate operations -->
        <div v-else-if="formMode === FORM_MODES.EDIT" class="p-4 space-y-4">
          <div class="space-y-2">
            <CookingTeamCard
              v-for="team in displayedTeams"
              :key="team.id"
              :team="team"
              mode="edit"
              variant="list"
              @update="handleUpdateTeam"
              @delete="handleDeleteTeam"
            />
          </div>
          <UButton color="secondary" icon="i-heroicons-plus-circle" @click="handleAddTeam">
            Tilføj madhold
          </UButton>
          <div class="flex gap-2">
            <UButton color="gray" @click="handleCancel">Færdig</UButton>
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
          <template #empty-state>
            <div class="flex flex-col items-center justify-center py-6 gap-3">
              <UIcon name="i-heroicons-user-group" class="w-8 h-8 text-gray-400"/>
              <p class="text-sm text-gray-500">Ingen madhold endnu. Opret madhold for at komme i gang!</p>
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
  </UCard>
</template>