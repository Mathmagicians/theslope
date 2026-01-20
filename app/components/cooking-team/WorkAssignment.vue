<script setup lang="ts">
/**
 * WorkAssignment - Volunteer buttons and roster for cooking team assignments
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ARCHITECTURE: Business Logic Component for Team Volunteering
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * WorkAssignment handles the business logic for:
 * - Volunteering for cooking roles (Chef, Cook, Junior Helper)
 * - (Future) Withdrawing from assigned roles
 * - (Future) Displaying the roster/schedule for the team
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 🍽️ Vil du hjælpe til med madlavningen?                                  │
 * │ [Bliv chefkok 👨‍🍳]  [Bliv kok 👥]  [Bliv kokkespire 🌱]                  │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Used in:
 * - /dinner page (DinnerDetailPanel #team slot)
 * - /chef page (DinnerDetailPanel #team slot)
 *
 * ADR Compliance:
 * - ADR-001: Types from validation composables
 * - ADR-007: Uses stores for data fetching and mutations
 * - Mobile-first responsive design
 */
import type { DinnerEventDetail } from '~/composables/useBookingValidation'
import { ROLE_ICONS } from '~/composables/useCookingTeamValidation'

interface Props {
  dinnerEvent: DinnerEventDetail
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'role-assigned'): void
}>()

// Design system
const { COMPONENTS, ICONS } = useTheSlopeDesignSystem()

// Store integration
const planStore = usePlanStore()
const authStore = useAuthStore()

// Get current user's inhabitant
const { user } = storeToRefs(authStore)
const currentInhabitant = computed(() => user.value?.Inhabitant)

// Role assignment (for volunteering buttons)
const { TeamRoleSchema } = useCookingTeamValidation()
const TeamRole = TeamRoleSchema.enum

// Check if user can volunteer for cooking roles
const canVolunteer = computed(() => {
  if (!currentInhabitant.value) return false
  if (!props.dinnerEvent?.cookingTeamId) return false
  // TODO: Check if already assigned to this team
  return true
})

// Handle role assignment (volunteer as chef/cook/helper)
const isAssigningRole = ref(false)
const handleRoleAssignment = async (role: typeof TeamRole[keyof typeof TeamRole]) => {
  if (!props.dinnerEvent?.id || !currentInhabitant.value?.id) return

  isAssigningRole.value = true
  try {
    await planStore.assignRoleToDinner(
      props.dinnerEvent.id,
      currentInhabitant.value.id,
      role
    )
    // Notify parent to refresh data (chef icon in ChefMenuCard)
    emit('role-assigned')
  } catch (error) {
    console.error('Failed to assign role:', error)
    // Error feedback could be added here
  } finally {
    isAssigningRole.value = false
  }
}
</script>

<template>
  <!-- Volunteer Buttons -->
  <UFieldGroup
    label="🍽️ Vil du hjælpe til med madlavningen?"
    :class="COMPONENTS.heroPanel.light.container"
    class="mt-2 md:mt-4"
    orientation="horizontal"
    data-testid="work-assignment"
  >
    <div class="flex flex-wrap gap-1 md:gap-2">
      <UButton
        :color="COMPONENTS.heroPanel.light.primaryButton"
        variant="solid"
        size="md"
        name="volunteer-chef"
        :loading="isAssigningRole"
        :disabled="isAssigningRole || !canVolunteer"
        @click="handleRoleAssignment(TeamRole.CHEF)"
      >
        <template #leading>{{ ROLE_ICONS.CHEF }}</template>
        Chefkok
        <template #trailing><UIcon :name="ICONS.plusCircle" /></template>
      </UButton>
      <UButton
        :color="COMPONENTS.heroPanel.light.primaryButton"
        variant="solid"
        size="md"
        name="volunteer-cook"
        :loading="isAssigningRole"
        :disabled="isAssigningRole || !canVolunteer"
        @click="handleRoleAssignment(TeamRole.COOK)"
      >
        <template #leading>{{ ROLE_ICONS.COOK }}</template>
        Kok
        <template #trailing><UIcon :name="ICONS.plusCircle" /></template>
      </UButton>
      <UButton
        :color="COMPONENTS.heroPanel.light.primaryButton"
        variant="solid"
        size="md"
        name="volunteer-helper"
        :loading="isAssigningRole"
        :disabled="isAssigningRole || !canVolunteer"
        @click="handleRoleAssignment(TeamRole.JUNIORHELPER)"
      >
        <template #leading>{{ ROLE_ICONS.JUNIORHELPER }}</template>
        Kokkespire
        <template #trailing><UIcon :name="ICONS.plusCircle" /></template>
      </UButton>
      <UButton
        :color="COMPONENTS.heroPanel.light.primaryButton"
        variant="solid"
        size="md"
        name="swap-shift"
        :disabled="true"
      >
        <template #leading><UIcon :name="ICONS.team" /></template>
        Byt Tjans
        <template #trailing><UIcon name="i-heroicons-arrows-right-left" /></template>
      </UButton>
    </div>
  </UFieldGroup>
</template>
