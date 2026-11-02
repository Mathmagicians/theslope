<!--
UX MOCKUP: season form - this component's own layout.
Where the form sits on the page: see AdminPlanning.vue.

VIEW (canEdit)                                    EDIT / CREATE
┌ Fællesspisning sæson 08/26-07/27             ┐   ┌ Redigerer fællesspisning sæson 08/26-07/27┐
│                     [✏ Rediger 08/26-07/27]  │   │ (create: Opretter fællesspisning sæson     │
│ Vi følger folkeskolernes feriekalender…      │   │  <navn>, navn once the dates are valid)    │
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

Visual check: /admin/planning in view, edit and create, phone and desktop.
-->

<script setup lang="ts">
import type {Season} from "~/composables/useSeasonValidation"
import type {FormMode} from "~/types/form"
import {FORM_MODES} from "~/types/form"
import {BUTTON_WORDS} from "~/config/buttonWords"
import {SEASON_WORDS} from '~/config/seasonWords'

const {SeasonSchema, createSeasonName, computeCookingDates} = useSeason()
const {BUTTONS, COLOR, COMPONENTS, ICONS, LAYOUTS, TYPOGRAPHY, TEXT} = useTheSlopeDesignSystem()
const WORDS = SEASON_WORDS.editor
const form = COMPONENTS.seasonForm

// The sum of dinners the saved season scaffolds
const cookingDayCount = computed(() => {
    const {start, end} = model.value.seasonDates ?? {}
    if (!start || !end) return 0
    return computeCookingDates(model.value.cookingDays, model.value.seasonDates, model.value.holidays ?? []).length
})
const {holidayUrl} = useAppConfig().theslope

const planStore = usePlanStore()
const {isSavingSeasonFlowInProgress: isSavingSeason} = storeToRefs(planStore)

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

watch(() => model.value.seasonDates, (newDates) => {
  if (newDates) {
    model.value.shortName = createSeasonName(newDates)
  }
}, {deep: true})

// The title says what the form is doing (Redigerer); the edit control says what it does (Rediger). The season's name
// lives in the title, and create shows it as soon as the dates are valid
const formTitle = computed(() =>
    capitalize([WORDS.titleVerbs[props.mode], WORDS.name, model.value.shortName].filter(Boolean).join(' '))
)

const editLabel = computed(() => `${BUTTON_WORDS.edit} ${model.value.shortName}`)

const onSubmitSeason = () => {
  emit('update', model.value)
}
</script>

<template>
  <UForm id="seasonForm" :schema="SeasonSchema" :state="model" @submit="onSubmitSeason">
    <template #default="{ errors }">
      <UCard v-show="model" :class="form.card">
        <template #header>
          <div :class="[LAYOUTS.cardActionRow, form.headerRow]">
            <div>
              <h2 :class="TYPOGRAPHY.cardTitle">{{ formTitle }}</h2>
              <h3 :class="TYPOGRAPHY.bodyTextSmall">{{ WORDS.holidayCalendar.lead }}
                <a :href="holidayUrl" :class="[TEXT.blue[500], form.holidayLink]" target="_blank">{{ WORDS.holidayCalendar.link }}</a>
              </h3>
            </div>
            <div :class="COMPONENTS.statBox.box" data-testid="cooking-day-count">
              <UIcon :name="ICONS.dinner" :class="COMPONENTS.statBox.icon"/>
              <div :class="COMPONENTS.statBox.figure">
                <p :class="COMPONENTS.statBox.value">{{ cookingDayCount }}</p>
                <p :class="COMPONENTS.statBox.unit">{{ WORDS.cookingDays }}</p>
              </div>
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
          <div :class="form.body">
            <!-- The fields: below the calendar on the phone, left of it from xl -->
            <div :class="form.formColumn">
              <div :class="form.stack">
                <CalendarDateRangePicker
                    v-model="model.seasonDates"
                    name="seasonDates"
                    :label="WORDS.seasonDates"
                    :disabled="isViewMode"/>

                <WeekDayMapDisplay
                    v-model="model.cookingDays"
                    name="cookingDays"
                    :label="WORDS.weekdays"
                    :disabled="isViewMode"
                />

                <USeparator/>
                <div :class="form.section">
                  <h4 :class="[TYPOGRAPHY.bodyTextMedium, TEXT.ink]">
                    {{ WORDS.holidays }}
                  </h4>
                  <CalendarDateRangeListPicker
                      v-model="model.holidays"
                      name="holidays"
                      :disabled="isViewMode"
                      :season-dates="model.seasonDates"
                  />
                </div>
                <USeparator/>
                <UFormField :label="WORDS.ticketIsCancellableDaysBefore" name="ticketIsCancellableDaysBefore">
                  <UInput
                      v-model="model.ticketIsCancellableDaysBefore"
                      name="ticketIsCancellableDaysBefore"
                      type="number"
                      :disabled="isViewMode"/>
                </UFormField>

                <UFormField :label="WORDS.diningModeIsEditableMinutesBefore" name="diningModeIsEditableMinutesBefore">
                  <UInput
                      v-model="model.diningModeIsEditableMinutesBefore"
                      name="diningModeIsEditableMinutesBefore"
                      type="number"
                      :disabled="isViewMode"/>
                </UFormField>

                <UFormField :label="WORDS.consecutiveCookingDays" name="consecutiveCookingDays">
                  <UInput
                      v-model="model.consecutiveCookingDays"
                      name="consecutiveCookingDays"
                      type="number"
                      :disabled="isViewMode"/>
                </UFormField>
                <USeparator/>

                <div :class="form.section">
                  <h4 :class="[TYPOGRAPHY.bodyTextMedium, TEXT.ink]">
                    {{ WORDS.ticketPrices }}
                  </h4>
                  <TicketPriceListEditor
                      v-model="model.ticketPrices"
                      name="ticketPrices"
                      :disabled="isViewMode"/>
                </div>
              </div>
            </div>

            <!-- The calendar: above the fields on the phone, right of them from xl -->
            <div :class="form.calendarColumn">
              <CalendarDisplay
                  :class="form.calendar"
                  :season-dates="model.seasonDates"
                  :cooking-days="model.cookingDays"
                  :holidays="model.holidays"
                  :dinner-events="model.dinnerEvents"/>
            </div>
          </div>
        </template>

        <template #footer>
          <div v-if="!isViewMode" :class="form.stack">
            <div v-if="errors.length > 0" :class="[TEXT.red[500], TYPOGRAPHY.bodyTextSmall, form.errors]">
              <div :class="form.errorsTitle">{{ WORDS.errors }}</div>
              <ul :class="form.errorList">
                <li v-for="error in errors" :key="error.name">
                  <span :class="form.errorName">{{ error.name }}:</span> {{ error.message }}
                </li>
              </ul>
            </div>
            <div :class="LAYOUTS.formButtonRow">
              <UButton v-bind="BUTTONS.cancel" data-testid="cancel-season" @click="emit('cancel')">
                {{ BUTTON_WORDS.cancel }}
              </UButton>
              <UButton
                  v-bind="BUTTONS.save"
                  data-testid="submit-season"
                  type="submit"
                  :loading="isSavingSeason"
                  :disabled="isSavingSeason">
                {{ BUTTON_WORDS.save }}
              </UButton>
            </div>
          </div>
        </template>
      </UCard>
    </template>
  </UForm>
</template>
