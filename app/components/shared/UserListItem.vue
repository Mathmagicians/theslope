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
    label?: string
    labelPlural?: string
    size?: 'xs' | 'sm' | 'md' | 'lg'
    ringColor?: string
    name?: never
    lastName?: never
    pictureUrl?: never
    subtitle?: never
}

type Props = SingleProps | GroupProps

const props = withDefaults(defineProps<Props>(), {
    compact: false,
    label: 'beboer',
    labelPlural: 'beboere'
})

// Check if this is a group or single user
const isGroup = computed(() => !!props.inhabitants && props.inhabitants.length > 0)

// Inject responsive breakpoint from parent
const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)

// Responsive max: 3 for mobile, 5 for desktop
const maxAvatars = computed(() => getIsMd.value ? 5 : 3)

// Show count when there are inhabitants
const inhabitantCount = computed(() => props.inhabitants?.length || 0)

// Determine avatar size - use prop if provided, otherwise responsive based on compact
const avatarSize = computed(() => {
    if (props.size) return props.size
    if (props.compact) return 'xs'
    return getIsMd.value ? 'md' : 'sm'
})
</script>

<template>
    <!-- Group mode: Multiple inhabitants -->
    <div v-if="isGroup" class="flex items-center gap-2">
        <UAvatarGroup
            :max="maxAvatars"
            :size="avatarSize"
        >
            <UTooltip
                v-for="inhabitant in inhabitants"
                :key="inhabitant.name"
                :text="`${inhabitant.name} ${inhabitant.lastName || ''}`"
            >
                <UAvatar
                    :src="inhabitant.pictureUrl || undefined"
                    :alt="`${inhabitant.name} ${inhabitant.lastName || ''}`"
                    icon="i-heroicons-user"
                    :class="ringColor ? `ring-2 ring-${ringColor}` : ''"
                />
            </UTooltip>
        </UAvatarGroup>
        <span class="text-xs md:text-md">
            {{ inhabitantCount }} {{ inhabitantCount === 1 ? label : labelPlural }}
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
