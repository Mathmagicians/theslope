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
const { COLOR, ICONS } = useTheSlopeDesignSystem()

// Team utilities
const { getTeamShortName } = useCookingTeam()

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

// Team short name for display (e.g., "Madhold 2" instead of "Madhold 2 - 08/25-06/26")
const teamShortName = computed(() => getTeamShortName(props.team.name))

// Role display configuration
const roleConfig = computed(() => {
  const configs = {
    [Role.CHEF]: {
      title: 'Du er chefkok',
      icon: ICONS.chef,
      color: COLOR.warning,
      description: `Du er chefkok på ${teamShortName.value} og har ansvaret for at slå en menu op, handle ind og håndtere madlavningen.`
    },
    [Role.COOK]: {
      title: 'Du er kok',
      icon: 'i-heroicons-user',
      color: COLOR.primary,
      description: `Du hjælper cheffen på ${teamShortName.value} med at lave maden`
    },
    [Role.JUNIORHELPER]: {
      title: 'Du er kokkespire',
      icon: 'i-heroicons-heart',
      color: COLOR.success,
      description: `Du er en sej kokkespire, som hjælper de voksne på ${teamShortName.value}`
    }
  }
  return configs[userRole.value as keyof typeof configs]
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
      {{ roleConfig.title }}
    </template>
    <template #description>
      {{ roleConfig.description }}
    </template>
  </UAlert>
</template>
