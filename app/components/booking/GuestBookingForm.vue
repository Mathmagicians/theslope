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
import type {TicketPriceSelectItem} from '~/composables/useTicket'
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
  save: [orders: DesiredOrder[]]
  cancel: []
}>()

// Design system
const {SIZES, COLOR, ICONS, COMPONENTS, getRandomEmptyMessage} = useTheSlopeDesignSystem()

// Ticket type config for styled badges
const {getTicketPriceSelectItems} = useTicket()

// Empty state message when no booking action available
const emptyStateMessage = computed(() => getRandomEmptyMessage('noGuestTickets'))

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


// Contextual validation - business logic that needs props/computed access
// Zod schema handles structural validation (type, min, max)
const validateForm = (state: Partial<typeof formState>) => {
  const errors: {name: string, message: string}[] = []
  const {action} = bookingOptions.value
  const count = state.count ?? 1

  // No booking action available (deadlines passed, no released tickets, etc.)
  if (!action) {
    errors.push({name: 'count', message: 'Kan desværre ikke tilmelde dine gæster'})
  }

  // Claiming: count must not exceed available released tickets
  if (action === 'claim' && count > props.releasedTicketCount) {
    errors.push({
      name: 'count',
      message: `Kun ${props.releasedTicketCount} billet${props.releasedTicketCount === 1 ? '' : 'ter'} ledig${props.releasedTicketCount === 1 ? '' : 'e'}`
    })
  }

  return errors
}


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

// UForm submit handler - receives validated data from FormSubmitEvent
const handleSubmit = async (event: FormSubmitEvent<GuestBookingFormData>) => {
  const {ticketPriceId, allergyTypeIds, count, dinnerMode} = event.data

  if (!ticketPriceId || !bookingOptions.value.action) return

  isSaving.value = true

  try {
    const orders: DesiredOrder[] = Array.from({length: count}, () => ({
      inhabitantId: props.bookerId,
      dinnerEventId: props.dinnerEvent.id,
      dinnerMode,
      ticketPriceId,
      isGuestTicket: true,
      allergyTypeIds: allergyTypeIds.length > 0 ? allergyTypeIds : undefined,
      state: OrderStateEnum.BOOKED
    }))

    emit('save', orders)
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
    :color="COLOR.neutral"
    variant="soft"
    :avatar="{text: emptyStateMessage.emoji, size: SIZES.emptyStateAvatar}"
    :ui="COMPONENTS.emptyStateAlert"
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

      <!-- Deadline badges + Dinner mode selector (top, like regular form) -->
      <div class="flex flex-col md:flex-row md:justify-between gap-2">
        <DeadlineBadge :badge="badges.booking" />
        <DeadlineBadge :badge="badges.diningMode" />
      </div>

      <UFormField label="Hvordan spiser I?" name="dinnerMode" :size="SIZES.small">
        <DinnerModeSelector
          v-model="formState.dinnerMode"
          :form-mode="FORM_MODES.EDIT"
          :disabled-modes="disabledModes"
          :size="SIZES.small"
          name="guest-dinner-mode"
          orientation="horizontal"
        />
      </UFormField>

      <!-- Two columns: ticket info | allergies (stacked on mobile) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Left: Antal + Billettype -->
        <div class="flex flex-col gap-4">
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
              :items="getTicketPriceSelectItems(ticketPrices).toReversed()"
              value-key="id"
              placeholder="Vælg billettype..."
              class="w-full"
              data-testid="guest-ticket-type-select"
            >
              <template #item="{ item }">
                <div class="flex flex-col gap-0.5">
                  <UBadge :color="(item as TicketPriceSelectItem).config.color" variant="solid" size="sm" class="uppercase w-fit">
                    {{ (item as TicketPriceSelectItem).label }}
                  </UBadge>
                  <span v-if="(item as TicketPriceSelectItem).description" class="text-xs text-muted">{{ (item as TicketPriceSelectItem).description }}</span>
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

      <!-- Footer: Error messages + action buttons -->
      <template #footer>
        <div class="flex flex-col gap-2">
          <!-- Error messages near buttons -->
          <div v-if="errors.length > 0" class="text-sm text-error">
            <div v-for="error in errors" :key="error.name" class="flex items-center gap-1">
              <UIcon :name="ICONS.xMark" class="size-4" />
              <span>{{ error.message }}</span>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex justify-end gap-2">
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
        </div>
      </template>
      </UCard>
    </template>
  </UForm>
</template>
