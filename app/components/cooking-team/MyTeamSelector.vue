<script setup lang="ts">
/**
 * MyTeamSelector - Team selector for members to view their affiliated teams
 *
 * Features:
 * - Shows teams user is member of (any role)
 * - A team on view the user is not on rides as the last tab, under the badge "Ikke dit hold"
 * - Uses UTabs with CookingTeamBadges for consistent display
 * - Emits selection changes via v-model
 * - Handles empty state internally: no team of the user's own and no visit
 *
 * Phone (horizontal at any count - the list scrolls when tabs outgrow the row):
 *   +--------------------------------------------------+
 *   |   (team)        (team)         (team)             |
 *   | [Madhold 2]   [Madhold 5]    [Madhold 3]          |
 *   |                              [Ikke dit hold]      |
 *   |  =========                                        |
 *   +--------------------------------------------------+
 *   (team) = ICONS.team above the badge, so the full width serves the name
 * Desktop: icon beside the badges; 3+ tabs, the visit counted, render as a vertical list (sidebar)
 *
 * Visual check: /chef on an own team and on a visiting tab, phone and desktop.
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
import { TEAM_WORDS } from '~/config/teamWords'

interface Props {
  modelValue?: number | null
  teams: CookingTeamDisplay[]
  seasonTeams: CookingTeamDisplay[] // The season's full team list: the number fallback for a team whose name carries none
  visitingTeam?: CookingTeamDisplay | null // A team on view the user is not on
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  visitingTeam: null
})

const emit = defineEmits<{
  'update:modelValue': [teamId: number]
}>()

// Design system
const { SIZES, ORIENTATIONS, ICONS, ALERTS, COMPONENTS, COLOR, NOISE } = useTheSlopeDesignSystem()
const { getTeamShortName, getTeamNumber } = useCookingTeam()

const tabTeams = computed(() => props.visitingTeam ? [...props.teams, props.visitingTeam] : props.teams)

// Tab orientation using design system helper:
// - Fewer than 3 tabs: always horizontal (fits nicely in a row)
// - 3+ tabs on desktop: vertical (takes less horizontal space in sidebar)
// - 3+ tabs on mobile: horizontal (standard mobile pattern)
const tabOrientation = computed(() => ORIENTATIONS.forItemCount(tabTeams.value.length))

// Find selected team index from team ID
const selectedTeamIndex = computed({
  get: () => Math.max(0, tabTeams.value.findIndex(t => t.id === props.modelValue)),
  set: (index: number) => {
    const teamId = tabTeams.value[index]?.id
    if (teamId) emit('update:modelValue', teamId)
  }
})

// Uses short name for user-facing display (e.g., "Madhold 2" not "Madhold 2 - 08/25-06/26")
// The team's colour rides on CookingTeamBadges in the tab body, from the team's number
const teamTabs = computed(() => {
  return tabTeams.value.map((team, index) => ({
    label: getTeamShortName(team.name),
    value: index,
    teamNumber: getTeamNumber(team, props.seasonTeams),
    isVisit: team.id === props.visitingTeam?.id
  }))
})
</script>

<template>
  <div name="my-team-selector" data-testid="my-team-selector">
    <!-- Empty state -->
    <UAlert
      v-if="tabTeams.length === 0"
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
        <span :class="COMPONENTS.myTeamSelector.tab">
          <UIcon :name="ICONS.team" :class="COMPONENTS.myTeamSelector.icon" />
          <span :class="COMPONENTS.myTeamSelector.label">
            <CookingTeamBadges
              :team-number="item.teamNumber"
              :team-name="item.label"
              :show-counts="false"
              :show-team-icon="false"
              size="small"
            />
            <UBadge
              v-if="item.isVisit"
              :color="COLOR.neutral"
              :variant="NOISE.subtle"
              :size="SIZES.small"
              data-testid="my-team-visit-badge"
            >
              {{ TEAM_WORDS.visit.badge }}
            </UBadge>
          </span>
        </span>
      </template>
    </UTabs>
  </div>
</template>
