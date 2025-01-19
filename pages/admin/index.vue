<script setup lang="ts">
const data = ref(null)
const error = ref(null)

async function getUsers() {
  console.log('Loading Users')
  data.value = await $fetch('/api/admin/users')
}
</script>

<template>
  <div class="text-blue-curacao-900">
    <h1>😎Admin view</h1>

    <div v-if="data">

      <h2>Brugere</h2>
      <ul class="border-2 border-mandarin-orange-500 [& > *]:bg-mandarin-orange-100 text-mandarin-orange-900">
        <li>
          {{ data }}
        </li>
      </ul>
    </div>
    <div v-else>
      <p>Loading...</p>
    </div>
  </div>
</template>
