<script setup lang="ts">
import type {HouseholdDisplay} from '~/composables/useCoreValidation'

interface Props {
    household: HouseholdDisplay
    compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    compact: false
})

const hasInhabitants = computed(() => props.household.inhabitants?.length > 0)
</script>

<template>
    <div v-if="compact" class="flex flex-col md:flex-row md:items-center gap-3">
        <UAvatarGroup size="sm" :max="3">
            <UTooltip v-for="inhabitant in household.inhabitants" :key="inhabitant.id" :text="inhabitant.name">
                <UAvatar
                    :src="inhabitant.pictureUrl ?? undefined"
                    :alt="inhabitant.name"
                    icon="i-heroicons-user"
                />
            </UTooltip>
        </UAvatarGroup>

        <div class="flex flex-wrap gap-1">
            <UBadge
                v-for="inhabitant in household.inhabitants"
                :key="inhabitant.id"
                size="md"
                variant="subtle"
                color="secondary"
            >
                {{ inhabitant.name }}
            </UBadge>
        </div>
    </div>

    <UCard v-else>
        <template #header>
            <h3 class="text-lg font-semibold">
                {{ household.address }}
            </h3>
        </template>

        <div v-if="hasInhabitants" class="space-y-2">
            <div
                v-for="inhabitant in household.inhabitants"
                :key="inhabitant.id"
                class="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
            >
                <UIcon name="i-heroicons-user" class="text-gray-400" />
                <span>{{ inhabitant.name }}</span>
            </div>
        </div>

        <div v-else class="text-gray-500 dark:text-gray-400 italic">
            No inhabitants
        </div>
    </UCard>
</template>