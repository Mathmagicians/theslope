<script setup lang="ts">
import {FORM_MODES} from "~/types/form"
import {ADMIN_HELP_TEXTS} from "~/config/help-texts"
import type {Season} from "~/composables/useSeasonValidation"

const {getDefaultSeason, getDefaultHolidays} = useSeason()
const store = usePlanStore()
const {
  isLoading,
  isNoSeasons,
  selectedSeason,
  seasons,
  disabledModes
} = storeToRefs(store)
const {createSeason, updateSeason, generateDinnerEvents, onSeasonSelect} = store

// FORM MANAGEMENT - Delegated to composable (ADR-007)
const { formMode, currentModel, onModeChange } = useEntityFormManager<Season>({
  getDefaultEntity: getDefaultSeason,
  selectedEntity: computed(() => selectedSeason.value)
})

// REACTIVE HOLIDAY CALCULATION
// When season dates change in create mode, auto-calculate holidays
watch(
  () => currentModel.value?.seasonDates,
  (newDates) => {
    if (!newDates || !currentModel.value || formMode.value !== FORM_MODES.CREATE) return
    currentModel.value.holidays = getDefaultHolidays(newDates)
  },
  { deep: true, immediate: true }
)

// COMPUTED
const selectedSeasonId = computed({
  get: () => selectedSeason.value?.id ?? undefined,
  set: (id: number | undefined) => {
    if (id) {
      onSeasonSelect(id)
    }
  }
})

const showAdminSeason = computed(() => {
  return !isLoading.value && (!isNoSeasons.value || formMode.value === FORM_MODES.CREATE) && currentModel.value
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
  try {
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
  } catch (error) {
    // Season creation or update failed - stay in current mode
    // Error toast already shown by handleApiError
  }
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
      <div class=" flex flex-col md:flex-row items-center justify-between w-full gap-4
  ">
        <!-- Left aligned on mobile, spread across on desktop -->
        <div class="w-full md:w-auto flex flex-row items-center gap-2">
          <USelect
              arrow
              data-testid="season-selector"
              v-model="selectedSeasonId"
              color="warning"
              :loading="isLoading"
              :placeholder="seasons?.length > 0 ? 'Vælg sæson' : 'Ingen sæsoner'"
              :items="seasons?.map(s => ({ ...s, label: s.shortName }))"
              value-key="id"
          >
          </USelect>
          <FormModeSelector v-model="formMode" :disabled-modes="disabledModes" @change="onModeChange"/>
        </div>
        <div class="w-full md:w-auto md:ml-auto">
          <HelpButton :text="ADMIN_HELP_TEXTS.planning.calendar"/>
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
      <Loader v-else-if="isLoading" text="Loader data for fællesspisningssæsonen"/>
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
        <p>Der er ingenting at vise. Bed din administrator om at oprette en fællespisningsæson.</p>
      </div>
      <div v-else>
        <h3 class="text-lg font-semibold">Vælg en sæson for at komme i gang</h3>
      </div>
    </template>
  </UCard>

</template>
