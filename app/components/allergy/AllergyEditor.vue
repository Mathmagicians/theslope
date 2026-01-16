<script setup lang="ts">
/**
 * AllergyEditor - Complete allergy selection with add/remove
 *
 * Features:
 * - Dropdown to add allergies (shows only available/unselected)
 * - Badge list of selected allergies with remove buttons
 * - Compact mode for inline forms (GuestBookingForm)
 *
 * Used by:
 * - GuestBookingForm (guest allergies, no comments)
 * - HouseholdAllergies (inhabitant allergies, with comments - uses slots)
 */
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'

interface Props {
  allergyTypes: AllergyTypeDisplay[]
  label?: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Allergier',
  placeholder: '🥛🥐🥚🥜 Tilføj allergi...'
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

// Map for dropdown items
const dropdownItems = computed(() =>
  availableTypes.value.map(t => ({
    ...t,
    icon: t.icon ?? undefined,
    label: t.name
  }))
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

    <!-- Add selector (only if there are available types) -->
    <USelectMenu
      v-if="availableTypes.length > 0"
      :model-value="undefined"
      :items="dropdownItems"
      value-key="id"
      :placeholder="placeholder"
      :size="SIZES.small"
      data-testid="allergy-editor-select"
      @update:model-value="handleAdd"
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

    <!-- Empty state when all allergies selected -->
    <p v-else-if="selectedTypes.length > 0" class="text-xs text-muted">
      Alle allergityper er valgt
    </p>
  </div>
</template>
