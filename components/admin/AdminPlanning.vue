<script setup lang="ts">
import type { FormMode } from '@/types/form'
import {FORM_MODES} from "@/types/form"
import {ADMIN_HELP_TEXTS} from "~/config/help-texts";
import type {Season} from "~/composables/useSeason";

const store = usePlanStore()
const {loadSeasons} = store
const { getDefaultSeason } = useSeason()

// RETRIEVE DATA FROM STORE
await loadSeasons()

// STATE
const formMode = ref<FormMode>(FORM_MODES.VIEW)
const selectedStep = ref<number>(1)
const currentSeason = ref<Season>(getDefaultSeason()) //initialize state with default values

const onCreateSeason = () => {
  currentSeason.value = getDefaultSeason()
  formMode.value = FORM_MODES.CREATE
}

const onEditSeason = (season: Season) => {
  currentSeason.value = season
  formMode.value = FORM_MODES.EDIT
}

const onViewSeason = (season: Season) => {
  currentSeason.value = season
  formMode.value = FORM_MODES.VIEW
}

//TODO we need to have a USelectMenu to select the season to view/ edit, and a ref to hold the selected season

const handleSeasonUpdate = (updatedSeason: Season) => {
  // Handle season updates from child component
  currentSeason.value = updatedSeason
}

const items = [{
  label: 'Kalender',
  icon: 'i-heroicons-calendar',
},
  {
    label: 'Madhold',
    icon: 'i-fluent-mdl2-team-favorite',
  },
  {
    label: 'Chefkokke',
    icon: 'i-streamline-food-kitchenware-chef-toque-hat-cook-gear-chef-cooking-nutrition-tools-clothes-hat-clothing-food',
  }]
</script>

<template>

    <UCard>
      <template #header>
        <div class="flex flex-col md:flex-row items-center justify-between w-full gap-4">
          <!-- Left aligned on mobile, spread across on desktop -->
          <div class="w-full md:w-auto">
            <FormModeSelector v-model="formMode" :steps="items"/>
          </div>
          <div class="w-full md:w-auto md:mx-auto">
            <FormStepper :steps="items" v-model="selectedStep"/>
          </div>
          <div class="w-full md:w-auto md:ml-auto">
            <HelpButton :text="ADMIN_HELP_TEXTS.planning.calendar"/>
          </div>
        </div>
      </template>
      <template #default>
        <AdminSeason
          v-model="currentSeason"
          :mode="formMode"
          @update="handleSeasonUpdate"
        />
      </template>

<template #footer>
</template>
    </UCard>

</template>
