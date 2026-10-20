<script setup lang="ts">
/**
 * HouseholdSettings - Household information + move-out date management
 *
 * Sections:
 * 1. Husstandsoplysninger - Read-only display: address, movedInDate, PBS ID
 * 2. Fraflytning - UCard with pencil-gate edit flow (gated by canEdit)
 *    - Toast on save: the booking result, one line per day (formatResultLines)
 *    - Persistent alert below card (robotHappy/robotDead), the same lines
 * 3. Kalenderabonnement - Calendar feed subscription
 *
 * Fraflytning — 4 states:
 *
 * State 1: No date, viewing
 * ┌─ Fraflytning ──────────────────────── [pen] ─┐
 * │  sun  Familien har ingen flytteplaner         │
 * └──────────────────────────────────────────────-┘
 *
 * State 2: No date, editing
 * ┌─ Fraflytning ────────────────────────────────-┐
 * │  !! Advarsel                                  │
 * │  Alle bookinger efter dato slettes.           │
 * │  Fraflytningsdato: [  dd/MM/yyyy  cal ]       │
 * ├───────────────────────────────────────────────-┤
 * │         [x Annuller]  [!! Saet fraflytning]   │
 * └───────────────────────────────────────────────-┘
 *
 * State 3: Has date, viewing
 * ┌─ Fraflytning ──────────────────────── [pen] ─┐
 * │  >>  Familien fraflytter 15/03/2026           │
 * └──────────────────────────────────────────────-┘
 *
 * State 4: Has date, editing
 * ┌─ Fraflytning ────────────────────────────────-┐
 * │  (i) Aendring af fraflytningsdato             │
 * │  Bookinger efter ny dato slettes.             │
 * │  Fraflytningsdato: [  15/03/2026  cal ]       │
 * │  [<< Fortryd flytning]                        │
 * ├───────────────────────────────────────────────-┤
 * │      [x Annuller]  [v Gem fraflytningsdato]   │
 * └───────────────────────────────────────────────-┘
 */
import type {HouseholdDetail} from '~/composables/useCoreValidation'

interface Props {
  household: HouseholdDetail
  canEdit?: boolean
  adminBypass?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canEdit: true,
  adminBypass: false
})

const {TYPOGRAPHY, ICONS, SIZES, LAYOUTS, BUTTONS, ALERTS, COLOR, NOISE, COMPONENTS, getResidencyDisplay} = useTheSlopeDesignSystem()
const {householdSettings} = COMPONENTS

// Store integration
const householdsStore = useHouseholdsStore()
const {lastMoveOutResult} = storeToRefs(householdsStore)
// The order the toast and the "Sidste ændring" alert name the people in
const householdOrder = computed(() => props.household.inhabitants.map(({id}) => id))

// Toast notifications
const toast = useToast()

// Move-out date state
const isSaving = ref(false)
const isEditing = ref(false)
const moveOutDate = ref<Date | null>(props.household.moveOutDate ?? null)

// Sync when household changes (e.g., after save)
watch(() => props.household, (h) => {
  moveOutDate.value = h.moveOutDate ?? null
  isEditing.value = false
}, {deep: true})

const hasMoveOutDate = computed(() => !!props.household.moveOutDate)

const cancelEdit = () => {
  isEditing.value = false
  moveOutDate.value = props.household.moveOutDate ?? null
}

// Status display: use shared residency config, fallback for active households
const residencyDisplay = computed(() => getResidencyDisplay(props.household.movedInDate, props.household.moveOutDate))
const statusIcon = computed(() => residencyDisplay.value?.icon ?? ICONS.noMoveOutPlans)
const statusIconClass = computed(() => residencyDisplay.value ? householdSettings.factIcon : householdSettings.noPlansIcon)
const statusText = computed(() => residencyDisplay.value?.dateText ?? 'Familien har ingen flytteplaner')
const statusTextClass = computed(() => residencyDisplay.value ? TYPOGRAPHY.bodyTextMuted : TYPOGRAPHY.bodyText)

// Edit alert (contextual: warning for new, info for change)
const editAlert = computed(() => hasMoveOutDate.value
  ? { icon: ICONS.info, title: 'Ændring af fraflytningsdato', description: 'Bookinger efter den nye dato slettes, og bookinger før den nye dato kan genoprettes.', testid: 'move-out-change-warning' }
  : { icon: ICONS.warning, title: 'Advarsel', description: 'Når du sætter en fraflytningsdato, slettes alle bookinger efter den valgte dato for husstanden.', testid: 'move-out-warning' }
)

const setMoveOutDate = async () => {
  if (!moveOutDate.value) return
  isSaving.value = true
  try {
    const result = await householdsStore.setMoveOutDate(props.household.id, moveOutDate.value, props.adminBypass)
    toast.add(scaffoldToast('Fraflytningsdato sat', result, householdOrder.value))
  } catch (error) {
    console.error('Failed to set move-out date:', error)
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

const clearMoveOutDate = async () => {
  isSaving.value = true
  try {
    const result = await householdsStore.setMoveOutDate(props.household.id, null, props.adminBypass)
    toast.add(scaffoldToast('Fraflytning fortrudt', result, householdOrder.value))
  } catch (error) {
    console.error('Failed to clear move-out date:', error)
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

// Calendar feed
const calendarFeed = ref<string | null>(null)
const getCalendarFeedForUser = async () => {
  calendarFeed.value = await householdsStore.fetchCalendarFeed()
}
</script>

<template>
  <div data-testid="household-settings" :class="householdSettings.root">

    <!-- Section 1: Husstandsoplysninger -->
    <div>
      <h3 :class="householdSettings.sectionTitle">Husstandsoplysninger</h3>
      <div :class="householdSettings.facts">
        <div :class="householdSettings.fact">
          <UIcon :name="ICONS.household" :class="householdSettings.factIcon"/>
          <span :class="TYPOGRAPHY.bodyTextMuted">{{ household.address }}</span>
        </div>
        <div :class="householdSettings.fact">
          <UIcon :name="ICONS.identification" :class="householdSettings.factIcon"/>
          <span :class="TYPOGRAPHY.bodyTextMuted">PBS {{ household.pbsId }}</span>
        </div>
        <div :class="householdSettings.fact">
          <UIcon :name="ICONS.moveIn" :class="householdSettings.factIcon"/>
          <span :class="TYPOGRAPHY.bodyTextMuted">Indflyttet {{ formatDate(household.movedInDate) }}</span>
        </div>
        <div v-if="residencyDisplay" :class="householdSettings.fact">
          <UIcon :name="residencyDisplay.icon" :class="householdSettings.factIcon"/>
          <span :class="TYPOGRAPHY.bodyTextMuted">{{ residencyDisplay.dateText }}</span>
        </div>
      </div>
    </div>

    <!-- Section 2: Fraflytning -->
    <UCard v-if="canEdit" data-testid="move-out-card">
      <template #header>
        <div :class="householdSettings.cardHeader">
          <h3 :class="TYPOGRAPHY.cardTitle">Fraflytning</h3>
          <UButton
            v-if="!isEditing"
            v-bind="BUTTONS.edit"
            data-testid="edit-move-out-date"
            @click="isEditing = true"
          />
        </div>
      </template>

      <div :class="householdSettings.cardBody">
        <!-- Status row (view mode) -->
        <div v-if="!isEditing" :class="householdSettings.fact">
          <UIcon :name="statusIcon" :class="statusIconClass"/>
          <span :class="statusTextClass" data-testid="move-out-date-display">{{ statusText }}</span>
        </div>

        <!-- Edit mode: contextual alert + date picker -->
        <template v-if="isEditing">
          <UAlert
            v-bind="ALERTS.warning"
            :icon="editAlert.icon"
            :title="editAlert.title"
            :description="editAlert.description"
            :data-testid="editAlert.testid"
          />
          <CalendarDatePicker
            v-model="moveOutDate"
            label="Fraflytningsdato"
            name="moveOutDate"
          />
        </template>

        <!-- Undo move-out (edit mode, only when date is set) -->
        <DangerButton
          v-if="hasMoveOutDate && isEditing"
          data-testid="clear-move-out-date"
          label="Fortryd flytning"
          confirm-label="Klik igen for at fortryde"
          :icon="ICONS.undo"
          :loading="isSaving"
          undo
          @confirm="clearMoveOutDate"
        />
      </div>

      <template #footer>
        <div v-if="isEditing" :class="LAYOUTS.formButtonRow">
          <UButton v-bind="BUTTONS.cancel" data-testid="cancel-edit-move-out-date" @click="cancelEdit">Annullér</UButton>
          <!-- No date yet: destructive "set date" action -->
          <DangerButton
            v-if="!hasMoveOutDate"
            data-testid="set-move-out-date"
            label="Sæt fraflytningsdato"
            confirm-label="Klik igen for at bekræfte fraflytning"
            :icon="ICONS.moveOut"
            :initial-color="COLOR.error"
            :initial-variant="NOISE.soft"
            :loading="isSaving"
            :disabled="!moveOutDate"
            @confirm="setMoveOutDate"
          />
          <!-- Has date: save new date -->
          <UButton
            v-else
            v-bind="BUTTONS.save"
            data-testid="save-move-out-date"
            :loading="isSaving"
            :disabled="!moveOutDate"
            @click="setMoveOutDate"
          >
            Gem fraflytningsdato
          </UButton>
        </div>
      </template>
    </UCard>

    <!-- Read-only move-out display for non-editors -->
    <div v-else-if="residencyDisplay" :class="[LAYOUTS.sectionDivider, householdSettings.sectionGap]">
      <h3 :class="householdSettings.sectionTitle">Fraflytning</h3>
      <div :class="householdSettings.fact">
        <UIcon :name="residencyDisplay.icon" :class="householdSettings.factIcon"/>
        <span :class="TYPOGRAPHY.bodyTextMuted" data-testid="move-out-date-display">{{ residencyDisplay.dateText }}</span>
      </div>
    </div>

    <!-- Last operation result (persistent, below card) -->
    <UAlert
      v-if="canEdit && lastMoveOutResult"
      v-bind="lastMoveOutResult.errored > 0 ? ALERTS.error : ALERTS.neutral"
      :icon="lastMoveOutResult.errored > 0 ? ICONS.robotDead : ICONS.robotHappy"
      title="Sidste ændring"
      data-testid="last-move-out-result-alert"
    >
      <template #description>
        <p :class="COMPONENTS.bookingResult.lines">{{ `Fraflytningsdato ændret, og familiens bookinger har ændret sig:\n${formatResultLines(lastMoveOutResult, householdOrder)}` }}</p>
      </template>
    </UAlert>

    <!-- Section 3: Kalenderabonnement -->
    <div :class="[LAYOUTS.sectionDivider, householdSettings.sectionGap]">
      <h3 :class="householdSettings.sectionTitle">Kalenderabonnement</h3>
      <p :class="householdSettings.intro">
        Abonner på familiens fællesspisningskalender i din foretrukne kalenderapp (Google Calendar, Apple Calendar,
        Outlook)
      </p>

      <UButton
        :icon="ICONS.calendar"
        :color="COLOR.primary"
        :size="SIZES.standard"
        @click="getCalendarFeedForUser"
      >
        Hent kalender (.ical)
      </UButton>

      <div v-if="calendarFeed" :class="householdSettings.feedBox">
        <p :class="householdSettings.feedLabel">Kalenderfeed genereret:</p>
        <a
          href="/api/calendar/feed"
          :class="householdSettings.feedLink"
          download="skraaningen-faellesspisning.ics"
        >
          Download skraaningen-faellesspisning.ics
        </a>
      </div>
    </div>
  </div>
</template>
