<script setup lang="ts">
/**
 * AllergyEditor - Allergy selection with add/remove (and optional comments)
 *
 * Emits events for all actions - parent decides what to do (batch or immediate save).
 *
 * Two display modes:
 * - Simple (default): selectedIds prop, badges/buttons display
 * - Comments (showComments=true): allergies prop with comments, card display with inputs
 *
 * Used by:
 * - GuestBookingForm: simple mode, batch save on form submit
 * - HouseholdAllergies: comments mode, immediate save to API
 */
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'

// Allergy with comment data (for showComments mode)
export interface AllergyItem {
  id: number              // Allergy record ID (for API operations)
  allergyTypeId: number   // References AllergyType
  comment?: string | null
}

interface Props {
  allergyTypes: AllergyTypeDisplay[]
  // Simple mode: just IDs
  selectedIds?: number[]
  // Comments mode: full allergy data
  allergies?: AllergyItem[]
  showComments?: boolean
  label?: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  selectedIds: () => [],
  allergies: () => [],
  showComments: false,
  label: 'Allergier',
  placeholder: '🥛🥐🥚🥜 Vælg allergi...'
})

const emit = defineEmits<{
  add: [allergyTypeId: number]
  remove: [allergyTypeId: number]  // In comments mode, parent maps typeId → allergy.id for API
  'update:comment': [allergyTypeId: number, comment: string]
}>()

const {SIZES, COLOR, ICONS} = useTheSlopeDesignSystem()

// Key to force dropdown reset after selection
const dropdownKey = ref(0)

// Local comment state for editing
const editingComments = ref<Record<number, string>>({})

// Sync editingComments with allergies prop
watch(() => props.allergies, (newAllergies) => {
  if (props.showComments) {
    editingComments.value = newAllergies.reduce((acc, a) => {
      acc[a.allergyTypeId] = a.comment || ''
      return acc
    }, {} as Record<number, string>)
  }
}, {immediate: true, deep: true})

// Effective selected IDs (from selectedIds or allergies)
const effectiveSelectedIds = computed(() =>
  props.showComments
    ? props.allergies.map(a => a.allergyTypeId)
    : props.selectedIds
)

// Available types (not yet selected)
const availableTypes = computed(() =>
  props.allergyTypes.filter(t => !effectiveSelectedIds.value.includes(t.id))
)

// Selected types with full display data
const selectedTypes = computed(() =>
  props.allergyTypes.filter(t => effectiveSelectedIds.value.includes(t.id))
)

// Get comment for a type (comments mode) - reserved for future use
const _getComment = (typeId: number): string =>
  props.allergies.find(a => a.allergyTypeId === typeId)?.comment || ''

// Handlers - emit events, parent decides what to do
const handleAdd = (typeId: number | undefined) => {
  if (typeId) {
    emit('add', typeId)
    dropdownKey.value++  // Force dropdown to remount and show placeholder
  }
}

const handleRemove = (typeId: number) => {
  emit('remove', typeId)
}

const handleCommentSave = (typeId: number) => {
  emit('update:comment', typeId, editingComments.value[typeId] || '')
}
</script>

<template>
  <div class="space-y-3">
    <!-- Label -->
    <label v-if="label" class="block text-sm font-medium">{{ label }}</label>

    <!-- Add dropdown (key forces reset after selection) -->
    <USelectMenu
      v-if="availableTypes.length > 0"
      :key="dropdownKey"
      :model-value="undefined"
      :items="availableTypes.map(t => ({ ...t, icon: t.icon ?? undefined, label: t.name }))"
      :placeholder="placeholder"
      value-key="id"
      class="w-full"
      data-testid="allergy-editor-select"
      @update:model-value="handleAdd"
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

    <!-- All selected message -->
    <p v-else-if="selectedTypes.length > 0" class="text-xs text-muted">
      Alle allergityper er valgt
    </p>

    <!-- Selected allergies: Comments mode (cards with inputs) -->
    <div v-if="showComments && selectedTypes.length > 0" class="space-y-2">
      <div
        v-for="type in selectedTypes"
        :key="type.id"
        class="flex flex-col md:flex-row md:items-center gap-2 p-3 rounded-lg border border-default bg-elevated"
      >
        <!-- Allergy type display -->
        <div class="flex items-center gap-2 md:flex-shrink-0">
          <AllergyTypeDisplay :allergy-type="type" show-name />
        </div>

        <!-- Comment input + actions -->
        <div class="flex items-center gap-2 flex-1">
          <UInput
            v-model="editingComments[type.id]"
            :placeholder="`Kommentar til ${type.name}...`"
            size="sm"
            class="flex-1"
            @keyup.enter="handleCommentSave(type.id)"
          >
            <template #trailing>
              <UButton
                color="success"
                variant="ghost"
                :icon="ICONS.check"
                :size="SIZES.small"
                :padded="false"
                aria-label="Gem kommentar"
                :data-testid="`allergy-${type.id}-save-comment`"
                @click="handleCommentSave(type.id)"
              />
            </template>
          </UInput>
          <UButton
            color="error"
            variant="soft"
            icon="i-heroicons-trash"
            size="sm"
            square
            aria-label="Fjern allergi"
            :data-testid="`allergy-${type.id}-remove`"
            @click="handleRemove(type.id)"
          />
        </div>
      </div>
    </div>

    <!-- Selected allergies: Simple mode (badges with remove buttons) -->
    <div v-else-if="!showComments && selectedTypes.length > 0" class="flex flex-wrap gap-2">
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
            :size="SIZES.small"
            :padded="false"
            class="ml-1"
            aria-label="Fjern allergi"
            @click="handleRemove(type.id)"
          />
        </span>
      </UBadge>
    </div>

    <!-- Empty state -->
    <AllergyTypeDisplay v-if="selectedTypes.length === 0" show-name />
  </div>
</template>
