<!--
UX MOCKUP: Admin Planning with Active Season Management

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VIEWING ACTIVE SEASON (Forår 2025)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

│ Vis fællesspisning sæson                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 🟢 AKTIV SÆSON                                                │  │
│  │ Denne sæson er synlig for alle beboere og kan bookes         │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Sæson: [Forår 2025]        Periode: 01/01/2025 - 30/06/2025       │
│  ...                                                                 │
│                                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                         [Edit]        │
└─────────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VIEWING FUTURE SEASON (Efterår 2025)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

│ Vis fællesspisning sæson                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ ⏳ FREMTIDIG SÆSON                                            │  │
│  │ Denne sæson starter om 45 dage. Kun synlig for admins.       │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Sæson: [Efterår 2025]      Periode: 01/08/2025 - 31/12/2025       │
│  ...                                                                 │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ 💡 Gør denne sæson aktiv?                                     │ │
│  │                                                                │ │
│  │ Når du aktiverer denne sæson:                                 │ │
│  │ • Beboere kan se og booke fællesspisninger                    │ │
│  │ • Nuværende aktive sæson (Forår 2025) deaktiveres            │ │
│  │                                                                │ │
│  │                   [✓ Aktiver denne sæson]                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                         [Edit]        │
└─────────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VIEWING PAST SEASON (Efterår 2024)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

│ Vis fællesspisning sæson                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 📁 ARKIVERET SÆSON                                            │  │
│  │ Denne sæson er afsluttet. Kun synlig for admins.             │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Sæson: [Efterår 2024]      Periode: 01/08/2024 - 31/12/2024       │
│  ...                                                                 │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ ℹ️  Arkiverede sæsoner                                         │ │
│  │                                                                │ │
│  │ Gamle sæsoner kan ikke genaktiveres. De bevares til           │ │
│  │ regnskab og historik.                                         │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                         [Edit]        │
└─────────────────────────────────────────────────────────────────────┘
-->

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
const selectedSeasonId = computed(() => selectedSeason.value?.id ?? null)
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
        <!-- Season Status Display -->
        <SeasonStatusDisplay
            v-if="selectedSeason && formMode === FORM_MODES.VIEW"
            :season="selectedSeason"
            :show-activation-button="true"
            @activate="() => console.log('TODO: Implement activation')"
            class="mb-6"
        />

        <AdminPlanningSeason v-if="currentModel && showAdminSeason"
                             v-model="currentModel"
                             :mode="formMode"
                             @update="handleSeasonUpdate"
                             @cancel="handleCancel"
        />
      </div>
      <Loader v-else-if="isSelectedSeasonLoading" text="Henter data for fællesspisningssæson"/>
      <AdminToCreateSeason v-else-if="isNoSeasons"/>
      <UAlert v-else
          :avatar="{text: '💤'}"
          color="info" class="space-y-4"
          title="Her ser lidt tomt ud!"
          description="Vælg en fællesspisningssæson for at komme i gang">
      </UAlert>
    </template>
  </UCard>

</template>
