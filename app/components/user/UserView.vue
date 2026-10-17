<script setup lang="ts">
const {avatar, email} = storeToRefs(useAuthStore())
const {SIZES} = useTheSlopeDesignSystem()
</script>
<template>
  <div class="flex items-center gap-2">
    <UAvatar v-if="avatar" :src="avatar" :size="SIZES.sm" />
    <span v-if="email">{{ email }}</span>
  </div>
</template>
