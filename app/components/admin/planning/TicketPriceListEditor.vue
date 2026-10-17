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
 */
import type {TicketPrice} from "~/composables/useTicketPriceValidation"
import {getErrorMessage, mapZodErrorsToFormErrors} from "~/utils/validtation"

// COMPONENT DEPENDENCIES
const {BUTTONS, COLOR, COMPONENTS, ICONS, TYPOGRAPHY, TEXT} = useTheSlopeDesignSystem()
const {TicketTypeSchema, TicketPricesArraySchema, createTicketPrice} = useTicketPriceValidation()
const {portionsOf} = useTicket()
const TICKET_TYPES = TicketTypeSchema.options
const TicketType = TicketTypeSchema.enum

// COMPONENT DEFINITION
const model = defineModel<TicketPrice[]>({required: true, default: () => []})
const props = withDefaults(defineProps<{
  disabled?: boolean
}>(), {
  disabled: false
})

// STATE
const errors = ref<Map<string, string[]>>(new Map())
// Single ref for new ticket - stores price in DKK for UI binding
const newTicket = ref({
  ticketType: TicketType.ADULT,
  priceDKK: 0,
  maximumAgeLimit: undefined as number | undefined,
  description: ''
})

// Helpers
const toOre = (dkk: number): number => Math.round(dkk * 100)


// COMPUTED
// Each price with its type's presentation, its badge text and its note
const priceItems = computed(() => ticketPriceSelectItems(model.value))

const ticketTypeOptions = computed(() =>
  TICKET_TYPES.map(type => ({
    label: ticketTypeLabel(type),
    value: type
  }))
)


// ACTIONS
const resetNewTicket = () => {
  newTicket.value = {
    ticketType: TicketType.ADULT,
    priceDKK: 0,
    maximumAgeLimit: undefined,
    description: ''
  }
}

const onAddTicketPrice = () => {
  const {ticketType, priceDKK, description, maximumAgeLimit} = newTicket.value
  const price = toOre(priceDKK)
  const ticketPrice = createTicketPrice({
    ticketType, price, description: description || undefined, maximumAgeLimit, portions: portionsOf({ticketType, price})
  })

  const newPrices = [...model.value, ticketPrice]
  const validation = TicketPricesArraySchema.safeParse(newPrices)

  if (validation.success) {
    model.value = newPrices
    resetNewTicket()
    errors.value.clear()
  } else {
    errors.value = mapZodErrorsToFormErrors(validation.error)
  }
}
</script>

<template>
  <div>
    <!-- Add new ticket price -->
    <!-- v-if, not v-show: view mode drops the draft controls out of the DOM and the tab order, as the row trash does -->
    <UCard v-if="!props.disabled" :class="COMPONENTS.ticketPriceEditor.addCard">
      <template #header>
        <h3 :class="COMPONENTS.ticketPriceEditor.addTitle">Tilføj billettyper</h3>
      </template>

      <div :class="COMPONENTS.ticketPriceEditor.addStack">
        <div :class="COMPONENTS.ticketPriceEditor.addRow">
          <UFormField label="Billettype" name="ticketType" :class="COMPONENTS.ticketPriceEditor.addField">
            <USelect
                v-model="newTicket.ticketType"
                :items="ticketTypeOptions"
                :ui="COMPONENTS.ticketPriceEditor.typeSelectUi"
                name="ticketType"/>
          </UFormField>

          <UFormField
              label="Pris (DKK)"
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

          <UFormField label="Angiv aldersgrænse" name="maxAge" :class="COMPONENTS.ticketPriceEditor.addField">
            <UInput
                v-model="newTicket.maximumAgeLimit"
                type="number"
                min="0"
                name="maxAge"
                placeholder="Eventuel aldersgrænse"/>
          </UFormField>
        </div>

        <UFormField label="Beskrivelse (valgfrit)" name="description" :class="COMPONENTS.ticketPriceEditor.descriptionField">
          <UTextarea
              v-model="newTicket.description"
              name="description"
              :rows="1"
              :ui="COMPONENTS.ticketPriceEditor.descriptionUi"
              placeholder="F.eks. 'Fra 11 år og opefter'"/>
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
            Tilføj billet
          </UButton>
        </div>
      </template>
    </UCard>

    <!-- List of ticket prices -->
    <ul v-if="model?.length > 0" :class="COMPONENTS.ticketPriceEditor.list">
      <li
          v-for="(item, index) in priceItems"
          :key="`ticket-${index}-${item.ticketType}`">
        <DinnerTicket :ticket-config="item.presentation" :price="item.price" :note="item.description">
          <template #end>
            <UButton
                v-if="!props.disabled"
                v-bind="BUTTONS.remove"
                :data-testid="`ticket-price-remove-${index}`"
                :aria-label="`Fjern ${item.presentation.label}-billet`"
                @click="model.splice(index, 1)"/>
          </template>
        </DinnerTicket>
      </li>
    </ul>
    <h3 v-else :class="[COMPONENTS.ticketPriceEditor.empty, TEXT.gray[500]]">
      Ingen billetpriser defineret endnu.
    </h3>
  </div>
</template>
