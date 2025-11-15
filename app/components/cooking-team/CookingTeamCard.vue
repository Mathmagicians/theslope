<script setup lang="ts">
/**
 * CookingTeamCard - Display cooking team in multiple modes
 *
 * Display Modes:
 * - monitor: Large display for kitchen monitors (read-only, uses UserListItem)
 * - compact: Minimal display for tables (avatars + badges)
 * - regular: Standard display with role sections (view mode)
 * - edit: Full CRUD interface with member management
 *
 * ADR Compliance:
 * - ADR-001: Types from validation composables
 * - Mobile-first responsive design
 * - Uses UserListItem for consistent inhabitant display
 */
import type { WeekDayMap, DateRange } from '~/types/dateTypes'
import type { DinnerEvent } from '~/composables/useDinnerEventValidation'
import type { TeamRole } from '~/composables/useCookingTeamValidation'
import type { InhabitantDisplay } from '~/composables/useHouseholdValidation'
import { ROLE_LABELS, ROLE_ICONS } from '~/composables/useCookingTeamValidation'

// Design system
const { COLOR, COMPONENTS, SIZES } = useTheSlopeDesignSystem()

type DisplayMode = 'monitor' | 'compact' | 'regular' | 'edit'

interface TeamMember {
  id: number
  role: TeamRole
  inhabitant: InhabitantDisplay
}

interface Props {
  teamId?: number          // Database ID (optional for create mode)
  teamNumber: number       // Logical number 1..N in season (required)
  teamName: string         // Team name (required)
  seasonId?: number       // Required for EDIT mode (inhabitant selector)
  assignments?: TeamMember[]
  affinity?: WeekDayMap | null  // Team's weekday preferences
  seasonCookingDays?: WeekDayMap | null  // Season's cooking days (parent restriction)
  seasonDates?: DateRange  // Season date range (for calendar)
  dinnerEvents?: DinnerEvent[]  // All dinner events (will be filtered to this team)
  holidays?: DateRange[]   // Holiday periods
  teams?: Array<{ id: number, name: string }>  // All teams in season (for InhabitantSelector lookup)
  mode?: DisplayMode       // Display mode: monitor, compact, regular, edit
  showMembers?: boolean   // If false, only show count badge in compact mode
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'regular',
  assignments: () => [],
  affinity: null,
  showMembers: true,
  dinnerEvents: () => [],
  holidays: () => []
})

const emit = defineEmits<{
  'update:teamName': [name: string]
  'update:affinity': [affinity: WeekDayMap | null]
  delete: [teamId: number | undefined]
  'add:member': [inhabitantId: number, role: TeamRole]
  'remove:member': [assignmentId: number]
}>()

// Inject responsive breakpoint from parent
const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)

// Local state for editing team name
const editedName = ref(props.teamName ?? '')

// Reset edited name when team name prop changes
watch(() => props.teamName, (newName) => {
  editedName.value = newName ?? ''
})

// Team color rotation based on teamNumber (1..N)
const { getTeamColor } = useCookingTeam()
const teamColor = computed(() => {
  return getTeamColor(props.teamNumber - 1) // teamNumber is 1-based, getTeamColor expects 0-based
})

// Resolve color alias to actual CSS variable color name
const appConfig = useAppConfig()
const resolvedColor = computed(() => {
  const colorName = teamColor.value as string
  return appConfig.ui?.colors?.[colorName] ?? 'neutral'
})

// Group assignments by role
const roleGroups = computed(() => {
  const groups = {
    CHEF: [] as TeamMember[],
    COOK: [] as TeamMember[],
    JUNIORHELPER: [] as TeamMember[]
  }

  props.assignments.forEach(assignment => {
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

// Format names for monitor display (comma-separated)
const formatNames = (members: TeamMember[]): string => {
  return members.map(m => `${m.inhabitant.name} ${m.inhabitant.lastName}`).join(', ')
}

const navigateToInhabitant = (inhabitantId: number) => {
  navigateTo(`/inhabitant/${inhabitantId}`)
}

const handleNameUpdate = () => {
  if (editedName.value !== props.teamName && editedName.value.trim()) {
    emit('update:teamName', editedName.value.trim())
  } else if (!editedName.value.trim()) {
    // Revert to original if empty
    editedName.value = props.teamName
  }
}

const handleDelete = () => {
  emit('delete', props.teamId)
}

const isEditable = computed(() => props.mode === 'edit')

// Empty state check (same condition used in multiple modes)
const hasNoMembers = computed(() => props.assignments.length === 0)

// Cooking days count (number of dinner events assigned to this team)
const cookingDaysCount = computed(() => props.dinnerEvents.length)

// Funny empty state messages (rotates based on team number for consistency)
const emptyStateMessages = [
  { emoji: '🌱', text: 'Køkkenholdet lytter til græs der gror' },
  { emoji: '☁️', text: 'Køkkenholdet kigger på skyer' },
  { emoji: '💨', text: 'Køkkenholdet øver sig på luftfrikadeller' },
  { emoji: '🎨', text: 'Køkkenholdet ser maling tørre' },
  { emoji: '🏃‍♀️🏃‍♂️', text: 'Køkkenholdet er løbet ud at lege' }
]
const emptyStateMessage = computed(() => {
  const index = (props.teamNumber - 1) % emptyStateMessages.length
  return emptyStateMessages[index]
})

// Ref to InhabitantSelector for refresh
const inhabitantSelectorRef = ref<{ refresh: () => Promise<void> } | null>(null)

// Expose refresh method to parent
defineExpose({
  refreshInhabitants: async () => {
    await inhabitantSelectorRef.value?.refresh()
  }
})
</script>
chan
<template>
  <!-- MONITOR MODE: Large display for kitchen monitors -->
  <div v-if="mode === 'monitor'" class="bg-violet-850 py-4 md:py-6">
    <!-- Team name header (always visible) -->
    <div class="mb-3 md:mb-4 px-3 md:px-4 flex items-center gap-2 flex-wrap">
      <UBadge :color="teamColor" variant="soft" :size="getIsMd ? 'xl' : 'lg'" class="w-fit">
        <UIcon name="i-fluent-mdl2-team-favorite" :size="getIsMd ? '20' : '16'" class="inline" /> {{ teamName }}
      </UBadge>
      <UBadge :color="teamColor" variant="soft" :size="getIsMd ? 'lg' : 'md'" class="w-fit">
        👥 {{ assignments.length }}
      </UBadge>
      <UBadge :color="teamColor" variant="soft" :size="getIsMd ? 'lg' : 'md'" class="w-fit">
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
            :to-display="roleGroups.CHEF.map(m => m.inhabitant)"
            :compact="false"
            :size="getIsMd ? 'lg' : 'md'"
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
            :to-display="teamMembers.map(m => m.inhabitant)"
            :compact="false"
            :size="getIsMd ? 'lg' : 'md'"
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
      :avatar="{ text: emptyStateMessage.emoji, size: SIZES.emptyStateAvatar.value }"
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

  <!-- COMPACT MODE: Minimal display for tables -->
  <div v-else-if="mode === 'compact'">
    <!-- Show only count badge when showMembers is false -->
    <div v-if="!showMembers" class="flex items-center gap-2">
      <UBadge
        :color="teamColor"
        variant="soft"
        size="md"
      >
        {{ teamName }}
      </UBadge>
      <UBadge
        :color="teamColor"
        variant="soft"
        size="md"
      >
        👥 {{ assignments.length }}
      </UBadge>
      <UBadge
        :color="teamColor"
        variant="soft"
        size="md"
      >
        📅 {{ cookingDaysCount }}
      </UBadge>
    </div>

    <!-- Show full member details when showMembers is true -->
    <div v-else class="flex flex-col md:flex-row gap-2">
      <div
        v-for="(members, role) in roleGroups"
        :key="role"
        v-show="members.length > 0"
        class="flex flex-col gap-1"
      >
        <span class="text-xs text-gray-500 font-medium">{{ ROLE_LABELS[role] }}</span>
        <UserListItem
          :to-display="members.map(m => m.inhabitant)"
          :compact="true"
          size="sm"
          :ring-color="teamColor"
        />
      </div>
    </div>
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
        <UBadge :color="teamColor" variant="soft" :size="getIsMd ? 'lg' : 'md'" class="rounded-full p-2 md:p-3">
          <UIcon name="i-fluent-mdl2-team-favorite" :size="getIsMd ? '24' : '16'" />
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
              :text="`${assignment.inhabitant.name} ${assignment.inhabitant.lastName} (${ROLE_LABELS[assignment.role]})`"
            >
              <UAvatar
                :src="assignment.inhabitant.pictureUrl"
                :alt="`${assignment.inhabitant.name} ${assignment.inhabitant.lastName}`"
                icon="i-heroicons-user"
              />
            </UTooltip>
          </UAvatarGroup>
          <UBadge
            :color="teamColor"
            variant="soft"
            size="md"
          >
            👥 {{ assignments.length }}
          </UBadge>
          <UBadge
            :color="teamColor"
            variant="soft"
            size="md"
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
      <UBadge :color="teamColor" variant="soft" :size="getIsMd ? 'lg' : 'md'" class="w-fit">
        <UIcon name="i-fluent-mdl2-team-favorite" :size="getIsMd ? '20' : '16'" class="inline" /> {{ teamName }}
      </UBadge>
      <UBadge :color="teamColor" variant="soft" size="md" class="w-fit">
        👥 {{ assignments.length }}
      </UBadge>
      <UBadge :color="teamColor" variant="soft" size="md" class="w-fit">
        📅 {{ cookingDaysCount }}
      </UBadge>
    </div>

    <!-- EDIT MODE: Two-row layout as per mockup -->
    <div v-if="mode === 'edit'" class="space-y-4">
      <!-- ROW 1: Team members (left 50%) + Inhabitant finder (right 50%) -->
      <div class="flex flex-col md:flex-row gap-2 md:gap-4">
        <!-- LEFT: Team members -->
        <div class="w-full md:w-1/2 space-y-4">
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
                    :src="member.inhabitant.pictureUrl"
                    :alt="`${member.inhabitant.name} ${member.inhabitant.lastName}`"
                    icon="i-heroicons-user"
                    size="sm"
                    class="cursor-pointer"
                    @click="navigateToInhabitant(member.inhabitant.id)"
                  />
                  <UBadge
                    size="md"
                    variant="subtle"
                    :color="teamColor"
                    class="cursor-pointer hover:opacity-80 transition-opacity flex-1"
                    @click="navigateToInhabitant(member.inhabitant.id)"
                  >
                    {{ member.inhabitant.name }} {{ member.inhabitant.lastName }}
                  </UBadge>
                  <UButton
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

        <!-- RIGHT: Inhabitant finder -->
        <div class="w-full md:w-1/2 space-y-4">
          <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Tilføj medlemmer</h4>
          <InhabitantSelector
            v-if="teamId && seasonId"
            :team-id="teamId"
            :team-name="teamName"
            :team-number="teamNumber"
            :team-color="teamColor"
            :season-id="seasonId"
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

      <!-- ROW 2: Weekday assignments (left 25%) + Calendar (right 75%) -->
      <div class="flex flex-col md:flex-row gap-2 md:gap-4">
        <!-- LEFT: Team Affinity -->
        <div class="w-full md:w-1/4">
          <WeekDayMapDisplay
            :model-value="affinity"
            :parent-restriction="seasonCookingDays"
            label="Holdets madlavningsdage"
            @update:model-value="(value) => emit('update:affinity', value)"
          />
        </div>

        <!-- RIGHT: Team Calendar -->
        <div class="w-full md:w-3/4">
          <TeamCalendarDisplay
            v-if="seasonDates && dinnerEvents.length > 0"
            :season-dates="seasonDates"
            :teams="[{ id: teamId, name: teamName }]"
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

    <!-- REGULAR MODE: Single row layout on desktop -->
    <div v-else>
      <!-- Members display -->
      <div v-if="!hasNoMembers" class="flex flex-col md:flex-row gap-4">
        <div
          v-for="(members, role) in roleGroups"
          :key="role"
          v-show="members.length > 0"
          class="flex-1"
        >
          <UserListItem
            :to-display="members.map(m => m.inhabitant)"
            :compact="false"
            size="md"
            :ring-color="teamColor"
            :label="ROLE_LABELS[role]"
          />
        </div>
      </div>
      <!-- Empty state -->
      <UAlert
        v-else
        variant="soft"
        :color="COLOR.neutral"
        :avatar="{ text: emptyStateMessage.emoji, size: SIZES.emptyStateAvatar.value }"
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
  </div>
</template>
