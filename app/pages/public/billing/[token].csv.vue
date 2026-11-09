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
const token = computed(() => String(route.params.token))
const {COMPONENTS} = useTheSlopeDesignSystem()

// Redirect to API endpoint for CSV download
onMounted(() => {
    window.location.href = `/api/public/billing/${token.value}/csv`
})
</script>

<template>
  <div :class="COMPONENTS.publicBilling.csvRedirect">
    <p>Henter CSV fil...</p>
  </div>
</template>
