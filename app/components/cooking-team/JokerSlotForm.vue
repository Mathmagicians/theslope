<script setup lang="ts">
/**
 * JokerSlotForm - a time-bound team seat without a person, opened under the joker add row (CookingTeamCard, edit face).
 *
 *   Periode     [07/10/2026] - [01/12/2026]           <- CalendarDateRangePicker, the season's dates
 *   Ugedage     [tir][tor]                            <- WeekDayMapDisplay, the team's cooking days, all ticked
 *   Rolle       [(whisk) Kok  v]                      <- TeamRoleFields
 *   Arbejdstid  [100%         v]
 *   Note        [Anna barsel            ]             <- optional
 *   [Annuller]  [Tilføj]
 */
import type {z} from 'zod'
import type {Form, FormSubmitEvent} from '@nuxt/ui'
import type {DateRange, WeekDayMap} from '~/types/dateTypes'
import {createDefaultWeekdayMap} from '~/types/dateTypes'
import type {JokerSlotCreate} from '~/composables/useDutyValidation'

type JokerSlotDraft = z.input<ReturnType<typeof useDutyValidation>['JokerSlotCreateSchema']>

const props = withDefaults(defineProps<{
  seasonDates: DateRange
  teamAffinity?: WeekDayMap | null
}>(), {
  teamAffinity: null
})

const emit = defineEmits<{
  submit: [slot: JokerSlotCreate]
  cancel: []
}>()

const {SIZES, BUTTONS, LAYOUTS, COMPONENTS} = useTheSlopeDesignSystem()
const {JokerSlotCreateSchema} = useDutyValidation()
const {TeamRoleSchema} = useCookingTeamValidation()

const period = ref<DateRange>({...props.seasonDates})

const draft = reactive<Pick<JokerSlotDraft, 'role' | 'allocationPercentage'> & {affinity: WeekDayMap, note?: string}>({
  role: TeamRoleSchema.enum.COOK,
  affinity: props.teamAffinity ? {...props.teamAffinity} : createDefaultWeekdayMap(false),
  allocationPercentage: JokerSlotCreateSchema.shape.allocationPercentage.parse(undefined),
  note: undefined
})

const formRef = useTemplateRef<Form<JokerSlotDraft>>('formRef')

const state = computed<JokerSlotDraft>(() => ({...draft, startDate: period.value.start, endDate: period.value.end}))

const handleSubmit = ({data: {note, ...slot}}: FormSubmitEvent<JokerSlotCreate>) => {
  emit('submit', note?.trim() ? {...slot, note: note.trim()} : slot)
}
</script>

<template>
  <UForm
      ref="formRef"
      :state="state"
      :schema="JokerSlotCreateSchema"
      :class="COMPONENTS.teamForm.stack"
      data-testid="joker-slot-form"
      @submit="handleSubmit"
  >
    <CalendarDateRangePicker v-model="period" name="endDate" label="Periode" />

    <WeekDayMapDisplay
        v-model="draft.affinity"
        :parent-restriction="teamAffinity"
        hide-restricted
        name="affinity"
        label="Ugedage"
    />

    <TeamRoleFields
        v-model:role="draft.role"
        v-model:allocation-percentage="draft.allocationPercentage"
        role-label="Rolle"
        role-select-test-id="joker-slot-role-select"
    />

    <UFormField label="Note" name="note" hint="Valgfri" :size="SIZES.small">
      <UInput v-model="draft.note" placeholder="Fx Anna barsel" :class="COMPONENTS.teamForm.control" :size="SIZES.small" />
    </UFormField>

    <div :class="LAYOUTS.formButtonRow">
      <UButton v-bind="BUTTONS.cancel" :size="SIZES.small" data-testid="joker-slot-cancel" @click="emit('cancel')">
        Annuller
      </UButton>
      <UButton v-bind="BUTTONS.save" :size="SIZES.small" data-testid="joker-slot-submit" @click="formRef?.submit()">
        Tilføj
      </UButton>
    </div>
  </UForm>
</template>
