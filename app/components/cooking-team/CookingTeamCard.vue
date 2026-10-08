<script setup lang="ts">
/**
 * CookingTeamCard - Display single cooking team in detail modes
 *
 * Display Modes:
 * - monitor: Kitchen monitors + volunteer buttons (always visible)
 * - regular: Standard display with role sections (view mode)
 * - edit: Full CRUD interface with member management
 *
 * MODE: 'monitor' (with volunteer buttons - always visible)
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ CookingTeamBadges (large): [(team) Team A] [(members) 4] [(calendar) 12] │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ (chef hat) Chefkokke    [Anna H]                                         │
 * │ (whisk)    Kokke        [Lars B] [Maria S]                               │
 * │ (plant)    Kokkespirer  [Peter J]         (COMPONENTS.roleBox.heading)   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * MODE: 'regular' / 'edit' - Holdmedlemmer, one box per role, the glyph once on its heading
 *   (chef hat) Chefkok
 *   |  (av) Anna  100%  tir
 *   (whisk) Kok
 *   |  (av) Per    50%  tir
 *   (plant) Kokkespire
 *   |  Ingen kokkespire
 *   (joker) Jokere
 *   |  07/10/2026-01/12/2026  tir  (whisk) Kok  Anna barsel  [(calendar) 8]   [(trash)]   <- edit face only
 *   |  [ + Tilføj jokertjans v ]                                        <- edit face, opens JokerSlotForm below
 *
 * Already volunteered:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ ✅ Du er tilmeldt som KOK                              [❌ AFMELD]       │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Used in:
 * - /chef page (DinnerDetailPanel - "Hvem laver maden?")
 * - /dinner page (DinnerDetailPanel - "Hvem laver maden?")
 *
 * For list displays (tabs, tables), use CookingTeamBadges component instead.
 *
 * ADR Compliance:
 * - ADR-001: Types from validation composables
 * - ADR-007/ADR-009: every mode reads the Detail the plan store holds for the selected team
 * - Mobile-first responsive design
 * - Uses UserListItem for consistent inhabitant display
 */
import type { WeekDayMap, DateRange } from '~/types/dateTypes'
import type { TeamRole, CookingTeamAssignment } from '~/composables/useCookingTeamValidation'
import { ROLE_LABELS } from '~/composables/useCookingTeamValidation'
import type { JokerSlotCreate } from '~/composables/useDutyValidation'

// Design system
const { SIZES, ICONS, ALERTS, BUTTONS, COLOR, TYPOGRAPHY, COMPONENTS, ROLE_ICONS, getRainbowBand, getCalendarCountBadge, getRandomEmptyMessage } = useTheSlopeDesignSystem()

type DisplayMode = 'monitor' | 'regular' | 'edit'

interface Props {
  teamId: number           // The team the mounting page selects in the plan store
  teamNumber: number       // Logical number 1..N in season (for display/color)
  mode?: DisplayMode       // Display mode
  useShortName?: boolean   // If true, display "Madhold X" instead of full name with season
  // EDIT mode only props:
  seasonId?: number
  seasonCookingDays?: WeekDayMap | null
  seasonDates?: DateRange
  holidays?: DateRange[]
  teams?: Array<{ id: number, name: string }>
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'regular',
  useShortName: false,
  seasonId: undefined,
  seasonCookingDays: undefined,
  seasonDates: undefined,
  holidays: () => [],
  teams: undefined
})

const emit = defineEmits<{
  'update:teamName': [name: string]
  'update:affinity': [affinity: WeekDayMap | null]
  delete: [teamId: number | undefined]
  'add:member': [inhabitantId: number, role: TeamRole, allocationPercentage: number, affinity: WeekDayMap | null]
  'update:member': [assignmentId: number, inhabitantId: number, role: TeamRole, allocationPercentage: number, affinity: WeekDayMap | null]
  'remove:member': [assignmentId: number]
  'add:jokerSlot': [slot: JokerSlotCreate]
  'remove:jokerSlot': [slotId: number]
}>()

// The mounting page selects the team in the plan store (ADR-007); the store keeps the previous team while the
// next one loads, so the card renders only the team it is mounted for
const planStore = usePlanStore()
const team = computed(() => planStore.selectedTeam?.id === props.teamId ? planStore.selectedTeam : null)
const error = computed(() => planStore.selectedTeamError)

const isLoading = computed(() => planStore.isSelectedTeamLoading || planStore.selectedTeamId !== props.teamId)
const isErrored = computed(() => planStore.isSelectedTeamErrored)
const isNoTeam = computed(() => !isLoading.value && !isErrored.value && team.value === null)

// All data from fetched team Detail entity
const { getTeamShortName, countJokerSlotShifts } = useCookingTeam()
const teamName = computed(() => {
  const fullName = team.value?.name ?? `Madhold ${props.teamNumber}`
  return props.useShortName ? getTeamShortName(fullName) : fullName
})
const assignments = computed(() => team.value?.assignments ?? [])
const affinity = computed(() => team.value?.affinity ?? null)
const dinnerEvents = computed(() => team.value?.dinnerEvents ?? [])  // From Detail entity
const cookingDaysCount = computed(() => team.value?.cookingDaysCount ?? 0)  // From aggregate
const jokerSlots = computed(() => team.value?.jokerSlots ?? [])
const jokerLines = computed(() => {
  const cookingDates = dinnerEvents.value.map(event => event.date)
  return jokerSlots.value.map(slot => ({slot, shifts: countJokerSlotShifts(slot, cookingDates)}))
})

const isJokerFormOpen = ref(false)

const handleJokerSlotSubmit = (slot: JokerSlotCreate) => {
  emit('add:jokerSlot', slot)
  isJokerFormOpen.value = false
}

// The field shows the live name until an edit starts and the draft is seeded on focus, so the server and the client
// render the same value and a team that resolves late never overwrites what is being typed
const draftName = ref<string | null>(null)
const editedName = computed({
  get: () => draftName.value ?? teamName.value,
  set: (value: string) => {
    draftName.value = value
  }
})
const startNameEdit = () => {
  draftName.value = teamName.value
}
// The team wears the rainbow stop of its number: fill and ink as classes, so a badge needs
// no colour slot (ADR-018)
const teamBand = computed(() => getRainbowBand(props.teamNumber - 1))

// The monitor face names each group in the plural
const MONITOR_HEADINGS: Record<TeamRole, string> = {
  CHEF: 'Chefkokke',
  COOK: 'Kokke',
  JUNIORHELPER: 'Kokkespirer'
}

const roleGroups = computed(() => {
  const groups = {
    CHEF: [] as CookingTeamAssignment[],
    COOK: [] as CookingTeamAssignment[],
    JUNIORHELPER: [] as CookingTeamAssignment[]
  }

  assignments.value.forEach(assignment => {
    if (assignment.role in groups) {
      groups[assignment.role].push(assignment)
    }
  })

  return groups
})

const navigateToInhabitant = (inhabitantId: number) => {
  navigateTo(`/inhabitant/${inhabitantId}`)
}

const handleNameUpdate = () => {
  const draft = editedName.value.trim()
  if (draft && draft !== teamName.value) emit('update:teamName', draft)
  draftName.value = null
}

const handleDelete = () => {
  emit('delete', props.teamId)
}

const isEditable = computed(() => props.mode === 'edit')
const hasNoMembers = computed(() => assignments.value.length === 0)

// Random fun empty state message from design system
const emptyStateMessage = getRandomEmptyMessage('cookingTeam')

// ========== INHABITANT SELECTOR (EDIT mode) ==========

const {mergeInhabitantsWithAssignments} = useCookingTeam()
const householdsStore = useHouseholdsStore()

const inhabitantsWithAssignments = computed(() =>
    mergeInhabitantsWithAssignments(
        householdsStore.households.flatMap(h => h.inhabitants ?? []),
        planStore.selectedSeason?.CookingTeams ?? []
    )
)

const findInhabitant = (id: number) => inhabitantsWithAssignments.value.find(i => i.id === id)

const getAssignmentsFor = (id: number) => findInhabitant(id)?.CookingTeamAssignment ?? []

const isInThisTeam = (id: number) =>
    getAssignmentsFor(id).some(a => a.cookingTeamId === props.teamId)

const getCurrentAssignment = (id: number) =>
    getAssignmentsFor(id).find(a => a.cookingTeamId === props.teamId)

const getTeamName = (cookingTeamId: number) =>
    getTeamShortName(props.teams?.find(t => t.id === cookingTeamId)?.name ?? '')

/** The band of another team in the season - empty when the season does not list it */
const getTeamBandForId = (cookingTeamId: number) => {
  const idx = props.teams?.findIndex(t => t.id === cookingTeamId) ?? -1
  return idx >= 0 ? getRainbowBand(idx) : ''
}

const sortByStatusThenName = (rowA: {original: InhabitantDisplay}, rowB: {original: InhabitantDisplay}): number => {
  const countA = getAssignmentsFor(rowA.original.id).length
  const countB = getAssignmentsFor(rowB.original.id).length
  if (countA === 0 && countB > 0) return -1
  if (countA > 0 && countB === 0) return 1
  if (isInThisTeam(rowA.original.id) && !isInThisTeam(rowB.original.id)) return -1
  if (!isInThisTeam(rowA.original.id) && isInThisTeam(rowB.original.id)) return 1
  return `${rowA.original.name} ${rowA.original.lastName}`
      .localeCompare(`${rowB.original.name} ${rowB.original.lastName}`)
}



const handleFormSubmit = (inhabitantId: number, role: TeamRole, allocationPercentage: number, affinity: WeekDayMap | null) => {
  const existing = getCurrentAssignment(inhabitantId)
  if (existing?.id) {
    emit('update:member', existing.id, inhabitantId, role, allocationPercentage, affinity)
  } else {
    emit('add:member', inhabitantId, role, allocationPercentage, affinity)
  }
}
</script>

<template>
  <!-- Loading state -->
  <Loader v-if="isLoading && !team" text="Henter madhold..." />

  <!-- Error state -->
  <ViewError v-else-if="isErrored" :error="error?.statusCode" :cause="error" />

  <!-- No team state (funny message) -->
  <UAlert
    v-else-if="isNoTeam"
    v-bind="ALERTS.emptyState"
    :avatar="{ text: emptyStateMessage.emoji, size: SIZES.emptyStateAvatar }"
  >
    <template #title>
      {{ emptyStateMessage.text }}
    </template>
    <template #description>
      Hold ikke fundet
    </template>
  </UAlert>

  <!-- MONITOR MODE: Large display for kitchen monitors -->
  <div v-else-if="mode === 'monitor'" :class="COMPONENTS.teamCard.monitor">
    <!-- Team name header (always visible) -->
    <div :class="COMPONENTS.teamCard.monitorHeader">
      <CookingTeamBadges
        :team-number="teamNumber"
        :team-name="teamName"
        :chef-count="roleGroups.CHEF.length"
        :member-count="assignments.length"
        :joker-slot-count="jokerSlots.length"
        :cooking-days-count="cookingDaysCount"
        size="large"
      />
    </div>

    <!-- Members display OR empty state -->
    <div v-if="!hasNoMembers" :class="COMPONENTS.roleBox.monitorGrid">
      <template v-for="(members, role) in roleGroups" :key="role">
        <div v-if="members.length > 0" :class="COMPONENTS.roleBox.monitorRow" :data-testid="`team-role-group-${role}`">
          <div :class="COMPONENTS.roleBox.heading" :data-testid="`team-role-heading-${role}`">
            <UIcon :name="ROLE_ICONS[role]" :class="COMPONENTS.roleBox.glyph" />
            <span>{{ MONITOR_HEADINGS[role] }}</span>
          </div>
          <UserListItem
            :inhabitants="members.map(m => m.inhabitant)"
            :compact="false"
            :size="SIZES.standard"
          />
        </div>
      </template>
    </div>
    <UAlert
      v-else
      v-bind="ALERTS.emptyState"
      :avatar="{ text: emptyStateMessage.emoji, size: SIZES.emptyStateAvatar }"
    >
      <template #title>
        {{ emptyStateMessage.text }}
      </template>
      <template #description>
        Ingen medlemmer på dette køkkenhold
      </template>
    </UAlert>
  </div>


  <!-- REGULAR/EDIT MODE: Full display with role sections -->
  <div v-else :class="COMPONENTS.teamCard.stack">
    <!-- TEAM HEADER (for EDIT mode) -->
    <div
      v-if="isEditable"
      :class="COMPONENTS.teamCard.editHeader"
    >
      <div :class="COMPONENTS.teamCard.editHeaderMain">
        <UBadge :class="[teamBand, COMPONENTS.teamChip]" :size="SIZES.standard">
          <UIcon :name="ICONS.team" :size="SIZES.standardIconSize" />
        </UBadge>
        <UFormField label="Holdnavn" :class="COMPONENTS.teamCard.nameField">
          <UInput
            v-model="editedName"
            data-testid="team-name-input"
            placeholder="Holdnavn"
            v-bind="COMPONENTS.teamCard.nameInput"
            :trailing-icon="ICONS.edit"
            @focus="startNameEdit"
            @blur="handleNameUpdate"
            @keyup.enter="handleNameUpdate"
          />
        </UFormField>

        <!-- Compact team members view in header -->
        <div :class="COMPONENTS.teamCard.memberSummary">
          <UAvatarGroup :size="SIZES.sm" :max="5">
            <UTooltip
              v-for="assignment in assignments"
              :key="assignment.id"
              :text="`${assignment.inhabitant?.name} ${assignment.inhabitant?.lastName} (${ROLE_LABELS[assignment.role]})`"
            >
              <UAvatar
                :src="assignment.inhabitant?.pictureUrl ?? undefined"
                :alt="`${assignment.inhabitant?.name} ${assignment.inhabitant?.lastName}`"
                :icon="ICONS.user"
              />
            </UTooltip>
          </UAvatarGroup>
          <CookingTeamBadges
            :team-number="teamNumber"
            :team-name="teamName"
            :chef-count="roleGroups.CHEF.length"
            :member-count="assignments.length"
            :joker-slot-count="jokerSlots.length"
            :cooking-days-count="cookingDaysCount"
            :show-name="false"
            size="large"
          />
        </div>
      </div>
      <DangerButton
        data-testid="delete-team-button"
        :label="`Slet ${teamName}`"
        :confirm-label="`Tryk igen for at slette ${teamName}...`"
        :class="COMPONENTS.teamCard.deleteButton"
        @confirm="handleDelete"
      />
    </div>

    <!-- VIEW MODE: Team name header -->
    <div v-else :class="COMPONENTS.teamCard.viewHeader">
      <CookingTeamBadges
        :team-number="teamNumber"
        :team-name="teamName"
        :chef-count="roleGroups.CHEF.length"
        :member-count="assignments.length"
        :joker-slot-count="jokerSlots.length"
        :cooking-days-count="cookingDaysCount"
        size="large"
      />
    </div>

    <!-- REGULAR/EDIT MODE: Shared two-row layout -->
    <div :class="COMPONENTS.teamCard.stack">
      <!-- ROW 1: Team members (left) + Inhabitant finder (right, EDIT only) -->
      <div :class="COMPONENTS.teamCard.row">
        <!-- LEFT: Team members -->
        <div :class="isEditable ? COMPONENTS.teamCard.halfColumn : COMPONENTS.teamCard.fullColumn">
          <h4 :class="TYPOGRAPHY.sectionSubheading">Holdmedlemmer</h4>
          <div :class="COMPONENTS.teamCard.boxes">
            <div
              v-for="(members, role) in roleGroups"
              :key="role"
              :class="COMPONENTS.roleBox.box"
              :data-testid="`team-role-group-${role}`"
            >
              <h5 :class="COMPONENTS.roleBox.heading" :data-testid="`team-role-heading-${role}`">
                <UIcon :name="ROLE_ICONS[role]" :class="COMPONENTS.roleBox.glyph" />
                <span>{{ ROLE_LABELS[role] }}</span>
              </h5>

              <div v-if="members.length > 0" :class="COMPONENTS.roleBox.list">
                <div v-for="member in members" :key="member.id" :class="COMPONENTS.roleBox.row" data-testid="team-member-row">
                  <UAvatar
                    :src="member.inhabitant?.pictureUrl ?? undefined"
                    :alt="`${member.inhabitant?.name} ${member.inhabitant?.lastName}`"
                    :icon="ICONS.user"
                    :size="SIZES.sm"
                    :class="COMPONENTS.teamCard.memberLink"
                    @click="member.inhabitant && navigateToInhabitant(member.inhabitant.id)"
                  />
                  <UBadge
                    :size="SIZES.md"
                    :class="[teamBand, COMPONENTS.teamCard.nameBadge]"
                    @click="member.inhabitant && navigateToInhabitant(member.inhabitant.id)"
                  >
                    {{ member.inhabitant?.name }} {{ member.inhabitant?.lastName }}
                  </UBadge>
                  <UBadge v-bind="COMPONENTS.teamCard.allocationBadge" :size="SIZES.small">
                    {{ member.allocationPercentage }}%
                  </UBadge>
                  <WeekDayMapDisplay v-if="member.affinity" :model-value="member.affinity" compact disabled />
                  <UButton
                    v-if="isEditable && member.id"
                    v-bind="BUTTONS.edit"
                    :icon="ICONS.trash"
                    :aria-label="`Fjern ${member.inhabitant?.name} ${member.inhabitant?.lastName} fra holdet`"
                    :data-testid="`team-member-remove-${member.id}`"
                    @click="emit('remove:member', member.id)"
                  />
                </div>
              </div>

              <div v-else :class="COMPONENTS.roleBox.empty">
                Ingen {{ ROLE_LABELS[role].toLowerCase() }}
              </div>
            </div>

            <div :class="COMPONENTS.roleBox.box" data-testid="team-joker-box">
              <h5 :class="COMPONENTS.roleBox.heading" data-testid="team-role-heading-JOKER">
                <UIcon :name="ICONS.joker" :class="COMPONENTS.roleBox.glyph" />
                <span>Jokere</span>
              </h5>

              <div v-if="jokerSlots.length > 0" :class="COMPONENTS.roleBox.list">
                <div v-for="{slot, shifts} in jokerLines" :key="slot.id" :class="COMPONENTS.roleBox.row" data-testid="team-joker-slot">
                  <span>{{ formatDateRange({start: slot.startDate, end: slot.endDate}) }}</span>
                  <WeekDayMapDisplay :model-value="slot.affinity" compact disabled />
                  <UIcon :name="ROLE_ICONS[slot.role]" :class="COMPONENTS.roleBox.glyph" />
                  <span>{{ ROLE_LABELS[slot.role] }}</span>
                  <span v-if="slot.note">{{ slot.note }}</span>
                  <UBadge
                    v-bind="getCalendarCountBadge(teamNumber)"
                    :size="SIZES.small"
                    :aria-label="`${shifts} ${shifts === 1 ? 'vagt' : 'vagter'}`"
                    data-testid="team-joker-slot-shifts"
                  >
                    {{ shifts }}
                  </UBadge>
                  <UButton
                    v-if="isEditable"
                    v-bind="BUTTONS.edit"
                    :icon="ICONS.trash"
                    :aria-label="`Slet jokertjans ${formatDateRange({start: slot.startDate, end: slot.endDate})}`"
                    :data-testid="`joker-slot-delete-${slot.id}`"
                    @click="emit('remove:jokerSlot', slot.id)"
                  />
                </div>
              </div>

              <div v-else :class="COMPONENTS.roleBox.empty">
                Ingen jokere
              </div>

              <template v-if="isEditable && seasonDates">
                <UButton
                  v-bind="{...BUTTONS.secondaryAction, ...BUTTONS.flipOpen(isJokerFormOpen)}"
                  :color="COLOR.primary"
                  :icon="ICONS.plusCircle"
                  :class="COMPONENTS.roleBox.add"
                  data-testid="joker-slot-add"
                  @click="isJokerFormOpen = !isJokerFormOpen"
                >
                  Tilføj jokertjans
                </UButton>
                <div v-if="isJokerFormOpen" :class="COMPONENTS.roleBox.form">
                  <JokerSlotForm
                    :season-dates="seasonDates"
                    :team-affinity="affinity"
                    @submit="handleJokerSlotSubmit"
                    @cancel="isJokerFormOpen = false"
                  />
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- RIGHT: Inhabitant finder (EDIT mode only) -->
        <div v-if="isEditable" :class="COMPONENTS.teamCard.halfColumn">
          <h4 :class="TYPOGRAPHY.sectionSubheading">Tilføj medlemmer</h4>
          <InhabitantSelector
            v-if="teamId && seasonId"
            :inhabitants="inhabitantsWithAssignments"
            :sort-fn="sortByStatusThenName"
            status-header="Status"
            actions-header="Tilføj til hold"
            search-placeholder="Søg efter navn..."
            empty-text="Ingen beboere tilgængelige"
          >
            <!-- Status: one badge per team assignment, or LEDIG -->
            <template #status="{ row }">
              <div v-if="getAssignmentsFor(row.original.id).length === 0">
                <UBadge v-bind="COMPONENTS.teamCard.freeBadge" :size="SIZES.small">LEDIG</UBadge>
              </div>
              <div v-else :class="COMPONENTS.teamCard.statusList">
                <div v-for="(a, idx) in getAssignmentsFor(row.original.id)" :key="idx" :class="COMPONENTS.teamCard.statusEntry">
                  <UBadge :class="[getTeamBandForId(a.cookingTeamId), COMPONENTS.teamCard.statusBadge]" :size="SIZES.small">
                    {{ getTeamName(a.cookingTeamId) }} · {{ a.allocationPercentage }}%
                  </UBadge>
                  <WeekDayMapDisplay v-if="a.affinity" :model-value="a.affinity" compact disabled />
                </div>
              </div>
            </template>

            <!-- Actions: Tilføj or Rediger, both expand the form -->
            <template #actions="{ row }">
              <UButton
                v-bind="BUTTONS.memberFinder"
                @click="row.toggleExpanded()"
              >
                <template #leading>
                  <UIcon :name="row.getIsExpanded() ? ICONS.chevronDown : isInThisTeam(row.original.id) ? ICONS.edit : ICONS.plusCircle" />
                </template>
                {{ row.getIsExpanded() ? 'Luk' : isInThisTeam(row.original.id) ? 'Rediger' : 'Tilføj' }}
              </UButton>
            </template>

            <!-- Expanded row: add/edit member form, pre-filled for existing members -->
            <template #expanded="{ row }">
              <div :class="COMPONENTS.teamCard.memberForm">
                <TeamMemberAddForm
                  :team-affinity="affinity"
                  :initial-role="getCurrentAssignment(row.original.id)?.role"
                  :initial-percentage="getCurrentAssignment(row.original.id)?.allocationPercentage"
                  :initial-affinity="getCurrentAssignment(row.original.id)?.affinity"
                  @submit="(role, pct, aff) => { handleFormSubmit(row.original.id, role, pct, aff); row.toggleExpanded() }"
                  @cancel="row.toggleExpanded()"
                />
              </div>
            </template>
          </InhabitantSelector>
          <UAlert
            v-else
            v-bind="ALERTS.emptyStateCompact"
            :icon="ICONS.users"
            title="Hold skal gemmes før medlemmer kan tilføjes"
          />
        </div>
      </div>

      <!-- ROW 2: Weekday assignments (left) + Calendar (right) -->
      <div :class="COMPONENTS.teamCard.row">
        <!-- LEFT: Team Affinity (compact in VIEW mode, editable checkboxes in EDIT mode) -->
        <div :class="COMPONENTS.teamCard.affinityColumn">
          <WeekDayMapDisplay
            :model-value="affinity"
            :parent-restriction="seasonCookingDays"
            :disabled="!isEditable"
            :compact="!isEditable"
            hide-restricted
            :label="isEditable ? 'Holdets madlavningsdage' : 'Madlavningsdage'"
            @update:model-value="(value) => emit('update:affinity', value)"
          />
        </div>

        <!-- RIGHT: Team Calendar -->
        <div :class="COMPONENTS.teamCard.calendarColumn">
          <TeamCalendarDisplay
            v-if="seasonDates && dinnerEvents.length > 0 && team"
            :season-dates="seasonDates"
            :teams="[team]"
            :dinner-events="dinnerEvents"
            :holidays="holidays"
          />
          <UAlert
            v-else
            v-bind="ALERTS.emptyStateCompact"
            :icon="ICONS.calendar"
            title="Ingen fællesspisninger tildelt endnu"
          />
        </div>
      </div>
    </div>
  </div>
</template>
