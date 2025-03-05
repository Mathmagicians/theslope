<script setup lang="ts">
import type {ErrorWithStatusCode} from "~/types/error"

const props = defineProps<{
  error: ErrorWithStatusCode
}>()

console.warn('Error:', props.error)

</script>

<template>
  <div class="bg-white">
    <ViewError
        :error="props.error.statusCode ?? 500"
        :message="props.error.message ?? 'Der er sket en fejl'"
        :cause="props.error.cause ?? new Error('Øv bøv, ukendt fejl')"/>
  </div>

</template>
