<script setup lang="ts">
/**
 * BookingPowerRow - Reusable "all members" power mode row
 *
 * Used in:
 * - DinnerBookingForm: Single dinner booking
 * - HouseholdCard: Weekly preferences
 * - HouseholdBookings: Multi-dinner booking views
 *
 * VIEW mode (collapsed - single row):
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ [⚡] Powermode! 👥👥👥 Alle medlemmer  🍽️ 🍽️ 🍽️ 🍽️ 🛍️          │
 * └────────────────────────────────────────────────────────────────────┘
 *
 * EDIT mode (expanded - card with footer actions):
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ HEADER                                                             │
 * │ [▼] Powermode! 👥👥👥 Alle medlemmer                               │
 * ├────────────────────────────────────────────────────────────────────┤
 * │ BODY                                                               │
 * │ ⚠️ Power mode: Ændringer påvirker alle X medlemmer                │
 * │                                                                    │
 * │ [🍽️ Spis][🕐 Sen][🛍️ Take][❌ Ingen]                             │
 * │                                                                    │
 * │ (or for weekly: WeekDayMapDinnerModeDisplay in EDIT via slot)     │
 * ├────────────────────────────────────────────────────────────────────┤
 * │ FOOTER                                                             │
 * │ [Annuller]                                          [Gem for alle]│
 * └────────────────────────────────────────────────────────────────────┘
 */
import type {InhabitantDisplay} from '~/composables/useCoreValidation'
import type {DinnerMode} from '~/composables/useBookingValidation'
import type {WeekDayMap} from '~/types/dateTypes'
import {FORM_MODES, type FormMode} from '~/types/form'

interface Props {
    inhabitants: InhabitantDisplay[]
    formMode?: FormMode
    dinnerMode?: DinnerMode
    consensus?: WeekDayMap<boolean> | boolean
    disabledModes?: DinnerMode[]
    loading?: boolean
    expanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    formMode: FORM_MODES.VIEW,
    dinnerMode: undefined,
    consensus: undefined,
    disabledModes: () => [],
    loading: false,
    expanded: false
})

const emit = defineEmits<{
    'update:dinnerMode': [mode: DinnerMode]
    'update:expanded': [expanded: boolean]
    save: []
    cancel: []
}>()

// Design system
const {COMPONENTS, SIZES, COLOR, ICONS} = useTheSlopeDesignSystem()

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

// Consensus for badge (single boolean for VIEW mode)
const badgeConsensus = computed(() => {
    if (props.consensus === undefined) return undefined
    if (typeof props.consensus === 'boolean') return props.consensus
    return Object.values(props.consensus).every(v => v)
})
</script>

<template>
  <!-- VIEW mode: Single collapsed row -->
  <div v-if="!expanded" class="flex items-center gap-2 md:gap-4 py-1">
    <UButton
      color="neutral"
      variant="ghost"
      :icon="COMPONENTS.powerMode.buttonIcon"
      square
      :size="SIZES.small"
      aria-label="Power mode"
      data-testid="power-mode-toggle"
      class="transition-all duration-700 hover:animate-pulse hover:scale-125 hover:rotate-45 hover:text-warning active:scale-175 active:rotate-[720deg] active:text-error"
      @click="toggleExpanded"
    />

    <UBadge
      :color="COMPONENTS.powerMode.color"
      variant="subtle"
      :size="SIZES.small"
    >
      Powermode!
    </UBadge>

    <UserListItem
      :inhabitants="inhabitants"
      compact
      :show-names="false"
      ring-color="warning"
      label="beboere"
    />

    <DinnerModeSelector
      v-if="dinnerMode"
      :model-value="dinnerMode"
      :form-mode="FORM_MODES.VIEW"
      :consensus="badgeConsensus"
      :size="SIZES.small"
      name="power-mode-view"
    />
  </div>

  <!-- EDIT mode: Expanded card with footer actions -->
  <UCard
    v-else
    :color="COMPONENTS.powerMode.card.color"
    :variant="COMPONENTS.powerMode.card.variant"
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
          data-testid="power-mode-collapse"
          class="rotate-180 transition-all duration-700"
          @click="toggleExpanded"
        />

        <UBadge
          :color="COMPONENTS.powerMode.color"
          variant="subtle"
          :size="SIZES.small"
        >
          Powermode!
        </UBadge>

        <UserListItem
          :inhabitants="inhabitants"
          compact
          :show-names="false"
          ring-color="warning"
          label="beboere"
        />
      </div>
    </template>

    <!-- Warning alert -->
    <UAlert
      :icon="COMPONENTS.powerMode.alert.icon"
      :color="COMPONENTS.powerMode.alert.color"
      :variant="COMPONENTS.powerMode.alert.variant"
      title="Power mode aktiveret"
      :description="`Ændringer påvirker alle ${inhabitants.length} medlemmer i husstanden.`"
      class="min-w-0"
    />

    <!-- Mode selector (slot for custom content like WeekDayMapDinnerModeDisplay) -->
    <slot name="editor">
      <DinnerModeSelector
        v-model="draftMode"
        :form-mode="FORM_MODES.EDIT"
        :disabled-modes="disabledModes"
        :size="SIZES.small"
        name="power-mode-selector"
      />
    </slot>

    <template #footer>
      <div class="flex justify-between gap-2">
        <UButton
          :color="COLOR.neutral"
          variant="ghost"
          :icon="ICONS.xMark"
          :size="SIZES.small"
          data-testid="cancel-power-mode"
          @click="handleCancel"
        >
          Annuller
        </UButton>
        <UButton
          :color="COMPONENTS.powerMode.color"
          variant="solid"
          :size="SIZES.small"
          :loading="loading"
          data-testid="save-power-mode"
          class="group"
          @click="handleSave"
        >
          <template #leading>
            <UIcon
              :name="COMPONENTS.powerMode.buttonIcon"
              :class="[
                'transition-all duration-700',
                loading ? 'animate-spin' : 'group-hover:animate-pulse group-hover:scale-125 group-hover:rotate-12 group-active:rotate-[360deg]'
              ]"
            />
          </template>
          {{ loading ? 'Gemmer...' : 'Gem for alle' }}
        </UButton>
      </div>
    </template>
  </UCard>
</template>
