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

// Props - canEdit from parent for authorization
interface Props {
  canEdit?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  canEdit: false
})

const {ALERTS} = useTheSlopeDesignSystem()
const {getDefaultSeason, getDefaultHolidays} = useSeason()
const toast = useToast()
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
const {createSeason, updateSeason, activateSeason, deactivateSeason} = store

// FORM MANAGEMENT - Delegated to composable (ADR-007)
const {formMode, currentModel, onModeChange} = useEntityFormManager<Season>({
  getDefaultEntity: getDefaultSeason,
  selectedEntity: computed(() => selectedSeason.value)
})

// SEASON SELECTION MANAGEMENT - delegated to composable (ADR-007)
const selectedSeasonId = computed(() => selectedSeason.value?.id ?? null)
const {season} = useSeasonSelector({
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
    // Create season (PUT auto-generates dinner events per ADR-015)
    const createdSeason = await createSeason(updatedSeason)
    if (!createdSeason) return
    showSuccessToast('Sæson oprettet')
  } else if (formMode.value === FORM_MODES.EDIT && updatedSeason.id) {
    // Update season (POST reconciles dinner events if schedule changed per ADR-015)
    await updateSeason(updatedSeason)
    showSuccessToast('Sæson opdateret')
  }
  await onModeChange(FORM_MODES.VIEW)
}

const handleCancel = async () => {
  await onModeChange(FORM_MODES.VIEW)
}

const handleActivateSeason = async () => {
  if (!selectedSeason.value?.id) return

  try {
    await activateSeason(selectedSeason.value.id)
    showSuccessToast('Sæson aktiveret', `${selectedSeason.value.shortName} er nu den aktive sæson`)
  } catch (error) {
    console.error('Failed to activate season:', error)
  }
}

const handleDeactivateSeason = async () => {
  try {
    await deactivateSeason()
    showSuccessToast('Sæson deaktiveret', 'Der er nu ingen aktiv sæson')
  } catch (error) {
    console.error('Failed to deactivate season:', error)
  }
}

</script>

<template>

  <UCard
      data-testid="admin-planning"
      class="w-full px-0"
  >
    <template #header>
      <div class=" flex flex-col md:flex-row items-center justify-between w-full gap-4">
        <!-- Left aligned on mobile, spread across on desktop -->
        <div class="w-full md:w-auto flex flex-row items-center gap-2">
          <SeasonSelector
              :model-value="selectedSeasonId"
              :seasons="seasons"
              :loading="isSeasonsLoading"
              class="w-full md:w-auto"
              :disabled="disabledModes.includes(FORM_MODES.CREATE)"
              @update:model-value="handleSeasonChange"
          />
          <FormModeSelector v-if="props.canEdit" v-model="formMode" :disabled-modes="disabledModes"/>
        </div>
      </div>
    </template>
    <template #default>
      <div v-if="showAdminSeason">
        <!-- Season Status Display - Show in view and edit modes, not create -->
        <SeasonStatusDisplay
            v-if="selectedSeason && (formMode === FORM_MODES.VIEW || formMode === FORM_MODES.EDIT)"
            :season-id="selectedSeason.id ?? null"
            :show-activation-button="props.canEdit && formMode === FORM_MODES.EDIT"
            class="mb-6"
            @activate="handleActivateSeason"
            @deactivate="handleDeactivateSeason"
        />

        <AdminPlanningSeason
v-if="currentModel && showAdminSeason"
                             v-model="currentModel"
                             :mode="formMode"
                             @update="handleSeasonUpdate"
                             @cancel="handleCancel"
        />
      </div>
      <Loader v-else-if="isSelectedSeasonLoading" text="Henter data for fællesspisningssæson"/>
      <AdminToCreateSeason v-else-if="isNoSeasons"/>
      <UAlert
          v-else
          v-bind="ALERTS.emptyState"
          :avatar="{text: '💤'}"
          title="Her ser lidt tomt ud!"
          description="Vælg en fællesspisningssæson for at komme i gang"/>
    </template>
  </UCard>

</template>
