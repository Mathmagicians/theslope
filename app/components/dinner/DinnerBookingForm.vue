<script setup lang="ts">
/**
 * DinnerBookingForm - Reusable booking form for a single dinner event
 *
 * Used in:
 * - DinnerMenuHero: Single event booking on dinner page
 * - HouseholdBookings: Multiple events on household calendar page
 *
 * Features:
 * - UTable with household inhabitants
 * - VIEW mode: Show ticket type, name, dinner mode badge
 * - EDIT mode: Inline DinnerModeSelector with prices
 * - Power mode: Bulk update all family members
 * - Responsive: Horizontal selectors (desktop), vertical (mobile)
 */
import type {HouseholdDetail, Inhabitant} from '~/composables/useCoreValidation'
import type {DinnerEventDisplay, OrderDisplay} from '~/composables/useBookingValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import {FORM_MODES, type FormMode} from '~/types/form'

interface Props {
  household?: HouseholdWithInhabitants  // Optional - fetched if not provided
  dinnerEvent: DinnerEventDisplay
  orders?: OrderDisplay[]
  ticketPrices?: TicketPrice[]
  formMode?: FormMode
}

const props = withDefaults(defineProps<Props>(), {
  household: undefined,
  orders: () => [],
  ticketPrices: () => [],
  formMode: FORM_MODES.VIEW
})

const emit = defineEmits<{
  updateBooking: [inhabitantId: number, dinnerMode: string, ticketPriceId: number]
  updateAllBookings: [dinnerMode: string]
}>()

// Self-initialize household store for auxiliary data
const householdsStore = useHouseholdsStore()
const {selectedHousehold} = storeToRefs(householdsStore)

// Initialize without await for SSR hydration consistency
householdsStore.initHouseholdsStore()

// Use prop if provided, otherwise use store (auto-selects user's household)
const household = computed(() => props.household ?? selectedHousehold.value)

// Design system
const { COMPONENTS, SIZES, COLOR } = useTheSlopeDesignSystem()

// Ticket business logic
const {getTicketTypeConfig} = useTicket()

// Validation
const {DinnerModeSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum

// Power mode state
const isPowerModeActive = ref(false)
const draftDinnerMode = ref<typeof DinnerMode[keyof typeof DinnerMode]>(DinnerMode.DINEIN)

// Funny empty state messages (rotates based on dinner event ID for consistency)
const emptyStateMessages = [
  { emoji: '👻', text: 'Husstanden er forsvundet i tågen' },
  { emoji: '🏝️', text: 'Alle på ferie - ingen hjemme!' },
  { emoji: '🎪', text: 'Familien er stukket af med cirkus' },
  { emoji: '🧘', text: 'Familien mediterer i bjergene' },
  { emoji: '🚀', text: 'Husstanden tog til månen... uden WiFi' }
]
const emptyStateMessage = computed(() => {
  const id = props.dinnerEvent?.id || 0
  const index = id % emptyStateMessages.length
  return emptyStateMessages[index]
})

// UTable columns
const columns = [
  {id: 'ticketType', header: 'Billet'},
  {id: 'name', header: 'Navn'},
  {id: 'mode', header: 'Booking'}
]

// Table data: inhabitants with their ticket configs and orders
const tableData = computed(() => {
  if (!household.value?.inhabitants) return []

  return household.value.inhabitants.map(inhabitant => {
    const order = props.orders?.find(o => o.inhabitantId === inhabitant.id && o.dinnerEventId === props.dinnerEvent.id)
    const ticketConfig = getTicketTypeConfig(inhabitant.birthDate ?? null, props.ticketPrices)

    return {
      ...inhabitant,
      ticketConfig,
      order,
      dinnerMode: order?.dinnerMode ?? DinnerMode.NONE,
      price: order?.priceAtBooking ?? 0
    }
  })
})

// Handle power mode update
const handlePowerModeUpdate = () => {
  emit('updateAllBookings', draftDinnerMode.value)
  isPowerModeActive.value = false
}
</script>

<template>
  <!-- Empty state: No household or no inhabitants -->
  <UAlert
    v-if="!household?.inhabitants?.length"
    :color="COLOR.neutral"
    variant="soft"
    :avatar="{ text: emptyStateMessage.emoji, size: SIZES.emptyStateAvatar.value }"
    :ui="COMPONENTS.emptyStateAlert"
  >
    <template #title>
      {{ emptyStateMessage.text }}
    </template>
    <template #description>
      Ingen husstandsmedlemmer fundet
    </template>
  </UAlert>

  <!-- Booking form with inhabitants -->
  <div v-else class="space-y-4">
    <!-- Power Mode (EDIT mode only) -->
    <div v-if="formMode === FORM_MODES.EDIT" class="border-b border-white/20 pb-4">
      <UButton
        :color="COMPONENTS.powerMode.color"
        :variant="isPowerModeActive ? 'solid' : 'ghost'"
        :icon="COMPONENTS.powerMode.buttonIcon"
        size="sm"
        name="toggle-power-mode"
        block
        @click="isPowerModeActive = !isPowerModeActive"
      >
        ⚡ Power mode: Opdater hele familien
      </UButton>

      <!-- Power Mode Editor -->
      <UCard
        v-if="isPowerModeActive"
        :color="COMPONENTS.powerMode.card.color"
        :variant="COMPONENTS.powerMode.card.variant"
        class="mt-4"
      >
        <template #header>
          <UAlert
            :icon="COMPONENTS.powerMode.alert.icon"
            :color="COMPONENTS.powerMode.alert.color"
            :variant="COMPONENTS.powerMode.alert.variant"
            title="Power mode aktiveret"
            :description="`Her kan du sætte samme indstilling for alle ${household.inhabitants.length} medlemmer. Individuelle indstillinger overskrives.`"
          />
        </template>

        <DinnerModeSelector
          v-model="draftDinnerMode"
          :form-mode="FORM_MODES.EDIT"
          size="sm"
          name="power-mode-dinner-selector"
        />

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              size="sm"
              name="cancel-power-mode"
              @click="isPowerModeActive = false"
            >
              Annuller
            </UButton>
            <UButton
              :color="COMPONENTS.powerMode.color"
              variant="solid"
              :icon="COMPONENTS.powerMode.buttonIcon"
              size="sm"
              name="save-power-mode"
              @click="handlePowerModeUpdate"
            >
              Gem for alle
            </UButton>
          </div>
        </template>
      </UCard>
    </div>

    <!-- Inhabitants Table -->
    <UTable
      :data="tableData"
      :columns="columns"
      row-key="id"
    >
      <!-- Ticket Type Column -->
      <template #ticketType-cell="{ row }">
        <UBadge
          :color="row.ticketConfig.color"
          variant="subtle"
          size="sm"
        >
          {{ row.ticketConfig.label }}
        </UBadge>
      </template>

      <!-- Name Column -->
      <template #name-cell="{ row }">
        <UserListItem
          :to-display="row"
          compact
          :property-check="() => false"
        />
      </template>

      <!-- Mode Column -->
      <template #mode-cell="{ row }">
        <!-- VIEW mode: Show badge -->
        <DinnerModeSelector
          v-if="formMode === FORM_MODES.VIEW"
          :model-value="row.dinnerMode"
          :form-mode="FORM_MODES.VIEW"
          size="sm"
          :name="`inhabitant-${row.id}-mode-view`"
        />

        <!-- EDIT mode: Show selector + price -->
        <div v-else-if="formMode === FORM_MODES.EDIT" class="flex items-center gap-4">
          <DinnerModeSelector
            :model-value="row.dinnerMode"
            :form-mode="FORM_MODES.EDIT"
            size="sm"
            :name="`inhabitant-${row.id}-mode-edit`"
            @update:model-value="(mode) => emit('updateBooking', row.id, mode, row.order?.ticketPriceId ?? 0)"
          />
          <span class="text-sm font-semibold whitespace-nowrap">{{ row.price }} kr</span>
        </div>
      </template>
    </UTable>
  </div>
</template>
