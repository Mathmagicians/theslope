<script setup lang="ts">
definePageMeta({
  validate: async (route) => {
    // Check if the id is made up of S or T, followed by 1 or 2 digits, ie addresser af typen T1 and S31
    // needs to look up the address in the database, this is just a simple input validation
    return /^[S,s,T,t]\d{1,2}$/.test(route.params.id)
  }
})
</script>

<template>
  <div>
    <h1>Husstands overblik</h1>
    <p>Adress: {{ $route.params.id }}</p>
    <h2>Husstandsmedlemmer</h2>
    Agata
    <h2>Bestilte Spisebiletter</h2>
    10-01-2025

  </div>
</template>
