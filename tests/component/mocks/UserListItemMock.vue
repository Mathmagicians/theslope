<script setup lang="ts">
import {computed} from 'vue'

// Canonical UserListItem stand-in for component specs (docs/testing.md: extract repeated
// patterns): needs no tooltip provider, renders names, the count label and the badge slot
// so name and per-person badge assertions all keep working
const props = defineProps<{
  inhabitants: {name: string} | {name: string}[]
  compact?: boolean
  label?: string
  labelPlural?: string
}>()

const list = computed(() => Array.isArray(props.inhabitants) ? props.inhabitants : [props.inhabitants])
const names = computed(() => list.value.map(i => i.name).join(', '))
const single = computed(() => list.value[0])
</script>

<template>
  <div data-testid="user-list-item">
    <span>{{ names }}</span>
    <span v-if="label"> {{ list.length }} {{ list.length === 1 ? label : (labelPlural || label) }}</span>
    <slot name="badge" :inhabitant="single" />
  </div>
</template>
