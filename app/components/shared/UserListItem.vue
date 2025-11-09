<script setup lang="ts">
interface InhabitantLike {
    name: string
    lastName?: string
    pictureUrl?: string | null
    heynaboId?: number
}

interface SingleProps {
    name: string
    lastName?: string
    pictureUrl?: string | null
    subtitle?: string
    compact?: boolean
    heynaboId?: number
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
const isGroup = computed(() => !!props.inhabitants)

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
    if (props.compact) return 'sm'
    return getIsMd.value ? 'lg' : 'md'
})

// Heynabo integration - get user profile URL
const {getUserUrl} = useHeynabo()

</script>

<template>
    <!-- Group mode: Multiple inhabitants -->
    <div v-if="isGroup" class="flex items-center gap-2">
        <UAvatarGroup
            :max="maxAvatars"
            :size="avatarSize"
        >
            <template v-for="inhabitant in inhabitants" :key="inhabitant.name">
                <ULink
                    v-if="inhabitant.heynaboId"
                    :to="getUserUrl(inhabitant.heynaboId)"
                    target="_blank"
                    class="hover:scale-110 hover:rotate-3 transition-transform duration-200 inline-block"
                >
                    <UTooltip
                        :text="`${inhabitant.name} ${inhabitant.lastName || ''}`"
                        :delay-duration="0"
                    >
                        <UAvatar
                            :src="inhabitant.pictureUrl || undefined"
                            :alt="`${inhabitant.name} ${inhabitant.lastName || ''}`"
                            icon="i-heroicons-user"
                            :class="ringColor ? `ring-2 ring-${ringColor}` : ''"
                        />
                    </UTooltip>
                </ULink>
                <UTooltip
                    v-else
                    :text="`${inhabitant.name} ${inhabitant.lastName || ''}`"
                    :delay-duration="0"
                >
                    <UAvatar
                        :src="inhabitant.pictureUrl || undefined"
                        :alt="`${inhabitant.name} ${inhabitant.lastName || ''}`"
                        icon="i-heroicons-user"
                        :class="ringColor ? `ring-2 ring-${ringColor}` : ''"
                    />
                </UTooltip>
            </template>
        </UAvatarGroup>
        <span class="text-xs md:text-md">
            {{ inhabitantCount }} {{ inhabitantCount === 1 ? label : labelPlural }}
        </span>
    </div>

    <!-- Single mode: Compact -->
    <div v-else-if="compact" class="inline-flex items-center gap-2">
        <ULink
            v-if="heynaboId"
            :to="getUserUrl(heynaboId)"
            target="_blank"
            class="hover:scale-110 hover:rotate-3 transition-transform duration-200"
        >
            <UAvatar
                :src="pictureUrl || undefined"
                :alt="`${name} ${lastName || ''}`"
                size="sm"
                icon="i-heroicons-user"
            />
        </ULink>
        <UAvatar
            v-else
            :src="pictureUrl || undefined"
            :alt="`${name} ${lastName || ''}`"
            size="sm"
            icon="i-heroicons-user"
        />
        <div class="flex flex-col">
            <span class="text-sm font-medium">{{ name }}</span>
            <span v-if="subtitle" class="text-xs text-muted">{{ subtitle }}</span>
        </div>
    </div>

    <!-- Single mode: Non-compact -->
    <UCard v-else>
        <div class="flex items-center gap-3">
            <ULink
                v-if="heynaboId"
                :to="getUserUrl(heynaboId)"
                target="_blank"
                class="hover:scale-110 hover:rotate-3 transition-transform duration-200 inline-block"
            >
                <UAvatar
                    :src="pictureUrl || undefined"
                    :alt="`${name} ${lastName || ''}`"
                    size="md"
                    icon="i-heroicons-user"
                />
            </ULink>
            <UAvatar
                v-else
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
