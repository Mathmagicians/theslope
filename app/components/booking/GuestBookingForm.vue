<script setup lang="ts">
/**
 * GuestBookingForm - Standalone form for adding a guest to a dinner
 *
 * Uses getBookingOptions to determine:
 * - Which dinner modes are available based on deadlines and released tickets
 * - Which action to take: 'process' (scaffolder) vs 'claim' (claim endpoint)
 *
 * For "add guest" context, NONE is always disabled (can't add a guest who won't eat)
 * but shown for visual consistency with other booking forms.
 */
import type {DinnerEventDisplay, DinnerMode, DesiredOrder, GuestBookingFormData} from '~/composables/useBookingValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'
import type {SeasonDeadlines} from '~/composables/useSeason'
import type {FormSubmitEvent} from '@nuxt/ui'
import {FORM_MODES} from '~/types/form'

interface Props {
  dinnerEvent: DinnerEventDisplay
  ticketPrices: TicketPrice[]
  allergyTypes: AllergyTypeDisplay[]
  deadlines: SeasonDeadlines
  releasedTicketCount: number
  bookerId: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  save: [orders: DesiredOrder[], action: 'process' | 'claim']
  cancel: []
}>()

// Design system
const {SIZES, COLOR, ICONS} = useTheSlopeDesignSystem()

// Booking logic
const {getBookingOptions, createBookingBadges} = useBooking()
const {canModifyOrders, canEditDiningMode} = props.deadlines

// Validation schemas
const {DinnerModeSchema, OrderStateSchema, GuestBookingFormSchema} = useBookingValidation()
const DinnerModeEnum = DinnerModeSchema.enum
const OrderStateEnum = OrderStateSchema.enum

// Booking options using getBookingOptions utility (orderState = null for new guest)
const bookingOptions = computed(() => getBookingOptions(
  null,
  canModifyOrders(props.dinnerEvent.date),
  canEditDiningMode(props.dinnerEvent.date),
  props.dinnerEvent.state,
  props.releasedTicketCount > 0
))

// Form state - reactive object for UForm binding
const formState = reactive({
  count: 1,
  ticketPriceId: undefined as number | undefined,
  allergyTypeIds: [] as number[],
  dinnerMode: DinnerModeEnum.DINEIN as DinnerMode
})
const isSaving = ref(false)

// Contextual schema with closure - validates count against released tickets when claiming
const formSchema = computed(() =>
  GuestBookingFormSchema.refine(
    (data) => {
      if (bookingOptions.value.action === 'claim') {
        return data.count <= props.releasedTicketCount
      }
      return true
    },
    {
      message: `Kun ${props.releasedTicketCount} billet${props.releasedTicketCount === 1 ? '' : 'ter'} ledig${props.releasedTicketCount === 1 ? '' : 'e'}`,
      path: ['count']
    }
  )
)

// Deadline badges using existing factory
const badges = computed(() => createBookingBadges(props.dinnerEvent, props.deadlines, props.releasedTicketCount))

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

// UForm submit handler - validates with Zod schema before emitting
const handleSubmit = async () => {
  isSaving.value = true

  try {
    const {ticketPriceId, allergyTypeIds, count, dinnerMode} = formState
    const {action} = bookingOptions.value

    if (!ticketPriceId || !action) return

    const orders: DesiredOrder[] = Array.from({length: count}, () => ({
      inhabitantId: props.bookerId,
      dinnerEventId: props.dinnerEvent.id,
      dinnerMode,
      ticketPriceId,
      isGuestTicket: true,
      allergyTypeIds: allergyTypeIds.length > 0 ? allergyTypeIds : undefined,
      state: OrderStateEnum.BOOKED
    }))

    emit('save', orders, action)
  } finally {
    isSaving.value = false
  }
}

const handleCancel = () => emit('cancel')
</script>

<template>
  <UCard
    color="info"
    variant="soft"
    :ui="{body: 'p-4 flex flex-col gap-4', footer: 'p-4'}"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon :name="ICONS.userPlus" class="size-5 text-info" />
        <h4 class="text-md font-semibold">Tilføj gæst</h4>
        <UBadge v-if="props.releasedTicketCount > 0" :color="COLOR.info" :icon="ICONS.claim" variant="subtle" :size="SIZES.small">
          {{ props.releasedTicketCount }} Ledig{{ props.releasedTicketCount === 1 ? '' : 'e' }}
        </UBadge>
      </div>
    </template>

    <!-- Deadline badges -->
    <div class="flex flex-wrap gap-4">
      <DeadlineBadge :badge="badges.booking" />
      <DeadlineBadge :badge="badges.diningMode" />
    </div>

    <!-- Form fields when booking is available -->
    <UForm
      v-if="bookingOptions.action"
      :schema="GuestBookingFormSchema"
      :state="formState"
      class="flex flex-col gap-4"
      @submit="handleSubmit"
    >
      <UFormField label="Antal gæster" name="count" :size="SIZES.small">
        <UInput
          v-model="formState.count"
          type="number"
          :min="1"
          :max="10"
          :size="SIZES.small"
        />
      </UFormField>

      <UFormField label="Billettype" name="ticketPriceId" :size="SIZES.small">
        <USelect
          v-model="formState.ticketPriceId"
          :items="ticketPrices.map(p => ({label: p.description ?? p.ticketType, value: p.id}))"
          value-key="value"
          :size="SIZES.small"
          data-testid="guest-ticket-type-select"
        />
      </UFormField>

      <UFormField v-if="allergyOptions.length > 0" label="Allergier (valgfrit)" name="allergyTypeIds" :size="SIZES.small">
        <AllergySelectMenu
          v-model="formState.allergyTypeIds"
          :allergy-types="allergyOptions"
          :multiple="true"
          placeholder="Vælg allergier..."
        />
      </UFormField>

      <UFormField label="Spisemåde" name="dinnerMode" :size="SIZES.small">
        <DinnerModeSelector
          v-model="formState.dinnerMode"
          :form-mode="FORM_MODES.EDIT"
          :disabled-modes="disabledModes"
          :size="SIZES.small"
          name="guest-dinner-mode"
          orientation="horizontal"
        />
      </UFormField>

      <div class="flex justify-end gap-2 pt-2">
        <UButton
          :color="COLOR.neutral"
          variant="ghost"
          :icon="ICONS.xMark"
          :size="SIZES.small"
          data-testid="guest-form-cancel"
          @click="handleCancel"
        >
          Annuller
        </UButton>
        <UButton
          type="submit"
          color="info"
          variant="solid"
          :size="SIZES.small"
          :loading="isSaving"
          data-testid="guest-form-save"
        >
          <template #leading>
            <UIcon :name="ICONS.userPlus" />
          </template>
          Tilføj gæst
        </UButton>
      </div>
    </UForm>

    <template #footer />
  </UCard>
</template>
