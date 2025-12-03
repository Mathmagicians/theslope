<script setup lang="ts">
/**
 * TeamRoleStatus - Displays user's role and responsibilities on selected team
 *
 * Shows:
 * - User's role (CHEF, COOK, JUNIORHELPER)
 * - Team name and color
 * - Role-specific responsibilities/deadlines
 *
 * Used in:
 * - /chef/index.vue (top of master panel)
 */
import type { CookingTeamDetail } from '~/composables/useCookingTeamValidation'

interface Props {
  team: CookingTeamDetail
  inhabitantId: number
}

const props = defineProps<Props>()

// Design system
const { COLOR } = useTheSlopeDesignSystem()
const { getTeamColor } = useCookingTeam()

// Validation schemas
const { TeamRoleSchema } = useCookingTeamValidation()
const Role = TeamRoleSchema.enum

// Get user's role on this team
const userAssignment = computed(() => {
  return props.team.assignments?.find(a => a.inhabitantId === props.inhabitantId)
})

const userRole = computed(() => {
  return userAssignment.value?.role
})

const isChef = computed(() => userRole.value === Role.CHEF)

// Role display configuration
const roleConfig = computed(() => {
  const configs = {
    [Role.CHEF]: {
      label: 'Chefkok',
      icon: 'i-heroicons-star',
      color: COLOR.warning,
      description: 'Du er chefkok på dette hold, og har ansvaret for at slå en menu op, handle ind og håndtere madlavningen.'
    },
    [Role.COOK]: {
      label: 'Kok',
      icon: 'i-heroicons-user',
      color: COLOR.primary,
      description: 'Du hjælper cheffen med at lave maden'
    },
    [Role.JUNIORHELPER]: {
      label: 'Kokkespire',
      icon: 'i-heroicons-heart',
      color: COLOR.success,
      description: 'Du lærer at lave mad sammen med holdet'
    }
  }
  return configs[userRole.value as keyof typeof configs]
})

// Team number for color matching
const teamNumber = computed(() => {
  // Team is already loaded with all details
  const teamIndex = props.team.id ? props.team.id - 1 : 0
  return teamIndex
})
</script>

<template>
  <UAlert
    v-if="userRole && roleConfig"
    :color="isChef ? COLOR.warning : COLOR.info"
    variant="soft"
    :icon="roleConfig.icon"
    :ui="{ root: 'w-full' }"
  >
    <template #title>
      <div class="flex items-center gap-2">
        <span>{{ roleConfig.label }} på</span>
        <UBadge
          :color="getTeamColor(teamNumber)"
          variant="solid"
          size="sm"
        >
          {{ team.name }}
        </UBadge>
      </div>
    </template>
    <template #description>
      {{ roleConfig.description }}
    </template>
  </UAlert>
</template>
