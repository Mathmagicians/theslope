<script setup lang="ts">
import type {Inhabitant} from '~/composables/useHouseholdValidation'

interface Props {
    inhabitant: Inhabitant
    compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    compact: false
})

const subtitle = computed(() => {
    return props.inhabitant.birthDate
        ? new Date(props.inhabitant.birthDate).toLocaleDateString()
        : undefined
})
</script>

<template>
    <UserListItem
        :name="inhabitant.name"
        :last-name="inhabitant.lastName"
        :picture-url="inhabitant.pictureUrl"
        :subtitle="subtitle"
        :compact="compact"
    />
</template>
