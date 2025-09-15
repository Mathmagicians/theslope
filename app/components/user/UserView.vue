<script setup lang="ts">
const {avatar} = storeToRefs(useAuthStore())
const {email} = storeToRefs(useAuthStore())
const {phone} = storeToRefs(useAuthStore())
const {address} = storeToRefs(useAuthStore())

const userDataRows = [
  {content: email,  icon: 'i-guidance-mail'},
  {content: phone,  icon: 'i-guidance-phone'},
  {content: address, icon: 'i-guidance-home-2'}
]
</script>
<template>

</template>
