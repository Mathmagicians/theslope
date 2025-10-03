<script setup lang="ts">
import {FORM_MODES} from "~/types/form"
import {ADMIN_HELP_TEXTS} from "~/config/help-texts"
import type {Season} from "~/composables/useSeasonValidation"

const store = usePlanStore()
const {
  formMode,
  isLoading,
  isNoSeasons,
  selectedSeason,
  seasons,
  disabledModes,
  getModel
} = storeToRefs(store)
const {init, createSeason, updateSeason, loadSeasons, onSeasonSelect, onModeChange} = store

const route = useRoute()
const router = useRouter()

// STATE
const selectedStep = ref<number>(1)

// COMPUTED
const showAdminSeason = computed(() => {
  console.log('📆 > AdminPlanning > showAdminSeason > state:',
      'formMode:', formMode.value,
      'isLoading:', isLoading.value,
      'isNoSeasons:', isNoSeasons.value,
      'getModel exists:', !!getModel.value)
  return !isLoading.value && (!isNoSeasons.value || formMode.value === FORM_MODES.CREATE) && getModel.value
})

//HANDLING STATE CHANGE
const handleSeasonUpdate = async (updatedSeason: Season) => {
  try {
    // Determine if we're creating a new season or updating an existing one
    if (formMode.value === FORM_MODES.CREATE) {
      await createSeason(updatedSeason)
      // After successful creation, switch to view mode and refresh the seasons list
      await loadSeasons()
    } else if (formMode.value === FORM_MODES.EDIT && updatedSeason.id) {
      await updateSeason(updatedSeason)
      // After successful update, switch to view mode and refresh the seasons list
      await loadSeasons()
    }
  } catch (error) {
    console.error('ADMIN PLANNING > Failed to update season:', error)
    // Here you could show an error notification to the user
  }
}

const handleCancel = async () => {
  console.info('AdminPlanning > handleCancel > resetting to default form mode and clearing draft')
  // Reset to default form mode which will trigger the watcher on formMode
  // The watcher will call onModeChange which handles draft clearing
  await onModeChange(FORM_MODES.VIEW)
}

const updateURLQueryFromMode = (mode: FORM_MODES) => {
  console.log('📆 > AdminPlanning > updateURLfromMode > updating URL query with mode:', mode)
  router.replace({
    path: route.path,
    hash: route.hash, // Explicitly preserve the hash
    query: {
      ...route.query,
      mode: mode
    }
  }, {preserveState: true})
}

//INITIALIZATION
onMounted(async () => {
  // Get form mode from query params (before hash)
  const modeFromQuery = toFormMode(route.query.mode as string)
  console.log('📆 > AdminPlanning > onMounted > route.query:', route.query)
  console.info('📆 > AdminPlanning > onMounted > modeFromQuery:', modeFromQuery, 'route.query.mode:', route.query.mode)

  // Update form mode based on URL parameter if valid
  if (modeFromQuery) {
    await onModeChange(modeFromQuery)
  }
})

// Watch for form mode changes and update URL
watch(formMode, (newMode) => {
  // Only update if we're changing modes and not already matching the URL
  if (route.query.mode !== newMode && toFormMode(newMode)) {
    console.log('📆 > AdminPlanning > watch formMode > updating URL query with mode:', newMode)
    updateURLQueryFromMode(newMode)
  }
})

// UI STUFF

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
</script>

<template>

  <UCard
      data-test-id="admin-planning"
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
              :placeholder="seasons?.length>0  ? 'Vælg sæson' : 'Ingen sæsoner'"
              :items="seasons"
              option-attribute="shortName"
              value-attribute="id"
              @change="onSeasonSelect"
              model-value="selectedSeasonId"
          >
            <template #trailing>
              <UIcon name="i-heroicons-chevron-down-20-solid" class="w-5 h-5"/>
            </template>
          </USelect>
          <FormModeSelector v-model="formMode" :disabled-modes="disabledModes" @change="onModeChange"/>
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
      <div v-if="showAdminSeason">
        <AdminPlanningSeason v-if="getModel?.value && showAdminSeason"
                             v-model="getModel.value"
                             :mode="formMode"
                             @update="handleSeasonUpdate"
                             @cancel="handleCancel"
        />
      </div>
      <Loader v-else-if="isLoading" text="Fællesspisning Sæson"/>
      <div v-else-if="isNoSeasons"
           class="flex flex-col items-center justify-center space-y-4">
        <h3 class="text-lg font-semibold">Her ser lidt tomt ud! </h3>
        <UButton v-if="!disabledModes.includes(FORM_MODES.CREATE)"
                 name="create-new-season"
                 color="orange"
                 icon="i-heroicons-plus-circle"
                 @click="onModeChange(FORM_MODES.CREATE)"
        >
          Opret ny sæson
        </UButton>
        <p>Der er ingen sæsoner at vise. Bed din administrator om at oprette en fællespisningsæson.</p>
      </div>
      <div v-else>
        <h3 class="text-lg font-semibold">Vælg en sæson for at komme i gang</h3>
      </div>
    </template>

    <template #footer>
    </template>
  </UCard>

</template>
