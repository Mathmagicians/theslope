<template>
  <div class="p-2 md:p-4">
    <div
        v-for="(preference, day) in weeklyPreferences"
        :key="day"
        class="flex items-center gap-2 md:gap-4 mb-2 md:mb-4"
    >
      <UText class="w-16 md:w-24 font-medium">{{ day }}:</UText>
      <USelect
          :v-model="weeklyPreferences[day]"
          :options="mealOptions"
          :key="`select-${day}`"
          class="w-24 md:w-32"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

enum MealPreference {
  DINEIN = 'DINEIN',
  TAKEAWAY = 'TAKEAWAY',
  NONE = 'NONE'
}

type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'

type WeeklyPreferences = {
  [key in DayOfWeek]: MealPreference
}

const selection: Ref<WeeklyPreferences> = ref(weeklyPreferences)

const mealOptions = Object.values(MealPreference)

const weeklyPreferences = ref<WeeklyPreferences>({
  Monday: MealPreference.DINEIN,
  Tuesday: MealPreference.DINEIN,
  Wednesday: MealPreference.DINEIN,
  Thursday: MealPreference.DINEIN,
  Friday: MealPreference.DINEIN,
  Saturday: MealPreference.DINEIN,
  Sunday: MealPreference.DINEIN
})
</script>
