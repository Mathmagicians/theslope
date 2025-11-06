<script setup lang="ts">
const store = useUsersStore()
const {allergyManagers, isAllergyManagersLoading} = storeToRefs(store)
</script>

<template>
  <Loader v-if="isAllergyManagersLoading" text="Henter allergi ansvarlige" />

  <div v-else-if="allergyManagers && allergyManagers.length > 0" class="space-y-3">
    <p class="text-sm text-muted">Kontakt allergi ansvarlig hvis du har spørgsmål om allergier:</p>

    <div class="flex flex-col gap-3">
      <UserListItem
        v-for="manager in allergyManagers"
        :key="`manager-${manager.id}`"
        :name="manager.Inhabitant?.name || ''"
        :last-name="manager.Inhabitant?.lastName"
        :picture-url="manager.Inhabitant?.pictureUrl || null"
        :subtitle="manager.email"
      />
    </div>
  </div>

  <p v-else class="text-muted text-sm">Ingen allergi ansvarlige registreret endnu.</p>
</template>
