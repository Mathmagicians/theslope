<script setup lang="ts">
import type { FormMode } from '~/types/form'
import type { WeekDayMap, DateRange } from '~/types/dateTypes'
import type { DinnerEvent } from '~/composables/useDinnerEventValidation'

interface TeamMember {
  id: number
  role: 'CHEF' | 'COOK' | 'JUNIORHELPER'
  inhabitant: {
    id: number
    name: string
    lastName: string
    pictureUrl: string | null
  }
}

interface Props {
  teamId?: number          // Database ID (optional for create mode)
  teamNumber: number      // Logical number 1..N in season
  teamName: string        // Team name (editable)
  seasonId?: number       // Required for EDIT mode (inhabitant selector)
  assignments?: TeamMember[]
  affinity?: WeekDayMap | null  // Team's weekday preferences
  seasonCookingDays?: WeekDayMap | null  // Season's cooking days (parent restriction)
  seasonDates?: DateRange  // Season date range (for calendar)
  dinnerEvents?: DinnerEvent[]  // All dinner events (will be filtered to this team)
  holidays?: DateRange[]   // Holiday periods
  teams?: Array<{ id: number, name: string }>  // All teams in season (for InhabitantSelector lookup)
  compact?: boolean
  mode?: FormMode         // Form mode: view, edit, create
  showMembers?: boolean   // If false, only show count badge in compact mode
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  assignments: () => [],
  affinity: null,
  mode: 'view',
  showMembers: true,
  dinnerEvents: () => [],
  holidays: () => []
})

const emit = defineEmits<{
  'update:teamName': [name: string]
  'update:affinity': [affinity: WeekDayMap | null]
  delete: [teamId: number | undefined]
  'add:member': [inhabitantId: number, role: 'CHEF' | 'COOK' | 'JUNIORHELPER']
  'remove:member': [assignmentId: number]
}>()

// Inject responsive breakpoint from parent
const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)

// Local state for editing team name
const editedName = ref(props.teamName)

// Reset edited name when team name prop changes
watch(() => props.teamName, (newName) => {
  editedName.value = newName
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

const roleLabels = {
  CHEF: 'Chefkok',
  COOK: 'Kok',
  JUNIORHELPER: 'Kokkespire'
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

const isEditable = computed(() => props.mode === 'create' || props.mode === 'edit')

// Ref to InhabitantSelector for refresh
const inhabitantSelectorRef = ref<{ refresh: () => Promise<void> } | null>(null)

// Expose refresh method to parent
defineExpose({
  refreshInhabitants: async () => {
    await inhabitantSelectorRef.value?.refresh()
  }
})
</script>

<template>
  <!-- COMPACT VIEW for table display -->
  <div v-if="compact">
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
        {{ assignments.length }} medlem{{ assignments.length !== 1 ? 'mer' : '' }}
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
        <span class="text-xs text-gray-500 font-medium">{{ roleLabels[role] }}</span>
        <div class="flex items-center gap-2">
          <UAvatarGroup size="sm" :max="3">
            <UTooltip
              v-for="member in members"
              :key="member.id"
              :text="`${member.inhabitant.name} ${member.inhabitant.lastName}`"
            >
              <UAvatar
                :src="member.inhabitant.pictureUrl"
                :alt="`${member.inhabitant.name} ${member.inhabitant.lastName}`"
                icon="i-heroicons-user"
                class="cursor-pointer"
                @click="navigateToInhabitant(member.inhabitant.id)"
              />
            </UTooltip>
          </UAvatarGroup>

          <div class="flex flex-wrap gap-1">
            <UBadge
              v-for="member in members"
              :key="member.id"
              size="sm"
              variant="soft"
              :color="teamColor"
              class="cursor-pointer"
              @click="navigateToInhabitant(member.inhabitant.id)"
            >
              {{ member.inhabitant.name }}
            </UBadge>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- FULL VIEW with role sections -->
  <div v-else class="space-y-4">
    <!-- TEAM HEADER (for CREATE/EDIT modes) -->
    <div
      v-if="isEditable"
      class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 py-2 px-0 md:p-4 border-y-2 md:border-2 border-dashed rounded-none md:rounded-lg"
      :class="`border-${teamColor}-400 dark:border-${teamColor}-700`"
      :style="{ borderColor: `var(--color-${resolvedColor}-300)` }"
    >
      <div class="flex flex-col md:flex-row md:items-center gap-3 flex-1">
        <UBadge :color="teamColor" variant="soft" :size="getIsMd ? 'lg' : 'md'" class="rounded-full p-2 md:p-8">
          <UIcon name="i-fluent-mdl2-team-favorite" :size="getIsMd ? '48' : '16'" />
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
              :text="`${assignment.inhabitant.name} ${assignment.inhabitant.lastName} (${roleLabels[assignment.role]})`"
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
            {{ assignments.length }} medlem{{ assignments.length !== 1 ? 'mer' : '' }}
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
    <div v-else class="flex items-center gap-3 p-4 border rounded-lg" :class="`border-${teamColor}-300 dark:border-${teamColor}-700`">
      <UIcon name="i-heroicons-user-group" class="text-xl" :class="`text-${teamColor}-500`" />
      <h3 class="text-lg font-semibold">{{ teamName }}</h3>
    </div>

    <!-- EDIT MODE: Three-row layout -->
    <div v-if="mode === 'edit'" class="space-y-6 lg:space-y-10">
      <!-- ROW1: Weekday assignments + Calendar -->
      <div class="flex flex-col md:flex-row gap-6">
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
          <div v-else class="p-6 border-2 border-dashed rounded-lg text-center text-gray-500">
            <UIcon name="i-heroicons-calendar" class="text-4xl mb-2" />
            <p class="text-sm">Ingen fællesspisninger tildelt endnu</p>
          </div>
        </div>
      </div>

      <!-- ROW2: Team members (full width) -->
      <div class="space-y-4">
        <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Holdmedlemmer</h4>
        <div class="flex flex-col md:flex-row gap-4">
          <div
            v-for="(members, role) in roleGroups"
            :key="role"
            class="flex-1 space-y-2"
          >
            <h5 class="text-xs font-medium text-gray-600 dark:text-gray-400">
              {{ roleLabels[role] }}
            </h5>

            <div v-if="members.length > 0" class="flex flex-col gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
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
              Ingen {{ roleLabels[role].toLowerCase() }}
            </div>
          </div>
        </div>
      </div>

      <!-- ROW3: Inhabitant finder (full width) -->
      <div class="space-y-4">
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
        <div v-else class="p-6 border-2 border-dashed rounded-lg text-center text-gray-500">
          <UIcon name="i-heroicons-users" class="text-4xl mb-2" />
          <p class="text-sm">Hold skal gemmes før medlemmer kan tilføjes</p>
        </div>
      </div>
    </div>

    <!-- CREATE/VIEW MODE: Single column with role sections -->
    <div v-else class="space-y-4">
      <div
        v-for="(members, role) in roleGroups"
        :key="role"
        class="space-y-2"
      >
        <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {{ roleLabels[role] }}
        </h4>

        <div v-if="members.length > 0" class="flex flex-col md:flex-row md:items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
          <UAvatarGroup size="md" :max="5">
            <UTooltip
              v-for="member in members"
              :key="member.id"
              :text="`${member.inhabitant.name} ${member.inhabitant.lastName}`"
            >
              <UAvatar
                :src="member.inhabitant.pictureUrl"
                :alt="`${member.inhabitant.name} ${member.inhabitant.lastName}`"
                icon="i-heroicons-user"
                class="cursor-pointer hover:ring-2 hover:ring-offset-2"
                :class="`hover:ring-${teamColor}`"
                @click="navigateToInhabitant(member.inhabitant.id)"
              />
            </UTooltip>
          </UAvatarGroup>

          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="member in members"
              :key="member.id"
              size="md"
              variant="subtle"
              :color="teamColor"
              class="cursor-pointer hover:opacity-80 transition-opacity"
              @click="navigateToInhabitant(member.inhabitant.id)"
            >
              {{ member.inhabitant.name }} {{ member.inhabitant.lastName }}
            </UBadge>
          </div>
        </div>

        <div v-else class="text-sm text-gray-500 italic p-3">
          Madhold uden kokke!
        </div>
      </div>
    </div>
  </div>
</template>
