<!--
┌─────────────────────────────────────────────────────────────────┐
│ UserListItem - Display inhabitants in 4 modes                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ MODE 1: SINGLE COMPACT (tables, inline)                        │
│  [👤🔵] Lars                                                    │
│         ↑ child badge (if under 18)                            │
│  Display: Small avatar + first name only + optional badge      │
│                                                                 │
│ MODE 2: SINGLE NOT COMPACT (cards, detailed)                   │
│  ┌───────────────────────────────────────────────┐             │
│  │ [👤]🔵 Lars Jensen                           │             │
│  └───────────────────────────────────────────────┘             │
│  Display: Larger avatar + full name + badge (if child)         │
│                                                                 │
│ MODE 3: GROUP COMPACT (tables)                                 │
│  [👤][👤][👤]+2  🔵5                                           │
│                   ↑ badge with count only                      │
│  Mobile: 3 avatars max, Desktop: 5 avatars max                 │
│                                                                 │
│ MODE 4: GROUP NOT COMPACT (prominent)                          │
│  [👤 ][👤 ][👤 ][👤 ][👤 ]+2  🔵 7 bofæller                  │
│                                 ↑ badge + count + label        │
│  Mobile: 3 larger avatars, Desktop: 5 larger avatars, border           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
-->
<script setup lang="ts">
import type {InhabitantDisplay} from '~/composables/useCoreValidation'
import type {NuxtUISize} from '~/composables/useTheSlopeDesignSystem'

interface Props {
  inhabitants: InhabitantDisplay | InhabitantDisplay[]
  compact?: boolean
  size?: NuxtUISize
  ringColor?: string
  label?: string
  propertyCheck?: (inhabitant: InhabitantDisplay) => boolean
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  size: undefined,
  ringColor: undefined,
  label: undefined,
  propertyCheck: undefined
})

// Child detection (under 18 years old)
const isChild = (inhabitant: InhabitantDisplay): boolean => {
  const age = calculateAge(inhabitant.birthDate ?? null)
  return age !== null && age < 18
}

// Use provided propertyCheck or default to isChild
const checkProperty = computed(() => props.propertyCheck ?? isChild)

// Mode detection - create typed computed properties for template type safety
const isGroup = computed(() => Array.isArray(props.inhabitants))

// Typed computed for group mode (array)
const inhabitantsList = computed((): InhabitantDisplay[] =>
  Array.isArray(props.inhabitants) ? props.inhabitants : [props.inhabitants]
)

// Typed computed for single mode (single inhabitant)
const singleInhabitant = computed((): InhabitantDisplay | null =>
  Array.isArray(props.inhabitants) ? null : props.inhabitants
)

const count = computed(() => inhabitantsList.value.length)

// Duplicate first name detection
const duplicateFirstNames = computed(() => {
  const list = Array.isArray(props.inhabitants) ? props.inhabitants : [props.inhabitants]
  const firstNameCounts = new Map<string, number>()

  list.forEach(inhabitant => {
    const count = firstNameCounts.get(inhabitant.name) || 0
    firstNameCounts.set(inhabitant.name, count + 1)
  })

  return new Set(
    Array.from(firstNameCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([name, _]) => name)
  )
})

// Format display name: "FirstName L" if duplicate first name exists
const formatDisplayName = (inhabitant: InhabitantDisplay): string => {
  if (duplicateFirstNames.value.has(inhabitant.name)) {
    const lastNameInitial = inhabitant.lastName.charAt(0).toUpperCase()
    return `${inhabitant.name} ${lastNameInitial}`
  }
  return inhabitant.name
}

// Responsive breakpoint injection
const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)

// Avatar display settings
const maxAvatars = computed(() => getIsMd.value ? 5 : 3)
const avatarSize = computed(() => {
  if (props.size) return props.size
  if (props.compact) return getIsMd.value ? 'md' : 'sm'
  return getIsMd.value ? 'lg' : 'md'
})

// Heynabo integration
const {getUserUrl} = useHeynabo()
</script>

<template>
  <!-- GROUP MODE -->
  <div v-if="isGroup" class="flex items-center gap-2">
    <UAvatarGroup :max="maxAvatars" :size="avatarSize">
      <template v-for="inhabitant in inhabitantsList" :key="inhabitant.heynaboId">
        <ULink
          :to="getUserUrl(inhabitant.heynaboId)"
          target="_blank"
          class="hover:scale-110 hover:rotate-3 transition-transform duration-200 inline-block"
        >
          <UTooltip :text="`${inhabitant.name} ${inhabitant.lastName}`" :delay-duration="0">
            <UAvatar
              :src="inhabitant.pictureUrl ?? undefined"
              :alt="`${inhabitant.name} ${inhabitant.lastName}`"
              icon="i-heroicons-user"
              :class="ringColor ? `md:ring-2 md:ring-${ringColor}` : ''"
            />
          </UTooltip>
        </ULink>
      </template>
    </UAvatarGroup>

    <!-- Compact: Badge only | Not compact: Badge + count + label -->
    <UBadge v-if="compact" size="xs" color="primary">
      {{ count }}
    </UBadge>
    <div v-else class="flex items-center gap-1">
      <UBadge size="sm" color="primary">
        {{ count }}
      </UBadge>
      <span v-if="label" class="text-sm">{{ label }}</span>
    </div>
  </div>

  <!-- SINGLE MODE: COMPACT -->
  <div v-else-if="compact && singleInhabitant" class="inline-flex items-center gap-2">
    <ULink
      :to="getUserUrl(singleInhabitant.heynaboId)"
      target="_blank"
      class="hover:scale-110 hover:rotate-3 transition-transform duration-200"
    >
      <UAvatar
        :src="singleInhabitant.pictureUrl ?? undefined"
        :alt="`${singleInhabitant.name} ${singleInhabitant.lastName}`"
        :size="avatarSize"
        icon="i-heroicons-user"
        :class="ringColor ? `md:ring-2 md:ring-${ringColor}` : ''"
      />
    </ULink>
    <div class="flex items-center gap-1">
      <span class="text-xs md:text-md font-medium">{{ formatDisplayName(singleInhabitant) }}</span>
      <UBadge v-if="checkProperty(singleInhabitant)" size="xs" color="info">
        Barn
      </UBadge>
    </div>
  </div>

  <!-- SINGLE MODE: NOT COMPACT -->
  <UCard v-else-if="singleInhabitant">
    <div class="flex items-center gap-3">
      <ULink
        :to="getUserUrl(singleInhabitant.heynaboId)"
        target="_blank"
        class="hover:scale-110 hover:rotate-3 transition-transform duration-200 inline-block"
      >
        <UAvatar
          :src="singleInhabitant.pictureUrl ?? undefined"
          :alt="`${singleInhabitant.name} ${singleInhabitant.lastName}`"
          :size="avatarSize"
          icon="i-heroicons-user"
          :class="ringColor ? `md:ring-2 md:ring-${ringColor}` : ''"
        />
      </ULink>
      <div class="flex items-center gap-2">
        <span class="font-semibold">{{ singleInhabitant.name }} {{ singleInhabitant.lastName }}</span>
        <UBadge v-if="checkProperty(singleInhabitant)" size="sm" color="info">
          Barn
        </UBadge>
      </div>
    </div>
  </UCard>
</template>