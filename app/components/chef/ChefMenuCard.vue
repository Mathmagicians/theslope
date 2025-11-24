<script setup lang="ts">
/**
 * ChefMenuCard - Menu management card for chef detail view
 *
 * Features:
 * - Inline edit menu title and description (pencil icon to enable)
 * - Dinner status stepper with action buttons (advance state)
 * - Budget display
 * - Form with save/cancel actions
 *
 * State transitions (chef can advance):
 * SCHEDULED → ANNOUNCED (announce menu)
 * ANNOUNCED → CONSUMED (mark as consumed)
 * Any state → CANCELLED (cancel dinner)
 *
 * Used in:
 * - /chef/index.vue detail view (when dinner selected)
 *
 * ADR Compliance:
 * - ADR-001: Types from validation composables
 * - Mobile-first responsive design
 * - Form pattern: edit mode toggle, draft state, save/cancel
 */
import type { DinnerEventDisplay } from '~/composables/useBookingValidation'

interface Props {
  dinnerEvent: DinnerEventDisplay
  budget?: number // Optional budget in øre
}

const props = defineProps<Props>()

const emit = defineEmits<{
  updateMenu: [data: { menuTitle: string, menuDescription: string }]
  advanceState: [newState: string]
  cancel: []
}>()

// Design system
const { TYPOGRAPHY, SIZES, ICONS, COLOR, DINNER_STATE_BADGES } = useTheSlopeDesignSystem()

// Validation schemas
const { DinnerStateSchema } = useBookingValidation()
const DinnerState = DinnerStateSchema.enum

// Edit mode and draft state
const isEditingMenu = ref(false)
const draftMenuTitle = ref(props.dinnerEvent.menuTitle || '')
const draftMenuDescription = ref(props.dinnerEvent.menuDescription || '')

// Watch for changes to dinner event (reset draft when event changes)
watch(() => props.dinnerEvent, (newEvent) => {
  if (newEvent) {
    draftMenuTitle.value = newEvent.menuTitle || ''
    draftMenuDescription.value = newEvent.menuDescription || ''
  }
}, { immediate: true })

// Menu title placeholder based on state
const menuTitlePlaceholder = computed(() => {
  return props.dinnerEvent.state === DinnerState.SCHEDULED
    ? 'Indtast menu titel'
    : 'Menu titel'
})

// State badge
const stateBadge = computed(() => {
  return DINNER_STATE_BADGES[props.dinnerEvent.state as keyof typeof DINNER_STATE_BADGES] || DINNER_STATE_BADGES.SCHEDULED
})

// Next state (what happens when chef clicks "advance")
const nextState = computed(() => {
  switch (props.dinnerEvent.state) {
    case DinnerState.SCHEDULED:
      return { state: DinnerState.ANNOUNCED, label: 'Annoncer menu', icon: ICONS.megaphone }
    case DinnerState.ANNOUNCED:
      return { state: DinnerState.CONSUMED, label: 'Marker som afholdt', icon: ICONS.check }
    default:
      return null
  }
})

// Can advance state (must have menu title to announce)
const canAdvanceState = computed(() => {
  if (!nextState.value) return false
  if (props.dinnerEvent.state === DinnerState.SCHEDULED) {
    return !!props.dinnerEvent.menuTitle && props.dinnerEvent.menuTitle !== 'TBD'
  }
  return true
})

// Format budget
const formattedBudget = computed(() => {
  if (!props.budget) return null
  return `${(props.budget / 100).toFixed(2)} kr`
})

// Handle menu save
const handleMenuSave = () => {
  emit('updateMenu', {
    menuTitle: draftMenuTitle.value,
    menuDescription: draftMenuDescription.value
  })
  isEditingMenu.value = false
}

// Handle menu cancel
const handleMenuCancel = () => {
  draftMenuTitle.value = props.dinnerEvent.menuTitle || ''
  draftMenuDescription.value = props.dinnerEvent.menuDescription || ''
  isEditingMenu.value = false
}

// Handle state advance
const handleAdvanceState = () => {
  if (!nextState.value || !canAdvanceState.value) return
  emit('advanceState', nextState.value.state)
}

// Handle cancel dinner
const handleCancelDinner = () => {
  if (confirm('Er du sikker på at du vil aflyse denne middag?')) {
    emit('advanceState', DinnerState.CANCELLED)
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-start justify-between gap-2">
        <h3 :class="TYPOGRAPHY.cardTitle">Menu & Status</h3>

        <!-- State badge -->
        <UBadge
          :color="stateBadge.color"
          :icon="stateBadge.icon"
          variant="subtle"
          :size="SIZES.small.value"
        >
          {{ stateBadge.label }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-6">
      <!-- Menu title - VIEW mode -->
      <div v-if="!isEditingMenu">
        <UFormField label="Menu titel">
          <div class="flex items-start gap-2">
            <div class="flex-1">
              <p
                :class="[
                  'text-sm',
                  dinnerEvent.menuTitle ? '' : 'italic text-neutral-500'
                ]"
                data-testid="chef-menu-title"
              >
                {{ dinnerEvent.menuTitle || 'Ikke angivet' }}
              </p>
            </div>
            <UButton
              :icon="ICONS.edit"
              :color="COLOR.neutral"
              variant="ghost"
              size="xs"
              name="edit-menu"
              @click="isEditingMenu = true"
            />
          </div>
        </UFormField>

        <!-- Menu description - VIEW mode -->
        <UFormField v-if="dinnerEvent.menuDescription" label="Beskrivelse" class="mt-4">
          <p class="text-sm" data-testid="chef-menu-description">
            {{ dinnerEvent.menuDescription }}
          </p>
        </UFormField>
      </div>

      <!-- Menu title & description - EDIT mode -->
      <div v-else class="space-y-4">
        <UFormField label="Menu titel" required>
          <UInput
            v-model="draftMenuTitle"
            :placeholder="menuTitlePlaceholder"
            :size="SIZES.standard.value"
            data-testid="chef-menu-title-input"
          />
        </UFormField>

        <UFormField label="Beskrivelse (valgfri)">
          <UTextarea
            v-model="draftMenuDescription"
            placeholder="Tilføj en beskrivelse af menuen"
            :rows="3"
            :size="SIZES.standard.value"
            data-testid="chef-menu-description-input"
          />
        </UFormField>

        <!-- Save/Cancel buttons -->
        <div class="flex gap-2 justify-end">
          <UButton
            :color="COLOR.neutral"
            variant="ghost"
            :size="SIZES.standard.value"
            name="cancel-menu-edit"
            @click="handleMenuCancel"
          >
            Annuller
          </UButton>
          <UButton
            :color="COLOR.primary"
            variant="solid"
            :size="SIZES.standard.value"
            :icon="ICONS.check"
            name="save-menu-edit"
            :disabled="!draftMenuTitle.trim()"
            @click="handleMenuSave"
          >
            Gem
          </UButton>
        </div>
      </div>

      <!-- Budget (if provided) -->
      <UFormField v-if="formattedBudget" label="Budget">
        <div class="text-sm font-medium">
          {{ formattedBudget }}
        </div>
      </UFormField>

      <!-- Dinner Status Stepper -->
      <div class="pt-4 border-t">
        <h4 class="text-sm font-semibold mb-4">Status handlinger</h4>

        <div class="space-y-2">
          <!-- Advance to next state -->
          <UButton
            v-if="nextState"
            :color="canAdvanceState ? COLOR.primary : COLOR.neutral"
            variant="solid"
            :size="SIZES.standard.value"
            :icon="nextState.icon"
            :disabled="!canAdvanceState"
            block
            name="advance-dinner-state"
            @click="handleAdvanceState"
          >
            {{ nextState.label }}
          </UButton>

          <!-- Help text if can't advance -->
          <UAlert
            v-if="nextState && !canAdvanceState && dinnerEvent.state === DinnerState.SCHEDULED"
            :color="COLOR.warning"
            variant="soft"
            icon="i-heroicons-information-circle"
            :ui="{ padding: 'p-2', description: 'text-xs' }"
          >
            <template #description>
              Indtast menu titel for at annoncere
            </template>
          </UAlert>

          <!-- Cancel dinner (if not already cancelled or consumed) -->
          <UButton
            v-if="dinnerEvent.state !== DinnerState.CANCELLED && dinnerEvent.state !== DinnerState.CONSUMED"
            :color="COLOR.error"
            variant="outline"
            :size="SIZES.standard.value"
            icon="i-heroicons-x-mark"
            block
            name="cancel-dinner"
            @click="handleCancelDinner"
          >
            Aflys middag
          </UButton>
        </div>
      </div>
    </div>
  </UCard>
</template>
