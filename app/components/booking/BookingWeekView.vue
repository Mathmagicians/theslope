<script setup lang="ts">
/**
 * BookingWeekView - Week booking view for household
 */
import type {HouseholdDetail} from '~/composables/useCoreValidation'

interface Props {
  household: HouseholdDetail
  selectedDate: Date
}

defineProps<Props>()
</script>

<template>
  <div data-testid="booking-week-view">
    <!-- Week view content will go here -->
  </div>
</template>
