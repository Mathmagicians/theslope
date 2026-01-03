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
 * │ 👨‍🍳 Chef: [Anna H]                                                       │
 * │ 🥄 Kokke: [Lars B] [Maria S] [Peter J]                                   │
 * │ 👶 Hjælpere: (ingen)                                                     │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ [👨‍🍳 BLIV CHEFKOK]  [🥄 BLIV KOK]  [👶 BLIV HJÆLPER]                     │
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
import type { TeamRole } from '~/composables/useCookingTeamValidation'
import type { InhabitantDisplay } from '~/composables/useCoreValidation'
import { ROLE_LABELS, ROLE_ICONS } from '~/composables/useCookingTeamValidation'

// Design system
const { COLOR, COMPONENTS, SIZES, ICONS, getRandomEmptyMessage } = useTheSlopeDesignSystem()

type DisplayMode = 'monitor' | 'regular' | 'edit'

// TeamMember requires inhabitant - only assignments with valid inhabitants are displayed
interface TeamMember {
  id?: number  // Optional - new assignments don't have id yet
  role: TeamRole
  inhabitant: InhabitantDisplay  // Required for display
}

interface Props {
  teamId: number           // Database ID - component fetches detail from store
  teamNumber: number       // Logical number 1..N in season (for display/color)
  mode?: DisplayMode       // Display mode
  // EDIT mode only props:
  seasonId?: number
  seasonCookingDays?: WeekDayMap | null
  seasonDates?: DateRange
  holidays?: DateRange[]
  teams?: Array<{ id: number, name: string }>
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'regular',
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
  'add:member': [inhabitantId: number, role: TeamRole]
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
const teamName = computed(() => team.value?.name ?? `Madhold ${props.teamNumber}`)
const assignments = computed(() => team.value?.assignments ?? [])
const affinity = computed(() => team.value?.affinity ?? null)
const dinnerEvents = computed(() => team.value?.dinnerEvents ?? [])  // From Detail entity
const cookingDaysCount = computed(() => team.value?.cookingDaysCount ?? 0)  // From aggregate

const editedName = ref(teamName.value)

watch(teamName, (newName) => {
  editedName.value = newName
})

const { getTeamColor } = useCookingTeam()
const teamColor = computed(() => {
  return getTeamColor(props.teamNumber - 1)
})

const appConfig = useAppConfig()
const resolvedColor = computed(() => {
  const colorName = teamColor.value as string
  const colors = appConfig.ui?.colors as Record<string, string> | undefined
  return colors?.[colorName] ?? 'neutral'
})

const roleGroups = computed(() => {
  const groups = {
    CHEF: [] as TeamMember[],
    COOK: [] as TeamMember[],
    JUNIORHELPER: [] as TeamMember[]
  }

  assignments.value.forEach(assignment => {
    if (assignment.role in groups) {
      groups[assignment.role].push(assignment)
    }
  })

  return groups
})

// Team members (all cooks and helpers, excluding chef)
const teamMembers = computed(() => [
  ...roleGroups.value.COOK,
  ...roleGroups.value.JUNIORHELPER
])

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
</script>

<template>
  <!-- Loading state -->
  <Loader v-if="isLoading" text="Henter madhold..." />

  <!-- Error state -->
  <ViewError v-else-if="isErrored" :error="error?.statusCode" :cause="error" />

  <!-- No team state (funny message) -->
  <UAlert
    v-else-if="isNoTeam"
    variant="soft"
    :color="COLOR.neutral"
    :avatar="{ text: emptyStateMessage.emoji, size: SIZES.emptyStateAvatar }"
    :ui="COMPONENTS.emptyStateAlert"
  >
    <template #title>
      {{ emptyStateMessage.text }}
    </template>
    <template #description>
      Hold ikke fundet
    </template>
  </UAlert>

  <!-- MONITOR MODE: Large display for kitchen monitors -->
  <div v-else-if="mode === 'monitor'" class="bg-violet-850 py-4 md:py-6">
    <!-- Team name header (always visible) -->
    <div class="mb-3 md:mb-4 px-3 md:px-4 flex items-center gap-2 flex-wrap">
      <UBadge :color="teamColor" variant="soft" :size="SIZES.large" class="w-fit">
        <UIcon :name="ICONS.team" :size="SIZES.largeIconSize" class="inline" /> {{ teamName }}
      </UBadge>
      <UBadge :color="teamColor" variant="soft" :size="SIZES.large" class="w-fit">
        👥 {{ assignments.length }}
      </UBadge>
      <UBadge :color="teamColor" variant="soft" :size="SIZES.large" class="w-fit">
        📅 {{ cookingDaysCount }}
      </UBadge>
    </div>

    <!-- Members display OR empty state -->
    <div v-if="!hasNoMembers" class="flex flex-col md:flex-row gap-3 md:gap-4">
      <!-- Chef display (if assigned) -->
      <div v-if="roleGroups.CHEF.length > 0" class="flex items-center gap-3 md:gap-4 flex-1">
        <span class="text-3xl md:text-4xl">{{ ROLE_ICONS.CHEF }}</span>
        <div class="flex-1">
          <UserListItem
            :inhabitants="roleGroups.CHEF.map(m => m.inhabitant)"
            :compact="false"
            :size="SIZES.standard"
            :ring-color="teamColor"
            :label="ROLE_LABELS.CHEF"
          />
        </div>
      </div>

      <!-- Team display (cooks + helpers) -->
      <div v-if="teamMembers.length > 0" class="flex items-center gap-3 md:gap-4 flex-1">
        <span class="text-3xl md:text-4xl">{{ ROLE_ICONS.COOK }}</span>
        <div class="flex-1">
          <UserListItem
            :inhabitants="teamMembers.map(m => m.inhabitant)"
            :compact="false"
            :size="SIZES.standard"
            :ring-color="teamColor"
            label="medlemmer"
          />
        </div>
      </div>
    </div>
    <UAlert
      v-else
      variant="soft"
      :color="COLOR.neutral"
      :avatar="{ text: emptyStateMessage.emoji, size: SIZES.emptyStateAvatar }"
      :ui="COMPONENTS.emptyStateAlert"
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
      :class="`border-${teamColor}-400 dark:border-${teamColor}-700`"
      :style="{ borderColor: `var(--color-${resolvedColor}-300)` }"
    >
      <div class="flex flex-col md:flex-row md:items-center gap-3 flex-1">
        <UBadge :color="teamColor" variant="soft" :size="SIZES.standard" class="rounded-full p-2 md:p-3">
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
            :color="teamColor"
            variant="soft"
            :size="SIZES.large"
          >
            👥 {{ assignments.length }}
          </UBadge>
          <UBadge
            :color="teamColor"
            variant="soft"
            :size="SIZES.large"
          >
            📅 {{ cookingDaysCount }}
          </UBadge>
        </div>
      </div>
      <UButton
        data-testid="delete-team-button"
        color="winery"
        variant="solid"
        icon="i-healthicons-death-alt"
        class="w-full md:w-auto"
        @click="handleDelete"
      >
        Slet <span class="whitespace-nowrap">{{ teamName }}</span>
      </UButton>
    </div>

    <!-- VIEW MODE: Team name header -->
    <div v-else class="flex items-center gap-2 flex-wrap p-4 border" :class="`border-${teamColor}-300 dark:border-${teamColor}-700`">
      <UBadge :color="teamColor" variant="soft" :size="SIZES.large" class="w-fit">
        <UIcon :name="ICONS.team" :size="SIZES.largeIconSize" class="inline" /> {{ teamName }}
      </UBadge>
      <UBadge :color="teamColor" variant="soft" :size="SIZES.large" class="w-fit">
        👥 {{ assignments.length }}
      </UBadge>
      <UBadge :color="teamColor" variant="soft" :size="SIZES.large" class="w-fit">
        📅 {{ cookingDaysCount }}
      </UBadge>
    </div>

    <!-- REGULAR/EDIT MODE: Shared two-row layout -->
    <div class="space-y-4">
      <!-- ROW 1: Team members (left) + Inhabitant finder (right, EDIT only) -->
      <div class="flex flex-col md:flex-row gap-2 md:gap-4">
        <!-- LEFT: Team members -->
        <div :class="isEditable ? 'w-full md:w-1/2' : 'w-full'" class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Holdmedlemmer</h4>
          <div class="flex flex-col gap-4">
            <div
              v-for="(members, role) in roleGroups"
              :key="role"
              class="space-y-2"
            >
              <h5 class="text-xs font-medium text-gray-600 dark:text-gray-400">
                {{ ROLE_LABELS[role] }}
              </h5>

              <div v-if="members.length > 0" class="flex flex-col gap-2 p-3 bg-gray-50 dark:bg-gray-800">
                <div v-for="member in members" :key="member.id" class="flex items-center gap-2">
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
                    variant="subtle"
                    :color="teamColor"
                    class="cursor-pointer hover:opacity-80 transition-opacity flex-1"
                    @click="member.inhabitant && navigateToInhabitant(member.inhabitant.id)"
                  >
                    {{ member.inhabitant?.name }} {{ member.inhabitant?.lastName }}
                  </UBadge>
                  <UButton
                    v-if="isEditable && member.id"
                    color="winery"
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-x-mark"
                    @click="emit('remove:member', member.id)"
                  />
                </div>
              </div>

              <div v-else class="text-sm text-gray-500 italic p-3">
                Ingen {{ ROLE_LABELS[role].toLowerCase() }}
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT: Inhabitant finder (EDIT mode only) -->
        <div v-if="isEditable" class="w-full md:w-1/2 space-y-4">
          <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Tilføj medlemmer</h4>
          <InhabitantSelector
            v-if="teamId && seasonId"
            :team-id="teamId"
            :team-name="teamName"
            :team-color="teamColor"
            :teams="teams"
            @add:member="(inhabitantId, role) => emit('add:member', inhabitantId, role)"
            @remove:member="(assignmentId) => emit('remove:member', assignmentId)"
          />
          <div v-else class="p-6 border-2 border-dashed text-center text-gray-500">
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
            :label="isEditable ? 'Holdets madlavningsdage' : 'Madlavningsdage'"
            :color="teamColor"
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
          <div v-else class="p-6 border-2 border-dashed text-center text-gray-500">
            <UIcon name="i-heroicons-calendar" class="text-4xl mb-2" />
            <p class="text-sm">Ingen fællesspisninger tildelt endnu</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
