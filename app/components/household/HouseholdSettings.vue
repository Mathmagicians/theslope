<script setup lang="ts">
/**
 * HouseholdSettings - Household information + move-out date management
 *
 * Sections:
 * 1. Husstandsoplysninger - Read-only display: address, movedInDate, PBS ID
 * 2. Fraflytning - Set/clear move-out date (gated by canEdit)
 * 3. Kalenderabonnement - Calendar feed subscription
 *
 * Move-out date flow:
 * - No moveOutDate → date picker + DangerButton "Sæt udflytningsdato"
 * - moveOutDate set → display date + "Ændr" toggle + DangerButton "Fjern udflytningsdato" (undo mode)
 */
import type {HouseholdDetail} from '~/composables/useCoreValidation'
import type {NullableDateRange} from '~/types/dateTypes'

interface Props {
  household: HouseholdDetail
  canEdit?: boolean
  adminBypass?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canEdit: true,
  adminBypass: false
})

const {TYPOGRAPHY, ICONS, SIZES, COLOR, LAYOUTS} = useTheSlopeDesignSystem()

// Store integration
const householdsStore = useHouseholdsStore()

// Move-out date state
const isSaving = ref(false)
const isEditing = ref(false)

// Date range model for the picker: movedInDate (read-only start) + moveOutDate (editable end)
const dateRange = ref<NullableDateRange>({
  start: props.household.movedInDate,
  end: props.household.moveOutDate ?? null
})

// Sync when household changes (e.g., after save)
watch(() => props.household, (h) => {
  dateRange.value = {start: h.movedInDate, end: h.moveOutDate ?? null}
  isEditing.value = false
}, {deep: true})

const hasMoveOutDate = computed(() => !!props.household.moveOutDate)

const setMoveOutDate = async () => {
  if (!dateRange.value.end) return
  isSaving.value = true
  try {
    await householdsStore.setMoveOutDate(props.household.id, dateRange.value.end)
  } finally {
    isSaving.value = false
  }
}

const clearMoveOutDate = async () => {
  isSaving.value = true
  try {
    await householdsStore.setMoveOutDate(props.household.id, null)
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
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <UIcon :name="ICONS.household" :class="TYPOGRAPHY.bodyTextMuted"/>
          <span :class="TYPOGRAPHY.bodyTextMuted">Adresse</span>
          <span :class="TYPOGRAPHY.bodyText">{{ household.address }}</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-calendar" :class="TYPOGRAPHY.bodyTextMuted"/>
          <span :class="TYPOGRAPHY.bodyTextMuted">Indflyttet</span>
          <span :class="TYPOGRAPHY.bodyText">{{ formatDate(household.movedInDate) }}</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-identification" :class="TYPOGRAPHY.bodyTextMuted"/>
          <span :class="TYPOGRAPHY.bodyTextMuted">PBS ID</span>
          <span :class="TYPOGRAPHY.bodyText">{{ household.pbsId }}</span>
        </div>
      </div>
    </div>

    <!-- Section 2: Fraflytning -->
    <div v-if="canEdit" :class="LAYOUTS.sectionDivider" class="pt-6">
      <h3 :class="TYPOGRAPHY.cardTitle" class="mb-4">Fraflytning</h3>

      <!-- No move-out date set: show picker + set button -->
      <div v-if="!hasMoveOutDate" class="space-y-4">
        <CalendarDateRangePicker
          v-model="dateRange"
          :schema="nullableEndDateRangeSchema"
          :labels="{ start: 'Indflyttet', end: 'Udflytningsdato' }"
          data-testid="move-out-date-picker"
        />
        <DangerButton
          data-testid="set-move-out-date"
          label="Sæt udflytningsdato"
          confirm-label="Klik igen for at bekræfte"
          :icon="ICONS.calendar"
          :loading="isSaving"
          :disabled="!dateRange.end"
          @confirm="setMoveOutDate"
        />
      </div>

      <!-- Move-out date set: show date + edit/clear buttons -->
      <div v-else class="space-y-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-calendar" :class="TYPOGRAPHY.bodyTextMuted"/>
          <span :class="TYPOGRAPHY.bodyTextMuted">Udflytningsdato</span>
          <span :class="TYPOGRAPHY.bodyText" data-testid="move-out-date-display">{{ formatDate(household.moveOutDate!) }}</span>
          <UButton
            v-if="!isEditing"
            data-testid="edit-move-out-date"
            :icon="ICONS.edit"
            :color="COLOR.neutral"
            variant="ghost"
            :size="SIZES.small"
            @click="isEditing = true"
          />
        </div>

        <!-- Edit mode: date picker for changing the date -->
        <div v-if="isEditing" class="space-y-4">
          <CalendarDateRangePicker
            v-model="dateRange"
            :schema="nullableEndDateRangeSchema"
            :labels="{ start: 'Indflyttet', end: 'Udflytningsdato' }"
            data-testid="move-out-date-picker-edit"
          />
          <div class="flex gap-2">
            <UButton
              data-testid="save-move-out-date"
              :icon="ICONS.check"
              :color="COLOR.primary"
              :size="SIZES.standard"
              :loading="isSaving"
              :disabled="!dateRange.end"
              @click="setMoveOutDate"
            >
              Gem
            </UButton>
            <UButton
              data-testid="cancel-edit-move-out-date"
              :icon="ICONS.xMark"
              :color="COLOR.neutral"
              variant="ghost"
              :size="SIZES.standard"
              @click="isEditing = false; dateRange.end = household.moveOutDate ?? null"
            >
              Annullér
            </UButton>
          </div>
        </div>

        <!-- Clear move-out date -->
        <DangerButton
          data-testid="clear-move-out-date"
          label="Fjern udflytningsdato"
          confirm-label="Klik igen for at fjerne"
          :icon="ICONS.undo"
          :loading="isSaving"
          undo
          @confirm="clearMoveOutDate"
        />
      </div>
    </div>

    <!-- Read-only move-out display for non-editors -->
    <div v-else-if="hasMoveOutDate" :class="LAYOUTS.sectionDivider" class="pt-6">
      <h3 :class="TYPOGRAPHY.cardTitle" class="mb-4">Fraflytning</h3>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-calendar" :class="TYPOGRAPHY.bodyTextMuted"/>
        <span :class="TYPOGRAPHY.bodyTextMuted">Udflytningsdato</span>
        <span :class="TYPOGRAPHY.bodyText" data-testid="move-out-date-display">{{ formatDate(household.moveOutDate!) }}</span>
      </div>
    </div>

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
