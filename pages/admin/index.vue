<script setup lang="ts">
const {users} = storeToRefs(useUsersStore())
const {loadData, importHeynaboData} = useUsersStore()
await loadData()

const userColumns = [
  {key: 'id', label: 'ID', class: 'text-orange-800'},
  {key: 'email', label: 'Mail', class: 'text-orange-800'},
  {key: 'phone', label: 'Telefon', class: 'text-orange-800'}]
</script>

<template>
  <div class="text-blue-900">
    <h1>😎Admin view</h1>
    <UDivider/>
    <ul>
      <li>Se importerede brugere fra HeyNabo</li>
      <li>See teams</li>
      <li>Se chefkokke</li>
      <li>Se kalendar, oprette sæson, oprette ferier</li>
      <li>Oprette fællesspisninger (dinnerevents)</li>
      <li>Se allergier</li>
      <li>Bytte vagt</li>
      <li>Bytte chefkokke vagt</li>
    </ul>
    <UDivider/>
    <UButton @click="importHeynaboData" square class="m-4 " color="red" size="lg" variant="soft" icon="i-pajamas-admin" >
      Importer data fra Heynabo
    </UButton>
    <UDivider/>
    <!-- Show when users are loaded -->
    <div v-if="users">

      <h2 class="text-lg text-orange-800 text-center uppercase">Brugere - importeret fra Heynabo</h2>
      <UTable
          :rows="users"
          :columns="userColumns"
      />
    </div>
    <!-- Show when users are not loaded -->
    <div v-else>
      <UIcon name="i-pajamas-user"/>
      <p>Loading users...</p>
    </div>
  </div>
</template>
