<script setup lang="ts">
import type { FormMode } from '@/types/form'
import {FORM_MODES} from "@/types/form"
import {ADMIN_HELP_TEXTS} from "~/config/help-texts";

const store = usePlanStore()
const {loadSeasons} = store
loadSeasons()

const formMode = ref<FormMode>(FORM_MODES.VIEW)
const selectedStep = ref<number>(1)

const showCreateSeason = () => {
  console.log('Show Not implemented yet')
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
        <AdminSeason />
      </template>

<template #footer>
  <UButton @click="showCreateSeason" class="m-4 " color="pink" size="lg" variant="soft"
           icon="i-pajamas-admin">
    Opret Fællesspisningssæson
  </UButton>
</template>
    </UCard>


</template>
