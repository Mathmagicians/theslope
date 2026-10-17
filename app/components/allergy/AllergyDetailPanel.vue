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
import type {AllergyTypeCreate, AllergyTypeDetail} from '~/composables/useAllergyValidation'
import {FORM_MODES, type FormMode} from '~/types/form'

const props = withDefaults(defineProps<{
  /** Absent in create mode and when nothing is selected */
  allergyType?: AllergyTypeDetail
  panelMode?: FormMode | 'confirm-delete'
  canEdit?: boolean
  householdShortNames?: Record<number, string>
  isDeleting?: boolean
}>(), {
  allergyType: undefined,
  panelMode: FORM_MODES.VIEW,
  canEdit: false,
  householdShortNames: undefined,
  isDeleting: false
})

const emit = defineEmits<{
  edit: []
  delete: []
  save: [data: AllergyTypeCreate]
  cancel: []
  'confirm-delete': []
  'cancel-delete': []
}>()

// Design system
const {COLOR, SIZES, LAYOUTS, BUTTONS, ICONS, ALERTS, TEXT, TYPOGRAPHY, COMPONENTS, NOISE} = useTheSlopeDesignSystem()

// Deleting the type cascades to every Allergy row referencing it (ADR-005)
const affectedInhabitantCount = computed(() => props.allergyType?.inhabitants?.length ?? 0)
</script>

<template>
  <!-- DELETE CONFIRM - deleting the type cascades to every registration, so show it -->
  <div
      v-if="panelMode === 'confirm-delete' && allergyType"
      data-testid="delete-allergy-type-confirm"
      :class="COMPONENTS.allergyDetailPanel.face"
  >
    <UAlert
        v-bind="ALERTS.legend"
        :icon="ICONS.warning"
        :title="`Slet ${allergyType.name}?`"
    >
      <template #description>
        <ul :class="COMPONENTS.allergyDetailPanel.consequences">
          <li :class="COMPONENTS.allergyDetailPanel.consequence">
            <UBadge :color="COLOR.error" :variant="NOISE.subtle" :size="SIZES.small">
              <UIcon :name="ICONS.trash" :class="COMPONENTS.allergyDetailPanel.consequenceIcon"/>
              Allergien fjernes fra kataloget
            </UBadge>
          </li>
          <li v-if="affectedInhabitantCount > 0" :class="COMPONENTS.allergyDetailPanel.consequence">
            <UBadge :color="COLOR.error" :variant="NOISE.subtle" :size="SIZES.small">
              <UIcon :name="ICONS.users" :class="COMPONENTS.allergyDetailPanel.consequenceIcon"/>
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
      v-else-if="panelMode === FORM_MODES.EDIT || panelMode === FORM_MODES.CREATE"
      :allergy-type="panelMode === FORM_MODES.EDIT ? allergyType : undefined"
      :mode="FORM_MODES.EDIT"
      @save="(data) => emit('save', data)"
      @cancel="emit('cancel')"
  />

  <!-- Selected allergy with its actions -->
  <div v-else-if="allergyType" :class="COMPONENTS.allergyDetailPanel.face">
    <div :class="COMPONENTS.allergyDetailPanel.header">
      <h3 :class="TYPOGRAPHY.cardTitle">Detaljer</h3>
      <div v-if="canEdit" :class="COMPONENTS.allergyDetailPanel.actions">
        <UButton
            v-bind="BUTTONS.edit"
            aria-label="Rediger"
            data-testid="edit-allergy-type"
            @click="emit('edit')"
        />
        <UButton
            v-bind="BUTTONS.remove"
            aria-label="Slet"
            data-testid="delete-allergy-type"
            @click="emit('delete')"
        />
      </div>
    </div>
    <AllergyTypeCard :allergy-type="allergyType" :household-short-names="householdShortNames"/>
  </div>

  <!-- No selection -->
  <div v-else :class="[COMPONENTS.allergyDetailPanel.noSelection, TEXT.gray[500]]">
    <UIcon :name="ICONS.select" :class="COMPONENTS.allergyDetailPanel.noSelectionIcon"/>
    <p :class="TYPOGRAPHY.bodyTextSmall">Vælg en allergi for at se detaljer</p>
  </div>
</template>
