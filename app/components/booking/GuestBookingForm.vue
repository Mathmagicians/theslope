<script setup lang="ts">
/**
 * GuestBookingForm - Standalone form for adding a guest to a dinner
 *
 * Uses getBookingOptions to determine:
 * - Which dinner modes are available based on deadlines and released tickets
 * - Which action to take: 'process' before the deadline, 'claim' after it; both save through the scaffold, which
 *   books, buys a ticket for sale or queues the guest by supply
 *
 * For "add guest" context, NONE is always disabled (can't add a guest who won't eat)
 * but shown for visual consistency with other booking forms.
 */
import type {DinnerEventDisplay, DinnerMode, DesiredOrder, GuestBookingFormData} from '~/composables/useBookingValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'
import type {SeasonDeadlines} from '~/composables/useSeason'
import {supplyOfType, type PreviewSupply, type ReleasedTicketCounts} from '~/composables/useBooking'
import type {FormSubmitEvent} from '@nuxt/ui'
import {FORM_MODES} from '~/types/form'

interface Props {
  dinnerEvent: DinnerEventDisplay
  ticketPrices: TicketPrice[]
  allergyTypes: AllergyTypeDisplay[]
  deadlines: SeasonDeadlines
  releasedTicketCounts: ReleasedTicketCounts
  bookerId: number
  bookerName: string
  isHouseholdInResidency: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  save: [orders: DesiredOrder[]]
  cancel: []
}>()

// Design system
const {SIZES, COLOR, ICONS, BUTTONS, ALERTS, getRandomEmptyMessage, LAYOUTS, NOISE, COMPONENTS, ORIENTATIONS} = useTheSlopeDesignSystem()
const guestForm = COMPONENTS.guestBookingForm

// Empty state message when no booking action available
const emptyStateMessage = computed(() => getRandomEmptyMessage('noGuestTickets'))

// Booking logic
const {getBookingOptions, resolveUserBookingBuckets} = useBooking()
const {createBookingBadges, formatActionPreview, guestSaveLabel} = useBookingUi()
const {canModifyOrders, canEditDiningMode} = props.deadlines

// Validation schemas
const {DinnerModeSchema, OrderStateSchema, GuestBookingFormSchema, TicketTypeSchema} = useBookingValidation()
const DinnerModeEnum = DinnerModeSchema.enum
const OrderStateEnum = OrderStateSchema.enum

// Booking options using getBookingOptions utility (no order for a new guest)
const bookingOptions = computed(() => getBookingOptions(
  null,
  canModifyOrders(props.dinnerEvent.date),
  canEditDiningMode(props.dinnerEvent.date),
  props.dinnerEvent.state,
  props.isHouseholdInResidency
))

// The guests a save books: how many, at which ticket price, how they eat and their allergies
type GuestDraft = Pick<DesiredOrder, 'dinnerMode'> & {count: number, ticketPriceId: number, allergyTypeIds: number[]}

// Form state - reactive object for UForm binding
const formState = reactive<Omit<GuestDraft, 'ticketPriceId'> & {ticketPriceId: number | undefined}>({
  count: 1,
  // The form opens on the adult ticket
  ticketPriceId: props.ticketPrices.find(price => price.ticketType === TicketTypeSchema.enum.ADULT)?.id,
  allergyTypeIds: [],
  dinnerMode: DinnerModeEnum.DINEIN
})
const isSaving = ref(false)


// Contextual validation - business logic that needs props/computed access
// Zod schema handles structural validation (type, min, max)
const validateForm = () => {
  const errors: {name: string, message: string}[] = []
  const {action} = bookingOptions.value
  // No booking action: the dinner is cancelled or past, or the household lives elsewhere on the day
  if (!action) {
    errors.push({name: 'count', message: 'Kan desværre ikke tilmelde dine gæster'})
  }

  return errors
}


// Deadline badges using existing factory
const badges = computed(() => createBookingBadges(props.dinnerEvent, props.deadlines, props.releasedTicketCounts))

// The client settles the guests' claims against the tickets for sale of their ticket type on this dinner (the lock status)
const supply: PreviewSupply = order => supplyOfType(props.releasedTicketCounts, props.ticketPrices, order.ticketPriceId)

// The guests the form books: count orders at the picked ticket price, booked by the booker
const guestOrdersOf = ({count, ticketPriceId, dinnerMode, allergyTypeIds}: GuestDraft): DesiredOrder[] =>
  Array.from({length: count}, () => ({
    inhabitantId: props.bookerId,
    dinnerEventId: props.dinnerEvent.id,
    dinnerMode,
    ticketPriceId,
    isGuestTicket: true,
    allergyTypeIds: allergyTypeIds.length > 0 ? allergyTypeIds : undefined,
    state: OrderStateEnum.BOOKED
  }))

// Action preview: the guests' orders settled against the supply as the save settles them
const actionPreviewItems = computed(() => {
  const {ticketPriceId} = formState
  if (!ticketPriceId || !bookingOptions.value.action) return []

  // Resolve buckets using same logic as server; a new guest has no order and no queue entry
  const buckets = resolveUserBookingBuckets(
    guestOrdersOf({...formState, ticketPriceId}),
    [],
    [props.dinnerEvent],
    props.deadlines
  )

  // Format preview items - use booker name for guest label
  return formatActionPreview(buckets, [], [props.dinnerEvent], () => props.bookerName, supply)
})

// The button names the guests; the preview lines name what saving does for them, one line per outcome
const saveLabel = computed(() => guestSaveLabel(formState.count))

// Enabled modes for guest: filter out NONE (can't add a guest who won't eat)
const enabledModesForGuest = computed((): DinnerMode[] =>
  bookingOptions.value.enabledModes.filter(m => m !== DinnerModeEnum.NONE)
)

// Disabled modes: all modes not in enabledModesForGuest
const ALL_MODES: DinnerMode[] = [DinnerModeEnum.DINEIN, DinnerModeEnum.DINEINLATE, DinnerModeEnum.TAKEAWAY, DinnerModeEnum.NONE]
const disabledModes = computed((): DinnerMode[] =>
  ALL_MODES.filter(m => !enabledModesForGuest.value.includes(m))
)

// Allergy options for AllergySelectMenu (pass full AllergyTypeDisplay)
const allergyOptions = computed(() => props.allergyTypes)

// Default to first enabled eating mode
watch(enabledModesForGuest, (modes) => {
  if (modes.length > 0 && !modes.includes(formState.dinnerMode)) {
    formState.dinnerMode = modes[0]!
  }
}, {immediate: true})

// UForm submit handler - receives validated data from FormSubmitEvent
const handleSubmit = async (event: FormSubmitEvent<GuestBookingFormData>) => {
  if (!event.data.ticketPriceId || !bookingOptions.value.action) return

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
  <!-- Empty state: no booking action available -->
  <UAlert
    v-if="!bookingOptions.action"
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
          <UBadge v-if="hasTicketsForSale(props.releasedTicketCounts)" :color="COLOR.info" :icon="ICONS.claim" :variant="NOISE.subtle" :size="SIZES.small">
            {{ SUPPLY_WORDS.forSaleCount(props.releasedTicketCounts) }}
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
          :disabled-modes="disabledModes"
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
          <ActionPreview :items="actionPreviewItems" title="Du er ved at tilføje gæster" />

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
