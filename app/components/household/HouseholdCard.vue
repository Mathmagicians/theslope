<script setup lang="ts">
/**
 * HouseholdCard - members and their settings - especially weekly dinner preferences
 *
 * Displays household members with their weekly dinner preferences
 * - Collapsed view: Compact icons showing preferences at a glance
 * - Expanded view: Interactive controls to edit preferences
 */
import {FORM_MODES} from '~/types/form'
import type {HouseholdWithInhabitants} from '~/composables/useHouseholdValidation'
import type {WeekDayMap} from '~/types/dateTypes'
import type {DinnerMode} from '~/composables/useDinnerEventValidation'

interface Props {
  household: HouseholdWithInhabitants
}

const props = defineProps<Props>()

// UI state: Weekly preferences expanded/collapsed
const preferencesExpanded = ref(false)

// Update inhabitant preferences
const updatePreferences = async (inhabitantId: number, preferences: WeekDayMap<DinnerMode>) => {
  console.info('Updating preferences for inhabitant', inhabitantId, preferences)
  // TODO: Call API to update inhabitant preferences
  // await $fetch(`/api/admin/household/inhabitants/${inhabitantId}`, {
  //   method: 'POST',
  //   body: { dinnerPreferences: preferences }
  // })
}
</script>

<template>
  <!-- Weekly Preferences Section -->
  <UCard data-test-id="household-members">
    <template #header>
      <UButton
          variant="ghost"
          color="neutral"
          block
          class="justify-between"
          @click="preferencesExpanded = !preferencesExpanded"
      >
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-cog-6-tooth"/>
          <span class="font-semibold">Husstandens ugentlige booking præferencer</span>
        </div>
        <UIcon :name="preferencesExpanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"/>
      </UButton>
    </template>

    <!-- Compact view (collapsed) - Overview of all inhabitants -->
    <div v-if="!preferencesExpanded" class="mt-4 space-y-3">
      <div
          v-for="inhabitant in household.inhabitants"
          :key="inhabitant.id"
          class="flex items-start gap-3"
      >
        <div class="flex items-center gap-2 min-w-[120px]">
          <UIcon name="i-heroicons-user" class="w-3 h-3 text-gray-400"/>
          <span class="text-sm font-medium">{{ inhabitant.name }}</span>
        </div>
        <WeekDayMapDinnerModeDisplay
            :model-value="inhabitant.dinnerPreferences"
            :form-mode="FORM_MODES.VIEW"
            :name="`compact-inhabitant-${inhabitant.id}-preferences`"
        />
      </div>
    </div>

    <!-- Expanded view - Edit mode -->
    <div v-else class="mt-4 space-y-4">
      <p class="text-sm text-muted">
        Standard for hver ugedag (opdaterer automatisk fremtidige bookinger)
      </p>

      <div
          v-for="inhabitant in household.inhabitants"
          :key="inhabitant.id"
          class="space-y-2"
      >
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-user" class="w-4 h-4"/>
          <span class="font-medium">{{ inhabitant.name }}</span>
        </div>

        <WeekDayMapDinnerModeDisplay
            :model-value="inhabitant.dinnerPreferences"
            :form-mode="FORM_MODES.EDIT"
            :name="`inhabitant-${inhabitant.id}-preferences`"
            @update:model-value="(value) => updatePreferences(inhabitant.id, value)"
        />
      </div>

      <UAlert
          icon="i-heroicons-information-circle"
          color="primary"
          variant="soft"
          title="Ændringer opdaterer fremtidige bookinger"
      />
    </div>
  </UCard>
</template>
