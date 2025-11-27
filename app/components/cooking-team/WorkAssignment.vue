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

interface Props {
  dinnerEvent: DinnerEventDetail
}

const props = defineProps<Props>()

// Design system
const { COMPONENTS } = useTheSlopeDesignSystem()

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
    // Success feedback could be added here
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
    class="mt-4"
    data-testid="work-assignment"
  >
    <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
      <UButton
        :color="COMPONENTS.heroPanel.light.primaryButton"
        variant="solid"
        size="md"
        name="volunteer-chef"
        icon="i-heroicons-plus"
        :loading="isAssigningRole"
        :disabled="isAssigningRole || !canVolunteer"
        block
        @click="handleRoleAssignment(TeamRole.CHEF)"
      >
        Bliv chefkok 👨‍🍳
      </UButton>
      <UButton
        :color="COMPONENTS.heroPanel.light.primaryButton"
        variant="solid"
        size="md"
        name="volunteer-cook"
        icon="i-heroicons-plus"
        :loading="isAssigningRole"
        :disabled="isAssigningRole || !canVolunteer"
        block
        @click="handleRoleAssignment(TeamRole.COOK)"
      >
        Bliv kok 👥
      </UButton>
      <UButton
        :color="COMPONENTS.heroPanel.light.primaryButton"
        variant="solid"
        size="md"
        name="volunteer-helper"
        icon="i-heroicons-plus"
        :loading="isAssigningRole"
        :disabled="isAssigningRole || !canVolunteer"
        block
        @click="handleRoleAssignment(TeamRole.JUNIORHELPER)"
      >
        Bliv kokkespire 🌱
      </UButton>
    </div>
  </UFieldGroup>
</template>
