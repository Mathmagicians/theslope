<script setup lang="ts">
const {avatar, email} = storeToRefs(useAuthStore())
</script>
<template>
  <div class="flex items-center gap-2">
    <UAvatar v-if="avatar" :src="avatar" size="sm" />
    <span v-if="email">{{ email }}</span>
  </div>
</template>
