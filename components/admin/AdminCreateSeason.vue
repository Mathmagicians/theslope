<script setup lang="ts">
    import {SeasonSchema} from "~/prisma/generated/zod"
    import type {FormSubmitEvent} from "#ui/types"

    const store = usePlanStore()
    const {creatingSeason} = storeToRefs(store)
    const appConfig = useAppConfig()
    const theslopeDefaults = appConfig.theslope
    const thisYear = new Date().getFullYear()

    const initialSeasonFormStateValues = {
      startDate: calculateDayFromWeekNumber(0, theslopeDefaults.defaultSeason.startWeek,thisYear),
      endDate: calculateDayFromWeekNumber(4, theslopeDefaults.defaultSeason.endWeek,thisYear),
      cookingDays: theslopeDefaults.cookingDays,
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

    const onSubmitCreateSeason = (event: FormSubmitEvent<SeasonSchema>) =>  {
      console.info( '📆 > AdminCreateSeason > onSubmit', event)
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
      <UForm :schema="SeasonSchema" :state="createSeasonFormState" class="space-y-4" @submit.prevent="onSubmitCreateSeason">
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
