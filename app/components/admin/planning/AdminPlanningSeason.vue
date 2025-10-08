<script setup lang="ts">
import type {Season} from "~/composables/useSeasonValidation"
import type {FormSubmitEvent} from "#ui/types"
import {type DateRange, type WeekDayMap, WEEKDAYS} from "~/types/dateTypes"
import type {FormMode} from "~/types/form"

//COMPONENT DEPENDENCIES
const {SeasonSchema, createSeasonName} = useSeason()
const appConfig = useAppConfig()
const {theslope} = appConfig  //some default values

// COMPONENT DEFINITION
const props = defineProps<{ mode: FormMode }>()
const model = defineModel<Season>({required: true})
const emit = defineEmits<{
  cancel: [],
  update: [season: Season]
}>()

// COMPUTED STATE
const shortName = computed(() => createSeasonName(model.value.seasonDates))

const isViewMode = computed(() => props.mode === 'view')

// Update shortName when seasonDates changes
watch(() => model.value.seasonDates, (newDates) => {
  if (newDates) {
    model.value.shortName = createSeasonName(newDates)
  }
}, { deep: true })

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
    default:
      action = 'Vis'
  }
  return `${action} fællesspisning sæson`
})

// ACTIONS
const onSubmitSeason = (event: FormSubmitEvent<Season>) => {
  const formData = {...event.data}
  emit('update', formData)
}

// UI METHODS
const buttonText = computed(() => {
  switch (props.mode) {
    case 'create':
      return 'Opret ny sæson'
    case 'edit':
      return 'Gem ændringer'
    default:
      return 'OK'
  }
})
</script>

<template>
  <UCard
      v-if="model"
      class="w-full ring-none ring-0 shadow-none" padding="px-0" >
    <template #header>
      <h2 class="text-lg font-semibold">{{ formTitle }}</h2>
      <h3 class="text-sm">Vi følger folkeskolernes feriekalender i
        <a :href="theslope.holidayUrl" class="text-blue-500 underline" target="_blank">Lejre Kommune.</a>
      </h3>
    </template>

    <template #default>
      <div class="flex flex-col-reverse xl:flex-row gap-2 md:gap-6">
        <!-- Form Section - Below on mobile, Left on desktop -->
        <div class="grow">
          <UForm id="seasonForm" :schema="SeasonSchema" :state="model" class="space-y-4"
                 @submit="onSubmitSeason">
            <UFormField label="Sæson" name="shortName">
              <UInput disabled
                      name="seasonShortName"
                      :model-value="shortName"/>
            </UFormField>

            <!-- Season date picker -->
            <CalendarDateRangePicker
                v-if="!isViewMode"
                name="seasonDates"
                v-model="model.seasonDates"/>

            <!-- Pick weekdays for cooking -->
            <UFormField label="Hvilke ugedage skal der være fællesspisning?"
                        name="cookingDaysGroup">
              <UCheckbox v-for="day in WEEKDAYS"
                         :key="day"
                         :name="`cookingDay-${day}`"
                         v-model="model.cookingDays[day]"
                         :label="day"
                         class="capitalize"
                         :disabled="isViewMode"/>
            </UFormField>

            <!-- Pick holidays -->
            <USeparator/>
            <UFormField label="Hvornår holder fællesspisning fri?"
                        name="holidaysGroup">

              <CalendarDateRangeListPicker
                  name="holidays"
                  v-model="model.holidays"
                  :disabled="isViewMode"
                  :season-dates="model.seasonDates"
              />

            </UFormField>

            <USeparator/>

            <!-- Ticket settings -->
            <UFormField
                label="Hvor mange dage før fællespisning, skal man kunne afbestille sin billet?"
                name="cancellableGroup">
              <UInput
                  v-model="model.ticketIsCancellableDaysBefore"
                  name="cancellableDays"
                  type="number"
                  :disabled="isViewMode"/>
            </UFormField>

            <UFormField label="Hvor mange minutter før fællespisning, skal man kunne ændre mellem spisesal og takeaway?"
                        name="editableGroup">
              <UInput
                  v-model="model.diningModeIsEditableMinutesBefore"
                  name="editableMinutes"
                  type="number"
                  :disabled="isViewMode"/>
            </UFormField>
          </UForm>
        </div>

        <!-- Calendar Section - Above on mobile, Right on desktop -->
        <div class="min-w-1/2 lg:w-1/2 grow-0">
          <CalendarDisplay class="mx-auto"
                           :seasonDates="model.seasonDates"
                           :cookingDays="model.cookingDays as WeekDayMap"
                           :holidays="model.holidays"
                           :dinner-events="model.dinnerEvents"/>
        </div>
      </div>
    </template>

    <template #footer>
      <div v-if="!isViewMode" class="flex justify-end gap-4">
        <UButton name="cancel-season" color="secondary" variant="soft" @click="emit('cancel')">
          Annuller
        </UButton>
        <UButton name="submit-season" type="submit" form="seasonForm" color="info" icon="i-heroicons-check-circle">
          {{ buttonText }}
        </UButton>
      </div>
    </template>
  </UCard>
</template>
