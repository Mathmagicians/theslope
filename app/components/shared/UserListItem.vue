<script setup lang="ts">
interface InhabitantLike {
    name: string
    lastName?: string
    pictureUrl?: string | null
}

interface SingleProps {
    name: string
    lastName?: string
    pictureUrl?: string | null
    subtitle?: string
    compact?: boolean
    inhabitants?: never
}

interface GroupProps {
    inhabitants: InhabitantLike[]
    compact?: boolean
    name?: never
    lastName?: never
    pictureUrl?: never
    subtitle?: never
}

type Props = SingleProps | GroupProps

const props = withDefaults(defineProps<Props>(), {
    compact: false
})

// Check if this is a group or single user
const isGroup = computed(() => !!props.inhabitants && props.inhabitants.length > 0)

// Responsive max: 3 for mobile, 5 for desktop
const { width } = useWindowSize()
const maxAvatars = computed(() => width.value < 768 ? 3 : 5)

// Convert inhabitants to avatar format for UAvatarGroup
const avatarItems = computed(() => {
    if (!props.inhabitants) return []
    return props.inhabitants.map(inhabitant => ({
        src: inhabitant.pictureUrl || undefined,
        alt: `${inhabitant.name} ${inhabitant.lastName || ''}`,
        name: `${inhabitant.name} ${inhabitant.lastName || ''}`
    }))
})

// Show count when there are inhabitants
const inhabitantCount = computed(() => props.inhabitants?.length || 0)
</script>

<template>
    <!-- Group mode: Multiple inhabitants -->
    <div v-if="isGroup" class="flex items-center gap-2">
        <UAvatarGroup
            :items="avatarItems"
            :max="maxAvatars"
            :size="compact ? 'xs' : 'sm'"
        />
        <span class="text-xs text-muted">
            {{ inhabitantCount }} {{ inhabitantCount === 1 ? 'beboer' : 'beboere' }}
        </span>
    </div>

    <!-- Single mode: Original behavior -->
    <UCard v-else-if="compact" :ui="{ body: 'p-1' }" class="inline-flex items-center gap-2" variant="soft">
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
