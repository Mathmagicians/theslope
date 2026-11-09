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
 * MODE: 'regular' / 'edit' - Holdmedlemmer, one box per role, the glyph once on its heading; a member row's
 * avatar, name, allocation, weekdays and slet sit in the box's columns, the slet column at the right edge
 *   (chef hat) Chefkok
 *   |  (av) Anna Hansen   100%  tir        [(trash)]
 *   |  (av) Bo            50%   man tor    [(trash)]
 *   (whisk) Kok
 *   |  (av) Per           50%   tir        [(trash)]
 *   (plant) Kokkespire
 *   |  Ingen kokkespire
 *   (joker) Jokere
 *   |  07/10/2026-01/12/2026  tir  (whisk) Kok  Anna barsel  [(calendar) 8]   [(trash)]   <- trash on the edit face only
 *
 * MODE: 'edit' - the right column, the finder and the joker add row under it (stacks under the members on a phone)
 *   Tilføj medlemmer
 *   [Søg efter navn...]
 *   (av) Anna Hansen   LEDIG                              [Tilføj]
 *   Tilføj jokere
 *   (joker)  Joker · en plads uden navn                [Tilføj]   <- flips to Luk, opens JokerSlotForm below
 *   |  Periode, Ugedage, Rolle, Arbejdstid, Note     [Annuller] [Tilføj]
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
 * Visual check: at 375px and desktop with a role of seven members, the /dinner monitor face's role row and the
 * /admin/teams edit header's faces show three and the overflow count on a phone, five from md; the names and the
 * badges wrap under the faces inside the card and the page does not scroll sideways.
 */
import type { WeekDayMap, DateRange } from '~/types/dateTypes'
import type { TeamRole, CookingTeamAssignment, CookingTeamDisplay } from '~/composables/useCookingTeamValidation'
import type { JokerSlotCreate } from '~/composables/useDutyValidation'
import { TEAM_WORDS } from '~/config/teamWords'
import { BUTTON_WORDS } from '~/config/buttonWords'
import { TEAM_CARD_MODES, type TeamCardMode } from '~/types/form'

const { SIZES, ICONS, ALERTS, BUTTONS, TYPOGRAPHY, COMPONENTS, ROLE_ICONS, getRainbowBand, getCalendarCountBadge, getRandomEmptyMessage } = useTheSlopeDesignSystem()
const WORDS = TEAM_WORDS.card
const Role = useCookingTeamValidation().TeamRoleSchema.enum

interface Props {
  teamId: number           // The team the mounting page selects in the plan store
  teamNumber: number       // Logical number 1..N in season (for display/color)
  mode?: TeamCardMode
  useShortName?: boolean   // If true, display "Madhold X" instead of full name with season
  visiting?: boolean       // The viewer is not on the team: the monitor header carries "Ikke dit hold"
  // EDIT mode only props:
  seasonId?: number
  seasonCookingDays?: WeekDayMap | null
  seasonDates?: DateRange
  holidays?: DateRange[]
  teams?: CookingTeamDisplay[]
}

const props = withDefaults(defineProps<Props>(), {
  mode: TEAM_CARD_MODES.REGULAR,
  useShortName: false,
  visiting: false,
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

// The mounting page selects the team in the plan store, and every face reads its Detail there; the store keeps the
// previous team while the next one loads, so the card renders only the team it is mounted for
const planStore = usePlanStore()
const team = computed(() => planStore.selectedTeam?.id === props.teamId ? planStore.selectedTeam : null)
const error = computed(() => planStore.selectedTeamError)

const isLoading = computed(() => planStore.isSelectedTeamLoading || planStore.selectedTeamId !== props.teamId)
const isErrored = computed(() => planStore.isSelectedTeamErrored)
const isNoTeam = computed(() => !isLoading.value && !isErrored.value && team.value === null)

const { getTeamShortName, countJokerSlotShifts, getTeamNumber } = useCookingTeam()
const teamName = computed(() => {
  const fullName = team.value?.name ?? WORDS.fallbackName(props.teamNumber)
  return props.useShortName ? getTeamShortName(fullName) : fullName
})
const assignments = computed(() => team.value?.assignments ?? [])
const affinity = computed(() => team.value?.affinity ?? null)
const dinnerEvents = computed(() => team.value?.dinnerEvents ?? [])
const cookingDaysCount = computed(() => team.value?.cookingDaysCount ?? 0)
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
// The team wears the rainbow stop of its number: fill and ink as classes, so a badge needs no colour slot
const teamBand = computed(() => getRainbowBand(props.teamNumber - 1))

// The members per role, in the order the boxes show them
const roleGroups = computed(() => {
  const membersOf = (role: TeamRole): CookingTeamAssignment[] => assignments.value.filter(assignment => assignment.role === role)
  return {
    [Role.CHEF]: membersOf(Role.CHEF),
    [Role.COOK]: membersOf(Role.COOK),
    [Role.JUNIORHELPER]: membersOf(Role.JUNIORHELPER)
  } satisfies Record<TeamRole, CookingTeamAssignment[]>
})
const chefCount = computed(() => roleGroups.value[Role.CHEF].length)

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

const isEditable = computed(() => props.mode === TEAM_CARD_MODES.EDIT)
const hasNoMembers = computed(() => assignments.value.length === 0)

const now = useClock()
const emptyStateMessage = getRandomEmptyMessage('cookingTeam', now.value)

// The finder on the edit face lists every inhabitant with the season's team assignments
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
  const other = props.teams?.find(t => t.id === cookingTeamId)
  return other ? getRainbowBand(getTeamNumber(other, props.teams ?? []) - 1) : ''
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
  <Loader v-if="isLoading && !team" text="Henter madhold..." />

  <ViewError v-else-if="isErrored" :error="error?.statusCode" :cause="error" />

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

  <div v-else-if="mode === TEAM_CARD_MODES.MONITOR" :class="COMPONENTS.teamCard.monitor">
    <div :class="COMPONENTS.teamCard.monitorHeader">
      <CookingTeamBadges
        :team-number="teamNumber"
        :team-name="teamName"
        :chef-count="chefCount"
        :member-count="assignments.length"
        :joker-slot-count="jokerSlots.length"
        :cooking-days-count="cookingDaysCount"
        :size="SIZES.large"
      />
      <UBadge v-if="visiting" v-bind="COMPONENTS.visitBadge" :size="SIZES.small" :label="TEAM_WORDS.visit.badge" data-testid="team-card-visit-badge" />
    </div>

    <div v-if="!hasNoMembers" :class="COMPONENTS.roleBox.monitorGrid">
      <template v-for="(members, role) in roleGroups" :key="role">
        <div v-if="members.length > 0" :class="COMPONENTS.roleBox.monitorRow" :data-testid="`team-role-group-${role}`">
          <div :class="COMPONENTS.roleBox.heading" :data-testid="`team-role-heading-${role}`">
            <UIcon :name="ROLE_ICONS[role]" :class="COMPONENTS.roleBox.glyph" />
            <span>{{ TEAM_WORDS.roles[role].plural }}</span>
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


  <div v-else :class="COMPONENTS.teamCard.stack">
    <div
      v-if="isEditable"
      :class="COMPONENTS.teamCard.editHeader"
    >
      <div :class="COMPONENTS.teamCard.editHeaderMain">
        <UBadge :class="[teamBand, COMPONENTS.teamChip]" :size="SIZES.standard">
          <UIcon :name="ICONS.team" :size="SIZES.standardIconSize" />
        </UBadge>
        <UFormField :label="WORDS.nameField" :class="COMPONENTS.teamCard.nameField">
          <UInput
            v-model="editedName"
            data-testid="team-name-input"
            :placeholder="WORDS.nameField"
            v-bind="COMPONENTS.teamCard.nameInput"
            :trailing-icon="ICONS.edit"
            @focus="startNameEdit"
            @blur="handleNameUpdate"
            @keyup.enter="handleNameUpdate"
          />
        </UFormField>

        <div :class="COMPONENTS.teamCard.memberSummary" data-testid="team-member-summary">
          <UAvatarGroup v-bind="COMPONENTS.avatar.compact.group" :max="SIZES.avatarMax">
            <UTooltip
              v-for="assignment in assignments"
              :key="assignment.id"
              :text="`${assignment.inhabitant?.name} ${assignment.inhabitant?.lastName} (${TEAM_WORDS.roles[assignment.role].label})`"
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
            :chef-count="chefCount"
            :member-count="assignments.length"
            :joker-slot-count="jokerSlots.length"
            :cooking-days-count="cookingDaysCount"
            :show-name="false"
            :size="SIZES.large"
          />
        </div>
      </div>
      <DangerButton
        data-testid="delete-team-button"
        :label="WORDS.delete.label(teamName)"
        :confirm-label="WORDS.delete.confirm(teamName)"
        :class="COMPONENTS.teamCard.deleteButton"
        @confirm="handleDelete"
      />
    </div>

    <div v-else :class="COMPONENTS.teamCard.viewHeader">
      <CookingTeamBadges
        :team-number="teamNumber"
        :team-name="teamName"
        :chef-count="chefCount"
        :member-count="assignments.length"
        :joker-slot-count="jokerSlots.length"
        :cooking-days-count="cookingDaysCount"
        :size="SIZES.large"
      />
    </div>

    <div :class="COMPONENTS.teamCard.stack">
      <!-- The members, and on the edit face the finder beside them -->
      <div :class="COMPONENTS.teamCard.row">
        <div :class="isEditable ? COMPONENTS.teamCard.halfColumn : COMPONENTS.teamCard.fullColumn">
          <h4 :class="TYPOGRAPHY.sectionSubheading">{{ WORDS.members }}</h4>
          <div :class="COMPONENTS.teamCard.boxes">
            <div
              v-for="(members, role) in roleGroups"
              :key="role"
              :class="COMPONENTS.roleBox.box"
              :data-testid="`team-role-group-${role}`"
            >
              <h5 :class="COMPONENTS.roleBox.heading" :data-testid="`team-role-heading-${role}`">
                <UIcon :name="ROLE_ICONS[role]" :class="COMPONENTS.roleBox.glyph" />
                <span>{{ TEAM_WORDS.roles[role].label }}</span>
              </h5>

              <div v-if="members.length > 0" :class="COMPONENTS.roleBox.memberList">
                <div v-for="member in members" :key="member.id" :class="COMPONENTS.roleBox.memberRow" data-testid="team-member-row">
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
                  <span v-else />
                  <UButton
                    v-if="isEditable && member.id"
                    v-bind="BUTTONS.remove"
                    :aria-label="WORDS.removeMember(`${member.inhabitant?.name} ${member.inhabitant?.lastName}`)"
                    :data-testid="`team-member-remove-${member.id}`"
                    @click="emit('remove:member', member.id)"
                  />
                </div>
              </div>

              <div v-else :class="COMPONENTS.roleBox.empty">
                Ingen {{ TEAM_WORDS.roles[role].label.toLowerCase() }}
              </div>
            </div>

            <div :class="COMPONENTS.roleBox.box" data-testid="team-joker-box">
              <h5 :class="COMPONENTS.roleBox.heading" data-testid="team-role-heading-JOKER">
                <UIcon :name="ICONS.joker" :class="COMPONENTS.roleBox.glyph" />
                <span>{{ WORDS.jokers }}</span>
              </h5>

              <div v-if="jokerSlots.length > 0" :class="COMPONENTS.roleBox.list">
                <div v-for="{slot, shifts} in jokerLines" :key="slot.id" :class="COMPONENTS.roleBox.row" data-testid="team-joker-slot">
                  <span>{{ formatDateRange({start: slot.startDate, end: slot.endDate}) }}</span>
                  <WeekDayMapDisplay :model-value="slot.affinity" compact disabled />
                  <UIcon :name="ROLE_ICONS[slot.role]" :class="COMPONENTS.roleBox.glyph" />
                  <span>{{ TEAM_WORDS.roles[slot.role].label }}</span>
                  <span v-if="slot.note">{{ slot.note }}</span>
                  <UBadge
                    v-bind="getCalendarCountBadge(teamNumber)"
                    :size="SIZES.small"
                    :aria-label="WORDS.shifts(shifts)"
                    data-testid="team-joker-slot-shifts"
                  >
                    {{ shifts }}
                  </UBadge>
                  <UButton
                    v-if="isEditable"
                    v-bind="BUTTONS.remove"
                    :aria-label="WORDS.deleteJoker(formatDateRange({start: slot.startDate, end: slot.endDate}))"
                    :data-testid="`joker-slot-delete-${slot.id}`"
                    @click="emit('remove:jokerSlot', slot.id)"
                  />
                </div>
              </div>

              <div v-else :class="COMPONENTS.roleBox.empty">
                Ingen jokere
              </div>

            </div>
          </div>
        </div>

        <div v-if="isEditable" :class="COMPONENTS.teamCard.halfColumn">
          <h4 :class="TYPOGRAPHY.sectionSubheading">{{ WORDS.addMembers }}</h4>
          <InhabitantSelector
            v-if="teamId && seasonId"
            :inhabitants="inhabitantsWithAssignments"
            :sort-fn="sortByStatusThenName"
            :actions-header="WORDS.addToTeam"
          >
            <!-- One badge per team assignment, or the free badge -->
            <template #status="{ row }">
              <div v-if="getAssignmentsFor(row.original.id).length === 0">
                <UBadge v-bind="COMPONENTS.teamCard.freeBadge" :size="SIZES.small">{{ WORDS.free }}</UBadge>
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

            <!-- Tilføj and Rediger both open the member form -->
            <template #actions="{ row }">
              <UButton
                v-bind="BUTTONS.memberFinder"
                @click="row.toggleExpanded()"
              >
                <template #leading>
                  <UIcon :name="row.getIsExpanded() ? ICONS.chevronDown : isInThisTeam(row.original.id) ? ICONS.edit : ICONS.plusCircle" />
                </template>
                {{ row.getIsExpanded() ? BUTTON_WORDS.close : isInThisTeam(row.original.id) ? BUTTON_WORDS.edit : BUTTON_WORDS.add }}
              </UButton>
            </template>

            <!-- The member form, filled with the assignment of a member already on the team -->
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
            :title="WORDS.unsaved"
          />

          <template v-if="seasonDates">
            <h4 :class="TYPOGRAPHY.sectionSubheading">{{ WORDS.addJokers }}</h4>
            <div>
              <div :class="COMPONENTS.teamCard.jokerAddRow" data-testid="joker-add-row">
                <div :class="COMPONENTS.teamCard.jokerAddName">
                  <UAvatar :icon="ICONS.joker" :size="SIZES.sm" />
                  <span :class="COMPONENTS.teamCard.jokerAddLabel">{{ WORDS.jokerRow }}</span>
                </div>
                <UButton
                  v-bind="BUTTONS.memberFinder"
                  :icon="isJokerFormOpen ? ICONS.chevronDown : ICONS.plusCircle"
                  :aria-expanded="isJokerFormOpen"
                  data-testid="joker-slot-add"
                  @click="isJokerFormOpen = !isJokerFormOpen"
                >
                  {{ isJokerFormOpen ? BUTTON_WORDS.close : BUTTON_WORDS.add }}
                </UButton>
              </div>
              <div v-if="isJokerFormOpen" :class="COMPONENTS.teamCard.memberForm">
                <JokerSlotForm
                  :season-dates="seasonDates"
                  :team-affinity="affinity"
                  @submit="handleJokerSlotSubmit"
                  @cancel="isJokerFormOpen = false"
                />
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- The cooking days, and the team's calendar beside them -->
      <div :class="COMPONENTS.teamCard.row">
        <div :class="COMPONENTS.teamCard.affinityColumn">
          <WeekDayMapDisplay
            :model-value="affinity"
            :parent-restriction="seasonCookingDays"
            :disabled="!isEditable"
            :compact="!isEditable"
            hide-restricted
            :label="isEditable ? WORDS.cookingDays.edit : WORDS.cookingDays.view"
            @update:model-value="(value) => emit('update:affinity', value)"
          />
        </div>

        <div :class="COMPONENTS.teamCard.calendarColumn">
          <TeamCalendarDisplay
            v-if="seasonDates && dinnerEvents.length > 0 && team"
            :season-dates="seasonDates"
            :teams="[team]"
            :season-teams="planStore.selectedSeason?.CookingTeams ?? []"
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
