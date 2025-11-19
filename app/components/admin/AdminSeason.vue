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
const holidays = ref<DateRange[]>(model.value.holidays ?? [])

const isViewMode = computed(() => props.mode === 'view')

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
  console.info('📆 > AdminSeason > onSubmit', event.data)

  // Create a copy of the form data to emit
  const formData = {...event.data}

  // Emit the update event with the form data
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

console.log("📆 AdminSeason > initialization done, formMode: ", props.mode, "model (season)", model.value.shortName)
</script>

<template>
  <UCard
      v-if="model"
      class="w-full ring-none ring-0 shadow-none" padding="px-0" :ui="{
    rounded: 'rounded-none',
    shadow: 'shadow-none',
    body: {
      padding: 'px-0',
      base: 'ring-0',
      shadow: 'shadow-none'
    },
    header: {
      padding: 'px-0',
      background: 'bg-violet-50 dark:bg-violet-700'
    },
    footer: {
      padding: 'px-0',
      background: 'bg-violet-50 dark:bg-violet-700'
    }
  }">
    <template #header>
      <h2 class="text-lg font-semibold">{{ formTitle }}</h2>
      <h3 class="text-sm">Vi følger folkeskolernes feriekalender i
        <a :href="theslope.holidayUrl" class="text-blue-500 underline" target="_blank">Lejre Kommune.</a>
        <span>Debug: {{ model?.shortName }}</span>
      </h3>
    </template>

    <template #default>
      <div class="flex flex-col-reverse xl:flex-row gap-2 md:gap-6">
        <!-- Form Section - Below on mobile, Left on desktop -->
        <div class="grow">
          <UForm
id="seasonForm" :schema="SeasonSchema" :state="model" class="space-y-4"
                 @submit.prevent="onSubmitSeason">
            <UFormGroup label="Sæson" name="shortName">
              <UInput
disabled
                      name="seasonShortName"
                      :model-value="shortName"/>
            </UFormGroup>

            <!-- Season date picker -->
            <CalendarDateRangePicker
                v-if="!isViewMode"
                v-model="model.seasonDates"
                name="seasonDates"/>

            <!-- Pick weekdays for cooking -->
            <UFormGroup
label="Hvilke ugedage skal der være fællesspisning?"
                        name="cookingDaysGroup">
              <UCheckbox
v-for="day in WEEKDAYS"
                         :key="day"
                         v-model="model.cookingDays[day]"
                         :name="`cookingDay-${day}`"
                         :label="day"
                         class="capitalize"
                         :disabled="isViewMode"/>
            </UFormGroup>

            <!-- Pick holidays -->
            <UDivider/>
            <UFormGroup
label="Hvornår holder fællesspisning fri?"
                        name="holidaysGroup">

              <CalendarDateRangeListPicker
                  v-model="holidays"
                  name="holidays"
                  :disabled="isViewMode"
                  :season-dates="model.seasonDates"
              />

            </UFormGroup>

            <UDivider/>

            <!-- Ticket settings -->
            <UFormGroup
                label="Hvor mange dage før fællespisning, skal man kunne afbestille sin billet?"
                name="cancellableGroup">
              <UInput
                  v-model="model.ticketIsCancellableDaysBefore"
                  name="cancellableDays"
                  type="number"
                  :disabled="isViewMode"/>
            </UFormGroup>

            <UFormGroup
label="Hvor mange minutter før fællespisning, skal man kunne ændre mellem spisesal og takeaway?"
                        name="editableGroup">
              <UInput
                  v-model="model.diningModeIsEditableMinutesBefore"
                  name="editableMinutes"
                  type="number"
                  :disabled="isViewMode"/>
            </UFormGroup>
          </UForm>
        </div>

        <!-- Calendar Section - Above on mobile, Right on desktop -->
        <div class="min-w-1/2 lg:w-1/2 grow-0">
          <CalendarDisplay
class="mx-auto"
                           :season-dates="model.seasonDates"
                           :cooking-days="model.cookingDays as WeekDayMap"
                           :holidays="model.holidays"/>
        </div>
      </div>
    </template>

    <template #footer>
      <div v-if="!isViewMode" class="flex justify-end gap-4">
        <UButton color="gray" variant="soft" @click="emit('cancel')">
          Annuller
        </UButton>
        <UButton type="submit" form="seasonForm" color="pink" icon="i-heroicons-calendar">
          {{ buttonText }}
        </UButton>
      </div>
    </template>
  </UCard>
</template>
