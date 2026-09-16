BY
<script setup lang="ts">
const {ALERTS} = useTheSlopeDesignSystem()
</script>

<template>
  <UAlert
      v-bind="ALERTS.emptyState"
      :avatar="{text: '🧘‍'}"
      :actions="[
        {
          label: 'Opret ny sæson',
          color: 'secondary',
          variant: 'solid',
          to: '/admin/planning?mode=create',
          icon: 'i-heroicons-plus-circle'
        }
      ]"
      title="Her ser lidt tomt ud!"
      description="Bed din administrator om at oprette en fællespisningssæson"/>
</template>
