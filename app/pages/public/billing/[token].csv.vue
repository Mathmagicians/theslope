<script setup lang="ts">
/**
 * Public Billing CSV Download - redirects to API endpoint
 * Route: /public/billing/[token].csv
 */
definePageMeta({
    auth: false,
    layout: false
})

const route = useRoute()
const token = computed(() => route.params.token as string)

// Redirect to API endpoint for CSV download
onMounted(() => {
    window.location.href = `/api/public/billing/${token.value}/csv`
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <p>Henter CSV fil...</p>
  </div>
</template>
