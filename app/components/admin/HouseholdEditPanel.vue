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
 */
import type {HouseholdDisplay} from '~/composables/useCoreValidation'

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

const {SIZES, ICONS, TYPOGRAPHY, BUTTONS} = useTheSlopeDesignSystem()

// ========== RESIDENS ==========

const residency = computed(() => getResidencyDisplay(props.household.movedInDate, props.household.moveOutDate))

// ========== BEBOERE ==========

// Only show inhabitants from households at the same address (same heynaboId)
const sameAddressHouseholds = computed(() =>
    props.allHouseholds.filter(h => h.heynaboId === props.household.heynaboId)
)

const allInhabitants = computed(() => sameAddressHouseholds.value.flatMap(h => h.inhabitants ?? []))

const isInThisHousehold = (id: number) =>
    props.household.inhabitants?.some(i => i.id === id) ?? false

const getHouseholdForInhabitant = (id: number) =>
    sameAddressHouseholds.value.find(h => h.inhabitants?.some(i => i.id === id))

const sortByHouseholdThenName = (
    rowA: {original: {id: number, name: string, lastName: string}},
    rowB: {original: {id: number, name: string, lastName: string}}
): number => {
  const aHere = isInThisHousehold(rowA.original.id)
  const bHere = isInThisHousehold(rowB.original.id)
  if (aHere && !bHere) return -1
  if (!aHere && bHere) return 1
  return `${rowA.original.name} ${rowA.original.lastName}`
      .localeCompare(`${rowB.original.name} ${rowB.original.lastName}`)
}

// ========== DELETE ==========

const inhabitantCount = computed(() => props.household.inhabitants?.length ?? 0)
const householdLabel = computed(() => `${props.household.shortName} (PBS ${props.household.pbsId})`)
</script>

<template>
  <div class="p-4 md:p-6 bg-neutral-50 dark:bg-neutral-900 space-y-6">

    <!-- STAMDATA -->
    <section>
      <h3 :class="TYPOGRAPHY.cardTitle" class="mb-3">Stamdata</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <span class="text-neutral-500">PBS-nummer</span>
          <div class="font-medium">{{ household.pbsId }}</div>
        </div>
        <div>
          <span class="text-neutral-500">Adresse</span>
          <div class="font-medium">{{ household.address }} <UBadge color="neutral" variant="outline" :size="SIZES.small">Heynabo</UBadge></div>
        </div>
        <div>
          <span class="text-neutral-500">Heynabo-ID</span>
          <div class="font-medium">{{ household.heynaboId }}</div>
        </div>
        <div>
          <span class="text-neutral-500">Forkortelse</span>
          <div class="font-medium">{{ household.shortName }}</div>
        </div>
      </div>
    </section>

    <!-- RESIDENS -->
    <section>
      <h3 :class="TYPOGRAPHY.cardTitle" class="mb-3">Residens</h3>
      <UBadge
          v-if="residency"
          :color="residency.color"
          :icon="residency.icon"
          variant="subtle"
          :size="SIZES.small"
      >
        {{ residency.badgeText }}
      </UBadge>
      <span v-else class="text-sm text-neutral-500">Aktiv beboer</span>
    </section>

    <!-- BEBOERE -->
    <section>
      <h3 :class="TYPOGRAPHY.cardTitle" class="mb-3">Beboere</h3>
      <InhabitantSelector
          :inhabitants="allInhabitants"
          :sort-fn="sortByHouseholdThenName"
          :loading="loading"
          status-header="Husstand"
          actions-header="Handling"
          search-placeholder="Søg navn, PBS eller adresse..."
          empty-text="Ingen beboere i fællesskabet"
      >
        <template #status="{ row }">
          <template v-for="h in [getHouseholdForInhabitant(row.original.id)]" :key="h?.id">
            <UBadge
                v-if="h"
                :color="h.id === household.id ? 'success' : 'neutral'"
                :variant="h.id === household.id ? 'solid' : 'outline'"
                :size="SIZES.small"
                class="w-fit"
            >
              {{ h.shortName }} PBS {{ h.pbsId }}
            </UBadge>
          </template>
        </template>

        <template #actions="{ row }">
          <span v-if="isInThisHousehold(row.original.id)" class="text-xs text-neutral-500">I denne husstand</span>
          <UButton
              v-else
              color="primary"
              variant="soft"
              :size="SIZES.small"
              :loading="loading"
              @click="emit('move:inhabitant', row.original.id)"
          >
            <template #leading><UIcon :name="ICONS.moveIn" /></template>
            Flyt hertil
          </UButton>
        </template>
      </InhabitantSelector>
    </section>

    <!-- FOOTER -->
    <div class="flex flex-col-reverse md:flex-row md:justify-between gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-700">
      <DangerButton
          :label="`Slet ${householdLabel}`"
          :confirm-label="`Tryk igen for at slette ${householdLabel} (${inhabitantCount} beboere slettes)...`"
          :loading="loading"
          @confirm="emit('delete')"
      />
      <UButton v-bind="BUTTONS.cancel" @click="emit('close')">
        Annuller
      </UButton>
    </div>
  </div>
</template>
