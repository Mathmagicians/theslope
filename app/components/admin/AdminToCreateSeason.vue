<script setup lang="ts">
</script>

<template>
  <UAlert
      :avatar="{
      text: '🧘‍'
    }"
      :actions="[

      {
        label: 'Opret ny sæson',
        color: 'secondary',
        variant: 'solid',
        to: '/admin/planning?mode=create',
        icon: 'i-heroicons-plus-circle',
      }
    ]"
          color="info" class="space-y-4"
          title="Her ser lidt tomt ud!"
          description="Bed din administrator om at oprette en fællespisningssæson">
  </UAlert>
</template>
