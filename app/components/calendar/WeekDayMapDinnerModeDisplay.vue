<script setup lang="ts">
/**
 * WeekDayMapDinnerModeDisplay - Display and edit DinnerMode preferences for each weekday
 *
 * Similar to WeekDayMapDisplay but for DinnerMode enum values instead of boolean
 * Supports compact (icon badges) and full (radio buttons) views
 */
import {WEEKDAYS} from '~/types/dateTypes'
import type {WeekDayMap, WeekDay} from '~/types/dateTypes'
import {DinnerMode} from '@prisma/client'
import {z} from 'zod'

interface Props {
  modelValue?: WeekDayMap<DinnerMode> | null
  compact?: boolean
  disabled?: boolean
  label?: string
  name?: string
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  disabled: false,
  label: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: WeekDayMap<DinnerMode>]
}>()

const {createDefaultWeekdayMap} = useWeekDayMapValidation({
  valueSchema: z.nativeEnum(DinnerMode),
  defaultValue: DinnerMode.NONE
})

// Dinner mode display config
const dinnerModeConfig = {
  [DinnerMode.DINEIN]: {label: 'Fællesspisning', icon: 'i-streamline-food-kitchenware-spoon-plate-fork-plate-food-dine-cook-utensils-eat-restaurant-dining', color: 'success'},
  [DinnerMode.TAKEAWAY]: {label: 'Takeaway', icon: 'i-heroicons-shopping-bag', color: 'primary'},
  [DinnerMode.NONE]: {label: 'Ingen fællesmad', icon: 'i-heroicons-x-circle', color: 'neutral'}
}

// Radio group options
const dinnerModeOptions = [
  {label: dinnerModeConfig[DinnerMode.DINEIN].label, value: DinnerMode.DINEIN},
  {label: dinnerModeConfig[DinnerMode.TAKEAWAY].label, value: DinnerMode.TAKEAWAY},
  {label: dinnerModeConfig[DinnerMode.NONE].label, value: DinnerMode.NONE}
]

// Format day for compact display (first 3 letters)
const formatDayCompact = (day: WeekDay) => {
  return day.substring(0, 3)
}

// Update local model value
const updateDay = (day: WeekDay, value: DinnerMode) => {
  if (props.disabled) return

  // Initialize with all days set to NONE if modelValue is null/undefined
  const updated: WeekDayMap<DinnerMode> = props.modelValue
    ? {...props.modelValue}
    : createDefaultWeekdayMap(DinnerMode.NONE)

  updated[day] = value
  emit('update:modelValue', updated)
}

// ============================================================================
// PROTOTYPES: DinnerMode Table Display Options
// ============================================================================

// Test data: Family of 4
const testInhabitants = [
  { id: 1, name: 'Anna', lastName: 'Hansen' },
  { id: 2, name: 'Bob', lastName: 'Hansen' },
  { id: 3, name: 'Clara', lastName: 'Hansen' },
  { id: 4, name: 'David', lastName: 'Hansen' }
]

// Parent delimiters: Only show Mon, Tue, Thu, Fri (no Wed, Sat, Sun)
const testParentDelimiters: WeekDayMap<boolean> = {
  mandag: true,
  tirsdag: true,
  onsdag: false,
  torsdag: true,
  fredag: true,
  lørdag: false,
  søndag: false
}

// Helper to create DinnerMode map with specific selections
const createDinnerModeSelection = (dineinDays: WeekDay[], takeawayDays: WeekDay[]): WeekDayMap<DinnerMode> => {
  const map = createDefaultWeekdayMap(DinnerMode.NONE)
  dineinDays.forEach(day => { map[day] = DinnerMode.DINEIN })
  takeawayDays.forEach(day => { map[day] = DinnerMode.TAKEAWAY })
  return map
}

// Test preferences: inhabitantId -> WeekDayMap<DinnerMode>
const testPreferences = ref<Record<number, WeekDayMap<DinnerMode>>>({
  1: createDinnerModeSelection(['mandag', 'tirsdag', 'torsdag'], ['fredag']),
  2: createDinnerModeSelection(['mandag', 'tirsdag'], ['fredag']),
  3: createDinnerModeSelection(['mandag', 'torsdag'], ['fredag']),
  4: createDefaultWeekdayMap(DinnerMode.NONE)
})

// Visible weekdays based on parent delimiters
const visibleWeekdays = computed(() => {
  return WEEKDAYS.filter(day => testParentDelimiters[day])
})

// Update preference
const updatePreference = (inhabitantId: number, day: WeekDay, mode: DinnerMode) => {
  if (!testPreferences.value[inhabitantId]) {
    testPreferences.value[inhabitantId] = createDefaultWeekdayMap(DinnerMode.NONE)
  }
  testPreferences.value[inhabitantId][day] = mode
}

// ===== OPTION 2: Button Group (3 buttons, 1 selected) =====
const updateMode2 = (inhabitantId: number, day: WeekDay, mode: DinnerMode) => {
  updatePreference(inhabitantId, day, mode)
}

// ===== OPTION 3: Single Button (cycles through 3 states) =====
const cycleMode3 = (inhabitantId: number, day: WeekDay) => {
  const current = testPreferences.value[inhabitantId]?.[day] || DinnerMode.NONE
  const nextMode: Record<DinnerMode, DinnerMode> = {
    [DinnerMode.NONE]: DinnerMode.DINEIN,
    [DinnerMode.DINEIN]: DinnerMode.TAKEAWAY,
    [DinnerMode.TAKEAWAY]: DinnerMode.NONE
  }
  updatePreference(inhabitantId, day, nextMode[current])
}

const getModeIcon3 = (mode: DinnerMode): string => {
  return {
    [DinnerMode.DINEIN]: 'i-streamline:food-kitchenware-spoon-plate-fork-plate-food-dine-cook-utensils-eat-restaurant-dining',
    [DinnerMode.TAKEAWAY]: 'i-heroicons-shopping-bag',
    [DinnerMode.NONE]: 'i-heroicons-x-circle'
  }[mode]
}

const getModeColor3 = (mode: DinnerMode): string => {
  return {
    [DinnerMode.DINEIN]: 'success',
    [DinnerMode.TAKEAWAY]: 'primary',
    [DinnerMode.NONE]: 'neutral'
  }[mode]
}
</script>

<template>
  <!-- COMPACT VIEW: Show icons for each day (read-only, at-a-glance) -->
  <div v-if="compact" class="flex gap-0.5">
    <div v-for="day in WEEKDAYS" :key="day" class="flex flex-col items-center">
      <span class="text-[10px] text-gray-500 uppercase">{{ day.substring(0, 3) }}</span>
      <UIcon
        :name="dinnerModeConfig[modelValue?.[day] ?? DinnerMode.NONE].icon"
        class="w-4 h-4"
        :class="{
          'text-green-600': modelValue?.[day] === DinnerMode.DINEIN,
          'text-blue-600': modelValue?.[day] === DinnerMode.TAKEAWAY,
          'text-gray-300': modelValue?.[day] === DinnerMode.NONE || !modelValue?.[day]
        }"
      />
    </div>
  </div>

  <!-- FULL VIEW: Show radio buttons for each day -->
  <UFormField v-else :label="label" :name="name">
    <div class="flex flex-col gap-2">
      <div v-for="day in WEEKDAYS" :key="day" class="flex items-center gap-4">
        <span class="text-sm font-medium capitalize w-20">{{ day }}</span>
        <URadioGroup
          :model-value="modelValue?.[day] ?? DinnerMode.NONE"
          :items="dinnerModeOptions"
          :disabled="disabled"
          :name="`${name}-${day}`"
          orientation="horizontal"
          @update:model-value="(value) => updateDay(day, value)"
        />
      </div>
    </div>
  </UFormField>

  <!-- ========================================================================== -->
  <!-- PROTOTYPES: Three Design Options for DinnerMode Table -->
  <!-- ========================================================================== -->

  <div class="mt-12 space-y-8">
    <h2 class="text-2xl font-bold">Prototype Comparison: DinnerMode Weekly Preferences</h2>

    <!-- OPTION 2: Button Group -->
    <div class="border-2 border-green-500 p-4 rounded-lg">
      <h3 class="text-xl font-semibold mb-4">Option 2: Button Group (3 buttons)</h3>
      <p class="text-sm text-gray-600 mb-4">
        One of 3 buttons always selected: 📍 Spis her | 📦 Tag med | ⊘ Ingen
      </p>

      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b-2">
              <th class="px-1 py-1 md:px-3 md:py-2 text-left font-medium text-xs md:text-sm">Beboer</th>
              <th
                v-for="day in visibleWeekdays"
                :key="day"
                class="px-1 py-1 md:px-2 md:py-2 text-center font-medium text-xs md:text-sm capitalize"
              >
                {{ formatDayCompact(day) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="inhabitant in testInhabitants"
              :key="inhabitant.id"
              class="border-b hover:bg-gray-50"
            >
              <td class="px-1 py-1 md:px-3 md:py-2 text-xs md:text-sm">
                {{ inhabitant.name }} {{ inhabitant.lastName }}
              </td>
              <td
                v-for="day in visibleWeekdays"
                :key="day"
                class="px-1 py-1 md:px-2 md:py-2"
              >
                <UFieldGroup size="sm" orientation="horizontal">
                  <UButton
                    icon="i-streamline:food-kitchenware-spoon-plate-fork-plate-food-dine-cook-utensils-eat-restaurant-dining"
                    :color="testPreferences[inhabitant.id][day] === DinnerMode.DINEIN ? 'success' : 'neutral'"
                    :variant="testPreferences[inhabitant.id][day] === DinnerMode.DINEIN ? 'solid' : 'ghost'"
                    @click="updateMode2(inhabitant.id, day, DinnerMode.DINEIN)"
                  />
                  <UButton
                    icon="i-heroicons-shopping-bag"
                    :color="testPreferences[inhabitant.id][day] === DinnerMode.TAKEAWAY ? 'success' : 'neutral'"
                    :variant="testPreferences[inhabitant.id][day] === DinnerMode.TAKEAWAY ? 'solid' : 'ghost'"
                    @click="updateMode2(inhabitant.id, day, DinnerMode.TAKEAWAY)"
                  />
                  <UButton
                    icon="i-heroicons-x-circle"
                    color="neutral"
                    :variant="testPreferences[inhabitant.id][day] === DinnerMode.NONE ? 'subtle' : 'ghost'"
                    @click="updateMode2(inhabitant.id, day, DinnerMode.NONE)"
                  />
                </UFieldGroup>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="mt-2 text-xs text-gray-600">
        ✅ Pros: All options visible, single click | ❌ Cons: Wide cells, lots of visual weight
      </div>
    </div>

    <!-- OPTION 3: Single Cycling Button -->
    <div class="border-2 border-purple-500 p-4 rounded-lg">
      <h3 class="text-xl font-semibold mb-4">Option 3: Single Button (cycles 3 states)</h3>
      <p class="text-sm text-gray-600 mb-4">
        Click to cycle: ⊘ Ingen → 📍 Spis her → 📦 Tag med → ⊘ Ingen
      </p>

      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b-2">
              <th class="px-1 py-1 md:px-3 md:py-2 text-left font-medium text-xs md:text-sm">Beboer</th>
              <th
                v-for="day in visibleWeekdays"
                :key="day"
                class="px-1 py-1 md:px-2 md:py-2 text-center font-medium text-xs md:text-sm capitalize"
              >
                {{ formatDayCompact(day) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="inhabitant in testInhabitants"
              :key="inhabitant.id"
              class="border-b hover:bg-gray-50"
            >
              <td class="px-1 py-1 md:px-3 md:py-2 text-xs md:text-sm">
                {{ inhabitant.name }} {{ inhabitant.lastName }}
              </td>
              <td
                v-for="day in visibleWeekdays"
                :key="day"
                class="px-1 py-1 md:px-2 md:py-2 text-center"
              >
                <UButton
                  size="sm"
                  :icon="getModeIcon3(testPreferences[inhabitant.id][day])"
                  :color="getModeColor3(testPreferences[inhabitant.id][day])"
                  :variant="testPreferences[inhabitant.id][day] === DinnerMode.NONE ? 'ghost' : 'soft'"
                  @click="cycleMode3(inhabitant.id, day)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="mt-2 text-xs text-gray-600">
        ✅ Pros: Minimal UI, compact, intuitive cycling | ❌ Cons: States not immediately visible, requires clicks to discover
      </div>
    </div>

    <!-- Legend -->
    <div class="flex flex-col md:flex-row gap-3 md:gap-6 text-sm text-gray-700 border-t pt-4">
      <div class="flex items-center gap-2">
        <UIcon name="i-streamline:food-kitchenware-spoon-plate-fork-plate-food-dine-cook-utensils-eat-restaurant-dining" class="text-green-600 w-5 h-5" />
        <span>📍 Spis her (DINEIN)</span>
      </div>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-shopping-bag" class="text-blue-600 w-5 h-5" />
        <span>📦 Tag med (TAKEAWAY)</span>
      </div>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-x-circle" class="text-gray-400 w-5 h-5" />
        <span>⊘ Ingen tilmelding (NONE)</span>
      </div>
    </div>
  </div>
</template>