<script setup lang="ts">
import {FORM_MODES} from "~/types/form"
import type {Season} from "~/composables/useSeasonValidation"

const {getDefaultSeason, getDefaultHolidays} = useSeason()
const store = usePlanStore()
const {
  isSeasonsLoading,
  isSelectedSeasonLoading,
  isNoSeasons,
  selectedSeason,
  activeSeason,
  seasons,
  disabledModes
} = storeToRefs(store)
const {createSeason, updateSeason, generateDinnerEvents, onSeasonSelect} = store

// FORM MANAGEMENT - Delegated to composable (ADR-007)
const {formMode, currentModel, onModeChange} = useEntityFormManager<Season>({
  getDefaultEntity: getDefaultSeason,
  selectedEntity: computed(() => selectedSeason.value)
})

// SEASON SELECTION MANAGEMENT - delegated to composable (ADR-007)
const selectedSeasonId = computed(() => selectedSeason.value?.id)
const {onSeasonChange, season} = useSeasonSelector({
  seasons: computed(() => seasons.value),
  selectedSeasonId,
  activeSeason: computed(() => activeSeason.value),
  onSeasonSelect: store.onSeasonSelect
})

const handleSeasonChange = (id: number) => {
  const seasonObject = seasons.value.find(s => s.id === id)
  if (seasonObject) {
    season.value = seasonObject.shortName
  }
}

// REACTIVE HOLIDAY CALCULATION
// When season dates change in create mode, auto-calculate holidays
watch(
    () => currentModel.value?.seasonDates,
    (newDates) => {
      if (!newDates || !currentModel.value || formMode.value !== FORM_MODES.CREATE) return
      currentModel.value.holidays = getDefaultHolidays(newDates)
    },
    {deep: true, immediate: true}
)


const showAdminSeason = computed(() => {
  return !isSelectedSeasonLoading.value && (!isNoSeasons.value || formMode.value === FORM_MODES.CREATE) && currentModel.value
})

// UTILITY
const showSuccessToast = (title: string, description?: string) => {
  const toast = useToast()
  toast.add({
    title,
    description,
    icon: 'i-heroicons-check-circle',
    color: 'success'
  })
}

// SEASON-SPECIFIC BUSINESS LOGIC
const handleSeasonUpdate = async (updatedSeason: Season) => {
  if (formMode.value === FORM_MODES.CREATE) {
    // Step 1: Create season
    const createdSeason = await createSeason(updatedSeason)

    // Step 2: Generate dinner events for the new season
    if (createdSeason.id) {
      try {
        const eventResult = await generateDinnerEvents(createdSeason.id)
        showSuccessToast('Sæson oprettet', `${eventResult.eventCount} fællesspisninger genereret`)
      } catch (eventError) {
        // Season created but event generation failed
        showSuccessToast('Sæson oprettet', 'Fællesspisninger kunne ikke genereres automatisk')
      }
    }
  } else if (formMode.value === FORM_MODES.EDIT && updatedSeason.id) {
    await updateSeason(updatedSeason)
    showSuccessToast('Sæson opdateret')
  }
  await onModeChange(FORM_MODES.VIEW)

}

const handleCancel = async () => {
  await onModeChange(FORM_MODES.VIEW)
}

</script>

<template>

  <UCard
      data-test-id="admin-planning"
      class="w-full px-0"
  >
    <template #header>
      <div class=" flex flex-col md:flex-row items-center justify-between w-full gap-4">
        <!-- Left aligned on mobile, spread across on desktop -->
        <div class="w-full md:w-auto flex flex-row items-center gap-2">
          <SeasonSelector
              :model-value="selectedSeasonId"
              @update:model-value="handleSeasonChange"
              :seasons="seasons"
              :loading="isSeasonsLoading"
              class="w-full md:w-auto"
              :disabled="disabledModes.includes(FORM_MODES.CREATE)"
          />
          <FormModeSelector v-model="formMode" :disabled-modes="disabledModes"/>
        </div>
      </div>
    </template>
    <template #default>
      <div v-if="showAdminSeason">
        <AdminPlanningSeason v-if="currentModel && showAdminSeason"
                             v-model="currentModel"
                             :mode="formMode"
                             @update="handleSeasonUpdate"
                             @cancel="handleCancel"
        />
      </div>
      <Loader v-else-if="isSelectedSeasonLoading" text="Henter data for fællesspisningssæson"/>
      <div v-else-if="isNoSeasons"
           class="flex flex-col items-center justify-center space-y-4">
        <h3 class="text-lg font-semibold">Her ser lidt tomt ud! </h3>
        <UButton v-if="!disabledModes.includes(FORM_MODES.CREATE)"
                 name="create-new-season"
                 color="secondary"
                 icon="i-heroicons-plus-circle"
                 @click="onModeChange(FORM_MODES.CREATE)"
        >
          Opret ny sæson
        </UButton>
        <p>DDin administrator om at oprette en fællespisningsæson.</p>
      </div>
      <div v-else>
        <h3 class="text-lg font-semibold">Vælg en sæson for at komme i gang</h3>
      </div>
    </template>
  </UCard>

</template>
