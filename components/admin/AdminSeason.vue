<script setup lang="ts">
    import {SeasonSchema} from "~/prisma/generated/zod"
    import type {FormSubmitEvent} from "#ui/types"
    import {WEEKDAYS} from "~/types/dateTypes";

    interface Props {
      mode: FormMode
      season?: SeasonSchema
    }

    const store = usePlanStore()
    const {creatingSeason} = storeToRefs(store)
    const appConfig = useAppConfig()
    const theslopeDefaults = appConfig.theslope
    const thisYear = new Date().getFullYear()

    const initialSeasonFormStateValues = {
      startDate: calculateDayFromWeekNumber(0, theslopeDefaults.defaultSeason.startWeek,thisYear),
      endDate: calculateDayFromWeekNumber(4, theslopeDefaults.defaultSeason.endWeek,thisYear+1),
      cookingDays: createDefaultWeekdayMap(false)  // todo initialize by ... theslopeDefaults.cookingDays,
      isActive: false,

    }
    const createSeasonFormState = reactive({
        shortName: undefined,
        startDate: undefined,
        endDate: undefined,
        isActive:undefined,
        cookingDays: [],
        holidays: [],
        ticketIsCancellableDaysBefore: undefined,
        diningModeIsEditableMinutesBefore: undefined
    })

    const onSubmitSeason = (event: FormSubmitEvent<SeasonSchema>) =>  {
      console.info( '📆 > AdminSeason > onSubmit', event, form)
    }
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="text-lg font-semibold">Opret ny fællesspisning sæson</h2>
      <h3 class="text-sm">Vi følger folkeskolernes feriekalender i
        <a :href="theslopeDefaults.holidayUrl" class="text-blue-500 underline" target="_blank">
          Lejre Kommune.
        </a>
      </h3>

    </template>
    <template #default>

      <UDivider/>
      <UForm :schema="SeasonSchema" :state="createSeasonFormState" class="space-y-4" @submit.prevent="onSubmitSeason">

        <UFormGroup label="Kort navn" name="shortName" >
          <UInput disabled v-model="createSeasonFormState.shortName" />
        </UFormGroup>
        <!-- Pick start and end date for the season -->

        <!-- Pick weekdays for cooking -->
        <UFormGroup label="Hvilke ugedage skal der være fællesspisning?" name="cookingDays" >
          <UCheckbox
              v-for="day in WEEKDAYS"
              :key="day"
              v-model="createSeasonFormState.cookingDays[day]"
              :label="capitalize(day)"
          />

        </UFormGroup>


        <!-- Ticket settings -->
        <UFormGroup label="Hvor mange dage før fællespisning, skal man kunne afbestille sin billet?" name="cancellable" >
          <UInput v-model="createSeasonFormState.ticketIsCancellableDaysBefore" type="number" />
        </UFormGroup>

        <UFormGroup label="Hvor mange minutter før fællespisning, skal man kunne ændre mellem spisesal og takeaway?" name="editable" >
          <UInput v-model="createSeasonFormState.diningModeIsEditableMinutesBefore" type="number" />
        </UFormGroup>


      </UForm>
    </template>
      <template #footer>
        <UButton
            type="submit"
            color="pink"
            icon="i-heroicons-calendar"
            :loading="creatingSeason"
        >
          Opret ny sæson!
        </UButton>
      </template>
  </UCard>
</template>
