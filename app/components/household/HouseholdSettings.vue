<script setup lang="ts">
/**
 * HouseholdSettings - Household information + move-out date management
 *
 * Sections:
 * 1. Husstandsoplysninger - Read-only display: address, movedInDate, PBS ID
 * 2. Fraflytning - UCard with pencil-gate edit flow (gated by canEdit)
 *    - Toast on save (formatScaffoldResult in past tense)
 *    - Persistent alert below card (robotHappy/robotDead)
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

const {TYPOGRAPHY, ICONS, SIZES, LAYOUTS, BUTTONS} = useTheSlopeDesignSystem()

// Store integration
const householdsStore = useHouseholdsStore()
const {lastMoveOutResult} = storeToRefs(householdsStore)

// Booking business logic (scaffold result formatting)
const {formatScaffoldResult} = useBooking()

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

// Status display (DRY: single row driven by hasMoveOutDate)
const statusIcon = computed(() => hasMoveOutDate.value ? ICONS.moveOut : 'i-heroicons-sun')
const statusIconClass = computed(() => hasMoveOutDate.value ? 'opacity-60' : 'text-warning-500')
const statusText = computed(() => hasMoveOutDate.value
  ? `Familien fraflytter ${formatDate(props.household.moveOutDate!)}`
  : 'Familien har ingen flytteplaner'
)
const statusTextClass = computed(() => hasMoveOutDate.value ? TYPOGRAPHY.bodyTextMuted : TYPOGRAPHY.bodyText)

// Edit alert (contextual: warning for new, info for change)
const editAlert = computed(() => hasMoveOutDate.value
  ? { icon: 'i-heroicons-information-circle', title: 'Ændring af fraflytningsdato', description: 'Bookinger efter den nye dato slettes, og bookinger før den nye dato kan genoprettes.', testid: 'move-out-change-warning' }
  : { icon: 'i-heroicons-exclamation-triangle', title: 'Advarsel', description: 'Når du sætter en fraflytningsdato, slettes alle bookinger efter den valgte dato for husstanden.', testid: 'move-out-warning' }
)

const setMoveOutDate = async () => {
  if (!moveOutDate.value) return
  isSaving.value = true
  try {
    const result = await householdsStore.setMoveOutDate(props.household.id, moveOutDate.value, props.adminBypass)
    toast.add({
      title: 'Fraflytningsdato sat',
      description: formatScaffoldResult(result, 'past'),
      icon: ICONS.checkCircle,
      color: 'success'
    })
  } catch (error) {
    console.error('Failed to set move-out date:', error)
    toast.add({
      title: 'Kunne ikke gemme',
      description: 'Der opstod en fejl. Prøv igen senere.',
      icon: 'i-heroicons-exclamation-circle',
      color: 'error'
    })
  } finally {
    isSaving.value = false
  }
}

const clearMoveOutDate = async () => {
  isSaving.value = true
  try {
    const result = await householdsStore.setMoveOutDate(props.household.id, null, props.adminBypass)
    toast.add({
      title: 'Fraflytning fortrudt',
      description: formatScaffoldResult(result, 'past'),
      icon: ICONS.checkCircle,
      color: 'success'
    })
  } catch (error) {
    console.error('Failed to clear move-out date:', error)
    toast.add({
      title: 'Kunne ikke gemme',
      description: 'Der opstod en fejl. Prøv igen senere.',
      icon: 'i-heroicons-exclamation-circle',
      color: 'error'
    })
  } finally {
    isSaving.value = false
  }
}

// Calendar feed
const calendarFeed = ref<string | null>(null)
const getCalendarFeedForUser = async () => {
  calendarFeed.value = await $fetch<string>('/api/calendar/feed')
}
</script>

<template>
  <div data-testid="household-settings" class="space-y-6 px-2 md:px-0">

    <!-- Section 1: Husstandsoplysninger -->
    <div>
      <h3 :class="TYPOGRAPHY.cardTitle" class="mb-4">Husstandsoplysninger</h3>
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <UIcon :name="ICONS.household" class="opacity-60"/>
          <span :class="TYPOGRAPHY.bodyTextMuted">{{ household.address }}</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon :name="ICONS.identification" class="opacity-60"/>
          <span :class="TYPOGRAPHY.bodyTextMuted">PBS {{ household.pbsId }}</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon :name="ICONS.moveIn" class="opacity-60"/>
          <span :class="TYPOGRAPHY.bodyTextMuted">Indflyttet {{ formatDate(household.movedInDate) }}</span>
        </div>
        <div v-if="hasMoveOutDate" class="flex items-center gap-2">
          <UIcon :name="ICONS.moveOut" class="opacity-60"/>
          <span :class="TYPOGRAPHY.bodyTextMuted">Fraflytter {{ formatDate(household.moveOutDate!) }}</span>
        </div>
      </div>
    </div>

    <!-- Section 2: Fraflytning -->
    <UCard v-if="canEdit" data-testid="move-out-card">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 :class="TYPOGRAPHY.cardTitle">Fraflytning</h3>
          <UButton
            v-if="!isEditing"
            v-bind="BUTTONS.edit"
            data-testid="edit-move-out-date"
            @click="isEditing = true"
          />
        </div>
      </template>

      <div class="space-y-4">
        <!-- Status row (view mode) -->
        <div v-if="!isEditing" class="flex items-center gap-2">
          <UIcon :name="statusIcon" :class="statusIconClass"/>
          <span :class="statusTextClass" data-testid="move-out-date-display">{{ statusText }}</span>
        </div>

        <!-- Edit mode: contextual alert + date picker -->
        <template v-if="isEditing">
          <UAlert
            :icon="editAlert.icon"
            color="warning"
            variant="soft"
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
        <div v-if="isEditing" class="flex flex-col-reverse md:flex-row justify-end gap-2">
          <UButton v-bind="BUTTONS.cancel" data-testid="cancel-edit-move-out-date" @click="cancelEdit">Annullér</UButton>
          <!-- No date yet: destructive "set date" action -->
          <DangerButton
            v-if="!hasMoveOutDate"
            data-testid="set-move-out-date"
            label="Sæt fraflytningsdato"
            confirm-label="Klik igen for at bekræfte fraflytning"
            :icon="ICONS.moveOut"
            initial-color="error"
            initial-variant="soft"
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
    <div v-else-if="hasMoveOutDate" :class="LAYOUTS.sectionDivider" class="pt-6">
      <h3 :class="TYPOGRAPHY.cardTitle" class="mb-4">Fraflytning</h3>
      <div class="flex items-center gap-2">
        <UIcon :name="ICONS.moveOut" class="opacity-60"/>
        <span :class="TYPOGRAPHY.bodyTextMuted" data-testid="move-out-date-display">Fraflytter {{ formatDate(household.moveOutDate!) }}</span>
      </div>
    </div>

    <!-- Last operation result (persistent, below card) -->
    <UAlert
      v-if="canEdit && lastMoveOutResult"
      :icon="lastMoveOutResult.errored > 0 ? ICONS.robotDead : ICONS.robotHappy"
      :color="lastMoveOutResult.errored > 0 ? 'error' : 'neutral'"
      variant="subtle"
      title="Sidste ændring"
      :description="`Fraflytningsdato ændret, og familiens bookinger har ændret sig: ${formatScaffoldResult(lastMoveOutResult, 'past')}`"
      data-testid="last-move-out-result-alert"
    />

    <!-- Section 3: Kalenderabonnement -->
    <div :class="LAYOUTS.sectionDivider" class="pt-6">
      <h3 :class="TYPOGRAPHY.cardTitle" class="mb-4">Kalenderabonnement</h3>
      <p :class="TYPOGRAPHY.bodyTextMuted" class="mb-4">
        Abonner på familiens fællesspisningskalender i din foretrukne kalenderapp (Google Calendar, Apple Calendar,
        Outlook)
      </p>

      <UButton
        :icon="ICONS.calendar"
        color="primary"
        :size="SIZES.standard"
        @click="getCalendarFeedForUser"
      >
        Hent kalender (.ical)
      </UButton>

      <div v-if="calendarFeed" class="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded">
        <p :class="TYPOGRAPHY.bodyTextMuted" class="mb-2">Kalenderfeed genereret:</p>
        <a
          href="/api/calendar/feed"
          class="text-primary hover:underline text-sm"
          download="skraaningen-faellesspisning.ics"
        >
          Download skraaningen-faellesspisning.ics
        </a>
      </div>
    </div>
  </div>
</template>
