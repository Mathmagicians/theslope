<script setup lang="ts">
const {users} = storeToRefs(useUsersStore())
const {loadData} = useUsersStore()
await loadData()

const userColumns = [
  {key: 'id', label: 'ID', class: 'text-orange-mandarin-800'},
  {key: 'email', label: 'Mail', class: 'text-orange-mandarin-800' },
  {key: 'phone', label: 'Telefon', class: 'text-orange-mandarin-800'}]
</script>

<template>
  <div class="text-blue-curacao-900">
    <h1>😎Admin view</h1>
    <UDivider/>
    <ul>
      <li>Se importerede brugere</li>
      <li>See teams</li>
      <li>Se chefkokke</li>
      <li>Se kalendar, oprette sæson, oprette ferier</li>
      <li>Oprette fællesspisninger (dinnerevents)</li>
      <li>Se allergier</li>
      <li>Bytte vagt</li>
      <li>Bytte chefkokke vagt</li>
    </ul>
    <UDivider/>


    <!-- Show when users are loaded -->
    <div v-if="users?.length">

      <h2 class="text-lg text-orange-mandarin-800 text-center uppercase">Brugere importeret fra Heynabo</h2>
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
