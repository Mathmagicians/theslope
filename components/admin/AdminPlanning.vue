<script setup lang="ts">
import type {FormMode} from '@/types/form'
import {FORM_MODES} from "@/types/form"
import {ADMIN_HELP_TEXTS} from "~/config/help-texts";
import type {Season} from "~/composables/useSeason";

const authStore = useAuthStore()
const {isAdmin} = storeToRefs(authStore)

const store = usePlanStore()
const {isLoading, isNoSeasons, selectedSeason, draftSeason, seasons} = storeToRefs(store)
const {loadSeasons} = store

const {getDefaultSeason} = useSeason()

// RETRIEVE DATA FROM STORE
await loadSeasons()


// STATE
const selectedStep = ref<number>(1)

// COMPUTED
const defaultFormMode = (): FormMode | undefined => {
  if (!isNoSeasons.value && !disabledModes.value.includes(FORM_MODES.VIEW)) {
    return FORM_MODES.VIEW
  } else if (isNoSeasons.value && !disabledModes.value.includes(FORM_MODES.CREATE)) {
    return FORM_MODES.CREATE
  } else {
    return undefined
  }
}

const disabledModes = computed(() => {
  const disabledSet: Set<FormMode> = new Set()
  if (isNoSeasons.value) {
    disabledSet.add(FORM_MODES.EDIT)
    disabledSet.add(FORM_MODES.VIEW)
  }
  if (!isAdmin.value) {
    disabledSet.add(FORM_MODES.CREATE)
    disabledSet.add(FORM_MODES.EDIT)
  }
  return [...disabledSet]
})

//STATE PART II - thanks to BLOCK TYPESCRIPT DECLARATION RULES
const formMode = ref<FormMode | undefined>(defaultFormMode())

//HANDLING STATE CHANGE
const onCreateSeason = () => {
  draftSeason.value = getDefaultSeason()
  return draftSeason
}

const onEditSeason = () => {
  draftSeason.value = copySeason(selectedSeason.value)
  return draftSeason
}
const onViewSeason = () => selectedSeason

const getModelForAdminSeason = computed(() => {
  switch (formMode.value) {
    case FORM_MODES.CREATE:
      return onCreateSeason()
    case FORM_MODES.EDIT:
      return onEditSeason()
    case FORM_MODES.VIEW:
      return onViewSeason()
    default:
      console.warn("AdminPlanning > Get model for admin season - invalid form mode", formMode.value)
      return selectedSeason
  }
})


  const showAdminSeason = computed(()  =>
      !isLoading.value && (!isNoSeasons.value || formMode.value === FORM_MODES.CREATE))


  const handleSeasonUpdate = (updatedSeason: Season) => {
    // Handle season updates from child component
    console.warn("AdminPlanning > handleSeasonUpdate - not implemented", updatedSeason, draftSeason.value)
  }

  const items = [
    {
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
    }
  ]

  const seasonItems = computed(() => seasons.value?.map(s => s.shortName) ?? [])
</script>

<template>

  <UCard
      class="w-full px-0"
      :ui="{
    base: '',
    body: {
      padding: 'px-0',
      base: ''
    },
    header: {
      padding: 'px-0',
      base: ''
    },
    footer: {
      padding: 'px-0',
      base: ''
    }}"
  >
    <template #header>
      <div class=" flex flex-col md:flex-row items-center justify-between w-full gap-4
  ">
        <!-- Left aligned on mobile, spread across on desktop -->
        <div class="w-full md:w-auto flex flex-row items-center gap-2">
          <USelect
              color="orange"
              :loading="isLoading"
              :placeholder="seasonItems?.length>0  ? 'Vælg sæson' : 'Ingen sæsoner'"
              :options="seasonItems"
          >
            <template #trailing>
              <UIcon name="i-heroicons-chevron-down-20-solid" class="w-5 h-5"/>
            </template>
          </USelect>
          <FormModeSelector v-model="formMode" :steps="items" :disabled-modes="disabledModes"/>
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
      <AdminSeason v-if="showAdminSeason"
                   :v-model="getModelForAdminSeason"
                   :mode="formMode"
                   @update="handleSeasonUpdate"
      />
      <Loader v-else-if="isLoading" text="Fællesspisning Sæson">

      </Loader>
      <div v-else
           class="flex flex-col items-center justify-center space-y-4">
        <h3 class="text-lg font-semibold">Her ser lidt tomt ud! </h3>
        <UButton v-if="!disabledModes.includes(FORM_MODES.CREATE)"
                 color="orange"
                 icon="i-heroicons-plus-circle"
                 @click="onCreateSeason"
        >
          Opret ny sæson
        </UButton>
        <p>Der er ingen sæsoner at vise. Bed din administrator om at oprette en fællespisningsæson.</p>
      </div>
    </template>

    <template #footer>
    </template>
  </UCard>

</template>
