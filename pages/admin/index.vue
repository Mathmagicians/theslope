<script setup lang="ts">
import type { InternalApi } from 'nitropack'
type ApiResponse = InternalApi['/api/admin/users']['get']
const getUsersMessage = ref<ApiResponse | null>(null)

const error = ref(null)

async function getUsers() {
  console.log('Loading Users')
  const response = await $fetch('/api/admin/users')
  getUsersMessage.value = response
}
</script>

<template>
  <div class="text-blue-curacao-900">
    <h1>😎Admin view</h1>

    Bytte vagt
    Bytte chefkokke vagt

    <div v-if="getUsersMessage">

      <h2>Brugere</h2>
      <ul class="border-2 border-mandarin-orange-500 [& > *]:bg-mandarin-orange-100 text-mandarin-orange-900">
        <li>
          {{ getUsersMessage }}
        </li>
      </ul>
    </div>
    <div v-else>
      <p>Loading...</p>
    </div>
  </div>
</template>
