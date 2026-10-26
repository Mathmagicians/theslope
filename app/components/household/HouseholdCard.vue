<script setup lang="ts">
/**
 * HouseholdCard - the inhabitants and their settings - especially weekly dinner preferences
 *
 * Expandable table pattern with power mode:
 * - Power row (first row): Updates all the household's inhabitants at once with ⚡ icon
 * - Collapsed row: Shows ticket type, name, preferences as VIEW badges with ✏️ icon
 * - Expanded row: WeekDayMapDinnerModeDisplay in EDIT mode (button groups)
 * - Only one row can be expanded at a time
 * - Changes save immediately
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ UCARD                                                                   │
 * │ ┌─────────────────────────────────────────────────────────────────────┐ │
 * │ │ HEADER: Husstandens ugentlige booking præferencer                   │ │
 * │ └─────────────────────────────────────────────────────────────────────┘ │
 * │ ┌─────────────────────────────────────────────────────────────────────┐ │
 * │ │ BODY                                                                │ │
 * │ │                                                                     │ │
 * │ │ UTable - Inhabitants with expandable rows                          │ │
 * │ │ ┌───────────────────────────────────────────────────────────────┐  │ │
 * │ │ │ [⚡] Powermode! 👥👥👥 Alle medlemmer  🍽️ 🍽️ 🍽️ 🍽️ 🛍️   │  │ │  ← Power mode
 * │ │ ├───────────────────────────────────────────────────────────────┤  │ │
 * │ │ │ [✏️] Voksen  👤 Anna      🍽️ 🍽️ 🍽️ 🍽️ 🛍️   ← collapsed      │  │ │
 * │ │ ├───────────────────────────────────────────────────────────────┤  │ │
 * │ │ │ [✏️] Voksen  👤 Bob      🍽️ 🍽️ ❌ 🍽️ 🛍️   ← collapsed      │  │ │
 * │ │ ├───────────────────────────────────────────────────────────────┤  │ │
 * │ │ │ [✏️] Barn    👤 Clara    🍽️ 🍽️ 🍽️ 🍽️ 🛍️   ← collapsed      │  │ │
 * │ │ ├───────────────────────────────────────────────────────────────┤  │ │
 * │ │ │ [✏️] Baby    👤 David    ❌ ❌ ❌ ❌ ❌       ← collapsed      │  │ │
 * │ │ └───────────────────────────────────────────────────────────────┘  │ │
 * │ └─────────────────────────────────────────────────────────────────────┘ │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * EXPANDED (one inhabitant):
 * ┌───────────────────────────────────────────────────────────────┐
 * │ [▼] Voksen  👤 Anna                                          │
 * │ ──────────────────────────────────────────────────────────── │
 * │  EXPANDED:                                                   │
 * │  Mon: [🍽️ Spis][🕐 Sen][🛍️ Take][❌ Ingen]   ← button groups │
 * │  Tue: [🍽️ Spis][🕐 Sen][🛍️ Take][❌ Ingen]                 │
 * │  Wed: [🍽️ Spis][🕐 Sen][🛍️ Take][❌ Ingen]                 │
 * │  Thu: [🍽️ Spis][🕐 Sen][🛍️ Take][❌ Ingen]                 │
 * │  Fri: [🍽️ Spis][🕐 Sen][🛍️ Take][❌ Ingen]                 │
 * │  (Active: solid success/warning/primary, Inactive: ghost)    │
 * │  (NONE: active=ghost error, inactive=ghost neutral)          │
 * └───────────────────────────────────────────────────────────────┘
 *
 * PREVIEW above the buttons while the draft differs from the saved preferences: the server's dry run of the save, one
 * person or every member in power mode, through ActionPreview (a day per dinner); the loader while it works:
 *
 * One person
 *  Opdater fællesspisning præferencer for Knud
 *  Man [Spis][Sen][Take][Ingen]  Tir [...]  Ons [...]  Tor [...]
 *  (ticket) Du er ved at ændre familiens booking
 *  ── ti 20/10/2026 ──────────────────────────────
 *     [released badge]  Knud frigiver sin billet
 *  ── ti 27/10/2026 ──────────────────────────────
 *     [edit badge]      Knud ændrer spisemåde til Takeaway
 *  ── ma 02/11/2026 ──────────────────────────────
 *     [cancel badge]    Knud frameldes
 *                                                    [Annuller] [Gem]
 *
 * Power mode
 *  Power mode: Opdater præferencer for hele husstanden
 *  (warning) Du er ved at aktivere power mode ...
 *  Man [Spis][Sen][Take][Ingen]  Tir [...]  Ons [...]  Tor [...]
 *  (ticket) Du er ved at ændre familiens booking
 *  ── ti 20/10/2026 ──────────────────────────────
 *     [released badge]  Lene frigiver sin billet
 *  ── ma 02/11/2026 ──────────────────────────────
 *     [cancel badge]    Knud frameldes
 *     [cancel badge]    Lene frameldes
 *                                            [Annuller] [Gem for alle]
 *
 * While the preview loads
 *  Man [Spis][Sen][Take][Ingen]  Tir [...]  Ons [...]  Tor [...]
 *       (sync, spinning)  Prøver at beregne hvad I skal spise hvornår...
 *                                                    [Annuller] [Gem]
 *
 * Legend:
 * - ⚡ = Power mode (update all inhabitants)
 * - 👥👥👥 = The members' faces: three, then the overflow count, so the table fits a phone
 * - ✏️ = Pencil icon (edit one inhabitant)
 * - ▼ = Chevron down (expanded row - click to collapse)
 * - 🍽️🕐🛍️❌ = Compact badges (collapsed VIEW mode)
 * - [Button] = Button groups (expanded EDIT mode)
 *
 * Visual check: /household/<S>/members at 375px and desktop, closed, one person open with a preview, power mode open
 * with a preview: the table and the editor stay inside the width and the page does not scroll sideways.
 */
import {FORM_MODES} from '~/types/form'
import type {HouseholdDetail} from '~/composables/useCoreValidation'
import {WEEKDAYS, type WeekDayMap} from '~/types/dateTypes'
import type {DinnerMode} from '~/composables/useBookingValidation'
import type {TicketPresentation} from '~/composables/useBookingUi'

interface Props {
  household: HouseholdDetail
  canEdit?: boolean
  adminBypass?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canEdit: true,
  adminBypass: false
})

const householdsStore = useHouseholdsStore()
const {lastPreferenceResult} = storeToRefs(householdsStore)
const planStore = usePlanStore()
const {activeSeason} = storeToRefs(planStore)
// The order the preview, the toast and the "Sidste ændring" alert name the people in
const householdOrder = computed(() => props.household.inhabitants.map(({id}) => id))

const {computeAggregatedPreferences} = useHousehold()

const { WEEKDAY, COMPONENTS, COLOR, ICONS, BUTTONS, SIZES, ALERTS, NOISE, ORIENTATIONS, TABLE_COLUMNS } = useTheSlopeDesignSystem()
const { powerMode } = COMPONENTS

// No inhabitant has a negative id, so the power row's id never meets a person's
const POWER_ROW_ID = -1

// A row of the table: an inhabitant, or the power row that edits every member at once
interface PreferencesRow {
  id: number
  name: string
  dinnerPreferences: WeekDayMap<DinnerMode> | null
  ticketConfig: TicketPresentation
  consensus: WeekDayMap<boolean> | null
  isSynthetic: boolean
}

const tableData = computed((): PreferencesRow[] => {
  const inhabitants = props.household.inhabitants.map(({id, name, dinnerPreferences, birthDate}) => ({
    id,
    name,
    dinnerPreferences,
    ticketConfig: resolveTicketTypePresentation(birthDate ?? null, activeSeason.value?.ticketPrices),
    consensus: null,
    isSynthetic: false
  }))

  const {preferences, consensus} = computeAggregatedPreferences(props.household.inhabitants)
  const powerRow = {
    id: POWER_ROW_ID,
    name: 'Alle medlemmer',
    dinnerPreferences: preferences,
    ticketConfig: powerMode.ticketConfig,
    consensus,
    isSynthetic: true
  }

  return [powerRow, ...inhabitants]
})

const draftPreferences = ref<WeekDayMap<DinnerMode> | null>(null)
const editingInhabitantId = ref<number | null>(null)
const isSaving = ref(false)

const { expanded } = useExpandableRow({
  onExpand: (rowId) => {
    const row = tableData.value.find(candidate => rowIdOf(candidate) === rowId)
    if (row) {
      editingInhabitantId.value = row.id
      draftPreferences.value = row.dinnerPreferences
    }
  },
  onCollapse: () => {
    editingInhabitantId.value = null
    draftPreferences.value = null
  }
})

// The preview of Gem: the server's dry run of the draft for the person, or for every member in power mode
const previewRequest = computed(() => {
  const draft = draftPreferences.value
  const saved = tableData.value.find(row => row.id === editingInhabitantId.value)?.dinnerPreferences
  if (editingInhabitantId.value === null || !draft || WEEKDAYS.every(day => draft[day] === saved?.[day])) return null
  const inhabitantIds = editingInhabitantId.value === POWER_ROW_ID ? householdOrder.value : [editingInhabitantId.value]
  return {inhabitantIds, preferences: draft}
})
const {result: preview, pending: isPreviewPending} = useScaffoldPreview(
  () => previewRequest.value,
  ({inhabitantIds, preferences}) => householdsStore.previewPreferences(inhabitantIds, preferences)
)
const previewDays = computed(() => preview.value
  ? formatPreviewLines(preview.value, householdOrder.value)
  : [])

const toast = useToast()

const savePreferences = async () => {
  if (editingInhabitantId.value === null || !draftPreferences.value) return

  isSaving.value = true
  const isPowerMode = editingInhabitantId.value === POWER_ROW_ID

  try {
    const result = isPowerMode
      ? await householdsStore.updateAllInhabitantPreferences(props.household.id, draftPreferences.value, props.adminBypass)
      : await householdsStore.updateInhabitantPreferences(editingInhabitantId.value, draftPreferences.value, props.adminBypass)

    toast.add(scaffoldToast(isPowerMode ? 'Alle præferencer opdateret' : 'Præferencer opdateret', result, householdOrder.value))

    expanded.value = {}
    editingInhabitantId.value = null
    draftPreferences.value = null
  } catch (error) {
    console.error('🏠 > HOUSEHOLD_CARD > [savePreferences] Failed to update preferences', error)
    toast.add({
      title: 'Kunne ikke gemme',
      description: 'Der opstod en fejl. Prøv igen senere.',
      icon: ICONS.exclamationCircle,
      color: COLOR.error
    })
  } finally {
    isSaving.value = false
  }
}

const updateDraft = (preferences: WeekDayMap<DinnerMode>) => {
  draftPreferences.value = preferences
}

const visibleDays = computed(() => {
  const cookingDays = activeSeason.value?.cookingDays
  return cookingDays ? WEEKDAYS.filter(day => cookingDays[day]) : WEEKDAYS
})

// Table columns - 3 columns on mobile (toggle, name+ticket, modes), 4 on desktop
const columns = computed(() => [
  { id: 'expand' },
  { id: 'name', ...TABLE_COLUMNS.householdMemberName },
  { id: 'ticketType', ...TABLE_COLUMNS.householdTicketType },
  { id: 'preferences' }
])
</script>

<template>
  <UCard
data-testid="household-members" v-bind="COMPONENTS.householdAllergies.card">
    <template #header>
      <h3 :class="COMPONENTS.householdCard.title">Husstandens ugentlige booking præferencer</h3>
    </template>

    <div :class="COMPONENTS.householdCard.stack">
      <UTable
          v-model:expanded="expanded"
          :data="tableData"
          :columns="columns"
          :get-row-id="rowIdOf"
          :ui="COMPONENTS.table.householdPreferencesUi"
      >
        <template #expand-cell="{ row }">
          <UButton
              v-if="canEdit"
              v-bind="BUTTONS.edit"
              :icon="row.getIsExpanded() ? ICONS.chevronDown : (row.original.isSynthetic ? COMPONENTS.powerMode.buttonIcon : BUTTONS.edit.icon)"
              :aria-label="row.getIsExpanded() ? 'Luk' : (row.original.isSynthetic ? 'Power mode' : 'Rediger præferencer')"
              :data-testid="row.original.isSynthetic ? 'power-mode-toggle' : `inhabitant-${row.original.id}-edit-preferences`"
              :class="[
                COMPONENTS.openTurn(row.getIsExpanded()),
                row.original.isSynthetic && !row.getIsExpanded() && COMPONENTS.householdCard.powerToggleIdle
              ]"
              @click="row.toggleExpanded()"
          />
        </template>

        <template #ticketType-cell="{ row }">
          <div :class="COMPONENTS.householdCard.ticketDesktop">
            <UBadge
                :color="row.original.ticketConfig.color"
                :variant="NOISE.subtle"
                :size="SIZES.sm"
                :data-testid="`ticket-type-${row.original.id}`"
            >
              {{ row.original.ticketConfig.label }}
            </UBadge>
          </div>
        </template>

        <template #name-cell="{ row }">
          <div :class="COMPONENTS.householdCard.nameCell">
            <UserListItem
                v-if="row.original.isSynthetic"
                :inhabitants="household.inhabitants"
                compact
                :show-names="false"
                :max="COMPONENTS.avatar.powerRowMax"
                :ring-color="COLOR.warning"
                label="beboere"
            />
            <UserListItem
                v-else
                :inhabitants="household.inhabitants.find(i => i.id === row.original.id) ?? household.inhabitants[0]!"
                compact
                :ring-color="COLOR.primary"
            />
            <UBadge
                :class="COMPONENTS.householdCard.ticketPhone"
                :color="row.original.ticketConfig.color"
                :variant="NOISE.subtle"
                :size="SIZES.xs"
            >
              {{ row.original.ticketConfig.label }}
            </UBadge>
          </div>
        </template>

        <template #preferences-header>
          <UFieldGroup :size="SIZES.standard" :orientation="ORIENTATIONS.horizontal" :class="WEEKDAY.fieldGroupClasses">
            <DinnerModeSelector
              v-for="day in visibleDays"
              :key="day"
              :model-value="day"
              :size="SIZES.standard"
              :name="`weekday-header-${day}`"
            />
          </UFieldGroup>
        </template>

        <template #preferences-cell="{ row }">
          <WeekDayMapDinnerModeDisplay
              :model-value="row.original.dinnerPreferences"
              :form-mode="FORM_MODES.VIEW"
              :parent-restriction="activeSeason?.cookingDays"
              :show-labels="false"
              :consensus="row.original.consensus"
              :size="SIZES.standard"
              :name="`inhabitant-${row.original.id}-preferences-view`"
          />
        </template>

        <template #expanded="{ row }">
          <UFormField
              :label="row.original.isSynthetic ? 'Power mode: Opdater præferencer for hele husstanden' : `Opdater fællesspisning præferencer for ${row.original.name}`"
              :class="COMPONENTS.householdCard.editorField"
          >
            <div :class="COMPONENTS.householdCard.editorStack">
              <UAlert
                  v-if="row.original.isSynthetic"
                  v-bind="ALERTS.warning"
                  :icon="COMPONENTS.powerMode.icon"
                  title="Du er ved at aktivere power mode"
                  :description="`Her kan du editere hele familien på en gang. Ændringer påvirker alle ${household.inhabitants.length} medlemmer i husstanden. Individuelle præferencer overskrives.`"
              />

              <WeekDayMapDinnerModeDisplay
                  :model-value="draftPreferences"
                  :form-mode="FORM_MODES.EDIT"
                  :parent-restriction="activeSeason?.cookingDays"
                  :show-labels="true"
                  :consensus="row.original.consensus"
                  :size="SIZES.standard"
                  :name="row.original.isSynthetic ? 'power-mode-preferences-edit' : `inhabitant-${row.original.id}-preferences-edit`"
                  @update:model-value="updateDraft"
              />

              <ActionPreview :days="previewDays" :pending="isPreviewPending" />

              <div :class="COMPONENTS.householdCard.actionsRow">
                <UFieldGroup :size="SIZES.cardFieldGroup">
                  <UButton
                      :color="COLOR.neutral"
                      :variant="NOISE.quiet"
                      :icon="ICONS.xMark"
                      data-testid="cancel-preferences"
                      @click="row.toggleExpanded()"
                  >
                    Annuller
                  </UButton>
                  <UButton
                      v-if="canEdit"
                      :color="row.original.isSynthetic ? COMPONENTS.powerMode.color : COLOR.primary"
                      :variant="NOISE.loud"
                      :loading="isSaving"
                      :disabled="isSaving"
                      :class="COMPONENTS.householdCard.saveButton"
                      data-testid="save-preferences"
                      @click="savePreferences"
                  >
                    <template #leading>
                      <UIcon
                        :name="row.original.isSynthetic ? COMPONENTS.powerMode.buttonIcon : ICONS.check"
                        :class="[
                          COMPONENTS.householdCard.saveIcon,
                          row.original.isSynthetic && isSaving && COMPONENTS.householdCard.saveIconSaving,
                          row.original.isSynthetic && !isSaving && COMPONENTS.householdCard.saveIconIdle
                        ]"
                      />
                    </template>
                    {{ isSaving ? 'Arbejder...' : (row.original.isSynthetic ? 'Gem for alle' : 'Gem') }}
                  </UButton>
                </UFieldGroup>
              </div>
            </div>
          </UFormField>
        </template>
      </UTable>

      <UAlert
          v-if="lastPreferenceResult"
          v-bind="lastPreferenceResult.errored > 0 ? ALERTS.error : ALERTS.neutral"
          :icon="lastPreferenceResult.errored > 0 ? ICONS.robotDead : ICONS.robotHappy"
          title="Sidste ændring"
          data-testid="last-result-alert"
      >
        <template #description>
          <p :class="COMPONENTS.bookingResult.lines">{{ `Du har ændret præferencer, og familiens bookinger har ændret sig:\n${formatResultLines(lastPreferenceResult, householdOrder)}` }}</p>
        </template>
      </UAlert>

      <UAlert
          v-bind="ALERTS.info"
          title="Sådan redigerer du præferencer"
      >
        <template #description>
          <div :class="COMPONENTS.householdCard.hintList">
            <span :class="COMPONENTS.householdCard.hintLine">
              <UIcon :name="COMPONENTS.powerMode.buttonIcon" :class="COMPONENTS.householdCard.hintIcon" /> Power mode opdaterer alle medlemmer samtidigt - ændringer opdaterer fremtidige tilmeldinger
            </span>
            <span :class="COMPONENTS.householdCard.hintLine">
              <UIcon :name="ICONS.edit" :class="COMPONENTS.householdCard.hintIcon" /> Klik på blyanten for at redigere enkeltpersoner
            </span>
            <span>Ændringer gemmes når du trykker på GEM, og påvirker fremtidige bookinger</span>
            <span :class="COMPONENTS.householdCard.hintModes">
              <strong>Valg for fællesspisning:</strong>
              <span :class="COMPONENTS.householdCard.hintMode"><UIcon :name="ICONS.dinner" :class="COMPONENTS.householdCard.hintIcon" /> Fællesspisning</span>
              <span :class="COMPONENTS.householdCard.hintMode"><UIcon :name="ICONS.clock" :class="COMPONENTS.householdCard.hintIcon" /> Sen spisning</span>
              <span :class="COMPONENTS.householdCard.hintMode"><UIcon :name="ICONS.takeaway" :class="COMPONENTS.householdCard.hintIcon" /> Takeaway</span>
              <span :class="COMPONENTS.householdCard.hintMode"><UIcon :name="ICONS.noDinner" :class="COMPONENTS.householdCard.hintIcon" /> Ingen spisning</span>
            </span>
          </div>
        </template>
      </UAlert>
    </div>
  </UCard>
</template>
