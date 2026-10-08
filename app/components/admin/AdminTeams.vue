<script setup lang="ts">
/**
 * AdminTeams - one master table, one portable team detail
 *
 * Selection is the open state and rides in ?team=; the detail's face rides in
 * ?mode=view|edit|create (ADR-006). The master table is constant - one third
 * of the row from md, the same columns in every state - and only the region
 * beside it swaps: the all-teams calendar with no selection (the overview, at
 * a glance), the framed team detail when a row is open. Everything inside the
 * edit face saves immediately. The toggle chevron turns toward the open detail
 * (up folds the phone dock, right points into the md+ pane) and the row click
 * toggles the same way.
 *
 * Overview (default; desktop shown, the phone stacks the calendar below)
 * +--Madhold-------------------------------------------------------------+
 * | [Saeson: 12/26-01/27 v]                       [(plus) Opret madhold] |
 * +---------------------------------+-------------------------------------+
 * | v | Madhold           | Dage    |                                     |
 * | v | [Madhold 1]...    | tir, ons|   ALL-TEAMS CALENDAR                |
 * | v | [Madhold 2]...    | man, tor|   (all teams at a glance)           |
 * +---------------------------------+-------------------------------------+
 *
 * Desktop (md+), team open - the same master, the framed detail in its place
 * +---------------------------------+-------------------------------------+
 * | v | Madhold           | Dage    | +---------------------------------+ |
 * | > I [Madhold 2]...    | man, tor| | Madhold 2  [(pencil) Rediger]   | |
 * | v | [Madhold 3]...    | man     | | medlemmer, finder, dage +       | |
 * |   |                   |         | | holdets kalender                | |
 * +---------------------------------+-+---------------------------------+-+
 *   I = left tab accent in the team's rainbow colour (getRainbowAccent)
 *   the edit face swaps the pencil for [(arrow) Tilbage]
 *
 * Phone (<md), team open - the framed dock under the row, header sticky
 * | ^ I [Madhold 2][(hat)2][(mem)6] | man, tor |
 * |   +-------------------------------------+ |
 * |   | Madhold 2          [(pencil)]       | | <- sticky under the tab bar
 * |   | CookingTeamCard ...                 | |
 * |   +-------------------------------------+ |
 *
 * CREATE (?mode=create, from the header button) - count stepper + previews,
 * footer [Annuller] [Opret N madhold]; batch create numbers from N+1.
 */
import {h, resolveComponent} from 'vue'
import {FORM_MODES} from "~/types/form"
import type {TeamRole, CookingTeamDisplay} from "~/composables/useCookingTeamValidation"
import type {WeekDayMap} from "~/types/dateTypes"
import type {JokerSlotCreate} from "~/composables/useDutyValidation"

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
  removeTeamMember,
  createJokerSlot,
  deleteJokerSlot
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
const {value: selectedTeamId, setValue: setSelectedTeamParam} = useQueryParam<number>('team', {
  serialize: (id) => id.toString(),
  deserialize: (s) => {
    const parsed = parseInt(s)
    return !isNaN(parsed) ? parsed : null
  },
  validate: (id) => displayedTeams.value.some(t => t.id === id),
  normalize: (id) => (id && displayedTeams.value.some(t => t.id === id)) ? id : null,
  defaultValue: () => 0,
  syncWhen: () => formMode.value !== FORM_MODES.CREATE && displayedTeams.value.some(t => t.id)
})

// Selection IS the open state: with no team selected the page shows the overview
// (full-width table + the all-teams calendar); the toggle deselects like a chevron folds
const selectedTeamIndex = computed(() => displayedTeams.value.findIndex(t => t.id === selectedTeamId.value))
const selectedTeam = computed(() => displayedTeams.value[selectedTeamIndex.value] ?? null)

const handleToggleTeam = async (id: number) => {
  if (selectedTeamId.value === id) {
    // Sequential, awaited URL writes: each spread of route.query sees the previous one,
    // so neither the mode nor the team key resurrects the other's stale value
    if (formMode.value === FORM_MODES.EDIT) await onModeChange(FORM_MODES.VIEW)
    await setSelectedTeamParam(0)
    return
  }
  selectedTeamId.value = id
}

// MOBILE EXPANSION - derived from the selection: the dock under the row IS the open detail
const expanded = computed({
  get: (): Record<number, boolean> => {
    if (isMd.value || formMode.value === FORM_MODES.CREATE || selectedTeamIndex.value < 0) return {}
    return {[selectedTeamIndex.value]: true}
  },
  set: (value: Record<number, boolean>) => {
    const openIndex = Object.keys(value).find(key => value[Number(key)])
    const target = openIndex !== undefined ? displayedTeams.value[Number(openIndex)]?.id : selectedTeam.value?.id
    if (target) void handleToggleTeam(target)
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
  'remove:member': handleRemoveMember,
  'add:jokerSlot': handleAddJokerSlot,
  'remove:jokerSlot': handleRemoveJokerSlot
}))

// Gated on data presence, not on the fetch state: a background season refresh (every
// immediate save runs one) keeps the mounted page, it never swaps it for the loader
const showAdminTeams = computed(() => !!selectedSeason.value)

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
    // The store's toast reports the operation result (ADR-009), not the draft
    await createTeam(createDraft.value)
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

// EDIT MODE: Members and joker slots (IMMEDIATE SAVE) - the store toasts each action
const handleAddMember = async (inhabitantId: number, role: TeamRole, allocationPercentage: number = 100, affinity: WeekDayMap | null = null) => {
  if (!selectedTeam.value?.id) return

  await addTeamMember({
    cookingTeamId: selectedTeam.value.id,
    inhabitantId,
    role,
    allocationPercentage,
    ...(affinity ? {affinity} : {})
  })
}

// EDIT MODE: Update member (delete old + create new)
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
}

const handleRemoveMember = async (assignmentId: number) => {
  await removeTeamMember(assignmentId)
}

const handleAddJokerSlot = async (slot: JokerSlotCreate) => {
  if (!selectedTeam.value?.id) return
  await createJokerSlot(selectedTeam.value.id, slot)
}

const handleRemoveJokerSlot = async (slotId: number) => {
  if (!selectedTeam.value?.id) return
  await deleteJokerSlot(selectedTeam.value.id, slotId)
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

const {ICONS, SIZES, BUTTONS, ALERTS, COLOR, COMPONENTS, LAYOUTS, getRainbowAccent} = useTheSlopeDesignSystem()

const columns = [
  {
    id: 'expand',
    // The toggle turns toward the open detail: up folds the phone dock, right points into
    // the md+ pane; closed is down on both
    cell: ({row}: {row: TableRow}) => {
      const isOpen = row.original.id === selectedTeamId.value
      return h(resolveComponent('UButton'), {
        color: COLOR.neutral,
        variant: 'ghost',
        icon: isOpen ? (isMd.value ? ICONS.chevronRight : ICONS.chevronUp) : ICONS.chevronDown,
        square: true,
        'aria-label': isOpen ? 'Luk' : 'Åbn detaljer',
        'data-testid': `team-toggle-${row.original.id}`,
        onClick: () => handleToggleTeam(row.original.id!)
      })
    }
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
      <div :class="LAYOUTS.cardHeaderRow">
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
            :class="LAYOUTS.cardActionButton"
            :color="COLOR.primary"
            :icon="ICONS.plusCircle"
            data-testid="create-team"
            :disabled="disabledModes.includes(FORM_MODES.CREATE)"
            @click="onModeChange(FORM_MODES.CREATE)"
        >
          Opret madhold
        </UButton>
      </div>
    </template>

    <template #default>
      <Loader v-if="(isSelectedSeasonLoading || isSeasonsLoading) && !selectedSeason" text="Henter data for fællesspisningssæson"/>
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
          <div class="w-full md:w-1/3">
          <UTable
              v-model:expanded="expanded"
              :columns="columns"
              :data="displayedTeams"
              :loading="isSelectedSeasonLoading"
              :ui="COMPONENTS.table.ui"
          >
            <template #name-cell="{ row }">
              <div
                  :class="[COMPONENTS.table.clickableCell, row.original.id === selectedTeamId && getRainbowAccent(displayedTeams.findIndex(t => t.id === row.original.id))]"
                  :data-testid="`team-row-${row.original.id}`"
                  @click="handleToggleTeam(row.original.id!)"
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
              <div v-if="selectedTeam?.id" :class="COMPONENTS.masterDetail.dockClamp">
              <div :class="[COMPONENTS.masterDetail.dock, 'space-y-2']">
                <div :class="[COMPONENTS.masterDetail.dockHeader, 'flex items-center justify-between gap-2']">
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
                <div :class="COMPONENTS.masterDetail.dockBody">
                  <CookingTeamCard v-bind="detailProps" v-on="detailEvents" />
                </div>
              </div>
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

          <!-- Detail pane (md+): the same card as the dock, framed so the team's own
               calendar reads apart from the all-teams calendar of the overview -->
          <div v-if="isMd && selectedTeam?.id" :class="['md:w-2/3 space-y-4 self-start', COMPONENTS.masterDetail.pane]">
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

          <!-- No selection: the all-teams calendar fills the detail region, at a glance -->
          <div v-else-if="selectedSeason && displayedTeams.length > 0" class="w-full md:w-2/3 self-start">
            <TeamCalendarDisplay
                :season-dates="selectedSeason.seasonDates"
                :teams="displayedTeams"
                :dinner-events="selectedSeason.dinnerEvents ?? []"
                :holidays="selectedSeason.holidays"
            />
          </div>
          </div>
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
