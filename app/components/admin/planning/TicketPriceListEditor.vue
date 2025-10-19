<script setup lang="ts">
import type {TicketPrice} from "~/composables/useTicketPriceValidation"
import {getErrorMessage, mapZodErrorsToFormErrors} from "~/utils/validtation"

// COMPONENT DEPENDENCIES
const {TICKET_TYPES, TicketPricesArraySchema, createTicketPrice} = useTicketPriceValidation()

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
  ticketType: TICKET_TYPES[0],
  priceDKK: 0,
  maximumAgeLimit: undefined as number | undefined,
  description: ''
})

// Helpers
const toDKK = (ore: number): string => (ore / 100).toFixed(2)
const toOre = (dkk: number): number => Math.round(dkk * 100)

const formatTicketType = (type: string): string => {
  const labels: Record<string, string> = {
    'ADULT': 'Voksen',
    'CHILD': 'Barn',
    'BABY': 'Baby',
    'HUNGRY_BABY': 'Sulten baby'
  }
  return labels[type] || type
}

// COMPUTED
const ticketTypeOptions = computed(() =>
  TICKET_TYPES.map(type => ({
    label: formatTicketType(type),
    value: type
  }))
)


// ACTIONS
const resetNewTicket = () => {
  newTicket.value = {
    ticketType: TICKET_TYPES[0],
    priceDKK: 0,
    maximumAgeLimit: undefined,
    description: ''
  }
}

const onAddTicketPrice = () => {
  const ticketPrice = createTicketPrice(
    newTicket.value.ticketType,
    toOre(newTicket.value.priceDKK),
    undefined,
    newTicket.value.description || undefined,
    newTicket.value.maximumAgeLimit
  )

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
    <UCard v-show="!props.disabled" class="mb-4">
      <template #header>
        <h3 class="text-sm font-semibold">Tilføj billettyper</h3>
      </template>

      <div class="flex flex-col gap-6 w-full">
        <div class="flex gap-4 w-full">
          <UFormField label="Billettype" name="ticketType" class="flex-1 min-w-0">
            <USelect
                v-model="newTicket.ticketType"
                :items="ticketTypeOptions"
                :ui="{ content: 'min-w-fit' }"
                name="ticketType"/>
          </UFormField>

          <UFormField
              label="Pris (DKK)"
              name="ticketPrice"
              class="flex-1 min-w-0"
              :error="getErrorMessage(errors, ['price'])">
            <UInput
                v-model="newTicket.priceDKK"
                type="number"
                step="1"
                min="0"
                name="ticketPrice"
                placeholder="0.00"/>
          </UFormField>

          <UFormField label="Max alder" name="maxAge" class="flex-1 min-w-0">
            <UInput
                v-model="newTicket.maximumAgeLimit"
                type="number"
                min="0"
                name="maxAge"
                placeholder="--"/>
          </UFormField>
        </div>

        <UFormField label="Beskrivelse (valgfrit)" name="description" class="w-full">
          <UTextarea
              v-model="newTicket.description"
              name="description"
              :rows="1"
              :ui="{ root: 'w-full' }"
              placeholder="F.eks. 'Fra 11 år og opefter'"/>
        </UFormField>

        <p v-if="getErrorMessage(errors, ['_'])" class="text-red-500 text-sm">
          {{ getErrorMessage(errors, ['_']) }}
        </p>
      </div>

      <template #footer>
        <div class="flex justify-end">
          <UButton
              @click="onAddTicketPrice"
              name="addTicketPrice"
              color="info"
              icon="i-heroicons-ticket"
              variant="outline">
            Tilføj billet
          </UButton>
        </div>
      </template>
    </UCard>

    <!-- List of ticket prices -->
    <ul v-if="model?.length > 0" class="mt-4 space-y-2">
      <li
          v-for="(ticket, index) in model"
          :key="`ticket-${index}-${ticket.ticketType}`">
        <UFormField :label="index === 0 ? 'Billetpriser' : ''">
          <div class="flex flex-col gap-1">
            <div class="flex items-start gap-2">
              <UInput
                  :model-value="`${formatTicketType(ticket.ticketType)}: ${toDKK(ticket.price)} DKK${ticket.maximumAgeLimit ? ` (max ${ticket.maximumAgeLimit} år)` : ''}`"
                  :name="`ticketPrice-${index}`"
                  disabled
                  :ui="{ input: 'truncate-none' }"
              >
                <template #leading>
                  <UIcon name="i-heroicons-ticket"/>
                </template>
              </UInput>
              <UButton
                  v-if="!props.disabled"
                  @click="model.splice(index, 1)"
                  :name="`removeTicketPrice-${index}`"
                  color="error"
                  icon="i-heroicons-trash"
                  size="sm"
                  variant="ghost"
                  class="mt-1"/>
            </div>
            <p v-if="ticket.description" class="text-sm text-gray-500 ml-1">
              {{ ticket.description }}
            </p>
          </div>
        </UFormField>
      </li>
    </ul>
    <h3 v-else class="text-md mx-auto text-gray-500">
      Ingen billetpriser defineret endnu.
    </h3>
  </div>
</template>
