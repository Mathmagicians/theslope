<script setup lang="ts">
/**
 * MyTeamSelector - Team selector for members to view their affiliated teams
 *
 * Features:
 * - Shows teams user is member of (any role)
 * - Uses UTabs with CookingTeamBadges for consistent display
 * - Emits selection changes via v-model
 * - Handles empty state internally
 *
 * Phone (horizontal at any count - the list scrolls when tabs outgrow the row):
 *   +--------------------------------------------------+
 *   |   (team)      (team)      (team)      (team)     |
 *   | [Madhold 1] [Madhold 2] [Madhold 3] [Madhold 4]  |
 *   |  =========                                       |
 *   +--------------------------------------------------+
 *   (team) = ICONS.team above the badge, so the full width serves the name
 * Desktop: icon beside the badge; 3+ teams render as a vertical list (sidebar)
 *
 * Used in:
 * - /chef/index.vue (master panel)
 *
 * Pattern:
 * - CookingTeamBadges in the tab bodies (the shared team badge row)
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
const { SIZES, ORIENTATIONS, ICONS, ALERTS, COMPONENTS } = useTheSlopeDesignSystem()
const { getTeamShortName } = useCookingTeam()

// Tab orientation using design system helper:
// - Fewer than 3 teams: always horizontal (fits nicely in a row)
// - 3+ teams on desktop: vertical (takes less horizontal space in sidebar)
// - 3+ teams on mobile: horizontal (standard mobile pattern)
const tabOrientation = computed(() => ORIENTATIONS.forItemCount(props.teams.length))

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

// Uses short name for user-facing display (e.g., "Madhold 2" not "Madhold 2 - 08/25-06/26")
// The team's colour rides on CookingTeamBadges in the tab body, from the team's number
const teamTabs = computed(() => {
  return props.teams.map((team, index) => ({
    label: getTeamShortName(team.name),
    value: index
  }))
})
</script>

<template>
  <div name="my-team-selector" data-testid="my-team-selector">
    <!-- Empty state -->
    <UAlert
      v-if="teams.length === 0"
      v-bind="ALERTS.info"
      :icon="ICONS.userGroup"
    >
      <template #title>
        Ingen madhold
      </template>
      <template #description>
        Du er ikke medlem af nogen madhold. Kontakt en administrator for at blive tildelt et madhold.
      </template>
    </UAlert>

    <!-- Team tabs with CookingTeamBadges (matches AdminTeams pattern) -->
    <UTabs
      v-else
      v-bind="COMPONENTS.teamTabs"
      v-model="selectedTeamIndex"
      :items="teamTabs"
      :orientation="tabOrientation"
      :size="SIZES.large"
    >
      <template #default="{ item }">
        <span class="flex flex-col items-center gap-1 md:flex-row md:gap-2">
          <UIcon :name="ICONS.team" class="shrink-0" />
          <CookingTeamBadges
            :team-number="item.value + 1"
            :team-name="item.label"
            :show-counts="false"
            :show-team-icon="false"
            size="small"
          />
        </span>
      </template>
    </UTabs>
  </div>
</template>
