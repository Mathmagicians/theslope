<script setup lang="ts">
/**
 * TicketPriceListEditor - the season form's ticket prices: the card that adds a price and the list of prices
 *
 * Each price is a DinnerTicket, the ticket the booking form shows: the type badge in its colour with the price, the age
 * limit and description on row 2, and the remove button where the booking form shows how you eat. View mode drops the
 * add card and the remove buttons.
 *
 * DESKTOP:
 * ┃  [  ][  ][  ]  [BABY · 0kr]                              [remove]  ░░[tk]░░┃
 * ┃                Under 2 år · Spiser gratis smagsprøver fra forældrene  ░░░░░░░┃
 * ┃  [  ][  ][  ]  [BARN · 17kr]                             [remove]  ░░[tk]░░┃
 * ┃                Under 12 år · Barn                                     ░░░░░░░┃
 * ┃  [  ][  ][  ]  [VOKSEN · 40kr]                           [remove]  ░░[tk]░░┃
 * ┃                Voksen                                                 ░░░░░░░┃
 *
 * PHONE - row 2 wraps under the badge:
 * ┃  [  ][  ][  ]  [BABY · 0kr]      [remove]  ░[tk]░┃
 * ┃                Under 2 år · Spiser gratis       ░░░░░┃
 * ┃                smagsprøver fra forældrene        ░░░░░┃
 *
 * Visual check: /admin/planning in view and edit, the prices and the empty line, phone and desktop.
 */
import type {TicketPrice} from "~/composables/useTicketPriceValidation"
import type {TicketType as TicketTypeValue} from '~/composables/useBookingValidation'
import {getErrorMessage, mapZodErrorsToFormErrors} from "~/utils/validtation"
import {SEASON_WORDS} from '~/config/seasonWords'

const {BUTTONS, COLOR, COMPONENTS, ICONS, TYPOGRAPHY, TEXT} = useTheSlopeDesignSystem()
const {TicketTypeSchema, TicketPricesArraySchema, createTicketPrice} = useTicketPriceValidation()
const {portionsOf} = useTicket()
const {typedKrToGrossOre} = useOrder()
const WORDS = SEASON_WORDS.ticketPriceEditor
const TICKET_TYPES = TicketTypeSchema.options
const TicketType = TicketTypeSchema.enum

const model = defineModel<TicketPrice[]>({required: true, default: () => []})
const props = withDefaults(defineProps<{
  disabled?: boolean
}>(), {
  disabled: false
})

const errors = ref<Map<string, string[]>>(new Map())

// The add card's draft holds the price in kroner as typed; the price becomes øre on add
type TicketDraft = {ticketType: TicketTypeValue, priceDKK: number, maximumAgeLimit: number | undefined, description: string}
const emptyDraft = (): TicketDraft => ({ticketType: TicketType.ADULT, priceDKK: 0, maximumAgeLimit: undefined, description: ''})
const newTicket = ref<TicketDraft>(emptyDraft())

// Each price with its type's presentation, its badge text and its note
const priceItems = computed(() => ticketPriceSelectItems(model.value))

const ticketTypeOptions = computed(() =>
  TICKET_TYPES.map(type => ({
    label: ticketTypeLabel(type),
    value: type
  }))
)

const onAddTicketPrice = () => {
  const {ticketType, priceDKK, description, maximumAgeLimit} = newTicket.value
  const price = typedKrToGrossOre(priceDKK, false)
  const ticketPrice = createTicketPrice({
    ticketType, price, description: description || undefined, maximumAgeLimit, portions: portionsOf({ticketType, price})
  })

  const newPrices = [...model.value, ticketPrice]
  const validation = TicketPricesArraySchema.safeParse(newPrices)

  if (validation.success) {
    model.value = newPrices
    newTicket.value = emptyDraft()
    errors.value.clear()
  } else {
    errors.value = mapZodErrorsToFormErrors(validation.error)
  }
}

const onRemoveTicketPrice = (index: number) => {
  model.value = model.value.filter((_, i) => i !== index)
}
</script>

<template>
  <div>
    <!-- v-if, not v-show: view mode drops the draft controls out of the DOM and the tab order, as the row trash does -->
    <UCard v-if="!props.disabled" :class="COMPONENTS.ticketPriceEditor.addCard">
      <template #header>
        <h3 :class="COMPONENTS.ticketPriceEditor.addTitle">{{ WORDS.addTitle }}</h3>
      </template>

      <div :class="COMPONENTS.ticketPriceEditor.addStack">
        <div :class="COMPONENTS.ticketPriceEditor.addRow">
          <UFormField :label="WORDS.ticketType" name="ticketType" :class="COMPONENTS.ticketPriceEditor.addField">
            <USelect
                v-model="newTicket.ticketType"
                :items="ticketTypeOptions"
                :ui="COMPONENTS.ticketPriceEditor.typeSelectUi"
                name="ticketType"/>
          </UFormField>

          <UFormField
              :label="WORDS.price"
              name="ticketPrice"
              :class="COMPONENTS.ticketPriceEditor.addField"
              :error="getErrorMessage(errors, ['price'])">
            <UInput
                v-model="newTicket.priceDKK"
                type="number"
                step="1"
                min="0"
                name="ticketPrice"
                placeholder="0.00"/>
          </UFormField>

          <UFormField :label="WORDS.maxAge.label" name="maxAge" :class="COMPONENTS.ticketPriceEditor.addField">
            <UInput
                v-model="newTicket.maximumAgeLimit"
                type="number"
                min="0"
                name="maxAge"
                :placeholder="WORDS.maxAge.placeholder"/>
          </UFormField>
        </div>

        <UFormField :label="WORDS.description.label" name="description" :class="COMPONENTS.ticketPriceEditor.descriptionField">
          <UTextarea
              v-model="newTicket.description"
              name="description"
              :rows="1"
              :ui="COMPONENTS.ticketPriceEditor.descriptionUi"
              :placeholder="WORDS.description.placeholder"/>
        </UFormField>

        <p v-if="getErrorMessage(errors, ['_'])" :class="[TEXT.red[500], TYPOGRAPHY.bodyTextSmall]">
          {{ getErrorMessage(errors, ['_']) }}
        </p>
      </div>

      <template #footer>
        <div :class="COMPONENTS.ticketPriceEditor.addFooter">
          <UButton
              v-bind="BUTTONS.secondaryAction"
              data-testid="ticket-price-add"
              :color="COLOR.info"
              :icon="ICONS.ticket"
              @click="onAddTicketPrice">
            {{ WORDS.add }}
          </UButton>
        </div>
      </template>
    </UCard>

    <ul v-if="model?.length > 0" :class="COMPONENTS.seasonFormList.list">
      <li
          v-for="(item, index) in priceItems"
          :key="`ticket-${index}-${item.ticketType}`">
        <DinnerTicket :ticket-config="item.presentation" :price="item.price" :note="item.description">
          <template #end>
            <UButton
                v-if="!props.disabled"
                v-bind="BUTTONS.remove"
                :data-testid="`ticket-price-remove-${index}`"
                :aria-label="WORDS.remove(item.presentation.label)"
                @click="onRemoveTicketPrice(index)"/>
          </template>
        </DinnerTicket>
      </li>
    </ul>
    <h3 v-else :class="[COMPONENTS.seasonFormList.empty, TEXT.gray[500]]">
      Ingen billetpriser defineret endnu.
    </h3>
  </div>
</template>
