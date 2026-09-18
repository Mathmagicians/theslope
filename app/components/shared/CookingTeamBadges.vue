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
 * Design System: the badges wear the team's rainbow stop - fill and ink as classes, so the
 * badge needs no colour slot (ADR-018)
 */

const { SIZES, getRainbowBand } = useTheSlopeDesignSystem()

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

const teamBand = computed(() => getRainbowBand(props.teamNumber - 1))
const badgeSize = computed(() => props.compact ? SIZES.small : SIZES.standard)
</script>

<template>
  <div class="flex items-center gap-2 flex-wrap">
    <UBadge
      :class="teamBand"
      :size="badgeSize"
    >
      {{ teamName }}
    </UBadge>
    <template v-if="showCounts">
      <UBadge
        :class="teamBand"
        :size="badgeSize"
      >
        👥 {{ memberCount }}
      </UBadge>
      <UBadge
        :class="teamBand"
        :size="badgeSize"
      >
        📅 {{ cookingDaysCount }}
      </UBadge>
    </template>
  </div>
</template>
