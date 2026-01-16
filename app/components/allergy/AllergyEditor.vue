<script setup lang="ts">
/**
 * AllergyEditor - Complete allergy selection with add/remove
 *
 * Pattern extracted from HouseholdAllergies:
 * - USelectMenu dropdown to add allergies (shows only unselected)
 * - Badge list of selected allergies with remove buttons
 *
 * Used by:
 * - GuestBookingForm (guest allergies, simple badges)
 */
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'

interface Props {
  allergyTypes: AllergyTypeDisplay[]
  label?: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Allergier',
  placeholder: '🥛🥐🥚🥜 Vælg en allergi...'
})

const selectedIds = defineModel<number[]>({default: () => []})

const {SIZES, COLOR, ICONS} = useTheSlopeDesignSystem()

// Available allergy types (not already selected)
const availableTypes = computed(() =>
  props.allergyTypes.filter(t => !selectedIds.value.includes(t.id))
)

// Selected allergy types (full objects for display)
const selectedTypes = computed(() =>
  props.allergyTypes.filter(t => selectedIds.value.includes(t.id))
)

// Add allergy by ID
const handleAdd = (id: number | undefined) => {
  if (id && !selectedIds.value.includes(id)) {
    selectedIds.value = [...selectedIds.value, id]
  }
}

// Remove allergy by ID
const handleRemove = (id: number) => {
  selectedIds.value = selectedIds.value.filter(i => i !== id)
}
</script>

<template>
  <div class="space-y-2">
    <!-- Label -->
    <label v-if="label" class="block text-sm font-medium">{{ label }}</label>

    <!-- Add selector - pattern from HouseholdAllergies -->
    <USelectMenu
      v-if="availableTypes.length > 0"
      :model-value="undefined"
      :items="availableTypes.map(t => ({ ...t, icon: t.icon ?? undefined, label: t.name }))"
      :placeholder="placeholder"
      value-key="id"
      class="w-full"
      data-testid="allergy-editor-select"
      @update:model-value="(val: number) => val && handleAdd(val)"
    >
      <template #item="{ item }">
        <span class="flex items-center gap-2">
          <span>{{ (item as AllergyTypeDisplay).icon }}</span>
          <span>{{ (item as AllergyTypeDisplay).name }}</span>
        </span>
      </template>
      <template #empty>
        <span class="text-muted">Ingen allergier tilgængelige</span>
      </template>
    </USelectMenu>

    <!-- Empty state when all allergies selected -->
    <p v-else-if="selectedTypes.length > 0" class="text-xs text-muted">
      Alle allergityper er valgt
    </p>

    <!-- Selected allergies as badges with remove -->
    <div v-if="selectedTypes.length > 0" class="flex flex-wrap gap-2">
      <UBadge
        v-for="type in selectedTypes"
        :key="type.id"
        :color="COLOR.warning"
        variant="soft"
        :size="SIZES.small"
        class="pr-1"
      >
        <span class="flex items-center gap-1">
          <span v-if="type.icon">{{ type.icon }}</span>
          <span>{{ type.name }}</span>
          <UButton
            :color="COLOR.neutral"
            variant="link"
            :icon="ICONS.xMark"
            size="xs"
            :padded="false"
            class="ml-1"
            @click="handleRemove(type.id)"
          />
        </span>
      </UBadge>
    </div>
  </div>
</template>
