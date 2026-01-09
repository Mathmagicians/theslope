<script setup lang="ts">
/**
 * BookingPersonRow - Reusable individual person booking row
 *
 * Used in:
 * - DinnerBookingForm: Single dinner booking (ticket card display)
 * - HouseholdCard: Weekly preferences (expandable to WeekDayMapDinnerModeDisplay)
 * - HouseholdBookings: Multi-dinner booking views
 *
 * VIEW mode (collapsed - single row):
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ [✏️] Voksen  👤 Anna Hansen  🎂 15/03/1990   🍽️ 🍽️ 🍽️ 🍽️ 🛍️    │
 * └────────────────────────────────────────────────────────────────────┘
 *
 * EDIT mode (expanded - card with footer actions):
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ HEADER                                                             │
 * │ [▼] Voksen  👤 Anna Hansen  🎂 15/03/1990                          │
 * ├────────────────────────────────────────────────────────────────────┤
 * │ BODY                                                               │
 * │ [🍽️ Spis][🕐 Sen][🛍️ Take][❌ Ingen]                             │
 * │                                                                    │
 * │ (or for weekly: WeekDayMapDinnerModeDisplay in EDIT via slot)     │
 * ├────────────────────────────────────────────────────────────────────┤
 * │ FOOTER                                                             │
 * │ [Annuller]                                                  [Gem] │
 * └────────────────────────────────────────────────────────────────────┘
 */
import type {InhabitantDisplay} from '~/composables/useCoreValidation'
import type {DinnerMode} from '~/composables/useBookingValidation'
import {FORM_MODES, type FormMode} from '~/types/form'
import type {NuxtUIColor} from '~/composables/useTheSlopeDesignSystem'

interface Props {
    inhabitant: InhabitantDisplay
    ticketLabel?: string
    ticketColor?: NuxtUIColor
    formMode?: FormMode
    dinnerMode?: DinnerMode
    disabledModes?: DinnerMode[]
    loading?: boolean
    expanded?: boolean
    showBirthDate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    ticketLabel: undefined,
    ticketColor: 'neutral',
    formMode: FORM_MODES.VIEW,
    dinnerMode: undefined,
    disabledModes: () => [],
    loading: false,
    expanded: false,
    showBirthDate: true
})

const emit = defineEmits<{
    'update:dinnerMode': [mode: DinnerMode]
    'update:expanded': [expanded: boolean]
    save: []
    cancel: []
}>()

// Design system
const {SIZES, COLOR, ICONS} = useTheSlopeDesignSystem()

// Draft mode for EDIT
const {DinnerModeSchema} = useBookingValidation()
const draftMode = ref<DinnerMode>(props.dinnerMode ?? DinnerModeSchema.enum.DINEIN)

// Sync draft with prop
watch(() => props.dinnerMode, (newMode) => {
    if (newMode) draftMode.value = newMode
})

const toggleExpanded = () => {
    emit('update:expanded', !props.expanded)
}

const handleSave = () => {
    emit('update:dinnerMode', draftMode.value)
    emit('save')
}

const handleCancel = () => {
    draftMode.value = props.dinnerMode ?? DinnerModeSchema.enum.DINEIN
    emit('cancel')
    emit('update:expanded', false)
}
</script>

<template>
  <!-- VIEW mode: Single collapsed row -->
  <div v-if="!expanded" class="flex items-center gap-2 md:gap-4 py-1">
    <UButton
      color="neutral"
      variant="ghost"
      :icon="ICONS.edit"
      square
      :size="SIZES.small"
      :aria-label="`Rediger præferencer for ${inhabitant.name}`"
      :data-testid="`inhabitant-${inhabitant.id}-edit`"
      class="transition-all duration-300"
      @click="toggleExpanded"
    />

    <UBadge
      v-if="ticketLabel"
      :color="ticketColor"
      variant="subtle"
      :size="SIZES.small"
    >
      {{ ticketLabel }}
    </UBadge>

    <UserListItem
      :inhabitants="inhabitant"
      compact
      ring-color="primary"
    >
      <template v-if="showBirthDate && inhabitant.birthDate" #badge>
        <span class="text-xs text-muted flex items-center gap-1">
          <UIcon name="i-heroicons-cake" class="size-4 md:size-6" />
          {{ formatDate(inhabitant.birthDate) }}
        </span>
      </template>
    </UserListItem>

    <!-- VIEW mode display (slot for custom content) -->
    <slot name="view">
      <DinnerModeSelector
        v-if="dinnerMode"
        :model-value="dinnerMode"
        :form-mode="FORM_MODES.VIEW"
        :size="SIZES.small"
        :name="`inhabitant-${inhabitant.id}-mode-view`"
      />
    </slot>
  </div>

  <!-- EDIT mode: Expanded card with footer actions -->
  <UCard
    v-else
    color="primary"
    variant="outline"
    class="max-w-full overflow-x-auto"
    :ui="{ body: 'p-4 flex flex-col gap-4', footer: 'p-4', header: 'p-4' }"
  >
    <template #header>
      <div class="flex items-center gap-2 md:gap-4">
        <UButton
          color="neutral"
          variant="ghost"
          :icon="ICONS.chevronDown"
          square
          :size="SIZES.small"
          aria-label="Luk"
          :data-testid="`inhabitant-${inhabitant.id}-collapse`"
          class="rotate-180 transition-all duration-300"
          @click="toggleExpanded"
        />

        <UBadge
          v-if="ticketLabel"
          :color="ticketColor"
          variant="subtle"
          :size="SIZES.small"
        >
          {{ ticketLabel }}
        </UBadge>

        <UserListItem
          :inhabitants="inhabitant"
          compact
          ring-color="primary"
        >
          <template v-if="showBirthDate && inhabitant.birthDate" #badge>
            <span class="text-xs text-muted flex items-center gap-1">
              <UIcon name="i-heroicons-cake" class="size-4 md:size-6" />
              {{ formatDate(inhabitant.birthDate) }}
            </span>
          </template>
        </UserListItem>
      </div>

      <h4 class="text-md font-semibold mt-2">
        Opdater præferencer for {{ inhabitant.name }}
      </h4>
    </template>

    <!-- Mode selector (slot for custom content like WeekDayMapDinnerModeDisplay) -->
    <slot name="editor">
      <DinnerModeSelector
        v-model="draftMode"
        :form-mode="FORM_MODES.EDIT"
        :disabled-modes="disabledModes"
        :size="SIZES.small"
        :name="`inhabitant-${inhabitant.id}-mode-edit`"
      />
    </slot>

    <template #footer>
      <div class="flex justify-between gap-2">
        <UButton
          :color="COLOR.neutral"
          variant="ghost"
          :icon="ICONS.xMark"
          :size="SIZES.small"
          :data-testid="`inhabitant-${inhabitant.id}-cancel`"
          @click="handleCancel"
        >
          Annuller
        </UButton>
        <UButton
          :color="COLOR.primary"
          variant="solid"
          :icon="ICONS.check"
          :size="SIZES.small"
          :loading="loading"
          :data-testid="`inhabitant-${inhabitant.id}-save`"
          @click="handleSave"
        >
          {{ loading ? 'Gemmer...' : 'Gem' }}
        </UButton>
      </div>
    </template>
  </UCard>
</template>
