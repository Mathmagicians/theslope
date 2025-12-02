<script setup>
const route = useRoute()
const shortname = route.params.shortname
await navigateTo(`/household/${shortname}/bookings`, {replace: true})
</script>

<template>
  <div/>
</template>