<script setup lang="ts">
/**
 * GuestBookingForm - Standalone form for adding a guest to a dinner
 *
 * The modes come from getBookingOptions over the guest the form saves: before the deadline it books, after it it buys a
 * ticket for sale or queues the guest by supply, all through the scaffold. No mode (a past, cancelled or consumed
 * dinner, a day outside residency) shows the empty state.
 *
 * A new guest never takes Ingen; it shows disabled for visual consistency with other booking forms.
 *
 * The preview above the buttons is the server's dry run of the guests' orders (ActionPreview, titled
 * "Du er ved at tilføje gæster"): the loader while it works, then a line per outcome naming the guests; the button
 * names the guests.
 */
import type {DinnerEventDisplay, DinnerMode, DesiredOrder, GuestBookingFormData, ScaffoldOrdersRequest} from '~/composables/useBookingValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'
import type {SeasonDeadlines} from '~/composables/useSeason'
import type {BookingContext, ReleasedTicketCounts} from '~/composables/useBooking'
import {BOOKING_WORDS} from '~/config/bookingWords'
import type {FormSubmitEvent} from '@nuxt/ui'
import {FORM_MODES} from '~/types/form'

interface Props {
  householdId: number
  dinnerEvent: DinnerEventDisplay
  ticketPrices: TicketPrice[]
  allergyTypes: AllergyTypeDisplay[]
  deadlines: SeasonDeadlines
  releasedTicketCounts: ReleasedTicketCounts
  bookerId: number
  bookerName: string
  bookingContext: BookingContext // The household's booking context on the dinner (bookingContextOf)
  adminBypass?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  adminBypass: false
})

const emit = defineEmits<{
  save: [orders: DesiredOrder[]]
  cancel: []
}>()

// Design system
const {SIZES, COLOR, ICONS, BUTTONS, ALERTS, getRandomEmptyMessage, LAYOUTS, NOISE, COMPONENTS, ORIENTATIONS} = useTheSlopeDesignSystem()
const guestForm = COMPONENTS.guestBookingForm

const now = useClock()

// Empty state message when no booking action available
const emptyStateMessage = computed(() => getRandomEmptyMessage('noGuestTickets', now.value))

// Booking logic
const {getBookingOptions, buildGuestOrder} = useBooking()
const {findTicketPriceByType} = useTicket()
const {createBookingBadges, guestSaveLabel} = useBookingUi()
const bookingsStore = useBookingsStore()

// Validation schemas
const {DinnerModeSchema, GuestBookingFormSchema, TicketTypeSchema} = useBookingValidation()
const DinnerModeEnum = DinnerModeSchema.enum

// The guests a save books, as the form schema reads them; the mode holds Ingen while the form tries each mode
type GuestDraft = Omit<GuestBookingFormData, 'dinnerMode'> & {dinnerMode: DinnerMode}

// Form state - reactive object for UForm binding
const formState = reactive<Omit<GuestDraft, 'ticketPriceId'> & {ticketPriceId: number | undefined}>({
  count: 1,
  // The form opens on the adult ticket
  ticketPriceId: findTicketPriceByType(TicketTypeSchema.enum.ADULT, props.ticketPrices)?.id,
  allergyTypeIds: [],
  dinnerMode: DinnerModeEnum.DINEIN
})
const isSaving = ref(false)


// Contextual validation - business logic that needs props/computed access
// Zod schema handles structural validation (type, min, max)
const validateForm = () => {
  const errors: {name: string, message: string}[] = []
  // No mode: the dinner is cancelled or past, or the household lives elsewhere on the day
  if (enabledModes.value.length === 0) {
    errors.push({name: 'count', message: 'Kan desværre ikke tilmelde dine gæster'})
  }

  return errors
}


// Deadline badges using existing factory, counted from the page's clock
const badges = computed(() => createBookingBadges(props.dinnerEvent, props.deadlines, now.value, props.releasedTicketCounts))
// The header's badge while tickets are for sale
const forSaleWords = computed(() => ticketsForSale(props.releasedTicketCounts))

// The guests the form books: count orders at the picked ticket price, booked by the booker
const guestOrdersOf = ({count, ticketPriceId, dinnerMode, allergyTypeIds}: GuestDraft): DesiredOrder[] =>
  Array.from({length: count}, () =>
    buildGuestOrder(props.bookerId, props.dinnerEvent.id, ticketPriceId, dinnerMode, allergyTypeIds.length > 0 ? allergyTypeIds : undefined))

// The modes the guest may take: the guest the save books in each mode, as the decision matrix lands it, at the picked
// price; while none is picked, the season's first price stands in
const enabledModes = computed((): DinnerMode[] => {
  const ticketPriceId = formState.ticketPriceId ?? props.ticketPrices[0]?.id
  return getBookingOptions({
    order: null,
    waitlistEntry: null,
    candidate: dinnerMode => ticketPriceId === undefined ? null : guestOrdersOf({...formState, count: 1, ticketPriceId, dinnerMode})[0] ?? null
  }, props.bookingContext)
})

// The preview: the server's dry run of the guests a valid draft books
const previewRequest = computed((): ScaffoldOrdersRequest | null => {
  const draft = GuestBookingFormSchema.safeParse(formState)
  if (!draft.success || enabledModes.value.length === 0) return null
  return {householdId: props.householdId, dinnerEventIds: [props.dinnerEvent.id], orders: guestOrdersOf(draft.data)}
})
const {result: preview, pending: isPreviewPending} = useScaffoldPreview(
  () => previewRequest.value,
  request => bookingsStore.previewBookings(request, props.adminBypass)
)
const previewDays = computed(() => preview.value ? formatPreviewLines(preview.value, [props.bookerId]) : [])

// The button names the guests; the preview lines name what saving does for them, one line per outcome
const saveLabel = computed(() => guestSaveLabel(formState.count))

// Allergy options for AllergySelectMenu (pass full AllergyTypeDisplay)
const allergyOptions = computed(() => props.allergyTypes)

// Default to first enabled eating mode
watch(enabledModes, (modes) => {
  if (modes.length > 0 && !modes.includes(formState.dinnerMode)) {
    formState.dinnerMode = modes[0]!
  }
}, {immediate: true})

// UForm submit handler - receives validated data from FormSubmitEvent
const handleSubmit = async (event: FormSubmitEvent<GuestBookingFormData>) => {
  if (!event.data.ticketPriceId || enabledModes.value.length === 0) return

  isSaving.value = true

  try {
    emit('save', guestOrdersOf(event.data))
  } finally {
    isSaving.value = false
  }
}

const handleCancel = () => emit('cancel')
</script>

<template>
  <!-- Empty state: no mode available -->
  <UAlert
    v-if="enabledModes.length === 0"
    v-bind="ALERTS.emptyState"
    :avatar="{text: emptyStateMessage.emoji, size: SIZES.emptyStateAvatar}"
  >
    <template #title>{{ emptyStateMessage.text }}</template>
  </UAlert>

  <!-- Booking form -->
  <UForm
    v-else
    :state="formState"
    :schema="GuestBookingFormSchema"
    :validate="validateForm"
    @submit="handleSubmit"
  >
    <template #default="{ errors }">
      <UCard
      :color="COLOR.info"
      v-bind="guestForm.card"
    >
      <template #header>
        <div :class="guestForm.header">
          <UIcon :name="ICONS.userPlus" :class="guestForm.headerIcon" />
          <h4 :class="guestForm.title">Tilføj gæst</h4>
          <UBadge v-if="forSaleWords" :color="COLOR.info" :icon="ICONS.claim" :variant="NOISE.subtle" :size="SIZES.small">
            {{ forSaleWords }}
          </UBadge>
        </div>
      </template>

      <!-- Deadline badges + Dinner mode selector (top, like regular form) -->
      <div :class="guestForm.deadlines">
        <DeadlineBadge :badge="badges.booking" />
        <DeadlineBadge :badge="badges.diningMode" />
      </div>

      <UFormField label="Hvordan spiser I?" name="dinnerMode" :size="SIZES.standard">
        <DinnerModeSelector
          v-model="formState.dinnerMode"
          :form-mode="FORM_MODES.EDIT"
          :enabled-modes="enabledModes"
          :size="SIZES.standard"
          name="guest-dinner-mode"
          :orientation="ORIENTATIONS.horizontal"
        />
      </UFormField>

      <!-- Two columns: ticket info | allergies (stacked on mobile) -->
      <div :class="guestForm.columns">
        <!-- Left: Antal + Billettype -->
        <div :class="guestForm.fieldStack">
          <UFormField label="Antal gæster" name="count" :size="SIZES.small">
            <UInput
              v-model.number="formState.count"
              type="number"
              :min="1"
              :max="10"
              :size="SIZES.small"
            />
          </UFormField>

          <UFormField label="Billettype" name="ticketPriceId" :size="SIZES.small">
            <USelectMenu
              v-model="formState.ticketPriceId"
              :items="ticketPriceSelectItems(ticketPrices).toReversed()"
              value-key="id"
              placeholder="Vælg billettype..."
              :class="guestForm.select"
              data-testid="guest-ticket-type-select"
            >
              <template #item="{ item }">
                <div :class="guestForm.option">
                  <UBadge :color="item.presentation.color" :variant="NOISE.loud" :size="SIZES.sm" :class="guestForm.optionBadge">
                    {{ item.label }}
                  </UBadge>
                  <span v-if="item.description" :class="guestForm.optionNote">{{ item.description }}</span>
                </div>
              </template>
            </USelectMenu>
          </UFormField>
        </div>

        <!-- Right: Allergies -->
        <UFormField v-if="allergyOptions.length > 0" name="allergyTypeIds" :size="SIZES.small">
          <AllergyEditor
            :allergy-types="allergyOptions"
            :selected-ids="formState.allergyTypeIds"
            label="Allergier (valgfrit)"
            @add="id => formState.allergyTypeIds.push(id)"
            @remove="id => formState.allergyTypeIds = formState.allergyTypeIds.filter(i => i !== id)"
          />
        </UFormField>
      </div>

      <!-- Footer: Action preview + error messages + buttons -->
      <template #footer>
        <div :class="guestForm.footer">
          <!-- Action preview: show what will happen when saving -->
          <ActionPreview :days="previewDays" :pending="isPreviewPending" :title="BOOKING_WORDS.preview.guestTitle" />

          <!-- Error messages near buttons -->
          <div v-if="errors.length > 0" :class="guestForm.errors">
            <div v-for="error in errors" :key="error.name" :class="guestForm.error">
              <UIcon :name="ICONS.xMark" :class="guestForm.errorIcon" />
              <span>{{ error.message }}</span>
            </div>
          </div>

          <!-- Action buttons - stacked on mobile (primary on top), horizontal on desktop -->
          <div :class="LAYOUTS.formButtonRow">
            <UButton
              v-bind="BUTTONS.cancel"
              data-testid="guest-form-cancel"
              @click="handleCancel"
            >
              Annuller
            </UButton>
            <UButton
              v-bind="BUTTONS.save"
              type="submit"
              :loading="isSaving"
              data-testid="guest-form-save"
            >
              <template #leading>
                <UIcon :name="ICONS.userPlus" />
              </template>
              {{ saveLabel }}
            </UButton>
          </div>
        </div>
      </template>
      </UCard>
    </template>
  </UForm>
</template>
