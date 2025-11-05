<script setup lang="ts">
/**
 * HouseholdCard - members and their settings - especially weekly dinner preferences
 *
 * Displays household members with their weekly dinner preferences in a table layout
 * - Weekday headers shown once at top
 * - One row per inhabitant
 * - VIEW mode: Icon badges (default)
 * - EDIT mode: Interactive button groups
 */
import {FORM_MODES, type FormMode} from '~/types/form'
import type {HouseholdWithInhabitants} from '~/composables/useHouseholdValidation'
import type {WeekDayMap} from '~/types/dateTypes'
import {WEEKDAYS} from '~/types/dateTypes'
import type {DinnerMode} from '~/composables/useDinnerEventValidation'
import {formatWeekdayCompact} from '~/utils/date'

interface Props {
  household: HouseholdWithInhabitants
}

const props = defineProps<Props>()

// UI state: Form mode (VIEW or EDIT)
const formMode = ref<FormMode>(FORM_MODES.VIEW)

// Store integration
const householdsStore = useHouseholdsStore()
const planStore = usePlanStore()
const {activeSeason} = storeToRefs(planStore)

// Get visible weekdays from active season cooking days
const visibleDays = computed(() => {
  if (!activeSeason.value?.cookingDays) return WEEKDAYS
  return WEEKDAYS.filter(day => activeSeason.value.cookingDays[day])
})

// Toggle between VIEW and EDIT modes
const toggleEditMode = () => {
  formMode.value = formMode.value === FORM_MODES.VIEW ? FORM_MODES.EDIT : FORM_MODES.VIEW
}

// Update inhabitant preferences via store
const updatePreferences = async (inhabitantId: number, preferences: WeekDayMap<DinnerMode>) => {
  try {
    await householdsStore.updateInhabitantPreferences(inhabitantId, preferences)
  } catch (error) {
    console.error('Failed to update preferences:', error)
  }
}
</script>

<template>
  <!-- Weekly Preferences Section -->
  <UCard data-test-id="household-members">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-cog-6-tooth"/>
          <span class="font-semibold">Husstandens ugentlige booking præferencer</span>
        </div>
        <UButton
          :icon="formMode === FORM_MODES.EDIT ? 'i-heroicons-check' : 'i-heroicons-pencil'"
          :color="formMode === FORM_MODES.EDIT ? 'success' : 'neutral'"
          variant="ghost"
          size="sm"
          @click="toggleEditMode"
        />
      </div>
    </template>

    <div class="space-y-4">
      <p v-if="formMode === FORM_MODES.EDIT" class="text-sm text-muted">
        Standard for hver ugedag (opdaterer automatisk fremtidige bookinger)
      </p>

      <!-- Table-like layout: header + rows -->
      <div class="space-y-2">
        <!-- Header row: weekday labels (shown once) -->
        <div class="flex items-center gap-4">
          <div class="min-w-[140px]"></div> <!-- Empty space for name column -->
          <div class="flex gap-1">
            <div
              v-for="day in visibleDays"
              :key="day"
              class="flex flex-col items-center gap-1 min-w-[32px]"
            >
              <span class="text-xs text-gray-500 capitalize">{{ formatWeekdayCompact(day) }}</span>
            </div>
          </div>
        </div>

        <!-- Data rows: one per inhabitant -->
        <div
          v-for="inhabitant in household.inhabitants"
          :key="inhabitant.id"
          class="flex items-center gap-4"
        >
          <div class="flex items-center gap-2 min-w-[140px]">
            <UIcon name="i-heroicons-user" class="w-4 h-4 text-gray-400"/>
            <span class="font-medium">{{ inhabitant.name }}</span>
          </div>

          <WeekDayMapDinnerModeDisplay
            :model-value="inhabitant.dinnerPreferences"
            :form-mode="formMode"
            :parent-restriction="activeSeason?.cookingDays"
            :show-labels="false"
            :name="`inhabitant-${inhabitant.id}-preferences`"
            @update:model-value="(value) => updatePreferences(inhabitant.id, value)"
          />
        </div>
      </div>

      <UAlert
        v-if="formMode === FORM_MODES.EDIT"
        icon="i-heroicons-information-circle"
        color="primary"
        variant="soft"
        title="Ændringer opdaterer fremtidige bookinger"
      />
    </div>
  </UCard>
</template>
