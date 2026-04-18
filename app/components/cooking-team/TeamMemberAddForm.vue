<script setup lang="ts">
/**
 * TeamMemberAddForm - Inline expandable form for adding/editing a team member.
 *
 * Collects role, allocation percentage, and optional weekday affinity.
 * Expands inline below the InhabitantSelector row (same UX as GuestBookingForm).
 * When initialRole/initialPercentage/initialAffinity are provided, acts as edit form.
 */
import type {TeamRole} from '~/composables/useCookingTeamValidation'
import {ROLE_OPTIONS, ALLOCATION_PERCENTAGE_OPTIONS} from '~/composables/useCookingTeamValidation'
import type {WeekDayMap} from '~/types/dateTypes'
import type {TeamColor} from '~/composables/useCookingTeam'

interface Props {
  teamAffinity?: WeekDayMap | null
  teamColor: TeamColor
  initialRole?: TeamRole
  initialPercentage?: number
  initialAffinity?: WeekDayMap | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  submit: [role: TeamRole, allocationPercentage: number, affinity: WeekDayMap | null]
  cancel: []
}>()

const {SIZES, BUTTONS, ICONS} = useTheSlopeDesignSystem()
const {TeamRoleSchema} = useCookingTeamValidation()
const Role = TeamRoleSchema.enum

const isEditMode = computed(() => !!props.initialRole)

const form = reactive({
  role: (props.initialRole ?? Role.COOK) as TeamRole,
  allocationPercentage: props.initialPercentage ?? 100,
  affinity: props.initialAffinity ?? null as WeekDayMap | null
})

const handleSubmit = () => {
  emit('submit', form.role, form.allocationPercentage, form.affinity)
}
</script>

<template>
  <div class="flex flex-col gap-3 py-2">
    <UFormField label="Vælg rolle på hold" :size="SIZES.small">
      <USelectMenu
          v-model="form.role"
          :items="ROLE_OPTIONS"
          value-key="value"
          placeholder="Vælg rolle..."
          :size="SIZES.small"
      />
    </UFormField>

    <UFormField label="Arbejdstid" :size="SIZES.small">
      <USelectMenu
          v-model="form.allocationPercentage"
          :items="ALLOCATION_PERCENTAGE_OPTIONS"
          value-key="value"
          placeholder="Vælg procent..."
          :size="SIZES.small"
      />
    </UFormField>

    <WeekDayMapDisplay
        v-model="form.affinity"
        :parent-restriction="teamAffinity"
        hide-restricted
        label="Kan kun følgende ugedage"
        :color="teamColor"
    />

    <div class="flex flex-col-reverse md:flex-row md:justify-end gap-2">
      <UButton v-bind="BUTTONS.cancel" :size="SIZES.small" @click="emit('cancel')">
        Annuller
      </UButton>
      <UButton v-bind="BUTTONS.save" :size="SIZES.small" @click="handleSubmit">
        <template #leading><UIcon :name="isEditMode ? ICONS.check : ICONS.plusCircle" /></template>
        {{ isEditMode ? 'Gem' : 'Tilføj' }}
      </UButton>
    </div>
  </div>
</template>
