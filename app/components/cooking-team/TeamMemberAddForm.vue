<script setup lang="ts">
/**
 * TeamMemberAddForm - Inline expandable form for adding/editing a team member.
 *
 * Collects role, allocation percentage, and optional weekday affinity.
 * Expands inline below the InhabitantSelector row (same UX as GuestBookingForm).
 * When initialRole/initialPercentage/initialAffinity are provided, acts as edit form.
 */
import type {TeamRole} from '~/composables/useCookingTeamValidation'
import type {WeekDayMap} from '~/types/dateTypes'

interface Props {
  teamAffinity?: WeekDayMap | null
  initialRole?: TeamRole
  initialPercentage?: number
  initialAffinity?: WeekDayMap | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  submit: [role: TeamRole, allocationPercentage: number, affinity: WeekDayMap | null]
  cancel: []
}>()

const {SIZES, BUTTONS, ICONS, LAYOUTS, COMPONENTS} = useTheSlopeDesignSystem()
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
  <div :class="COMPONENTS.teamForm.stack">
    <TeamRoleFields
        v-model:role="form.role"
        v-model:allocation-percentage="form.allocationPercentage"
        role-label="Vælg rolle på hold"
        role-select-test-id="team-member-role-select"
    />

    <WeekDayMapDisplay
        v-model="form.affinity"
        :parent-restriction="teamAffinity"
        hide-restricted
        label="Kan kun følgende ugedage"
    />

    <div :class="LAYOUTS.formButtonRow">
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
