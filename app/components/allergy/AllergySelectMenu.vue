<script setup lang="ts">
/**
 * AllergySelectMenu - Reusable allergy type multi-select
 *
 * USelectMenu wrapper for selecting allergy types with icons.
 * Used by:
 * - HouseholdAllergies (single select mode for adding allergies)
 * - GuestBookingForm (multiple select for guest allergies)
 */
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'

interface Props {
  allergyTypes: AllergyTypeDisplay[]
  multiple?: boolean
  placeholder?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  multiple: false,
  placeholder: '🥛🥐🥚🥜 Vælg allergier...',
  disabled: false
})

const modelValue = defineModel<number | number[] | undefined>()

const {SIZES} = useTheSlopeDesignSystem()

// Map allergy types to select items with icon and label
const items = computed(() =>
  props.allergyTypes.map(t => ({
    ...t,
    icon: t.icon ?? undefined,
    label: t.name
  }))
)
</script>

<template>
  <USelectMenu
    v-model="modelValue"
    :items="items"
    value-key="id"
    :multiple="multiple"
    :placeholder="placeholder"
    :disabled="disabled"
    :size="SIZES.small"
    data-testid="allergy-select-menu"
  >
    <template #item="{ item }">
      <span class="flex items-center gap-2">
        <span v-if="item.icon">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </span>
    </template>
    <template #empty>
      <span class="text-muted">Ingen allergier tilgængelige</span>
    </template>
  </USelectMenu>
</template>
