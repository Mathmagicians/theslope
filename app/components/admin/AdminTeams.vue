<script setup lang="ts">
/**
 * AdminTeams - one master table, one portable team detail (the AdminAllergies pattern)
 *
 * Selection rides in ?team=, the detail's face in ?mode=view|edit|create (ADR-006).
 * Everything inside the edit face saves immediately.
 *
 * DESKTOP (md+) - master table 1/5, detail pane 4/5
 * +--Madhold-------------------------------------------------------------+
 * | [Saeson: 12/26-01/27 v]                       [(plus) Opret madhold] |
 * +--------------------------------+---------------------------------------+
 * | MASTER (table, compact names)  | Madhold 2         [(pencil) Rediger]  |
 * | [Madhold 1][(hat)1][(mem)4]    |  CookingTeamCard (regular or edit):   |
 * | [Madhold 2][(hat)0][(mem)6] *  |  medlemmer, finder, dage, kalender    |
 * | [Madhold 3][(hat)2][(mem)5]    |  (edit face shows [(arrow) Tilbage])  |
 * +--------------------------------+---------------------------------------+
 *   * selected row highlighted (COMPONENTS.table.selectedRow)
 *
 * PHONE (<md) - the same detail docks under the tapped row (#expanded);
 * its header (badge + Rediger/Tilbage) is sticky while the body scrolls
 * +-----------------------------------------+
 * | [Madhold 1][(hat)1][(mem)4]  | tir, tor |
 * |-----------------------------------------|
 * | [Madhold 2]      [(pencil) Rediger]     | <- sticky under the tab bar
 * |   CookingTeamCard ...                   |
 * |-----------------------------------------|
 * | [Madhold 3][(hat)2][(mem)5]  | man      |
 * +-----------------------------------------+
 *
 * CREATE (?mode=create, from the header button) - count stepper + previews,
 * footer [Annuller] [Opret N madhold]; batch create numbers from N+1.
 */
import {h, resolveComponent} from 'vue'
import {FORM_MODES} from "~/types/form"
import type {TeamRole, CookingTeamDisplay} from "~/composables/useCookingTeamValidation"
import type {WeekDayMap} from "~/types/dateTypes"

// Props - canEdit from parent for authorization
interface Props {
  canEdit?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  canEdit: false
})

const {getDefaultCookingTeam, countChefs, getTeamShortName} = useCookingTeam()

// Layout breakpoint from the default layout - drives the detail's mount point
const isMd = inject<Ref<boolean>>('isMd', ref(false))
const store = usePlanStore()
const {
  isSeasonsLoading,
  isSelectedSeasonLoading,
  isNoSeasons,
  selectedSeason,
  activeSeason,
  seasons,
  disabledModes,
  isCreatingTeams
} = storeToRefs(store)
const {
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember
} = store

// Get teams from selected season - ALWAYS show live data
const teams = computed(() => selectedSeason.value?.CookingTeams ?? [])

// FORM MANAGEMENT - useEntityFormManager for URL/mode management only
const {formMode, onModeChange: baseOnModeChange} = useEntityFormManager<CookingTeamDisplay[]>({
  getDefaultEntity: () => [],
  selectedEntity: computed(() => teams.value)
})

const onModeChange = baseOnModeChange

// SEASON SELECTION MANAGEMENT - delegated to composable (ADR-007)
const selectedSeasonId = computed(() => selectedSeason.value?.id ?? null)
const {season} = useSeasonSelector({
  seasons: computed(() => seasons.value),
  selectedSeasonId,
  activeSeason: computed(() => activeSeason.value),
  onSeasonSelect: store.onSeasonSelect
})

const handleSeasonChange = (id: number) => {
  const seasonObject = seasons.value.find(s => s.id === id)
  if (seasonObject) {
    season.value = seasonObject.shortName
  }
}

// CREATE MODE - Component owns draft (dynamic generation based on teamCount)
const teamCount = ref(1)
const createDraft = ref<CookingTeamDisplay[]>([])

// Watch component state to regenerate CREATE draft
watch([formMode, teamCount, selectedSeason, teams], () => {
  const season = selectedSeason.value
  if (!season) return
  if (formMode.value === FORM_MODES.CREATE) {
    const existingTeamCount = teams.value.length
    createDraft.value = Array.from({length: teamCount.value}, (_, index) =>
        getDefaultCookingTeam(
            season.id!,
            season.shortName ?? '',
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

// EDIT MODE - Team selection via ?team= query param (ADR-006, survives store refresh)
// Cleanup (strip ?team= on mode change) handled by onModeChange wrapper above.
const {value: selectedTeamId} = useQueryParam<number>('team', {
  serialize: (id) => id.toString(),
  deserialize: (s) => {
    const parsed = parseInt(s)
    return !isNaN(parsed) ? parsed : null
  },
  validate: (id) => displayedTeams.value.some(t => t.id === id),
  normalize: (id) => {
    if (id && displayedTeams.value.some(t => t.id === id)) return id
    return displayedTeams.value[0]?.id ?? null
  },
  defaultValue: () => displayedTeams.value[0]?.id ?? 0,
  syncWhen: () => formMode.value !== FORM_MODES.CREATE && displayedTeams.value.some(t => t.id)
})
const selectedTeamIndex = computed(() => {
  const idx = displayedTeams.value.findIndex(t => t.id === selectedTeamId.value)
  return idx >= 0 ? idx : 0
})
const selectedTeam = computed(() => displayedTeams.value[selectedTeamIndex.value] ?? null)

// On a phone the detail docks under the selected row; the dock opens on tap and folds on
// a second tap while the selection itself stays (the pane needs one from md up)
const dockOpen = ref(false)

const handleSelectTeam = (id: number) => {
  if (!isMd.value && selectedTeamId.value === id && dockOpen.value) {
    dockOpen.value = false
    return
  }
  dockOpen.value = true
  selectedTeamId.value = id
}

// MOBILE EXPANSION - derived from the selection (the AdminAllergies pattern): UTable-initiated
// collapse closes the dock, expansion routes through the selection
const expanded = computed({
  get: (): Record<number, boolean> => {
    if (isMd.value || formMode.value === FORM_MODES.CREATE || !dockOpen.value) return {}
    const index = selectedTeamIndex.value
    return index === -1 ? {} : {[index]: true}
  },
  set: (value: Record<number, boolean>) => {
    const openIndex = Object.keys(value).find(key => value[Number(key)])
    if (openIndex !== undefined) {
      dockOpen.value = true
      selectedTeamId.value = displayedTeams.value[Number(openIndex)]?.id ?? 0
    } else {
      dockOpen.value = false
    }
  }
})

// ONE detail, two mount points (desktop pane / mobile expanded row) - shared bindings
const detailProps = computed(() => ({
  teamId: selectedTeam.value?.id ?? 0,
  teamNumber: selectedTeamIndex.value + 1,
  seasonId: selectedSeason.value?.id,
  seasonCookingDays: selectedSeason.value?.cookingDays,
  seasonDates: selectedSeason.value?.seasonDates,
  holidays: selectedSeason.value?.holidays,
  teams: displayedTeams.value.map(t => ({id: t.id!, name: t.name})),
  mode: formMode.value === FORM_MODES.EDIT ? 'edit' as const : 'regular' as const,
  useShortName: true
}))

const detailEvents = computed(() => ({
  'update:teamName': (newName: string) => handleUpdateTeamName(selectedTeam.value!.id!, newName),
  'update:affinity': (affinity: WeekDayMap<boolean> | null) => handleUpdateTeamAffinity(selectedTeam.value!.id!, affinity),
  'delete': handleDeleteTeam,
  'add:member': handleAddMember,
  'update:member': handleUpdateMember,
  'remove:member': handleRemoveMember
}))

const showAdminTeams = computed(() => {
  // A season with no teams still renders: the table shows its own #empty slot
  return !isSelectedSeasonLoading.value && !!selectedSeason.value
})

// Action button loading state - used for both :loading and :disabled (NuxtUI pattern)
const isActionLoading = computed(() => isSeasonsLoading.value || isSelectedSeasonLoading.value || isCreatingTeams.value)

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

// CREATE MODE: Batch create teams (server auto-assigns affinities + events)
const handleBatchCreateTeams = async () => {
  if (!createDraft.value.length || !selectedSeason.value?.id) return

  try {
    // The toast reports the operation result (ADR-009), not the draft
    const {teams: createdTeams, eventsAssigned} = await createTeam(createDraft.value)
    showSuccessToast('Madhold oprettet', `${createdTeams.length} madhold oprettet · ${eventsAssigned} madlavninger tildelt`)
    await onModeChange(FORM_MODES.VIEW)
  } catch (error) {
    console.error('👥 > ADMIN_TEAMS > [CREATE] Error creating teams:', error)
    throw error
  }
}

// EDIT MODE: Update team name (IMMEDIATE SAVE)
const handleUpdateTeamName = async (teamId: number, newName: string) => {
  const team = teams.value.find(t => t.id === teamId)
  if (!team) return

  await updateTeam({id: teamId, name: newName}) // Immediate save to DB
  // No toast for individual name updates (too noisy)
  // teams reactively updates from store refresh - no manual update needed
}

// EDIT MODE: Update team affinity (IMMEDIATE SAVE)
const handleUpdateTeamAffinity = async (teamId: number, affinity: WeekDayMap<boolean> | null) => {
  const team = teams.value.find(t => t.id === teamId)
  if (!team || !affinity) return

  await updateTeam({id: teamId, affinity}) // Immediate save to DB
  showSuccessToast('Madlavningsdage for teams opdateret')
  // teams reactively updates from store refresh - no manual update needed
}

// EDIT MODE: Delete team (IMMEDIATE DELETE)
const handleDeleteTeam = async (teamId: number | undefined) => {
  if (!teamId) return
  await deleteTeam(teamId) // Immediate delete from DB
  showSuccessToast('Madhold slettet')
  // teams reactively updates from store refresh - no manual update needed
}

// EDIT MODE: Add member to team (IMMEDIATE SAVE)
const handleAddMember = async (inhabitantId: number, role: TeamRole, allocationPercentage: number = 100, affinity: WeekDayMap | null = null) => {
  if (!selectedTeam.value?.id) return

  await addTeamMember({
    cookingTeamId: selectedTeam.value.id,
    inhabitantId,
    role,
    allocationPercentage,
    ...(affinity ? {affinity} : {})
  })
  showSuccessToast('Medlem tilføjet til hold')
}

// EDIT MODE: Update member (delete old + create new, single refresh)
const handleUpdateMember = async (assignmentId: number, inhabitantId: number, role: TeamRole, allocationPercentage: number = 100, affinity: WeekDayMap | null = null) => {
  if (!selectedTeam.value?.id) return
  await removeTeamMember(assignmentId)
  await addTeamMember({
    cookingTeamId: selectedTeam.value.id,
    inhabitantId,
    role,
    allocationPercentage,
    ...(affinity ? {affinity} : {})
  })
  showSuccessToast('Medlem opdateret')
}

// EDIT MODE: Remove member from team (IMMEDIATE DELETE)
const handleRemoveMember = async (assignmentId: number) => {
  await removeTeamMember(assignmentId)
  showSuccessToast('Medlem fjernet fra hold')
}

const handleCancel = async () => {
  await onModeChange(FORM_MODES.VIEW)
}

// TABLE COLUMNS - using TanStack Table API
interface TableRow {
  getIsExpanded: () => boolean
  toggleExpanded: () => void
  original: CookingTeamDisplay
}

const {ICONS, SIZES, BUTTONS, ALERTS, COLOR, BG, COMPONENTS, columnVisibility} = useTheSlopeDesignSystem()

const columns = [
  {
    id: 'expand',
    cell: ({row}: {row: TableRow}) =>
        h(resolveComponent('UButton'), {
          color: 'neutral',
          variant: 'ghost',
          icon: row.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight,
          square: true,
          'aria-label': row.getIsExpanded() ? 'Luk' : 'Åbn detaljer',
          onClick: () => row.toggleExpanded()
        })
  },
  {
    accessorKey: 'name',
    header: 'Madhold'
  },
  {
    accessorKey: 'affinity',
    header: 'Madlavningsdage'
  }
]

</script>

<template>
  <UCard
      data-testid="admin-teams"
      class="w-full px-0"
  >
    <template #header>
      <div class="flex flex-col md:flex-row items-center justify-between w-full gap-4">
        <div class="w-full md:w-auto flex flex-row items-center gap-2">
          <SeasonSelector
              :model-value="selectedSeasonId"
              :seasons="seasons"
              :loading="isSeasonsLoading"
              class="w-full md:w-auto"
              :disabled="disabledModes.includes(FORM_MODES.CREATE)"
              @update:model-value="handleSeasonChange"
          />
          <UButton
              v-if="props.canEdit && !isNoSeasons"
              v-bind="BUTTONS.primaryAction"
              :color="COLOR.secondary"
              :icon="ICONS.plusCircle"
              data-testid="create-team"
              :disabled="disabledModes.includes(FORM_MODES.CREATE)"
              @click="onModeChange(FORM_MODES.CREATE)"
          >
            Opret madhold
          </UButton>
        </div>
      </div>
    </template>

    <template #default>
      <Loader v-if="isSelectedSeasonLoading || isSeasonsLoading" text="Henter data for fællesspisningssæson"/>
      <AdminToCreateSeason v-else-if="isNoSeasons" :can-edit="props.canEdit"/>
      <div v-if="showAdminTeams">
        <!-- CREATE MODE: Team count input + preview -->
        <div v-if="formMode === FORM_MODES.CREATE" class="px-4 pb-4 space-y-4">
          <div class="flex items-center gap-4">
            <label for="team-count" class="text-lg font-bold">
              <span v-if="teams.length > 0">Vi har allerede {{
                  teams.length
                }} madhold. Hvor mange nye vil du lave?</span>
              <span v-else>Hvor mange madhold skal vi have?</span>
            </label>
            <input
                id="team-count"
                v-model.number="teamCount"
                type="number"
                min="1"
                max="20"
                class="w-20 px-3 py-2 border rounded"
            >
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="(team, index) in displayedTeams" :key="index" class="p-4 border rounded">
              <h3 class="font-semibold">{{ team.name }}</h3>
            </div>
          </div>
        </div>

        <!-- VIEW + EDIT: one master table; the detail mounts in the md+ pane or docks under the selected row -->
        <div v-else class="px-4 pb-4 space-y-6">
          <div class="flex flex-col md:flex-row gap-6 md:gap-3">
          <div class="w-full md:w-1/5">
          <UTable
              v-model:expanded="expanded"
              :columns="columns"
              :column-visibility="columnVisibility([], ['affinity', 'expand'])"
              :data="displayedTeams"
              :loading="isSelectedSeasonLoading"
              :ui="COMPONENTS.table.ui"
          >
            <template #name-cell="{ row }">
              <div
                  :class="['cursor-pointer rounded-md p-1', row.original.id === selectedTeamId && COMPONENTS.table.selectedRow]"
                  :data-testid="`team-row-${row.original.id}`"
                  @click="handleSelectTeam(row.original.id!)"
              >
                <CookingTeamBadges
                    :team-number="displayedTeams.findIndex(t => t.id === row.original.id) + 1"
                    :team-name="getTeamShortName(row.original.name)"
                    :chef-count="countChefs(row.original.assignments ?? [])"
                    :member-count="row.original.assignments?.length ?? 0"
                    :cooking-days-count="row.original.cookingDaysCount ?? 0"
                    size="small"
                />
              </div>
            </template>

            <template #affinity-cell="{ row }">
              <WeekDayMapDisplay
                  :model-value="row.original.affinity"
                  compact
              />
            </template>

            <!-- Docked detail (phone): the same card as the pane, its header pinned while the body scrolls -->
            <template #expanded>
              <div v-if="selectedTeam?.id" :class="['p-2 space-y-2', BG.panel]">
                <div :class="['sticky top-24 z-10 flex items-center justify-between gap-2 py-2', BG.panel]">
                  <CookingTeamBadges
                      :team-number="selectedTeamIndex + 1"
                      :team-name="getTeamShortName(selectedTeam.name)"
                      :show-counts="false"
                      size="small"
                  />
                  <UButton
                      v-if="props.canEdit && formMode === FORM_MODES.VIEW"
                      v-bind="BUTTONS.secondaryAction"
                      :color="COLOR.primary"
                      :icon="ICONS.edit"
                      data-testid="edit-team"
                      :aria-label="`Rediger ${getTeamShortName(selectedTeam.name)}`"
                      @click="onModeChange(FORM_MODES.EDIT)"
                  >
                    Rediger
                  </UButton>
                  <UButton
                      v-else-if="formMode === FORM_MODES.EDIT"
                      v-bind="BUTTONS.secondaryAction"
                      :icon="ICONS.arrowLeft"
                      data-testid="back-to-view"
                      @click="onModeChange(FORM_MODES.VIEW)"
                  >
                    Tilbage
                  </UButton>
                </div>
                <CookingTeamCard v-bind="detailProps" v-on="detailEvents" />
              </div>
            </template>

            <!-- The table owns its empty state: no separate alert rendered instead of the table -->
            <template #empty>
              <UAlert
                  v-bind="ALERTS.emptyState"
                  data-testid="teams-empty-state"
                  :avatar="{text: '💤', size: SIZES.emptyStateAvatar}"
                  title="Her ser lidt tomt ud!"
                  description="Ingen madhold oprettet endnu - opret nogle madhold for at komme i gang!"
              >
                <template v-if="props.canEdit && !disabledModes.includes(FORM_MODES.CREATE)" #actions>
                  <UButton
                      v-bind="BUTTONS.primaryAction"
                      name="create-new-team"
                      data-testid="create-new-team"
                      :color="COLOR.secondary"
                      :icon="ICONS.plusCircle"
                      @click="onModeChange(FORM_MODES.CREATE)"
                  >
                    Opret madhold
                  </UButton>
                </template>
              </UAlert>
            </template>
          </UTable>
          </div>

          <!-- DETAIL pane (md+): the same card as the dock -->
          <div v-if="selectedTeam?.id" class="hidden md:block md:w-4/5 space-y-4 self-start">
            <div class="flex items-center justify-between gap-2">
              <CookingTeamBadges
                  :team-number="selectedTeamIndex + 1"
                  :team-name="getTeamShortName(selectedTeam.name)"
                  :show-counts="false"
              />
              <UButton
                  v-if="props.canEdit && formMode === FORM_MODES.VIEW"
                  v-bind="BUTTONS.secondaryAction"
                  :color="COLOR.primary"
                  :icon="ICONS.edit"
                  data-testid="edit-team"
                  :aria-label="`Rediger ${getTeamShortName(selectedTeam.name)}`"
                  @click="onModeChange(FORM_MODES.EDIT)"
              >
                Rediger {{ getTeamShortName(selectedTeam.name) }}
              </UButton>
              <UButton
                  v-else-if="formMode === FORM_MODES.EDIT"
                  v-bind="BUTTONS.secondaryAction"
                  :icon="ICONS.arrowLeft"
                  data-testid="back-to-view"
                  @click="onModeChange(FORM_MODES.VIEW)"
              >
                Tilbage
              </UButton>
            </div>
            <CookingTeamCard v-bind="detailProps" v-on="detailEvents" />
          </div>
          </div>

          <!-- Team calendar view -->
          <TeamCalendarDisplay
              v-if="selectedSeason && displayedTeams.length > 0"
              :season-dates="selectedSeason.seasonDates"
              :teams="displayedTeams"
              :dinner-events="selectedSeason.dinnerEvents ?? []"
              :holidays="selectedSeason.holidays"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div v-if="formMode === FORM_MODES.CREATE" class="flex gap-2">
        <UButton data-testid="submit-create-teams" :color="COLOR.secondary" :loading="isActionLoading" :disabled="isActionLoading" @click="handleBatchCreateTeams">
          {{ isActionLoading ? 'Arbejder...' : 'Opret madhold' }}
        </UButton>
        <UButton :color="COLOR.neutral" variant="ghost" @click="handleCancel">
          Annuller
        </UButton>
      </div>

    </template>
  </UCard>
</template>
