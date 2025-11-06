<script setup lang="ts">
interface Props {
    name: string
    lastName?: string
    pictureUrl?: string | null
    subtitle?: string
    compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    compact: false
})
</script>

<template>
    <UCard v-if="compact" :ui="{ body: 'p-1' }" class="inline-flex items-center gap-2" variant="soft">
        <UAvatar
            :src="pictureUrl || undefined"
            :alt="name"
            size="xs"
            icon="i-heroicons-user"
        />
        <span class="text-xs font-medium">{{ name }}</span>
    </UCard>

    <UCard v-else>
        <div class="flex items-center gap-3">
            <UAvatar
                :src="pictureUrl || undefined"
                :alt="`${name} ${lastName || ''}`"
                size="md"
                icon="i-heroicons-user"
            />
            <div class="flex flex-col">
                <span class="font-semibold">{{ name }} {{ lastName }}</span>
                <span v-if="subtitle" class="text-sm text-muted">{{ subtitle }}</span>
            </div>
        </div>
    </UCard>
</template>
