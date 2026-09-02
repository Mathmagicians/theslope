<!--
AllergyDetailPanel - the portable DETAIL of the allergy catalog

One panel, four faces, chosen by panelMode:
- view:           "Detaljer" header + ✏️🗑 actions + AllergyTypeCard (full view)
- edit / create:  AllergyTypeCard edit form (create = no allergyType)
- confirm-delete: cascade warning naming every consequence (ADR-005)

The SAME component mounts beside the master on desktop and docked under the
selected row on mobile - the mount point is the container's decision, so this
panel stays layout-agnostic and prop-driven (no store access).
-->
<script setup lang="ts">
import type {AllergyTypeDetail} from '~/composables/useAllergyValidation'

const props = withDefaults(defineProps<{
  /** Absent in create mode and when nothing is selected */
  allergyType?: AllergyTypeDetail
  panelMode?: 'view' | 'edit' | 'create' | 'confirm-delete'
  canEdit?: boolean
  householdShortNames?: Record<number, string>
  isDeleting?: boolean
}>(), {
  allergyType: undefined,
  panelMode: 'view',
  canEdit: false,
  householdShortNames: undefined,
  isDeleting: false
})

const emit = defineEmits<{
  edit: []
  delete: []
  save: [data: {name: string, description: string, icon?: string}]
  cancel: []
  'confirm-delete': []
  'cancel-delete': []
}>()

// Design system
const {COLOR, SIZES, LAYOUTS, BUTTONS, ICONS} = useTheSlopeDesignSystem()

// Deleting the type cascades to every Allergy row referencing it (ADR-005)
const affectedInhabitantCount = computed(() => props.allergyType?.inhabitants?.length ?? 0)
</script>

<template>
  <!-- DELETE CONFIRM - deleting the type cascades to every registration, so show it -->
  <div
      v-if="panelMode === 'confirm-delete' && allergyType"
      data-testid="delete-allergy-type-confirm"
      class="w-full max-w-2xl space-y-4"
  >
    <UAlert
        :icon="ICONS.warning"
        :color="COLOR.neutral"
        variant="outline"
        :title="`Slet ${allergyType.name}?`"
    >
      <template #description>
        <ul class="mt-2 space-y-1">
          <li class="flex items-center gap-2">
            <UBadge :color="COLOR.error" variant="subtle" :size="SIZES.small">
              <UIcon :name="ICONS.trash" class="mr-1"/>
              Allergien fjernes fra kataloget
            </UBadge>
          </li>
          <li v-if="affectedInhabitantCount > 0" class="flex items-center gap-2">
            <UBadge :color="COLOR.error" variant="subtle" :size="SIZES.small">
              <UIcon :name="ICONS.users" class="mr-1"/>
              {{ affectedInhabitantCount }} beboer{{ affectedInhabitantCount === 1 ? '' : 'e' }} mister registreringen
            </UBadge>
          </li>
        </ul>
      </template>
    </UAlert>

    <div :class="LAYOUTS.formButtonRow">
      <UButton
          v-bind="BUTTONS.cancel"
          :class="LAYOUTS.cardActionButton"
          data-testid="cancel-delete-allergy-type"
          @click="emit('cancel-delete')"
      >
        Annuller
      </UButton>
      <UButton
          v-bind="BUTTONS.save"
          :class="LAYOUTS.cardActionButton"
          :icon="ICONS.trash"
          :loading="isDeleting"
          data-testid="confirm-delete-allergy-type"
          @click="emit('confirm-delete')"
      >
        Slet
      </UButton>
    </div>
  </div>

  <!-- EDIT or CREATE - no allergyType means create -->
  <AllergyTypeCard
      v-else-if="panelMode === 'edit' || panelMode === 'create'"
      :allergy-type="panelMode === 'edit' ? allergyType : undefined"
      mode="edit"
      @save="(data) => emit('save', data)"
      @cancel="emit('cancel')"
  />

  <!-- Selected allergy with its actions -->
  <div v-else-if="allergyType" class="w-full max-w-2xl space-y-4">
    <div class="flex items-center justify-between gap-2">
      <h3 class="text-lg font-semibold">Detaljer</h3>
      <div v-if="canEdit" class="flex items-center gap-2">
        <UButton
            v-bind="BUTTONS.edit"
            aria-label="Rediger"
            data-testid="edit-allergy-type"
            @click="emit('edit')"
        />
        <UButton
            v-bind="BUTTONS.edit"
            :icon="ICONS.trash"
            aria-label="Slet"
            data-testid="delete-allergy-type"
            @click="emit('delete')"
        />
      </div>
    </div>
    <AllergyTypeCard :allergy-type="allergyType" :household-short-names="householdShortNames"/>
  </div>

  <!-- No selection -->
  <div v-else class="flex flex-col items-center justify-center py-12 text-gray-500">
    <UIcon :name="ICONS.select" class="w-8 h-8 mb-2"/>
    <p class="text-sm">Vælg en allergi for at se detaljer</p>
  </div>
</template>
