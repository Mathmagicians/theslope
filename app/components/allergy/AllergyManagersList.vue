<script setup lang="ts">
const store = useUsersStore()
const {allergyManagers, isAllergyManagersLoading} = storeToRefs(store)

// Extract Inhabitant objects - they already match InhabitantLike interface
const allergyManagerInhabitants = computed(() => {
  if (!allergyManagers.value) return []
  return allergyManagers.value
    .filter(m => m.Inhabitant)
    .map(m => m.Inhabitant!)
})
</script>

<template>
  <Loader v-if="isAllergyManagersLoading" text="Henter allergi ansvarlige" />
  <UAlert v-else
    color="info"
    variant="subtle"
    icon="i-heroicons-question-mark-circle"
    title="Spørgsmål om allergier?"
    :ui="{ description: 'flex flex-col md:flex-row md:items-center gap-3' }"
  >
    <template #description>
      <p class="text-sm md:flex-1">Kontakt den allergiansvarlige, hvis du har brug for at snakke om allergier i din familie:</p>
      <UserListItem v-if="allergyManagers && allergyManagers.length > 0"
        :inhabitants="allergyManagerInhabitants"
        label="Allergiansvarlig"
        labelPlural="Allergiansvarlige"
        ring-color="ocean-500"
      />
      <p v-else class="text-muted text-sm">Ingen allergi ansvarlige registreret endnu.</p>
    </template>
  </UAlert>


</template>
