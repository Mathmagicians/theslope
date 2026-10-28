<script setup lang="ts">
import {formatDate} from '~/utils/date'

// Age categories - the active season's ticket prices carry the age limits
const {groupInhabitantsByTicketCategory} = useTicket()
const {formatTicketCounts} = useBilling()
const {TYPOGRAPHY, BUTTONS, COLOR, ICONS, COMPONENTS} = useTheSlopeDesignSystem()
const poster = COMPONENTS.allergyPoster

// A printed sheet: no layout, and light mode whatever the member's mode, since a dark face reads pale on white paper
definePageMeta({
  layout: false,
  colorMode: 'light'
})

// STORES
const store = useAllergiesStore()
const {allergyTypes, isAllergyTypesLoading, posterNotes} = storeToRefs(store)
const planStore = usePlanStore()
const {activeSeason} = storeToRefs(planStore)
const now = useClock()

// Current date for header (formatted in Danish)
const currentDate = computed(() => formatDate(now.value, 'd. MMMM yyyy'))

// QR Code URL (uses current request URL for correct environment - local/dev/prod)
const requestUrl = useRequestURL()
const qrCodeUrl = computed(() => `${requestUrl.origin}/admin/allergies/pdf`)

// Inhabitants per allergy, classified into age categories (ADULT, CHILD, BABY order)
const allergyData = computed(() => {
  return allergyTypes.value
      .filter(at => at.inhabitants && at.inhabitants.length > 0)
      .map(allergyType => {
        const categories = groupInhabitantsByTicketCategory(
            allergyType.inhabitants ?? [],
            activeSeason.value?.ticketPrices,
            now.value
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

const printPage = () => {
  if (import.meta.client) {
    window.print()
  }
}
</script>

<template>
  <div :class="poster.sheet">

    <div :class="poster.frame">
      <!-- No-print controls; the print CSS below names its hooks (no-print, poster-row) -->
      <div class="no-print" :class="poster.controls">
        <UButton
            v-bind="BUTTONS.primaryAction"
            :color="COLOR.primary"
            :icon="ICONS.arrowLeft"
            to="/admin/allergies"
        >
          Tilbage
        </UButton>
        <UButton
            v-bind="BUTTONS.primaryAction"
            :color="COLOR.primary"
            :icon="ICONS.printer"
            @click="printPage"
        >
          Print
        </UButton>
      </div>

      <Loader v-if="isAllergyTypesLoading" text="Indlæser allergier..."/>

      <div v-else>
        <!-- Header -->
        <div :class="poster.header">
          <h1 :class="poster.title">
            ALLERGI-LISTE for skrånere
          </h1>
          <p :class="TYPOGRAPHY.bodyTextMuted">pr. {{ currentDate }}</p>
        </div>

        <!-- Main content with QR code -->
        <div class="poster-row" :class="poster.row">
          <!-- Allergy table -->
          <div :class="poster.tableColumn">
            <table data-testid="allergy-table" :class="poster.table">
              <thead>
              <tr>
                <th :class="poster.headCell.allergen">ALLERGEN / INTOLERANCE</th>
                <th :class="poster.headCell.person">PERSON</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="allergy in allergyData" :key="allergy.id">
                <td :class="poster.bodyCell">
                  <div :class="poster.allergyName">
                    {{ allergy.icon }} {{ allergy.name.toUpperCase() }}
                  </div>
                  <div :class="poster.description">
                    {{ allergy.description }}
                  </div>
                </td>
                <td :class="poster.bodyCell">
                  <div :class="poster.members">
                    <!-- List inhabitants with compact category marker (V/B/b) -->
                    <div>
                      <span v-for="(person, idx) in allergy.members" :key="person.id">
                        {{ person.name }} ({{ ticketTypeLetter(person.ticketType) }})
                        <span
                            v-if="person.inhabitantComment"
                            :class="poster.comment">
                          - {{ person.inhabitantComment }}
                        </span>
                        <span v-if="idx < allergy.members.length - 1">, </span>
                      </span>
                    </div>

                    <!-- Count summary, e.g. [2V 1B] -->
                    <div :class="poster.counts">
                      [{{ allergy.ticketCounts }}]
                    </div>
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
          </div>

          <!-- QR code to the online list - drawn inline, so it prints with the poster -->
          <div :class="poster.qrColumn">
            <QrCode
                :value="qrCodeUrl"
                label="Scan for online version"
                :class="poster.qrFrame"
            />
            <p :class="poster.qrCaption">Scan for online version</p>
          </div>
        </div>

        <!-- Footer notes - same component and same Setting row as the catalog header; edited there -->
        <AllergyNotes :notes="posterNotes" :class="poster.notes"/>

        <!-- Allergy manager contact -->
        <AllergyManagersList
            kind="legend"
            message="Tal med allergiansvarlig for hjælp til at spotte allergener i opskrifterne og udtænke allergihensyn!"
            :class="poster.managers"
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

  /* A4 content is ~680px, below the md breakpoint, so the printed row keeps the QR beside the table */
  .poster-row {
    flex-direction: row;
  }

  .no-print {
    display: none !important;
  }

  .page-break {
    page-break-before: always;
  }
}
</style>