<script setup lang="ts">
import type {Inhabitant} from '~/composables/useHouseholdValidation'

interface Props {
    inhabitant: Inhabitant
    compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    compact: false
})
</script>

<template>
    <UCard v-if="compact" :ui="{ body: 'p-1' }" class="inline-flex items-center gap-2" variant="soft">
        <UAvatar
            :src="inhabitant.pictureUrl"
            :alt="inhabitant.name"
            size="xs"
            icon="i-heroicons-user"
        />
        <span class="text-xs font-medium">{{ inhabitant.name }}</span>
    </UCard>

    <UCard v-else>
        <div class="flex items-center gap-3">
            <UAvatar
                :src="inhabitant.pictureUrl"
                :alt="`${inhabitant.name} ${inhabitant.lastName}`"
                size="md"
                icon="i-heroicons-user"
            />
            <div class="flex flex-col">
                <span class="font-semibold">{{ inhabitant.name }} {{ inhabitant.lastName }}</span>
                <span v-if="inhabitant.birthDate" class="text-sm text-gray-500">
                    {{ new Date(inhabitant.birthDate).toLocaleDateString() }}
                </span>
            </div>
        </div>
    </UCard>
</template>
