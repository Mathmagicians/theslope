<!--
AllergyCatalogTable - THE master list of the allergy catalog (bug-fix doc D1)

One table for both selection modes:
- single: row click emits the id (AdminAllergies master column)
- multi:  checkboxes emit id[]   (AllergenMultiSelector / compare, ChefMenuCard edit)

Forwards UTable's expanded model (keyed by row index, house convention) and the
#expanded slot so a detail panel can dock under the selected row on mobile.
-->
<script setup lang="ts">
import type {AllergyTypeDetail} from '~/composables/useAllergyValidation'

const props = withDefaults(defineProps<{
  /** Pre-sorted by the parent (sorting is a container concern) */
  allergyTypes: AllergyTypeDetail[]
  mode?: 'single' | 'multi'
  /** single: selected id (or null) - multi: selected ids */
  modelValue?: number | number[] | null
  showNewBadge?: boolean
  readonly?: boolean
  loading?: boolean
  /** UTable expansion record keyed by row index */
  expanded?: Record<number, boolean>
}>(), {
  mode: 'single',
  modelValue: null,
  showNewBadge: false,
  readonly: false,
  loading: false,
  expanded: undefined
})

const emit = defineEmits<{
  'update:modelValue': [value: number | number[] | null]
  'update:expanded': [value: Record<number, boolean>]
}>()

// Design system
const {COLOR, COMPONENTS, ICONS} = useTheSlopeDesignSystem()

// Business logic
const {hasNewAllergyInhabitants} = useAllergy()

const isMulti = computed(() => props.mode === 'multi')

// Set for efficient .has() lookup in multi mode
const selectedIds = computed(() => new Set(Array.isArray(props.modelValue) ? props.modelValue : []))

const isSelected = (id: number) => isMulti.value ? selectedIds.value.has(id) : props.modelValue === id

const handleRowClick = (id: number) => {
  if (props.readonly) return
  if (isMulti.value) {
    const next = new Set(selectedIds.value)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    emit('update:modelValue', Array.from(next))
  } else {
    emit('update:modelValue', id)
  }
}

// v-model:expanded proxy so the parent owns expansion state
const expandedModel = computed({
  get: () => props.expanded ?? {},
  set: (value: Record<number, boolean>) => emit('update:expanded', value)
})

const columns = computed(() => [
  ...(isMulti.value ? [{accessorKey: 'checkbox', header: ''}] : []),
  {accessorKey: 'icon', header: ''},
  {accessorKey: 'name', header: 'Allergen'},
  {accessorKey: 'count', header: 'Antal'},
  ...(props.showNewBadge ? [{accessorKey: 'new', header: 'Nyt'}] : [])
])

// Tighter horizontal cell padding - the catalog lives in the narrow master column
const tableUi = {
  ...COMPONENTS.table.ui,
  td: `${COMPONENTS.table.ui.td} px-1`,
  th: 'px-1'
}

const clickableCellClass = computed(() => props.readonly ? '' : COMPONENTS.table.clickableCell)
</script>

<template>
  <UTable
      v-model:expanded="expandedModel"
      :columns="columns"
      :data="allergyTypes"
      :loading="loading"
      :ui="tableUi"
  >
    <!-- Checkbox cell (multi mode only) -->
    <template #checkbox-cell="{ row }">
      <div class="flex items-center justify-center">
        <UCheckbox
            :model-value="selectedIds.has(row.original.id!)"
            :name="`select-allergen-${row.original.id}`"
            :disabled="readonly"
            :color="COLOR.secondary"
            @change="handleRowClick(row.original.id!)"
        />
      </div>
    </template>

    <!-- Icon cell -->
    <template #icon-cell="{ row }">
      <div
          :class="[
            'flex items-center justify-center p-1 rounded-lg transition-colors',
            clickableCellClass,
            isSelected(row.original.id!) && COMPONENTS.table.selectedRow
          ]"
          @click="handleRowClick(row.original.id!)"
      >
        <div class="flex items-center justify-center w-8 h-8 rounded-full ring-1 ring-red-700 shrink-0">
          <UIcon
              v-if="row.original.icon?.startsWith('i-')"
              :name="row.original.icon"
              class="text-base"
          />
          <span v-else class="text-base">
            {{ row.original.icon || '🏷️' }}
          </span>
        </div>
      </div>
    </template>

    <!-- Name cell - carries the row identity for tests and selection state -->
    <template #name-cell="{ row }">
      <div
          :class="[
            'font-medium',
            clickableCellClass,
            isSelected(row.original.id!) && COMPONENTS.table.selectedRow
          ]"
          :data-testid="`allergy-row-${row.original.id}`"
          :data-selected="isSelected(row.original.id!) ? 'true' : undefined"
          @click="handleRowClick(row.original.id!)"
      >
        {{ row.original.name }}
      </div>
    </template>

    <!-- Count cell -->
    <template #count-cell="{ row }">
      <div
          :class="['text-center', clickableCellClass]"
          @click="handleRowClick(row.original.id!)"
      >
        {{ row.original.inhabitants?.length || 0 }}
      </div>
    </template>

    <!-- New badge cell - shows if any allergy of this type was recently added -->
    <template #new-cell="{ row }">
      <div
          :class="['text-center', clickableCellClass]"
          @click="handleRowClick(row.original.id!)"
      >
        <UIcon
            v-if="hasNewAllergyInhabitants(row.original)"
            :name="ICONS.new"
            :class="COMPONENTS.rowIconClass"
        />
      </div>
    </template>

    <!-- Docked detail (mobile master/detail) -->
    <template v-if="$slots.expanded" #expanded="scope">
      <slot name="expanded" v-bind="scope"/>
    </template>

    <!-- Empty state owned by the parent -->
    <template v-if="$slots['empty-state']" #empty-state>
      <slot name="empty-state"/>
    </template>
  </UTable>
</template>
