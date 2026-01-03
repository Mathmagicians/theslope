<script setup lang="ts">
/**
 * AdminTeams Component - Master-Detail Pattern for Team Management
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DESKTOP EDIT MODE (lg+): Side-by-side master-detail with 2-row layout
 * ═══════════════════════════════════════════════════════════════════════════
 * ┌──────────────┬──────────────────────────────────────────────────────────┐
 * │  TEAMS       │  ╔═══════════════════════════════════════════════════╗  │
 * │  (Master)    │  ║ 🏆 [Madhold 2___✏️]  [8 medlemmer]  [☠️ Slet]   ║  │
 * │              │  ╚═══════════════════════════════════════════════════╝  │
 * │ ┌──────────┐ │                                                          │
 * │ │Hold 1  🔵│ │  ┌──────────────────────┬───────────────────────────┐  │
 * │ │8 medl.   │ │  │ HOLDMEDLEMMER        │ TILFØJ MEDLEMMER          │  │
 * │ └──────────┘ │  ├──────────────────────┼───────────────────────────┤  │
 * │ ┏━━━━━━━━━━┓ │  │ Chefkok:             │ [Søg: ______🔍] [⇈⇊ 1/8] │  │
 * │ ┃Hold 2  🟢┃ │  │ 👤 Anna    [❌]      │ ┌───────────────────────┐ │  │
 * │ ┃6 medl.   ┃ │  │                      │ │👤 Bo Nielsen  LEDIG  │ │  │
 * │ ┗━━━━━━━━━━┛ │  │ Kok:                 │ │  [Chef][Kok][Spire]  │ │  │
 * │ ┌──────────┐ │  │ 👤 Bob     [❌]      │ ├───────────────────────┤ │  │
 * │ │Hold 3  🟣│ │  │ 👤 Carl    [❌]      │ │👤 Ida Olsen   Hold 3 │ │  │
 * │ │0 medl.   │ │  │                      │ │  I andet hold         │ │  │
 * │ └──────────┘ │  │ Kokkespire:          │ ├───────────────────────┤ │  │
 * │              │  │ 👤 Diana   [❌]      │ │👤 John Doe    Hold 2 │ │  │
 * │ ┌──────────┐ │  │ 👤 Eva     [❌]      │ │  [❌ Fjern]          │ │  │
 * │ │Hold 4  🟡│ │  │ 👤 Fred    [❌]      │ └───────────────────────┘ │  │
 * │ │5 medl.   │ │  └──────────────────────┴───────────────────────────┘  │
 * │ └──────────┘ │                                                          │
 * │              │  ┌──────────────────────┬───────────────────────────┐  │
 * │              │  │ MADLAVNINGSDAGE      │ KALENDER                  │  │
 * │              │  ├──────────────────────┼───────────────────────────┤  │
 * │              │  │ ☐ Mandag             │ Jan 2025                  │  │
 * │              │  │ ☑ Tirsdag            │ Mo Tu We Th Fr Sa Su      │  │
 * │              │  │ ☐ Onsdag             │     1  2  3  4  5         │  │
 * │              │  │ ☑ Torsdag            │  6 🟢  8  9 10 11 12      │  │
 * │              │  │ ☐ Fredag             │ 13 14 🟢 16 17 18 19      │  │
 * │              │  │ ☐ Lørdag             │ 20 21 🟢 23 24 25 26      │  │
 * │              │  │ ☐ Søndag             │ 27 28 🟢 30 31            │  │
 * │              │  │                      │ Feb 2025...               │  │
 * │              │  └──────────────────────┴───────────────────────────┘  │
 * └──────────────┴──────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * MOBILE EDIT MODE (< lg): Dropdown + vertical stack (single scroll direction)
 * ═══════════════════════════════════════════════════════════════════════════
 * ┌────────────────────────────────────────────────────────┐
 * │ Vælg hold: [Madhold 2 (8 medl.) ▼]      (dropdown)     │
 * ├────────────────────────────────────────────────────────┤
 * │ ╔════════════════════════════════════════════════════╗ │
 * │ ║ 🏆 [Madhold 2_____✏️]  [8 medl.]  [☠️ Slet]     ║ │
 * │ ╚════════════════════════════════════════════════════╝ │
 * ├────────────────────────────────────────────────────────┤
 * │ HOLDMEDLEMMER                                          │
 * │ ─────────────────────────────────────────────────────  │
 * │ Chefkok:                                               │
 * │ 👤 Anna Jensen        [❌]                            │
 * │                                                        │
 * │ Kok:                                                   │
 * │ 👤 Bob Smith          [❌]                            │
 * │ 👤 Carl Lee           [❌]                            │
 * │                                                        │
 * │ Kokkespire:                                            │
 * │ 👤 Diana Park         [❌]                            │
 * │ 👤 Eva Green          [❌]                            │
 * │ 👤 Fred White         [❌]                            │
 * ├────────────────────────────────────────────────────────┤
 * │ TILFØJ MEDLEMMER                                       │
 * │ ─────────────────────────────────────────────────────  │
 * │ [Søg: ___________________________________🔍] [⇈⇊ 1/8] │
 * │ ┌────────────────────────────────────────────────────┐ │
 * │ │ 👤 Bo Nielsen                            LEDIG    │ │
 * │ │    [Chef] [Kok] [Spire]                           │ │
 * │ ├────────────────────────────────────────────────────┤ │
 * │ │ 👤 Ida Olsen                             Hold 3   │ │
 * │ │    I andet hold                                    │ │
 * │ ├────────────────────────────────────────────────────┤ │
 * │ │ 👤 John Doe                              Hold 2   │ │
 * │ │    [❌ Fjern]                                     │ │
 * │ └────────────────────────────────────────────────────┘ │
 * ├────────────────────────────────────────────────────────┤
 * │ MADLAVNINGSDAGE                                        │
 * │ ─────────────────────────────────────────────────────  │
 * │ ☐ Mandag                                               │
 * │ ☑ Tirsdag                                              │
 * │ ☐ Onsdag                                               │
 * │ ☑ Torsdag                                              │
 * │ ☐ Fredag                                               │
 * │ ☐ Lørdag                                               │
 * │ ☐ Søndag                                               │
 * ├────────────────────────────────────────────────────────┤
 * │ KALENDER                                               │
 * │ ─────────────────────────────────────────────────────  │
 * │ Jan 2025                                               │
 * │ Mo Tu We Th Fr Sa Su                                   │
 * │     1  2  3  4  5                                      │
 * │  6 🟢  8  9 10 11 12                                   │
 * │ 13 14 🟢 16 17 18 19                                   │
 * │ 20 21 🟢 23 24 25 26                                   │
 * │ 27 28 🟢 30 31                                         │
 * │                                                        │
 * │ Feb 2025...                                            │
 * └────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * Key Layout Features:
 * ═══════════════════════════════════════════════════════════════════════════
 * Desktop:
 *   - Master list: Vertical tabs (left 20%)
 *   - Detail view: 2-row layout (right 80%)
 *     - Row 1: Members (left 50%) + Finder (right 50%)
 *     - Row 2: Cooking Days (left 25%) + Calendar (right 75%)
 *
 * Mobile:
 *   - Dropdown team selector (replaces vertical tabs)
 *   - Vertical stack: Header → Members → Finder → Days → Calendar
 *   - Single scroll direction (vertical only)
 *
 * Common:
 *   - Team header: Inline name editing (✏️), member count, delete button
 *   - Side-by-side sections become vertically stacked on mobile
 */
import {h, resolveComponent} from 'vue'
import {FORM_MODES} from "~/types/form"
import type {TeamRole, CookingTeamDisplay} from "~/composables/useCookingTeamValidation"
import type {WeekDayMap} from "~/types/dateTypes"

const {getDefaultCookingTeam, getTeamColor} = useCookingTeam()
const store = usePlanStore()
const {
  isSeasonsLoading,
  isSelectedSeasonLoading,
  isPlanStoreReady,
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
const isNoTeams = computed(() => teams.value.length === 0)

// FORM MANAGEMENT - useEntityFormManager for URL/mode management only
const {formMode, onModeChange} = useEntityFormManager<CookingTeamDisplay[]>({
  getDefaultEntity: () => [], // Not used - component manages CREATE draft
  selectedEntity: computed(() => teams.value)
})

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

// EDIT MODE - Team selection for master-detail pattern
const selectedTeamIndex = ref(0)
const selectedTeam = computed(() => {
  if (displayedTeams.value.length === 0) return null
  return displayedTeams.value[selectedTeamIndex.value] ?? null
})

// Team tabs for vertical navigation - using CookingTeamBadges for consistent display
// ADR-009: Use Display data with aggregated cookingDaysCount from DB
const teamTabs = computed(() => {
  return displayedTeams.value.map((team, index) => ({
    label: team.name,
    value: index,
    icon: 'i-fluent-mdl2-team-favorite',
    color: getTeamColor(index),
    // Data for badges - all from Display entity
    memberCount: team.assignments?.length ?? 0,
    cookingDaysCount: team.cookingDaysCount ?? 0
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

const showAdminTeams = computed(() => {
  return !isSelectedSeasonLoading.value && selectedSeason.value && (!isNoTeams.value || formMode.value === FORM_MODES.CREATE)
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
    await createTeam(createDraft.value)
    showSuccessToast('Madhold oprettet', `${createDraft.value.length} madhold oprettet med automatisk tildeling`)
    await onModeChange(FORM_MODES.VIEW)
  } catch (error) {
    console.error('👥 > ADMIN_TEAMS > [CREATE] Error creating teams:', error)
    throw error
  }
}

// EDIT MODE: Add new team (IMMEDIATE SAVE, server auto-assigns affinities + events)
const handleAddTeam = async () => {
  if (!selectedSeason.value?.id) return

  try {
    const newTeam = getDefaultCookingTeam(
        selectedSeason.value.id,
        selectedSeason.value.shortName ?? '',
        teams.value.length + 1
    )
    await createTeam(newTeam)
    showSuccessToast('Madhold tilføjet', 'Madlavningsdage og fællesspisninger opdateret automatisk')
    // teams reactively updates from store refresh - no manual update needed
  } catch (error) {
    console.error('👥 > ADMIN_TEAMS > [ADD] Error adding team:', error)
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
const handleAddMember = async (inhabitantId: number, role: TeamRole) => {
  if (!selectedTeam.value?.id) return

  await addTeamMember({
    cookingTeamId: selectedTeam.value.id,
    inhabitantId,
    role,
    allocationPercentage: 100
  })
  showSuccessToast('Medlem tilføjet til hold')
}

// EDIT MODE: Remove member from team (IMMEDIATE DELETE)
const handleRemoveMember = async (assignmentId: number) => {
  await removeTeamMember(assignmentId)
  showSuccessToast('Medlem fjernet fra hold')
}

const handleCancel = async () => {
  await onModeChange(FORM_MODES.VIEW)
}

// VIEW MODE: Expandable rows state (TanStack Table pattern from AdminUsers)
const expanded = ref<Record<number, boolean>>({})
const expandedTeam = ref<CookingTeamDisplay | null>(null)

// Watch for row expansion to track expanded team and enforce single expansion
watch(expanded, (newExpanded, oldExpanded) => {
  const expandedKeys = Object.keys(newExpanded).filter(key => newExpanded[Number(key)])

  if (expandedKeys.length > 1) {
    // More than one row expanded - close all except the most recently opened
    const newlyExpandedKey = expandedKeys.find(key => !oldExpanded[Number(key)])
    if (newlyExpandedKey) {
      Object.keys(expanded.value).forEach(key => {
        if (key !== newlyExpandedKey) {
          expanded.value[Number(key)] = false
        }
      })

      // Set expanded team for the newly expanded row
      const rowIndex = Number(newlyExpandedKey)
      expandedTeam.value = displayedTeams.value[rowIndex] ?? null
    }
  } else if (expandedKeys.length === 1) {
    // Exactly one row expanded - set expanded team
    const rowIndex = Number(expandedKeys[0])
    expandedTeam.value = displayedTeams.value[rowIndex] ?? null
  } else {
    // No rows expanded - clear expanded team
    expandedTeam.value = null
  }
})

// TABLE COLUMNS for VIEW mode - using TanStack Table API
interface TableRow {
  getIsExpanded: () => boolean
  toggleExpanded: () => void
  original: CookingTeamDisplay
}

const {ICONS} = useTheSlopeDesignSystem()

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
  },
  {
    accessorKey: 'assignments',
    header: 'Medlemmer'
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
          <FormModeSelector v-if="!isNoSeasons" v-model="formMode" :disabled-modes="disabledModes" @change="onModeChange"/>
        </div>
      </div>
    </template>

    <template #default>
      <Loader v-if="isSelectedSeasonLoading || isSeasonsLoading" text="Henter data for fællesspisningssæson"/>
      <AdminToCreateSeason v-else-if="isNoSeasons"/>
      <UAlert
          v-else-if="isPlanStoreReady && isNoTeams && formMode !== FORM_MODES.CREATE"
          title="Her ser lidt tomt ud!"
          description="Ingen madhold oprettet endnu ..."
          :avatar="{text: '💤'}"
          :actions="[
      {
        label: 'Opret nye madhold',
        color: 'secondary',
        variant: 'solid',
        to: '/admin/teams?mode=create',
        icon: 'i-heroicons-plus-circle',
      }
    ]"
          color="info"
          class="space-y-4"/>
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

        <!-- EDIT MODE: Master-Detail Layout -->
        <div v-else-if="formMode === FORM_MODES.EDIT" class="px-4 pb-4 space-y-6 md:space-y-4">
          <!-- MOBILE: Dropdown team selector (only visible on mobile) -->
          <div class="block md:hidden">
            <USelect
              v-model="selectedTeamIndex"
              :options="teamTabs.map((tab, index) => ({
                value: index,
                label: `${tab.label} (${tab.memberCount} medl.)`
              }))"
              option-value="value"
              option-label="label"
              placeholder="Vælg hold"
              size="lg"
            />
          </div>

          <div class="flex flex-col md:flex-row gap-6 md:gap-3">
            <!-- LEFT PANEL: Vertical Team Tabs (hidden on mobile) -->
            <div class="hidden md:block md:w-1/5 space-y-3" data-testid="team-tabs-list">
              <h3 class="text-lg font-semibold mb-4">Madhold</h3>

              <UTabs
                  v-model="selectedTeamIndex"
                  orientation="vertical"
                  :items="teamTabs"
                  variant="link"
                  size="xl"
              >
                <template #default="{ item }">
                  <CookingTeamBadges
                      :team-number="item.value + 1"
                      :team-name="item.label"
                      :member-count="item.memberCount"
                      :cooking-days-count="item.cookingDaysCount"
                      compact
                  />
                </template>
              </UTabs>
            </div>

            <!-- RIGHT PANEL: Edit Selected Team -->
            <div class="w-full md:w-4/5 space-y-4">
              <div v-if="selectedTeam?.id" class="space-y-4">
                <CookingTeamCard
                    ref="cookingTeamCardRef"
                    :team-id="selectedTeam.id"
                    :team-number="displayedTeams.findIndex(t => t.id === selectedTeam!.id) + 1"
                    :season-id="selectedSeason?.id"
                    :season-cooking-days="selectedSeason?.cookingDays"
                    :season-dates="selectedSeason?.seasonDates"
                    :holidays="selectedSeason?.holidays"
                    :teams="displayedTeams.map(t => ({ id: t.id!, name: t.name }))"
                    :mode="FORM_MODES.EDIT"
                    @update:team-name="(newName) => handleUpdateTeamName(selectedTeam!.id!, newName)"
                    @update:affinity="(affinity) => handleUpdateTeamAffinity(selectedTeam!.id!, affinity)"
                    @delete="handleDeleteTeam"
                    @add:member="handleAddMember"
                    @remove:member="handleRemoveMember"
                />
              </div>

              <div
v-else
                   class="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg text-gray-500">
                <UIcon name="i-heroicons-arrow-left" class="text-4xl mb-2"/>
                <p>Vælg et madhold for at redigere</p>
              </div>
            </div>
          </div>
        </div>

        <!-- VIEW MODE: Table with team assignments -->
        <div v-else class="px-4 pb-4 space-y-6">
          <UTable
              v-model:expanded="expanded"
              :columns="columns"
              :data="displayedTeams"
              :loading="isSelectedSeasonLoading"
              :ui="{ td: 'py-2' }"
          >
            <!-- Team name column with colored badge -->
            <template #name-cell="{ row }">
              <UBadge
                  :color="getTeamColor(displayedTeams.findIndex(t => t.id === row.original.id))"
                  variant="solid"
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

            <!-- Team assignments column with CookingTeamBadges -->
            <template #assignments-cell="{ row }">
              <CookingTeamBadges
                  :team-number="displayedTeams.findIndex(t => t.id === row.original.id) + 1"
                  :team-name="row.original.name"
                  :member-count="row.original.assignments?.length ?? 0"
                  :cooking-days-count="row.original.cookingDaysCount ?? 0"
                  compact
              />
            </template>

            <!-- Expanded row content: Full team card (single expansion) -->
            <template #expanded>
              <div v-if="expandedTeam?.id" class="p-4 bg-neutral-50 dark:bg-neutral-900">
                <CookingTeamCard
                    :team-id="expandedTeam.id"
                    :team-number="displayedTeams.findIndex(t => t.id === expandedTeam!.id) + 1"
                    :season-cooking-days="selectedSeason?.cookingDays"
                    :season-dates="selectedSeason?.seasonDates"
                    :holidays="selectedSeason?.holidays"
                    mode="regular"
                />
              </div>
            </template>

            <template #empty-state>
              <div class="flex flex-col items-center justify-center py-6 gap-3">
                <UIcon name="i-heroicons-user-group" class="w-8 h-8 text-gray-400"/>
                <p data-testid="teams-empty-state" class="text-sm text-gray-500">Ingen madhold endnu. Opret nogle
                  madhold
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
        <UButton color="secondary" :loading="isActionLoading" :disabled="isActionLoading" @click="handleBatchCreateTeams">
          {{ isActionLoading ? 'Arbejder...' : 'Opret madhold' }}
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
            :loading="isActionLoading"
            :disabled="isActionLoading"
            @click="handleAddTeam"
        >
          {{ isActionLoading ? 'Arbejder...' : 'Tilføj madhold' }}
        </UButton>
        <UButton color="secondary" variant="ghost" @click="handleCancel">
          Annuller
        </UButton>
      </div>
    </template>
  </UCard>
</template>
