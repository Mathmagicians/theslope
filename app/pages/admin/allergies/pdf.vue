<script setup lang="ts">
import {formatDate} from '~/utils/date'

// Age categories - the active season's ticket prices carry the age limits
const {groupInhabitantsByTicketCategory, ticketTypeConfig} = useTicket()
const {formatTicketCounts} = useBilling()
const {TYPOGRAPHY, COLOR} = useTheSlopeDesignSystem()

// No layout for printing
definePageMeta({
  layout: false
})

// STORES
const store = useAllergiesStore()
const {allergyTypes, isAllergyTypesLoading} = storeToRefs(store)
const planStore = usePlanStore()
const {activeSeason} = storeToRefs(planStore)

// Initialize stores
store.initAllergiesStore()
planStore.initPlanStore()

// Current date for header (formatted in Danish)
const currentDate = computed(() => formatDate(new Date(), 'd. MMMM yyyy'))

// QR Code URL (uses current request URL for correct environment - local/dev/prod)
const requestUrl = useRequestURL()
const qrCodeUrl = computed(() => `${requestUrl.origin}/admin/allergies/pdf`)

// Generate QR code data URL using a simple service
const qrCodeDataUrl = computed(() => {
  if (!qrCodeUrl.value) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrCodeUrl.value)}`
})

// Inhabitants per allergy, classified into age categories (ADULT, CHILD, BABY order)
const allergyData = computed(() => {
  return allergyTypes.value
      .filter(at => at.inhabitants && at.inhabitants.length > 0)
      .map(allergyType => {
        const categories = groupInhabitantsByTicketCategory(
            allergyType.inhabitants ?? [],
            activeSeason.value?.ticketPrices
        )
        const members = categories.flatMap(category => category.inhabitants)
        return {
          ...allergyType,
          members,
          ticketCounts: formatTicketCounts(members)
        }
      })
      .sort((a, b) => b.members.length - a.members.length)
})

// Print function
const printPage = () => {
  if (import.meta.client) {
    window.print()
  }
}
</script>

<template>
  <div class="min-h-screen bg-white">

    <div class="max-w-5xl mx-auto p-8">
      <!-- No-print controls -->
      <div class="no-print mb-6 flex justify-between items-center">
        <UButton
            icon="i-heroicons-arrow-left"
            to="/admin/allergies"
            variant="outline"
            color="secondary"
        >
          Tilbage
        </UButton>
        <UButton
            icon="i-heroicons-printer"
            color="primary"
            @click="printPage"
        >
          Print
        </UButton>
      </div>

      <Loader v-if="isAllergyTypesLoading" text="Indlæser allergier..."/>

      <div v-else>
        <!-- Header -->
        <div class="mb-6">
          <h1 :class="`${TYPOGRAPHY.sectionTitle} mb-2`">
            ALLERGI-LISTE for skrånere
          </h1>
          <p :class="TYPOGRAPHY.bodyTextMuted">pr. {{ currentDate }}</p>
        </div>

        <!-- Main content with QR code -->
        <div class="flex gap-6 mb-6">
          <!-- Allergy table -->
          <div class="flex-1">
            <table data-testid="allergy-table" class="w-full border-collapse">
              <thead>
              <tr>
                <th class="w-1/3 border-2 border-gray-700 p-3 text-left bg-gray-100 font-bold">ALLERGEN / INTOLERANCE</th>
                <th class="w-2/3 border-2 border-gray-700 p-3 text-left bg-gray-100 font-bold">PERSON</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="allergy in allergyData" :key="allergy.id">
                <td class="border-2 border-gray-700 p-3 align-top">
                  <div :class="`${TYPOGRAPHY.cardTitle} mb-2`">
                    {{ allergy.icon }} {{ allergy.name.toUpperCase() }}
                  </div>
                  <div :class="`${TYPOGRAPHY.bodyTextMuted} whitespace-pre-line`">
                    {{ allergy.description }}
                  </div>
                </td>
                <td class="border-2 border-gray-700 p-3 align-top">
                  <div class="space-y-2">
                    <!-- List inhabitants with compact category marker (V/B/b) -->
                    <div>
                      <span v-for="(person, idx) in allergy.members" :key="person.id">
                        {{ person.name }} ({{ ticketTypeConfig[person.ticketType].compactLabel }})
                        <span
                            v-if="person.inhabitantComment"
                            :class="`${TYPOGRAPHY.finePrint} text-gray-600`">
                          - {{ person.inhabitantComment }}
                        </span>
                        <span v-if="idx < allergy.members.length - 1">, </span>
                      </span>
                    </div>

                    <!-- Count summary, e.g. [2V 1B] -->
                    <div :class="`${TYPOGRAPHY.bodyTextMedium} mt-2`">
                      [{{ allergy.ticketCounts }}]
                    </div>
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
          </div>

          <!-- QR Code (no-print on screen) -->
          <div v-if="qrCodeDataUrl" class="no-print">
            <img :src="qrCodeDataUrl" alt="QR Code" class="w-40 h-40 border-2 border-gray-300">
            <p :class="`${TYPOGRAPHY.caption} text-gray-600 mt-2 text-center`">Scan for online version</p>
          </div>
        </div>

        <!-- Footer notes -->
        <UAlert :color="COLOR.warning" variant="outline" class="mt-4">
          <template #description>
            <p :class="`${TYPOGRAPHY.sectionSubheading} mb-2`">Vigtige bemærkninger:</p>
            <ul :class="`list-disc list-inside space-y-1 ${TYPOGRAPHY.bodyTextSmall}`">
              <li>Glutenfri boller findes i fryseren og tages op af madholdet</li>
              <li>Ved mælkeprodukter i brød, vil mælke-allergikere også have brug for glutenfrit brød (som altid er
                mælkefrit)
              </li>
              <li>Husk at give besked om allergener ved menu-præsentationen</li>
            </ul>
          </template>
        </UAlert>

        <!-- Allergy manager contact -->
        <AllergyManagersList
            :color="COLOR.neutral"
            variant="outline"
            message="Tal med allergiansvarlig for hjælp til at spotte allergener i opskrifterne og udtænke allergihensyn!"
            class="mt-6"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  @page {
    size: A4;
    margin: 1.5cm;
  }

  :deep(body) {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .no-print {
    display: none !important;
  }

  .page-break {
    page-break-before: always;
  }
}
</style>