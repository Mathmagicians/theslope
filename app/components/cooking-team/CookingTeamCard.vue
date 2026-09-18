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
 * │ 🍳 Team A   👥 4   📅 12                                                 │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ 👨‍🍳 Holdets chefkokke: [Anna H]                                          │
 * │ 👥 Holdets kokke: [Lars B] [Maria S]                                     │
 * │ 🌱 Holdets kokkespirer: [Peter J]                                        │
 * └──────────────────────────────────────────────────────────────────────────┘
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
 * - ADR-009: Uses store for EDIT mode (Detail), accepts props for MONITOR (from store)
 * - Mobile-first responsive design
 * - Uses UserListItem for consistent inhabitant display
 */
import type { WeekDayMap, DateRange } from '~/types/dateTypes'
import type { TeamRole, CookingTeamAssignment } from '~/composables/useCookingTeamValidation'
import { ROLE_LABELS, ROLE_ICONS } from '~/composables/useCookingTeamValidation'

// Design system
const { SIZES, ICONS, ALERTS, COLOR, TYPOGRAPHY, TEXT, BG, getRainbowBand, getRandomEmptyMessage } = useTheSlopeDesignSystem()

type DisplayMode = 'monitor' | 'regular' | 'edit'

interface Props {
  teamId: number           // Database ID - component fetches detail from store
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
}>()

// Store integration - use fetch function, not shared state
const planStore = usePlanStore()

// Each component instance fetches its own team detail (ADR-007)
// Key must be computed to react to teamId changes (cache key drives refetch)
const {data: team, status, error} = useAsyncData(
  computed(() => `cooking-team-detail-${props.teamId}`),
  () => planStore.fetchTeamDetail(props.teamId),
  {
    default: () => null,
    watch: [() => props.teamId],
    immediate: true
  }
)

// Status-derived computed (ADR-007)
const isLoading = computed(() => status.value === 'pending')
const isErrored = computed(() => status.value === 'error')
const isNoTeam = computed(() => status.value === 'success' && team.value === null)

// All data from fetched team Detail entity
const { getTeamShortName } = useCookingTeam()
const teamName = computed(() => {
  const fullName = team.value?.name ?? `Madhold ${props.teamNumber}`
  return props.useShortName ? getTeamShortName(fullName) : fullName
})
const assignments = computed(() => team.value?.assignments ?? [])
const affinity = computed(() => team.value?.affinity ?? null)
const dinnerEvents = computed(() => team.value?.dinnerEvents ?? [])  // From Detail entity
const cookingDaysCount = computed(() => team.value?.cookingDaysCount ?? 0)  // From aggregate

const editedName = ref(teamName.value)

watch(teamName, (newName) => {
  editedName.value = newName
})

// The team wears the rainbow stop of its number: fill and ink as classes, so a badge needs
// no colour slot (ADR-018)
const teamBand = computed(() => getRainbowBand(props.teamNumber - 1))

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
  if (editedName.value !== teamName.value && editedName.value.trim()) {
    emit('update:teamName', editedName.value.trim())
  } else if (!editedName.value.trim()) {
    editedName.value = teamName.value
  }
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
  <Loader v-if="isLoading" text="Henter madhold..." />

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
  <div v-else-if="mode === 'monitor'" class="py-4 md:py-6">
    <!-- Team name header (always visible) -->
    <div class="mb-3 md:mb-4 px-3 md:px-4 flex items-center gap-2 flex-wrap">
      <UBadge :class="[teamBand, 'w-fit']" :size="SIZES.large">
        <UIcon :name="ICONS.team" :size="SIZES.largeIconSize" class="inline" /> {{ teamName }}
      </UBadge>
      <UBadge :class="[teamBand, 'w-fit']" :size="SIZES.large">
        👨‍🍳 {{ assignments.length }}
      </UBadge>
      <UBadge :class="[teamBand, 'w-fit']" :size="SIZES.large">
        📅 {{ cookingDaysCount }}
      </UBadge>
    </div>

    <!-- Members display OR empty state -->
    <div v-if="!hasNoMembers" class="flex flex-col gap-3 md:gap-4 px-3 md:px-4">
      <!-- Chefs group -->
      <div v-if="roleGroups.CHEF.length > 0" class="flex items-start gap-3 md:gap-4">
        <div class="flex flex-col items-center">
          <span class="text-2xl md:text-3xl">{{ ROLE_ICONS.CHEF }}</span>
          <span :class="[TYPOGRAPHY.finePrint, TEXT.muted]">Chefkokke</span>
        </div>
        <UserListItem
          :inhabitants="roleGroups.CHEF.map(m => m.inhabitant)"
          :compact="false"
          :size="SIZES.standard"
          class="mt-2"
        />
      </div>

      <!-- Cooks group -->
      <div v-if="roleGroups.COOK.length > 0" class="flex items-start gap-3 md:gap-4">
        <div class="flex flex-col items-center">
          <span class="text-2xl md:text-3xl">{{ ROLE_ICONS.COOK }}</span>
          <span :class="[TYPOGRAPHY.finePrint, TEXT.muted]">Kokke</span>
        </div>
        <UserListItem
          :inhabitants="roleGroups.COOK.map(m => m.inhabitant)"
          :compact="false"
          :size="SIZES.standard"
          class="mt-2"
        />
      </div>

      <!-- Junior helpers group -->
      <div v-if="roleGroups.JUNIORHELPER.length > 0" class="flex items-start gap-3 md:gap-4">
        <div class="flex flex-col items-center">
          <span class="text-2xl md:text-3xl">{{ ROLE_ICONS.JUNIORHELPER }}</span>
          <span :class="[TYPOGRAPHY.finePrint, TEXT.muted]">Kokkespirer</span>
        </div>
        <UserListItem
          :inhabitants="roleGroups.JUNIORHELPER.map(m => m.inhabitant)"
          :compact="false"
          :size="SIZES.standard"
          class="mt-2"
        />
      </div>
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
  <div v-else class="space-y-4">
    <!-- TEAM HEADER (for EDIT mode) -->
    <div
      v-if="isEditable"
      class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 py-2 px-0 md:px-4 border-y-2 md:border-2 border-dashed"
    >
      <div class="flex flex-col md:flex-row md:items-center gap-3 flex-1">
        <UBadge :class="[teamBand, 'rounded-full p-2 md:p-3']" :size="SIZES.standard">
          <UIcon :name="ICONS.team" :size="SIZES.standardIconSize" />
        </UBadge>
        <UFormField label="Holdnavn" class="flex-1 min-w-fit" >
          <UInput
            v-model="editedName"
            data-testid="team-name-input"
            placeholder="Holdnavn"
            trailing-icon="i-heroicons-pencil"
            class="w-1/2"
            :ui="{ base: 'pe-11', trailing: 'me-3' }"
            @blur="handleNameUpdate"
            @keyup.enter="handleNameUpdate"
          />
        </UFormField>

        <!-- Compact team members view in header -->
        <div class="flex items-center gap-2">
          <UAvatarGroup size="sm" :max="5">
            <UTooltip
              v-for="assignment in assignments"
              :key="assignment.id"
              :text="`${assignment.inhabitant?.name} ${assignment.inhabitant?.lastName} (${ROLE_LABELS[assignment.role]})`"
            >
              <UAvatar
                :src="assignment.inhabitant?.pictureUrl ?? undefined"
                :alt="`${assignment.inhabitant?.name} ${assignment.inhabitant?.lastName}`"
                icon="i-heroicons-user"
              />
            </UTooltip>
          </UAvatarGroup>
          <UBadge
            :class="teamBand"
            :size="SIZES.large"
          >
            👨‍🍳 {{ assignments.length }}
          </UBadge>
          <UBadge
            :class="teamBand"
            :size="SIZES.large"
          >
            📅 {{ cookingDaysCount }}
          </UBadge>
        </div>
      </div>
      <DangerButton
        data-testid="delete-team-button"
        :label="`Slet ${teamName}`"
        :confirm-label="`Tryk igen for at slette ${teamName}...`"
        class="w-full md:w-auto"
        @confirm="handleDelete"
      />
    </div>

    <!-- VIEW MODE: Team name header -->
    <div v-else class="flex items-center gap-2 flex-wrap p-4 border">
      <UBadge :class="[teamBand, 'w-fit']" :size="SIZES.large">
        <UIcon :name="ICONS.team" :size="SIZES.largeIconSize" class="inline" /> {{ teamName }}
      </UBadge>
      <UBadge :class="[teamBand, 'w-fit']" :size="SIZES.large">
        👨‍🍳 {{ assignments.length }}
      </UBadge>
      <UBadge :class="[teamBand, 'w-fit']" :size="SIZES.large">
        📅 {{ cookingDaysCount }}
      </UBadge>
    </div>

    <!-- REGULAR/EDIT MODE: Shared two-row layout -->
    <div class="space-y-4">
      <!-- ROW 1: Team members (left) + Inhabitant finder (right, EDIT only) -->
      <div class="flex flex-col md:flex-row gap-2 md:gap-4">
        <!-- LEFT: Team members -->
        <div :class="isEditable ? 'w-full md:w-1/2' : 'w-full'" class="space-y-4">
          <h4 :class="TYPOGRAPHY.sectionSubheading">Holdmedlemmer</h4>
          <div class="flex flex-col gap-4">
            <div
              v-for="(members, role) in roleGroups"
              :key="role"
              class="space-y-2"
            >
              <h5 :class="[TYPOGRAPHY.caption, TEXT.toned]">
                {{ ROLE_LABELS[role] }}
              </h5>

              <div v-if="members.length > 0" :class="['flex flex-col gap-2 p-3', BG.inset]">
                <div v-for="member in members" :key="member.id" class="flex items-center gap-2 flex-wrap">
                  <UAvatar
                    :src="member.inhabitant?.pictureUrl ?? undefined"
                    :alt="`${member.inhabitant?.name} ${member.inhabitant?.lastName}`"
                    icon="i-heroicons-user"
                    size="sm"
                    class="cursor-pointer"
                    @click="member.inhabitant && navigateToInhabitant(member.inhabitant.id)"
                  />
                  <UBadge
                    size="md"
                    :class="[teamBand, 'cursor-pointer hover:opacity-80 transition-opacity']"
                    @click="member.inhabitant && navigateToInhabitant(member.inhabitant.id)"
                  >
                    {{ member.inhabitant?.name }} {{ member.inhabitant?.lastName }}
                  </UBadge>
                  <UBadge :color="COLOR.neutral" variant="outline" :size="SIZES.small" class="w-fit">
                    {{ member.allocationPercentage }}%
                  </UBadge>
                  <WeekDayMapDisplay v-if="member.affinity" :model-value="member.affinity" compact disabled />
                  <UButton
                    v-if="isEditable && member.id"
                    :color="COLOR.winery"
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-x-mark"
                    @click="emit('remove:member', member.id)"
                  />
                </div>
              </div>

              <div v-else :class="[TYPOGRAPHY.bodyTextSmall, TEXT.gray[500], 'italic p-3']">
                Ingen {{ ROLE_LABELS[role].toLowerCase() }}
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT: Inhabitant finder (EDIT mode only) -->
        <div v-if="isEditable" class="w-full md:w-1/2 space-y-4">
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
                <UBadge :color="COLOR.success" variant="outline" :size="SIZES.small">LEDIG</UBadge>
              </div>
              <div v-else class="flex flex-col gap-1">
                <div v-for="(a, idx) in getAssignmentsFor(row.original.id)" :key="idx" class="flex flex-col gap-0.5">
                  <UBadge :class="[getTeamBandForId(a.cookingTeamId), 'w-fit']" :size="SIZES.small">
                    {{ getTeamName(a.cookingTeamId) }} · {{ a.allocationPercentage }}%
                  </UBadge>
                  <WeekDayMapDisplay v-if="a.affinity" :model-value="a.affinity" compact disabled />
                </div>
              </div>
            </template>

            <!-- Actions: Tilføj or Rediger, both expand the form -->
            <template #actions="{ row }">
              <UButton
                :color="COLOR.primary"
                variant="soft"
                :size="SIZES.small"
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
              <div :class="['p-4', BG.panel]">
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
          <div v-else :class="['p-6 border-2 border-dashed text-center', TEXT.gray[500]]">
            <UIcon name="i-heroicons-users" class="text-4xl mb-2" />
            <p class="text-sm">Hold skal gemmes før medlemmer kan tilføjes</p>
          </div>
        </div>
      </div>

      <!-- ROW 2: Weekday assignments (left) + Calendar (right) -->
      <div class="flex flex-col md:flex-row gap-2 md:gap-4">
        <!-- LEFT: Team Affinity (compact in VIEW mode, editable checkboxes in EDIT mode) -->
        <div class="w-full md:w-1/4">
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
        <div class="w-full md:w-3/4">
          <TeamCalendarDisplay
            v-if="seasonDates && dinnerEvents.length > 0 && team"
            :season-dates="seasonDates"
            :teams="[team]"
            :dinner-events="dinnerEvents"
            :holidays="holidays"
          />
          <div v-else :class="['p-6 border-2 border-dashed text-center', TEXT.gray[500]]">
            <UIcon name="i-heroicons-calendar" class="text-4xl mb-2" />
            <p class="text-sm">Ingen fællesspisninger tildelt endnu</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
