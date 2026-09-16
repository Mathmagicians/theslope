<!--
UX MOCKUP: /admin/planning card (signed off 2026-09-16) - composition only.
The season form draws its own layout in AdminPlanningSeason.vue.

DESKTOP                                                  MOBILE (<md)
┌ UCard admin-planning ────────────────────────────────┐ ┌────────────────────────┐
│ [Sæson ▾ 08/26-07/27]           [＋ Opret sæson]     │ │ [Sæson ▾ 08/26-07/27]  │ stacked,
│                                                      │ │ [＋ Opret sæson]       │ full width
│ ┌ SeasonStatusDisplay ─────────────────────────────┐ │ │ ┌ SeasonStatusDisplay ┐│ (LAYOUTS
│ │ 🟢 Aktiv sæson …   [✕ Deaktiver Sæson] (in edit) │ │ │ └─────────────────────┘│  .cardActionRow
│ └──────────────────────────────────────────────────┘ │ │ ┌ AdminPlanningSeason ┐│  / …Button)
│ ┌ AdminPlanningSeason ─────────────────────────────┐ │ │ └─────────────────────┘│
│ └──────────────────────────────────────────────────┘ │ └────────────────────────┘
└──────────────────────────────────────────────────────┘

No seasons at all: AdminToCreateSeason. None selected: ALERTS.emptyState "Her ser lidt tomt ud!".
"Opret sæson" is disabled while CREATE is in disabledModes; members see neither ＋ nor ✏.
After Gem on the live season the toast reads "Sæson opdateret — 3 datoer tilføjet, 1 fjernet.
Forudbestillinger er opdateret. Husk at tildele madhold til nye datoer."
Removed here: FormModeSelector [👁][✏️][＋] (kept on Teams). No 🗑 for seasons.
-->

<script setup lang="ts">
import {FORM_MODES} from "~/types/form"
import type {Season, SeasonUpdateResponse} from "~/composables/useSeasonValidation"

// Props - canEdit from parent for authorization
interface Props {
  canEdit?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  canEdit: false
})

const {ALERTS, BUTTONS, COLOR, ICONS, LAYOUTS} = useTheSlopeDesignSystem()
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

const canEditSeason = computed(() => props.canEdit && !disabledModes.value.includes(FORM_MODES.EDIT))

// UTILITY
const showSuccessToast = (title: string, description?: string) => {
  toast.add({
    title,
    description,
    icon: ICONS.checkCircle,
    color: COLOR.success
  })
}

// Report what the save set in motion: reconciled dates, and on the live season the re-scaffolding
const describeSeasonUpdate = (result: SeasonUpdateResponse): string => {
  const {created, deleted} = result.reconciliation
  const sentences = [`${created} datoer tilføjet, ${deleted} fjernet.`]
  if (result.scaffold) sentences.push('Forudbestillinger er opdateret.')
  if (created > 0) sentences.push('Husk at tildele madhold til nye datoer.')
  return sentences.join(' ')
}

// SEASON-SPECIFIC BUSINESS LOGIC
const handleSeasonUpdate = async (updatedSeason: Season) => {
  if (formMode.value === FORM_MODES.CREATE) {
    // Create season (PUT auto-generates dinner events per ADR-015)
    const createdSeason = await createSeason(updatedSeason)
    if (!createdSeason) return
    showSuccessToast('Sæson oprettet')
  } else if (formMode.value === FORM_MODES.EDIT && updatedSeason.id) {
    // Update season (POST reconciles dinner events and re-scaffolds the live season per ADR-015)
    const result = await updateSeason(updatedSeason)
    if (!result) return
    showSuccessToast('Sæson opdateret', describeSeasonUpdate(result))
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
      <div :class="LAYOUTS.cardActionRow">
        <SeasonSelector
            :model-value="selectedSeasonId"
            :seasons="seasons"
            :loading="isSeasonsLoading"
            class="w-full md:w-auto"
            :disabled="disabledModes.includes(FORM_MODES.CREATE)"
            @update:model-value="handleSeasonChange"
        />
        <UButton
            v-if="props.canEdit"
            v-bind="BUTTONS.primaryAction"
            :class="LAYOUTS.cardActionButton"
            :color="COLOR.primary"
            :icon="ICONS.plusCircle"
            :disabled="disabledModes.includes(FORM_MODES.CREATE)"
            data-testid="create-season"
            @click="onModeChange(FORM_MODES.CREATE)">
          Opret sæson
        </UButton>
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
                             :can-edit="canEditSeason"
                             @update="handleSeasonUpdate"
                             @cancel="handleCancel"
                             @edit="onModeChange(FORM_MODES.EDIT)"
        />
      </div>
      <Loader v-else-if="isSelectedSeasonLoading" text="Henter data for fællesspisningssæson"/>
      <AdminToCreateSeason v-else-if="isNoSeasons" :can-edit="props.canEdit"/>
      <UAlert
          v-else
          v-bind="ALERTS.emptyState"
          :avatar="{text: '💤'}"
          title="Her ser lidt tomt ud!"
          description="Vælg en fællesspisningssæson for at komme i gang"/>
    </template>
  </UCard>

</template>
