<script setup lang="ts">
/**
 * MyTeamSelector - Team selector for members to view their affiliated teams
 *
 * Features:
 * - Shows teams user is member of (any role)
 * - Simple USelect dropdown
 * - Emits selection changes via v-model
 * - Handles empty state internally
 *
 * Used in:
 * - /chef/index.vue (master panel)
 *
 * ADR Compliance:
 * - ADR-001: Types from useCookingTeamValidation
 * - ADR-006: Selection synced with URL query param by parent
 */
import type { CookingTeamDisplay } from '~/composables/useCookingTeamValidation'

interface Props {
  modelValue?: number | null
  teams: CookingTeamDisplay[]
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null
})

const emit = defineEmits<{
  'update:modelValue': [teamId: number]
}>()

// Design system
const { COLOR } = useTheSlopeDesignSystem()

// Select options
const selectOptions = computed(() => {
  return props.teams.map(team => ({
    label: team.name,
    value: team.id
  }))
})
</script>

<template>
  <div name="my-team-selector" data-testid="my-team-selector">
    <!-- Empty state -->
    <UAlert
      v-if="teams.length === 0"
      type="info"
      variant="soft"
      :color="COLOR.info"
      icon="i-heroicons-user-group"
    >
      <template #title>
        Ingen madhold
      </template>
      <template #description>
        Du er ikke medlem af nogen madhold. Kontakt en administrator for at blive tildelt et madhold.
      </template>
    </UAlert>

    <!-- Team selector -->
    <USelect
      v-else
      :model-value="modelValue"
      :options="selectOptions"
      placeholder="Vælg madhold"
      value-attribute="value"
      option-attribute="label"
      @update:model-value="(value) => emit('update:modelValue', value)"
    />
  </div>
</template>
