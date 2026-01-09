<script setup lang="ts">
/**
 * BookingMonthView - Month booking view for household
 */
import type {HouseholdDetail} from '~/composables/useCoreValidation'

interface Props {
  household: HouseholdDetail
  selectedDate: Date
}

defineProps<Props>()
</script>

<template>
  <div data-testid="booking-month-view">
    <!-- Month view content will go here -->
  </div>
</template>
