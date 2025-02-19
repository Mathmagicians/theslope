<script setup lang="ts">

import {useSeason} from "~/composables/useSeason"
import type {Season} from "~/composables/useSeason"
import type {FormSubmitEvent} from "#ui/types"
import {WEEKDAYS} from "~/types/dateTypes"
import type {FormMode} from "~/types/form"

const { SeasonSchema, createSeasonName, copySeason } = useSeason()
const props = defineProps<{ mode: FormMode }>()
const model = defineModel<Season>()
const emit = defineEmits<{ cancel: [] }>()

const state = ref<Season>(copySeason(model.value))
const selectedDates = ref<DateRange>(state.value.seasonDates)

const appConfig = useAppConfig()
const { theslope } = appConfig //some default values

const shortName = computed({
  get: () => createSeasonName(state.value.seasonDates),
  set: (value) => {
    state.value.shortName = value
  }
})

// Update local state when model changes (e.g., when switching between seasons)
watch(() => model.value, (newValue) => {
  state.value = copySeason(newValue)
}, {deep: true})

const onSubmitSeason = (event: FormSubmitEvent<Season>) => {
  model.value = event.data
  console.info('📆 > AdminSeason > onSubmit', event.data)
}

const formTitle = computed(() => {
  let action: string
  switch (props.mode) {
    case 'create':
      action = 'Opret ny'
      break
    case 'edit':
      action = 'Rediger'
      break
    case 'view':
      action = 'Vis'
      break
    default:
      throw new Error(`Invalid form mode: ${props.mode}`)
  }
  return `${action} fællesspisning sæson`
})

const buttonText = computed(() => {
  switch (props.mode) {
    case 'create':
      return 'Opret ny sæson'
    case 'edit':
      return 'Gem ændringer'
    case 'view':
      return 'Vis sæson'
    default:
      throw new Error(`Invalid form mode: ${props.mode}`)
  }
})

const isViewMode = computed(() => props.mode === 'view')

</script>

<template>
  <UCard>
    <template #header>
      <h2 class="text-lg font-semibold">{{ formTitle }}</h2>
      <h3 class="text-sm">Vi følger folkeskolernes feriekalender i
        <a :href="theslope.holidayUrl" class="text-blue-500 underline" target="_blank">
          Lejre Kommune.
        </a>
      </h3>

    </template>
    <template #default>
      <div class="flex flex-col md:flex-row gap-6">
        <!-- Form Section - Below on mobile, Left on desktop -->
        <div class="flex-1">

          <UForm :schema="SeasonSchema" :state="state" class="space-y-4" @submit.prevent="onSubmitSeason">
            <UFormGroup label="Kort navn" name="shortName">
              <UInput disabled :model-value="shortName"/>
            </UFormGroup>

            <!-- Pick start and end date for the season -->
            <CalendarDateRangePicker v-if=" !isViewMode" v-model="state.seasonDates" />

            <!-- Pick weekdays for cooking -->

            <UFormGroup label="Hvilke ugedage skal der være fællesspisning?" name="cookingDays">
              <UCheckbox
                  v-for="day in WEEKDAYS"
                  :key="day"
                  v-model="state.cookingDays[day]"
                  :label="day"
                  class="capitalize"
                  :disabled="isViewMode"
              />

            </UFormGroup>

            <UDivider/>

            <!-- Add holidays -->

            <!-- Ticket settings -->

            <UFormGroup label="Hvor mange dage før fællespisning, skal man kunne afbestille sin billet?"
                        name="cancellable">
              <UInput v-model="state.ticketIsCancellableDaysBefore" type="number"
                      :disabled="isViewMode"/>
            </UFormGroup>

            <UFormGroup label="Hvor mange minutter før fællespisning, skal man kunne ændre mellem spisesal og takeaway?"
                        name="editable">
              <UInput v-model="state.diningModeIsEditableMinutesBefore" type="number"
                      :disabled="isViewMode"/>
            </UFormGroup>
          </UForm>
        </div>
        <!-- Calendar Section - Above on mobile, Right on desktop -->
        <div class="lg:w-1/3">
          <UCard>
            <CalendarDisplay
                :seasonDates="state.seasonDates"
                :cookingDays="state.cookingDays"
                :holidays="state.holidays"
            />
          </UCard>
        </div>
      </div>
    </template>
    <template #footer>
      <div v-if="!isViewMode" class="flex justify-end gap-4">
        <UButton
            color="gray"
            variant="soft"
            @click="$emit('cancel')"
        >
          Annuller
        </UButton>
        <UButton
            type="submit"
            color="pink"
            icon="i-heroicons-calendar"
        >
          {{ buttonText }}
        </UButton>
      </div>
    </template>
  </UCard>
</template>
