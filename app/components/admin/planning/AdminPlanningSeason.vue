<!--
UX MOCKUP: season form (signed off 2026-09-16) - this component's own layout.
Where the form sits on the page: see AdminPlanning.vue.

VIEW (canEdit)                                    EDIT / CREATE
┌ Fællesspisning sæson 08/26-07/27             ┐   ┌ Redigerer fællesspisning sæson 08/26-07/27┐
│                     [✏ Rediger 08/26-07/27]  │   │ (create: Opret fællesspisning sæson <navn>,│
│ Vi følger folkeskolernes feriekalender…      │   │  navn as soon as the dates are valid)      │
│ [Start dato][Slut dato]            (disabled)│   │ Vi følger folkeskolernes feriekalender…    │
│ Ugedage · ferier (read-only) · billetpriser  │   │ [Start dato ▾][Slut dato ▾]                │
│ CalendarDisplay right (above on mobile)      │   │ Hvilke ugedage skal der være fællesspisning?│
└──────────────────────────────────────────────┘   │ Hvornår holder fællesspisning fri?         │
                                                   │ [Start dato ▾][Slut dato ▾][☀ Tilføj ferie]│
                                                   │ ☀ [13/10/2026][17/10/2026] 🗑              │ each row a
                                                   │ ☀ [21/12/2026][03/01/2027] 🗑              │ picker
                                                   │ Billetpriser  [🎟 Tilføj billet] … 🗑       │
                                                   │ CalendarDisplay right (above on mobile)    │
                                                   ├────────────────────────────────────────────┤
                                                   │ fejlliste (if any)                         │
                                                   │                [✕ Annuller]  [✓ Gem]       │
                                                   └────────────────────────────────────────────┘

The season name lives in the title, so there is no read-only "Sæson" field. No 🗑 for the season.
-->

<script setup lang="ts">
import type {Season} from "~/composables/useSeasonValidation"
import type {FormMode} from "~/types/form"
import {FORM_MODES} from "~/types/form"
import type {WeekDayMap} from "~/types/dateTypes"

//COMPONENT DEPENDENCIES
const {SeasonSchema, createSeasonName} = useSeason()
const {BUTTONS, COLOR, ICONS, LAYOUTS, TYPOGRAPHY, TEXT} = useTheSlopeDesignSystem()
const appConfig = useAppConfig()
const {theslope} = appConfig  //some default values

// Get loading state from store (ADR-007: store owns loading states)
const planStore = usePlanStore()
const {isSavingSeasonFlowInProgress: isSavingSeason} = storeToRefs(planStore)

// COMPONENT DEFINITION
const props = withDefaults(defineProps<{ mode: FormMode, canEdit?: boolean }>(), {
  canEdit: false
})
const model = defineModel<Season>({required: true})
const emit = defineEmits<{
  cancel: [],
  edit: [],
  update: [season: Season]
}>()

const isViewMode = computed(() => props.mode === FORM_MODES.VIEW)

// Update shortName when seasonDates changes
watch(() => model.value.seasonDates, (newDates) => {
  if (newDates) {
    model.value.shortName = createSeasonName(newDates)
  }
}, {deep: true})

// The title says what the form is doing (Redigerer); the edit control says what it does (Rediger)
const SEASON_LABEL = 'fællesspisning sæson'
const EDIT_VERB = 'Rediger'
const TITLE_VERBS: Record<FormMode, string> = {
  [FORM_MODES.VIEW]: '',
  [FORM_MODES.EDIT]: 'Redigerer',
  [FORM_MODES.CREATE]: 'Opret'
}

// The season's name lives in the title (create shows it as soon as the dates are valid)
const formTitle = computed(() =>
    capitalize([TITLE_VERBS[props.mode], SEASON_LABEL, model.value.shortName].filter(Boolean).join(' '))
)

const editLabel = computed(() => `${EDIT_VERB} ${model.value.shortName}`)

// ACTIONS
const onSubmitSeason = () => {
  // Use model.value directly to ensure v-model changes are included
  emit('update', model.value)
}
</script>

<template>
  <UForm id="seasonForm" :schema="SeasonSchema" :state="model" @submit="onSubmitSeason">
    <template #default="{ errors }">
      <UCard
          v-show="model"
          class="w-full ring-none ring-0 shadow-none" padding="px-0">
        <template #header>
          <div :class="LAYOUTS.cardActionRow" class="md:justify-between">
            <div>
              <h2 class="text-lg font-semibold">{{ formTitle }}</h2>
              <h3 class="text-sm">Vi følger folkeskolernes feriekalender i
                <a :href="theslope.holidayUrl" :class="[TEXT.blue[500], 'underline']" target="_blank">Lejre Kommune.</a>
              </h3>
            </div>
            <UButton
                v-if="isViewMode && props.canEdit"
                v-bind="BUTTONS.secondaryAction"
                :class="LAYOUTS.cardActionButton"
                :color="COLOR.primary"
                :icon="ICONS.edit"
                data-testid="edit-season"
                @click="emit('edit')">
              {{ editLabel }}
            </UButton>
          </div>
        </template>

        <template #default>
          <div class="flex flex-col-reverse xl:flex-row gap-2 md:gap-6">
            <!-- Form Section - Below on mobile, Left on desktop -->
            <div class="grow">
              <div class="space-y-4">
                <!-- Season date picker -->
                <CalendarDateRangePicker
                    v-model="model.seasonDates"
                    name="seasonDates"
                    :disabled="isViewMode"/>

                <!-- Pick weekdays for cooking -->
                <WeekDayMapDisplay
                    v-model="model.cookingDays"
                    name="cookingDays"
                    label="Hvilke ugedage skal der være fællesspisning?"
                    :disabled="isViewMode"
                />

                <!-- Pick holidays -->
                <USeparator/>
                <div class="space-y-2">
                  <h4 :class="[TYPOGRAPHY.bodyTextMedium, TEXT.ink]">
                    Hvornår holder fællesspisning fri?
                  </h4>
                  <CalendarDateRangeListPicker
                      v-model="model.holidays"
                      name="holidays"
                      :disabled="isViewMode"
                      :season-dates="model.seasonDates"
                  />
                </div>
                <USeparator/>
                <UFormField
                    label="Hvor mange dage før fællespisning, skal man kunne afbestille sin billet?"
                    name="ticketIsCancellableDaysBefore">
                  <UInput
                      v-model="model.ticketIsCancellableDaysBefore"
                      name="ticketIsCancellableDaysBefore"
                      type="number"
                      :disabled="isViewMode"/>
                </UFormField>

                <UFormField
                    label="Hvor mange minutter før fællespisning, skal man kunne ændre mellem spisesal og takeaway?"
                    name="diningModeIsEditableMinutesBefore">
                  <UInput
                      v-model="model.diningModeIsEditableMinutesBefore"
                      name="diningModeIsEditableMinutesBefore"
                      type="number"
                      :disabled="isViewMode"/>
                </UFormField>

                <UFormField
label="Hvor mange dage i træk laver madholdene mad?"
                            name="consecutiveCookingDays">
                  <UInput
                      v-model="model.consecutiveCookingDays"
                      name="consecutiveCookingDays"
                      type="number"
                      :disabled="isViewMode"/>
                </UFormField>
                <USeparator/>

                <!-- Ticket prices -->
                <div class="space-y-2">
                  <h4 :class="[TYPOGRAPHY.bodyTextMedium, TEXT.ink]">
                    Billetpriser
                  </h4>
                  <TicketPriceListEditor
                      v-model="model.ticketPrices"
                      name="ticketPrices"
                      :disabled="isViewMode"/>
                </div>
              </div>
            </div>

            <!-- Calendar Section - Above on mobile, Right on desktop -->
            <div class="min-w-1/2 lg:w-1/2 grow-0">
              <CalendarDisplay
class="mx-auto"
                               :season-dates="model.seasonDates"
                               :cooking-days="model.cookingDays as WeekDayMap"
                               :holidays="model.holidays"
                               :dinner-events="model.dinnerEvents"/>
            </div>
          </div>
        </template>

        <template #footer>
          <div v-if="!isViewMode" class="space-y-4">
            <div v-if="errors.length > 0" :class="[TEXT.red[500], TYPOGRAPHY.bodyTextSmall, 'space-y-1']">
              <div class="font-semibold">Formen indeholder fejl, som skal rettes:</div>
              <ul class="list-disc list-inside">
                <li v-for="error in errors" :key="error.name">
                  <span class="font-medium">{{ error.name }}:</span> {{ error.message }}
                </li>
              </ul>
            </div>
            <div :class="LAYOUTS.formButtonRow">
              <UButton v-bind="BUTTONS.cancel" data-testid="cancel-season" @click="emit('cancel')">
                Annuller
              </UButton>
              <UButton
                  v-bind="BUTTONS.save"
                  data-testid="submit-season"
                  type="submit"
                  :loading="isSavingSeason"
                  :disabled="isSavingSeason">
                Gem
              </UButton>
            </div>
          </div>
        </template>
      </UCard>
    </template>
  </UForm>
</template>
