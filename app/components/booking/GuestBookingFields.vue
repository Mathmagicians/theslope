<script setup lang="ts">
/**
 * GuestBookingFields - Guest ticket form fields for expanded row
 * Extracted from DinnerBookingForm for reuse in BookingGridView
 */
import type {TicketPrice} from '~/composables/useTicketPriceValidation'

interface Props {
  ticketPrices: TicketPrice[]
  allergyOptions?: { label: string, value: number }[]
}

const props = withDefaults(defineProps<Props>(), {
  allergyOptions: () => []
})

const ticketPriceId = defineModel<number | undefined>('ticketPriceId')
const allergies = defineModel<number[]>('allergies', {default: () => []})
const guestCount = defineModel<number>('guestCount', {default: 1})

const {SIZES} = useTheSlopeDesignSystem()
const {resolveTicketPrice} = useTicket()

// Default to adult ticket (resolveTicketPrice with no birthDate falls back to ADULT)
watch(() => props.ticketPrices, (prices) => {
  if (prices.length > 0 && !ticketPriceId.value) {
    ticketPriceId.value = resolveTicketPrice(null, null, prices)?.id
  }
}, {immediate: true})

const ticketOptions = computed(() =>
  props.ticketPrices.map(p => ({label: p.description ?? p.ticketType, value: p.id}))
)
</script>

<template>
  <UFormField label="Antal gæster" :size="SIZES.small">
    <UInput
      v-model.number="guestCount"
      type="number"
      :min="1"
      :max="10"
      :size="SIZES.small"
      name="guest-count"
    />
  </UFormField>

  <UFormField label="Billettype" :size="SIZES.small">
    <USelect
      v-model="ticketPriceId"
      :items="ticketOptions"
      value-key="value"
      :size="SIZES.small"
      name="guest-ticket-type"
      data-testid="guest-ticket-type-select"
    />
  </UFormField>

  <UFormField v-if="allergyOptions.length > 0" label="Allergier (valgfrit)" :size="SIZES.small">
    <USelectMenu
      v-model="allergies"
      :items="allergyOptions"
      value-key="value"
      multiple
      placeholder="Vælg allergier..."
      :size="SIZES.small"
      name="guest-allergies"
    />
  </UFormField>
</template>
