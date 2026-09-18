<!--
AdminToCreateSeason - empty state shown on /admin/planning and /admin/teams when no season exists.

Props:
  - canEdit: gates the "Opret ny sæson" call-to-action (a member is told to ask an admin instead)
-->
<script setup lang="ts">
const {ALERTS, BUTTONS, COLOR, ICONS, LAYOUTS} = useTheSlopeDesignSystem()

const props = withDefaults(defineProps<{
  canEdit?: boolean
}>(), {
  canEdit: false
})
</script>

<template>
  <UAlert
      v-bind="ALERTS.emptyState"
      :avatar="{text: '🧘‍'}"
      title="Her ser lidt tomt ud!"
      description="Bed din administrator om at oprette en fællespisningssæson">
    <template v-if="props.canEdit" #actions>
      <UButton
          v-bind="BUTTONS.primaryAction"
          :class="LAYOUTS.cardActionButton"
          :color="COLOR.primary"
          :icon="ICONS.plusCircle"
          to="/admin/planning?mode=create"
          data-testid="create-first-season">
        Opret ny sæson
      </UButton>
    </template>
  </UAlert>
</template>
