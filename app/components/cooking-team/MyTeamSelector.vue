<script setup lang="ts">
/**
 * MyTeamSelector - Team selector for members to view their affiliated teams
 *
 * Features:
 * - Shows teams user is member of (any role)
 * - Uses UTabs with CookingTeamBadges for consistent display
 * - Responsive: horizontal tabs (mobile), vertical tabs (desktop)
 * - Emits selection changes via v-model
 * - Handles empty state internally
 *
 * Used in:
 * - /chef/index.vue (master panel)
 *
 * Pattern:
 * - Matches AdminTeams tab display with CookingTeamBadges
 * - Reusable TeamListItem display (team name, color, member count, cooking days)
 *
 * ADR Compliance:
 * - ADR-001: Types from useCookingTeamValidation
 * - ADR-006: Selection synced with URL query param by parent
 */
import type { CookingTeamDisplay } from '~/composables/useCookingTeamValidation'

interface Props {
  modelValue?: number | null
  teams: CookingTeamDisplay[]
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null
})

const emit = defineEmits<{
  'update:modelValue': [teamId: number]
}>()

// Design system
const { COLOR, SIZES, ORIENTATIONS } = useTheSlopeDesignSystem()
const { getTeamColor, getTeamShortName } = useCookingTeam()

// Tab orientation:
// - Fewer than 3 teams: always horizontal (fits nicely in a row)
// - 3+ teams on desktop: vertical (takes less horizontal space)
// - 3+ teams on mobile: horizontal (standard mobile pattern)
const tabOrientation = computed(() => {
  if (props.teams.length < 3) return 'horizontal'
  return ORIENTATIONS.responsive.value === 'horizontal' ? 'vertical' : 'horizontal'
})

// Find selected team index from team ID
const selectedTeamIndex = computed({
  get: () => {
    if (props.modelValue === null || props.teams.length === 0) return 0
    const index = props.teams.findIndex(t => t.id === props.modelValue)
    return index >= 0 ? index : 0
  },
  set: (index: number) => {
    const team = props.teams[index]
    if (team) {
      emit('update:modelValue', team.id!)
    }
  }
})

// Tab items with CookingTeamBadges data (matches AdminTeams pattern)
// Uses short name for user-facing display (e.g., "Madhold 2" not "Madhold 2 - 08/25-06/26")
const teamTabs = computed(() => {
  return props.teams.map((team, index) => ({
    label: getTeamShortName(team.name),
    value: index,
    icon: 'i-fluent-mdl2-team-favorite',
    color: getTeamColor(index),
    // Data for CookingTeamBadges
    memberCount: team.assignments?.length ?? 0,
    cookingDaysCount: team.cookingDaysCount ?? 0
  }))
})
</script>

<template>
  <div name="my-team-selector" data-testid="my-team-selector">
    <!-- Empty state -->
    <UAlert
      v-if="teams.length === 0"
      type="info"
      variant="soft"
      :color="COLOR.info"
      icon="i-heroicons-user-group"
    >
      <template #title>
        Ingen madhold
      </template>
      <template #description>
        Du er ikke medlem af nogen madhold. Kontakt en administrator for at blive tildelt et madhold.
      </template>
    </UAlert>

    <!-- Team tabs with CookingTeamBadges (matches AdminTeams pattern) -->
    <!-- Mobile: horizontal tabs, Desktop: vertical tabs -->
    <UTabs
      v-else
      v-model="selectedTeamIndex"
      :items="teamTabs"
      :orientation="tabOrientation"
      variant="link"
      :size="SIZES.large"
    >
      <template #default="{ item }">
        <CookingTeamBadges
          :team-number="item.value + 1"
          :team-name="item.label"
          :show-counts="false"
          compact
        />
      </template>
    </UTabs>
  </div>
</template>
