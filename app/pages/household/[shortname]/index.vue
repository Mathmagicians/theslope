<script setup>
const route = useRoute()
const shortname = route.params.shortname
const pbsQuery = route.query.pbs ? `?pbs=${route.query.pbs}` : ''
await navigateTo(`/household/${shortname}/bookings${pbsQuery}`, {replace: true})
</script>

<template>
  <div/>
</template>