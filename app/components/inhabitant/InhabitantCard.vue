<script setup lang="ts">
import type {InhabitantDisplay} from '~/composables/useCoreValidation'

interface Props {
    inhabitant: InhabitantDisplay
    compact?: boolean
    label?: string
}

const props = withDefaults(defineProps<Props>(), {
    compact: false
})
</script>

<template>
    <UserListItem
        :inhabitants="inhabitant"
        :compact="compact"
        :label="label"
    />
</template>
