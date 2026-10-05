<script setup lang="ts">
/**
 * CookingTeamBadges - THE team badge triple
 *
 * +-----------------------------------------------------------------------------------+
 * | [ (team icon) Madhold 2 ]  [ (chef hat) 1 ]  [ (members icon) 4 ]  [ (calendar) 12 ] |
 * +-----------------------------------------------------------------------------------+
 * (team icon) = ICONS.team, (chef hat) = ICONS.chef, (members icon) = ICONS.members,
 * (calendar) = ICONS.calendar
 *
 * Every badge wears the team's rainbow stop - fill and ink as classes, so the
 * badge needs no colour slot (ADR-018). Icons lead, counts follow.
 *
 * Used in:
 * - AdminTeams table cell and vertical team strip
 * - MyTeamSelector tabs (name only; the trigger stacks its own team icon, so showTeamIcon is off)
 * - CookingTeamCard headers (large; the edit row shows counts only via showName)
 */

const { SIZES, ICONS, getRainbowBand } = useTheSlopeDesignSystem()

type BadgeSize = 'small' | 'standard' | 'large'

interface Props {
  teamNumber: number        // Logical number 1..N in season (for color)
  teamName: string          // Team name to display
  chefCount?: number        // Number of CHEF-role members
  memberCount?: number      // Number of team members
  cookingDaysCount?: number // Number of cooking days assigned
  size?: BadgeSize
  showCounts?: boolean      // Member and cooking-days badges
  showName?: boolean        // Name badge (off for a counts-only row)
  showTeamIcon?: boolean    // Team icon on the name badge (off when the host renders its own)
}

const props = withDefaults(defineProps<Props>(), {
  chefCount: 0,
  memberCount: 0,
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
  <div class="flex items-center gap-2 flex-wrap">
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
        :class="teamBand"
        :size="badgeSize"
        :icon="ICONS.calendar"
      >
        {{ cookingDaysCount }}
      </UBadge>
    </template>
  </div>
</template>
