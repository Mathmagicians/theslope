<script setup lang="ts">
/**
 * TeamRoleFields - the role and allocation fields a team seat carries (TeamMemberAddForm, JokerSlotForm).
 *
 *   <roleLabel>   [(whisk) Kok  v]   <- items and trigger carry ROLE_ICONS
 *   Arbejdstid    [100%         v]
 */
import type {TeamRole} from '~/composables/useCookingTeamValidation'
import {ROLE_OPTIONS, ALLOCATION_PERCENTAGE_OPTIONS} from '~/composables/useCookingTeamValidation'

defineProps<{
  roleLabel: string
  roleSelectTestId: string
}>()

const role = defineModel<TeamRole>('role', {required: true})
const allocationPercentage = defineModel<number | undefined>('allocationPercentage')

const {SIZES, COMPONENTS, ROLE_ICONS} = useTheSlopeDesignSystem()

const roleOptions = ROLE_OPTIONS.map(option => ({...option, icon: ROLE_ICONS[option.value]}))
</script>

<template>
  <UFormField :label="roleLabel" name="role" :size="SIZES.small">
    <USelectMenu
        v-model="role"
        :items="roleOptions"
        :icon="ROLE_ICONS[role]"
        :data-testid="roleSelectTestId"
        value-key="value"
        placeholder="Vælg rolle..."
        :class="COMPONENTS.teamForm.control"
        :size="SIZES.small"
    />
  </UFormField>

  <UFormField label="Arbejdstid" name="allocationPercentage" :size="SIZES.small">
    <USelectMenu
        v-model="allocationPercentage"
        :items="ALLOCATION_PERCENTAGE_OPTIONS"
        value-key="value"
        placeholder="Vælg procent..."
        :class="COMPONENTS.teamForm.control"
        :size="SIZES.small"
    />
  </UFormField>
</template>
