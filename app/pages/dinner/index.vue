<script setup lang="ts">
/**
 * Dinner Page - Master/Detail view of communal dinners
 *
 * UX: Master-detail pattern
 * - Master (Calendar): 1/4 width, shows calendar with dinner events
 * - Detail (Dinner info): 3/4 width, shows selected day details
 *
 * Detail View Layout:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ MENU HERO (UCard Header - Full Bleed)                                      │
 * │ ┌─────────────────────────────────────────────────────────────────────────┐ │
 * │ │ [Baggrund: Menu Foto eller Fast Farve]                                  │ │
 * │ │                                                                          │ │
 * │ │                       SPAGHETTI CARBONARA                                │ │
 * │ │               Cremet pasta med bacon og parmesan                         │ │
 * │ │                                                                          │ │
 * │ │     Allergener: 🥛 Laktose   🌾 Gluten   🥚 Æg                           │ │
 * │ │                                                                          │ │
 * │ │     [Bestil] [Byt] [Annuller] [Skift Servering]                         │ │
 * │ └─────────────────────────────────────────────────────────────────────────┘ │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ KØKKEN FORBEREDELSE (UCard Body - Full Bleed)                              │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ 👨‍🍳 Chefkok: Anna Larsen                                                   │
 * │ 👥 Madhold 3: Bob Jensen, Clara Nielsen, David Hansen                      │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                          LAV MAD - 100%                                     │
 * │  100 PORTIONER                                                              │
 * │  Voksne: 80  |  Børn: 40 (20 portioner)  |  Baby: 5 (0 portioner)          │
 * ├──────────────────────────┬─────────────────────┬──────────────┬────────────┤
 * │   TAKEAWAY - 40%         │  SPIS HER - 35%     │SPIS SENT-20% │IKKE-5%     │
 * │                          │                     │              │            │
 * │      50 personer         │    44 personer      │  25 personer │ 6 personer │
 * │                          │                     │              │            │
 * │    40 portioner          │     35 stole        │   20 stole   │            │
 * │    40 tallerkener        │   33 tallerkener    │18 tallerkener│            │
 * │                          │                     │              │            │
 * │    🌾 Maria (2)          │   🥛 Anna (3)       │  🌾 Peter    │            │
 * │    🥚 Tom (1)            │   🥚 Lars (1)       │              │            │
 * │                          │                     │              │            │
 * └──────────────────────────┴─────────────────────┴──────────────┴────────────┘
 * ←─────────── 40% ─────────→←──────── 35% ──────→←──── 20% ───→←─── 5% ──→
 */

import {useQueryParam} from '~/composables/useQueryParam'
import {FORM_MODES, type FormMode} from '~/types/form'

// Design system
const { COLOR, BACKGROUNDS, ICONS } = useTheSlopeDesignSystem()

// Booking form state
const bookingFormMode = ref<FormMode>(FORM_MODES.VIEW)

// Toast for user feedback
const toast = useToast()

// Booking handlers
const handleBookingUpdate = (inhabitantId: number, dinnerMode: string, ticketPriceId: number) => {
  // TODO: Implement booking update via bookings store
  console.info('Booking update:', { inhabitantId, dinnerMode, ticketPriceId })
}

const handleAllBookingsUpdate = (dinnerMode: string) => {
  // TODO: Implement bulk booking update via bookings store
  console.info('All bookings update:', { dinnerMode })
}

const handleSaveBooking = () => {
  // TODO: Commit pending booking changes
  bookingFormMode.value = FORM_MODES.VIEW
  toast.add({
    title: 'Booking gemt',
    description: 'Din booking er blevet opdateret',
    icon: ICONS.checkCircle,
    color: COLOR.success
  })
}

// Component needs to handle its own data needs
const planStore = usePlanStore()
const {selectedSeason, isPlanStoreReady, isSelectedSeasonInitialized, isSelectedSeasonErrored} = storeToRefs(planStore)
// Initialize without await for SSR hydration consistency
planStore.initPlanStore()

// Initialize allergies store for allergen data
const allergiesStore = useAllergiesStore()
allergiesStore.initAllergiesStore()

// Derive needed data from store
const seasonDates = computed(() => selectedSeason.value?.seasonDates)
const holidays = computed(() => selectedSeason.value?.holidays ?? [])
const cookingDays = computed(() => selectedSeason.value?.cookingDays)
const dinnerEvents = computed(() => selectedSeason.value?.dinnerEvents ?? [])

// Get dinner start time from season configuration
const {getDefaultDinnerStartTime, getNextDinnerDate} = useSeason()
const dinnerStartTime = getDefaultDinnerStartTime()

// Date selection via URL query parameter
const dinnerDates = computed(() => dinnerEvents.value.map(e => new Date(e.date)))
const getDefaultDate = (): Date => {
    const nextDinner = getNextDinnerDate(dinnerDates.value, dinnerStartTime)
    return nextDinner?.start ?? new Date()
}

const {value: selectedDate, setValue} = useQueryParam<Date>('date', {
    serialize: formatDate,
    deserialize: (s) => {
        const parsed = parseDate(s)
        return parsed && !isNaN(parsed.getTime()) ? parsed : null
    },
    validate: (date) => {
        // Check if this date has a dinner event
        return dinnerEvents.value.some(e => {
            const eventDate = new Date(e.date)
            return eventDate.toDateString() === date.toDateString()
        })
    },
    defaultValue: getDefaultDate,
    // Auto-sync URL when store is ready and events are loaded
    syncWhen: () => isPlanStoreReady.value && dinnerEvents.value.length > 0
})

// Selected dinner event based on URL date
const selectedDinnerEvent = computed(() => {
    return dinnerEvents.value.find(e => {
        const eventDate = new Date(e.date)
        return eventDate.toDateString() === selectedDate.value.toDateString()
    })
})

// Selected dinner ID for data fetching
const selectedDinnerId = computed(() => selectedDinnerEvent.value?.id ?? null)

// Page owns dinner detail data (ADR-007: page owns data, layout receives via props)
const bookingsStore = useBookingsStore()
const { DinnerEventDetailSchema } = useBookingValidation()

const {
  data: dinnerEventDetail,
  status: dinnerEventDetailStatus,
  refresh: _refreshDinnerEventDetail
} = useAsyncData(
  computed(() => `dinner-detail-${selectedDinnerId.value || 'null'}`),
  () => selectedDinnerId.value
    ? bookingsStore.fetchDinnerEventDetail(selectedDinnerId.value)
    : Promise.resolve(null),
  {
    default: () => null,
    watch: [selectedDinnerId],
    immediate: true,
    transform: (data: unknown) => {
      if (!data) return null
      try {
        return DinnerEventDetailSchema.parse(data)
      } catch (e) {
        console.error('Error parsing dinner event detail:', e)
        throw e
      }
    }
  }
)

const isDinnerDetailLoading = computed(() => dinnerEventDetailStatus.value === 'pending')
const isDinnerDetailError = computed(() => dinnerEventDetailStatus.value === 'error')

useHead({
  title: '🍽️ Fællesspisning',
  meta: [
    {
      name: 'Fællesspisning',
      content: 'Tilmelding til dagens fællesspisning'
    }
  ]
})
</script>

<template>
  <Loader v-if="!isPlanStoreReady" text="Henter sæsondata..." />
  <ViewError v-else-if="isSelectedSeasonErrored" text="Kan ikke hente sæsondata" />

  <!-- No selected season state -->
  <UPage v-else-if="isSelectedSeasonInitialized && !selectedSeason">
    <div :class="`p-4 md:p-8 ${BACKGROUNDS.card}`">
      <UAlert
        type="info"
        variant="soft"
        :color="COLOR.info"
        :icon="ICONS.robotDead"
      >
        <template #title>
          Her ser lidt tomt ud!
        </template>
        <template #description>
          Bed din administrator om at oprette og aktivere en fællespisningssæson.
        </template>
        <template #actions>
          <UButton
            :color="COLOR.secondary"
            variant="solid"
            to="/admin/planning"
            :icon="ICONS.plusCircle"
            size="lg"
          >
            Værsgo, opret en ny sæson
          </UButton>
        </template>
      </UAlert>
    </div>
  </UPage>

  <!-- Main master-detail layout -->
  <UPage v-else-if="isSelectedSeasonInitialized && selectedSeason">
    <!-- Master: Calendar (left slot) -->
    <template #left>
      <CalendarMasterPanel title="Fællesspisningens kalender">
        <template #calendar>
          <DinnerCalendarDisplay
            v-if="seasonDates && selectedDate"
            :season-dates="seasonDates"
            :cooking-days="cookingDays"
            :holidays="holidays"
            :dinner-events="dinnerEvents"
            :show-countdown="true"
            :color="COLOR.peach"
            :selected-date="selectedDate"
            @date-selected="setValue"
          />
        </template>
      </CalendarMasterPanel>
    </template>

    <!-- Detail: Dinner info (page owns data, passes to pure layout) -->
    <DinnerDetailPanel
      :dinner-event="dinnerEventDetail"
      :ticket-prices="selectedSeason?.ticketPrices ?? []"
      :is-loading="isDinnerDetailLoading"
      :is-error="isDinnerDetailError"
    >
      <!-- #hero: ChefMenuCard in VIEW mode with DinnerBookingForm -->
      <template #hero>
        <ChefMenuCard
          v-if="dinnerEventDetail"
          :dinner-event="dinnerEventDetail"
          :form-mode="FORM_MODES.VIEW"
          :show-state-controls="false"
          :show-allergens="true"
        >
          <!-- Household booking form in ChefMenuCard's slot -->
          <DinnerBookingForm
            :dinner-event="dinnerEventDetail"
            :orders="dinnerEventDetail.tickets"
            :ticket-prices="selectedSeason?.ticketPrices ?? []"
            :form-mode="bookingFormMode"
            @update-booking="handleBookingUpdate"
            @update-all-bookings="handleAllBookingsUpdate"
          />

          <!-- Booking action button -->
          <div class="mt-4">
            <UButton
              v-if="bookingFormMode === FORM_MODES.VIEW"
              color="primary"
              variant="solid"
              size="lg"
              name="edit-booking"
              block
              @click="bookingFormMode = FORM_MODES.EDIT"
            >
              ÆNDRE BOOKING
            </UButton>

            <div v-else class="flex gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                size="lg"
                name="cancel-booking"
                @click="bookingFormMode = FORM_MODES.VIEW"
              >
                Annuller
              </UButton>
              <UButton
                color="primary"
                variant="solid"
                size="lg"
                name="save-booking"
                class="flex-1"
                :icon="ICONS.check"
                @click="handleSaveBooking"
              >
                Gem booking
              </UButton>
            </div>
          </div>
        </ChefMenuCard>
      </template>
    </DinnerDetailPanel>
  </UPage>
</template>
