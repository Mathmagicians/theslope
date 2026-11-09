<script setup lang="ts">
/**
 * HouseholdEditPanel - Expanded row content for admin household editing.
 *
 * Emits actions to parent (AdminHouseholds) which handles store calls and toasts.
 *
 * Sections:
 * - Stamdata: read-only Heynabo-owned fields
 * - Residens: read-only badge
 * - Beboere: shared InhabitantSelector for moving inhabitants
 * - Slet: DangerButton two-click delete
 *
 * Visual check: /admin/households, a household's row opened, phone and desktop.
 */
import type {HouseholdDisplay, InhabitantDisplay} from '~/composables/useCoreValidation'
import {BUTTON_WORDS} from '~/config/buttonWords'
import {HOUSEHOLD_WORDS} from '~/config/householdWords'

interface Props {
  household: HouseholdDisplay
  allHouseholds: HouseholdDisplay[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  'move:inhabitant': [inhabitantId: number]
  delete: []
  close: []
}>()

const {SIZES, ICONS, TYPOGRAPHY, BUTTONS, COLOR, TEXT, NOISE, COMPONENTS, LAYOUTS} = useTheSlopeDesignSystem()
const panel = COMPONENTS.householdEditPanel
const WORDS = HOUSEHOLD_WORDS.editPanel

const now = useClock()
const residency = computed(() => getResidencyDisplay(props.household.movedInDate, props.household.moveOutDate, now.value))

// Only the inhabitants of the households at the same address (same heynaboId)
const sameAddressHouseholds = computed(() =>
    props.allHouseholds.filter(h => h.heynaboId === props.household.heynaboId)
)

const allInhabitants = computed(() => sameAddressHouseholds.value.flatMap(h => h.inhabitants ?? []))

const isInThisHousehold = (id: number) =>
    props.household.inhabitants?.some(i => i.id === id) ?? false

const getHouseholdForInhabitant = (id: number) =>
    sameAddressHouseholds.value.find(h => h.inhabitants?.some(i => i.id === id))

const sortByHouseholdThenName = (rowA: {original: InhabitantDisplay}, rowB: {original: InhabitantDisplay}): number => {
  const aHere = isInThisHousehold(rowA.original.id)
  const bHere = isInThisHousehold(rowB.original.id)
  if (aHere && !bHere) return -1
  if (!aHere && bHere) return 1
  return `${rowA.original.name} ${rowA.original.lastName}`
      .localeCompare(`${rowB.original.name} ${rowB.original.lastName}`)
}

const inhabitantCount = computed(() => props.household.inhabitants?.length ?? 0)
</script>

<template>
  <div :class="panel.root">
    <section>
      <h3 :class="panel.sectionTitle">{{ WORDS.facts.title }}</h3>
      <div :class="panel.facts">
        <div>
          <span :class="TEXT.neutral[500]">{{ WORDS.facts.pbs }}</span>
          <div :class="panel.factValue">{{ household.pbsId }}</div>
        </div>
        <div>
          <span :class="TEXT.neutral[500]">{{ WORDS.facts.address }}</span>
          <div :class="panel.factValue">{{ household.address }} <UBadge :color="COLOR.neutral" :variant="NOISE.medium" :size="SIZES.small">{{ BUTTON_WORDS.heynabo.name }}</UBadge></div>
        </div>
        <div>
          <span :class="TEXT.neutral[500]">{{ WORDS.facts.heynaboId }}</span>
          <div :class="panel.factValue">{{ household.heynaboId }}</div>
        </div>
        <div>
          <span :class="TEXT.neutral[500]">{{ WORDS.facts.shortName }}</span>
          <div :class="panel.factValue">{{ household.shortName }}</div>
        </div>
      </div>
    </section>

    <section>
      <h3 :class="panel.sectionTitle">{{ WORDS.residency.title }}</h3>
      <UBadge
          v-if="residency"
          :color="residency.color"
          :icon="residency.icon"
          :variant="NOISE.subtle"
          :size="SIZES.small"
      >
        {{ residency.badgeText }}
      </UBadge>
      <span v-else :class="[TYPOGRAPHY.bodyTextSmall, TEXT.neutral[500]]">{{ WORDS.residency.active }}</span>
    </section>

    <section>
      <h3 :class="panel.sectionTitle">{{ WORDS.inhabitants.title }}</h3>
      <InhabitantSelector
          :inhabitants="allInhabitants"
          :sort-fn="sortByHouseholdThenName"
          :loading="loading"
          :status-header="WORDS.inhabitants.household"
          :actions-header="WORDS.inhabitants.action"
          :search-placeholder="WORDS.inhabitants.search"
          :empty-text="WORDS.inhabitants.empty"
      >
        <template #status="{ row }">
          <template v-for="h in [getHouseholdForInhabitant(row.original.id)]" :key="h?.id">
            <UBadge
                v-if="h"
                :color="h.id === household.id ? COLOR.success : COLOR.neutral"
                :variant="h.id === household.id ? NOISE.loud : NOISE.medium"
                :size="SIZES.small"
                :class="panel.householdBadge"
            >
              {{ WORDS.inhabitants.householdBadge(h.shortName, h.pbsId) }}
            </UBadge>
          </template>
        </template>

        <template #actions="{ row }">
          <span v-if="isInThisHousehold(row.original.id)" :class="[TYPOGRAPHY.finePrint, TEXT.neutral[500]]">{{ WORDS.inhabitants.here }}</span>
          <UButton
              v-else
              :color="COLOR.primary"
              :variant="NOISE.soft"
              :size="SIZES.small"
              :loading="loading"
              @click="emit('move:inhabitant', row.original.id)"
          >
            <template #leading><UIcon :name="ICONS.moveIn" /></template>
            {{ WORDS.inhabitants.moveHere }}
          </UButton>
        </template>
      </InhabitantSelector>
    </section>

    <div :class="[panel.footer, LAYOUTS.panelDivider]">
      <DangerButton
          :label="WORDS.delete.label(household.shortName, household.pbsId)"
          :confirm-label="WORDS.delete.confirm(household.shortName, household.pbsId, inhabitantCount)"
          :loading="loading"
          @confirm="emit('delete')"
      />
      <UButton v-bind="BUTTONS.cancel" @click="emit('close')">
        {{ BUTTON_WORDS.cancel }}
      </UButton>
    </div>
  </div>
</template>
