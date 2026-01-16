<!--
┌─────────────────────────────────────────────────────────────┐
│ UCARD                                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ HEADER                                                  │ │
│ │ Familiens allergier og diætkrav                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ BODY                                                    │ │
│ │                                                         │ │
│ │ UTable - Inhabitants with expandable allergy editing  │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ [▼] 👤 Anna Testsen [Barn]   🌾 Gluten, 🥛 Mælk   │ │ │
│ │ │ ────────────────────────────────────────────────── │ │ │
│ │ │  EXPANDED:                                         │ │ │
│ │ │  [Add dropdown]                                    │ │ │
│ │ │  ┌──────────────────────────────────────────────┐  │ │ │
│ │ │  │ 🌾 Gluten  [Comment...✓]         [🗑️]      │  │ │ │
│ │ │  │ 🥛 Mælk    [Comment...✓]         [🗑️]      │  │ │ │
│ │ │  └──────────────────────────────────────────────┘  │ │ │
│ │ ├─────────────────────────────────────────────────────┤ │ │
│ │ │ [▶] 👤 Bob Testsen           ☀️ Ingen allergier   │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │                                                         │ │
│ │ 💜 UAlert - Contact allergi ansvarlig (always shown)  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

-->

<script setup lang="ts">
import type {HouseholdDetail, InhabitantDisplay} from '~/composables/useCoreValidation'
import type {AllergyDisplay, AllergyTypeDisplay} from '~/composables/useAllergyValidation'
import type {TicketTypeConfig} from '~/composables/useTicket'

// Design system
const {SIZES} = useTheSlopeDesignSystem()

// Ticket type config for display (label, color, icon)
const {getTicketTypeConfig} = useTicket()

interface Props {
  household: HouseholdDetail
  canEdit?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canEdit: true
})

const allergyStore = useAllergiesStore()
const {
  allergyTypes,
  allergies,
  isAllergyTypesLoading
} = storeToRefs(allergyStore)
const {loadAllergiesForHousehold} = allergyStore

// Load allergies for this household
loadAllergiesForHousehold(props.household.id)

// Expandable row state - only one at a time
const expanded = ref<Record<number, boolean>>({})

// Toast notifications
const toast = useToast()
const showSuccessToast = (title: string, description?: string) => {
  toast.add({ title, description, color: 'success' })
}

// Track which inhabitant's allergies are being edited
const editingInhabitantId = ref<number | null>(null)

// Set editing inhabitant when row expands
const onRowExpand = (inhabitantId: number) => {
  editingInhabitantId.value = inhabitantId
}

// Clear editing state
const clearForm = () => {
  editingInhabitantId.value = null
}

// Helper to get allergy type name
const getAllergyTypeName = (allergyTypeId: number): string =>
  allergyTypes.value.find(t => t.id === allergyTypeId)?.name ?? 'ukendt'

// Add allergy - receives allergyTypeId from AllergyEditor @add event
const handleAddAllergy = async (allergyTypeId: number) => {
  if (!editingInhabitantId.value) return

  await allergyStore.createAllergy({
    inhabitantId: editingInhabitantId.value,
    allergyTypeId,
    inhabitantComment: null
  })

  showSuccessToast('Allergi', `${getAllergyTypeName(allergyTypeId)} tilføjet`)
}

// Remove allergy - receives allergyTypeId from AllergyEditor @remove event
// Need to find the actual allergy record to get its ID for the API call
const handleRemoveAllergy = async (allergyTypeId: number) => {
  const allergy = currentAllergies.value.find(a => a.allergyTypeId === allergyTypeId)
  if (!allergy) return

  await allergyStore.deleteAllergy(allergy.id)

  showSuccessToast('Allergi', `${getAllergyTypeName(allergyTypeId)} fjernet`)
}

// Update comment - receives allergyTypeId from AllergyEditor @update:comment event
const handleCommentUpdate = async (allergyTypeId: number, comment: string) => {
  const allergy = currentAllergies.value.find(a => a.allergyTypeId === allergyTypeId)
  if (!allergy) return

  await allergyStore.updateAllergy(allergy.id, {
    id: allergy.id,
    inhabitantComment: comment || null
  })

  showSuccessToast('Allergi', 'Din kommentar er gemt')
}

// Table row type definition
interface TableDataRow {
  id: number
  heynaboId: number
  householdId: number
  name: string
  lastName: string
  pictureUrl: string | null | undefined
  birthDate: Date | null | undefined
  ticketConfig: TicketTypeConfig
  allergies: AllergyDisplay[]
}

// Get current allergies for editing inhabitant (reactive - updates from allergy store)
const currentAllergies = computed(() => {
  const inhabitant = tableData.value.find((i: TableDataRow) => i.id === editingInhabitantId.value)
  return inhabitant?.allergies || []
})

// Transform to AllergyItem[] format for AllergyEditor
const currentAllergiesForEditor = computed(() =>
  currentAllergies.value.map(a => ({
    id: a.id,
    allergyTypeId: a.allergyTypeId,
    comment: a.inhabitantComment
  }))
)

// Prepare table data - join inhabitants with allergies from allergy store
const tableData = computed((): TableDataRow[] => {
  if (!props.household?.inhabitants) return []

  return props.household.inhabitants.map((inhabitant: InhabitantDisplay) => {
    // Get allergies for this inhabitant from allergy store
    const inhabitantAllergies = allergies.value.filter((a: AllergyDisplay) => a.inhabitantId === inhabitant.id)

    return {
      id: inhabitant.id,
      heynaboId: inhabitant.heynaboId,
      householdId: inhabitant.householdId,
      name: inhabitant.name,
      lastName: inhabitant.lastName,
      pictureUrl: inhabitant.pictureUrl,
      birthDate: inhabitant.birthDate,
      ticketConfig: getTicketTypeConfig(inhabitant.birthDate ?? null),
      allergies: inhabitantAllergies
    }
  })
})

// Watch for row expansion to track editing inhabitant and enforce single expansion
watch(expanded, (newExpanded, oldExpanded) => {
  const expandedKeys = Object.keys(newExpanded).filter(key => newExpanded[Number(key)])

  if (expandedKeys.length > 1) {
    // More than one row expanded - close all except the most recently opened
    const newlyExpandedKey = expandedKeys.find(key => !oldExpanded[Number(key)])
    if (newlyExpandedKey) {
      Object.keys(expanded.value).forEach(key => {
        if (key !== newlyExpandedKey) {
          expanded.value[Number(key)] = false
        }
      })
      const inhabitant = tableData.value[Number(newlyExpandedKey)]
      if (inhabitant) onRowExpand(inhabitant.id)
    }
  } else if (expandedKeys.length === 1) {
    const inhabitant = tableData.value[Number(expandedKeys[0])]
    if (inhabitant) onRowExpand(inhabitant.id)
  } else {
    clearForm()
  }
})

// Columns computed to conditionally include expand column when canEdit
const columns = computed(() => [
  // Only include expand column when user can edit (rendered via #expand-cell slot)
  ...(props.canEdit ? [{id: 'expand', header: ''}] : []),
  {
    accessorKey: 'name',
    header: 'Beboer'
  },
  {
    id: 'allergies',
    header: 'Allergier',
    cell: () => '' // Custom rendering via #allergies-cell template slot
  }
])
</script>

<template>
  <UCard data-testid="household-allergies" class="rounded-none md:rounded-lg border-t-0 md:border-t" :ui="{ body: 'px-0 mb-0 md:px-4' }">
    <!-- HEADER -->
    <template #header>
      <h3 class="text-lg font-semibold">Familiens allergier og diætkrav</h3>
    </template>

    <!-- BODY -->
    <div class="space-y-2 md:space-y-4">
      <template v-if="household">
        <!-- Inhabitants table with expandable allergy editing -->
        <UTable
            v-model:expanded="expanded"
            :data="tableData"
            :columns="columns"
            :ui="{ tr: 'data-[expanded=true]:bg-elevated/50', th: 'px-1 py-1 md:px-4 md:py-3', td: 'px-1 md:px-4' }"
        >
          <!-- Expand/Edit column (pencil icon) -->
          <template #expand-cell="{ row }">
            <UButton
                color="neutral"
                variant="ghost"
                :icon="row.getIsExpanded() ? 'i-heroicons-chevron-down' : 'i-heroicons-pencil'"
                square
                :aria-label="row.getIsExpanded() ? 'Luk' : 'Rediger allergier'"
                :data-testid="`inhabitant-${row.original.id}-allergy-toggle`"
                :ui="{
                  leadingIcon: [
                    'text-sm md:text-base',
                    'transition-transform',
                    row.getIsExpanded() ? 'duration-200 rotate-180' : ''
                  ]
                }"
                @click="row.toggleExpanded()"
            />
          </template>

          <!-- Inhabitant column -->
          <template #name-cell="{ row }">
            <UserListItem
                :inhabitants="row.original"
                compact
            >
              <template #badge>
                <UBadge
                    :color="row.original.ticketConfig.color"
                    variant="subtle"
                    :size="SIZES.xs"
                >
                  {{ row.original.ticketConfig.label }}
                </UBadge>
              </template>
            </UserListItem>
          </template>

          <!-- Allergies column (collapsed state) -->
          <template #allergies-cell="{ row }">
            <AllergyTypeDisplay v-if="row.original.allergies.length === 0" compact show-name />
            <div v-else class="flex flex-wrap gap-1 md:gap-2">
              <div
                  v-for="allergy in row.original.allergies"
                  :key="allergy.id"
                  class="flex items-center gap-1"
              >
                <AllergyTypeDisplay :allergy-type="allergy.allergyType" compact show-name />
                <span v-if="allergy.inhabitantComment" class="text-xs text-muted">
                  ({{ allergy.inhabitantComment }})
                </span>
              </div>
            </div>
          </template>

          <!-- Expanded row: Allergy edit form (double precaution: only when canEdit) -->
          <template v-if="canEdit" #expanded>
            <Loader v-if="isAllergyTypesLoading" text="Indlæser allergi typer..."/>
            <div v-else class="p-4">
              <AllergyEditor
                :allergy-types="allergyTypes"
                :allergies="currentAllergiesForEditor"
                show-comments
                label="Tilføj og rediger allergier"
                @add="handleAddAllergy"
                @remove="handleRemoveAllergy"
                @update:comment="handleCommentUpdate"
              />
            </div>
          </template>
        </UTable>

        <!-- Contact allergi ansvarlig (always shown) -->
        <AllergyManagersList/>
      </template>
    </div>
  </UCard>
</template>
