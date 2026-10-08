<script setup lang="ts">
/**
 * CookingTeamBadges - THE team badge row
 *
 * +---------------------------------------------------------------------------------------------------+
 * | [ (team icon) Madhold 2 ]  [ (chef hat) 1 ]  [ (members icon) 4 ]  [ (joker) 1 ]  [ (calendar) 12 ] |
 * +---------------------------------------------------------------------------------------------------+
 * (team icon) = ICONS.team, (chef hat) = ICONS.chef, (members icon) = ICONS.members,
 * (joker) = ICONS.joker, only while the team holds a joker slot, (calendar) = ICONS.calendar
 *
 * Every badge wears the team's rainbow stop - fill and ink as classes, so the
 * badge needs no colour slot (ADR-018). Icons lead, counts follow.
 *
 * Used in:
 * - AdminTeams table cell and vertical team strip
 * - MyTeamSelector tabs (name only; the trigger stacks its own team icon, so showTeamIcon is off)
 * - CookingTeamCard headers (large; the edit row shows counts only via showName)
 */

const { SIZES, ICONS, COMPONENTS, getRainbowBand, getCalendarCountBadge } = useTheSlopeDesignSystem()

type BadgeSize = 'small' | 'standard' | 'large'

interface Props {
  teamNumber: number        // Logical number 1..N in season (for color)
  teamName: string          // Team name to display
  chefCount?: number        // Number of CHEF-role members
  memberCount?: number      // Number of team members
  jokerSlotCount?: number   // Number of joker slots the team holds
  cookingDaysCount?: number // Number of cooking days assigned
  size?: BadgeSize
  showCounts?: boolean      // Member and cooking-days badges
  showName?: boolean        // Name badge (off for a counts-only row)
  showTeamIcon?: boolean    // Team icon on the name badge (off when the host renders its own)
}

const props = withDefaults(defineProps<Props>(), {
  chefCount: 0,
  memberCount: 0,
  jokerSlotCount: 0,
  cookingDaysCount: 0,
  size: 'standard',
  showCounts: true,
  showName: true,
  showTeamIcon: true
})

const teamBand = computed(() => getRainbowBand(props.teamNumber - 1))
const badgeSize = computed(() => ({small: SIZES.small, standard: SIZES.standard, large: SIZES.large}[props.size]))
</script>

<template>
  <div :class="COMPONENTS.teamBadgeRow">
    <UBadge
      v-if="showName"
      :class="teamBand"
      :size="badgeSize"
      :icon="showTeamIcon ? ICONS.team : undefined"
    >
      {{ teamName }}
    </UBadge>
    <template v-if="showCounts">
      <UBadge
        :class="teamBand"
        :size="badgeSize"
        :icon="ICONS.chef"
      >
        {{ chefCount }}
      </UBadge>
      <UBadge
        :class="teamBand"
        :size="badgeSize"
        :icon="ICONS.members"
      >
        {{ memberCount }}
      </UBadge>
      <UBadge
        v-if="jokerSlotCount > 0"
        :class="teamBand"
        :size="badgeSize"
        :icon="ICONS.joker"
        data-testid="team-badge-jokers"
      >
        {{ jokerSlotCount }}
      </UBadge>
      <UBadge
        v-bind="getCalendarCountBadge(teamNumber)"
        :size="badgeSize"
      >
        {{ cookingDaysCount }}
      </UBadge>
    </template>
  </div>
</template>
