<script setup lang="ts">
/**
 * CookingTeamBadges - Reusable team summary badges
 *
 * Displays consistent team information with colored badges:
 * - Team name with colored background
 * - Member count (👥 X)
 * - Cooking days count (📅 Y)
 *
 * Used in:
 * - AdminTeams EDIT mode tabs
 * - AdminTeams VIEW mode table
 * - Any list where team summary is needed
 *
 * Design System: Provides consistent team display across the app
 */

const { SIZES } = useTheSlopeDesignSystem()
const { getTeamColor } = useCookingTeam()

interface Props {
  teamNumber: number        // Logical number 1..N in season (for color)
  teamName: string         // Team name to display
  memberCount?: number      // Number of team members
  cookingDaysCount?: number // Number of cooking days assigned
  compact?: boolean        // If true, uses smaller size
  showCounts?: boolean     // If true, shows member and cooking days counts
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  showCounts: true,
  memberCount: 0,
  cookingDaysCount: 0
})

const teamColor = computed(() => getTeamColor(props.teamNumber - 1))
const badgeSize = computed(() => props.compact ? SIZES.small : SIZES.standard)
</script>

<template>
  <div class="flex items-center gap-2 flex-wrap">
    <UBadge
      :color="teamColor"
      variant="soft"
      :size="badgeSize"
    >
      {{ teamName }}
    </UBadge>
    <template v-if="showCounts">
      <UBadge
        :color="teamColor"
        variant="soft"
        :size="badgeSize"
      >
        👥 {{ memberCount }}
      </UBadge>
      <UBadge
        :color="teamColor"
        variant="soft"
        :size="badgeSize"
      >
        📅 {{ cookingDaysCount }}
      </UBadge>
    </template>
  </div>
</template>
