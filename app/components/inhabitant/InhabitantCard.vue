<script setup lang="ts">
import type {InhabitantDisplay} from '~/composables/useCoreValidation'

interface Props {
    inhabitant: InhabitantDisplay
    compact?: boolean
    label?: string
}

withDefaults(defineProps<Props>(), {
    compact: false,
    label: undefined
})
</script>

<template>
    <UserListItem
        :inhabitants="inhabitant"
        :compact="compact"
        :label="label"
    />
</template>
