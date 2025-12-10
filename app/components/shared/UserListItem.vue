<!--
┌─────────────────────────────────────────────────────────────────┐
│ UserListItem - Master component for displaying inhabitants      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ SINGLE MODE:                                                    │
│  [👤] Anna                    ← showNames=true, useFullName=false│
│  [👤] Anna Hansen             ← showNames=true, useFullName=true │
│  [👤]                         ← showNames=false                  │
│       <slot #badge>           ← role badges, child badge, etc.  │
│                                                                 │
│ GROUP MODE:                                                     │
│  [👤][👤][👤] Anna · Henne · Lars    ← showNames=true           │
│  [👤][👤][👤] 3 bofæller             ← showNames=false + label  │
│  [👤][👤][👤] 3                      ← showNames=false, compact │
│                                                                 │
│ PROPS:                                                          │
│  inhabitants    - Single or array of InhabitantDisplay          │
│  compact        - Smaller avatars (default: false)              │
│  size           - Override avatar size                          │
│  ringColor      - Avatar ring color                             │
│  showNames      - Display names (default: true)                 │
│  useFullName    - Full name vs first name (default: false)      │
│  label          - Group mode label, e.g., "bofæller"            │
│  linkToProfile  - Avatar links to Heynabo (default: true)       │
│                                                                 │
│ SLOTS:                                                          │
│  #badge({ inhabitant }) - Custom badges per inhabitant          │
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
  showNames?: boolean
  useFullName?: boolean
  label?: string
  linkToProfile?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  size: undefined,
  ringColor: undefined,
  showNames: true,
  useFullName: false,
  label: undefined,
  linkToProfile: true
})

// Slot type definition
defineSlots<{
  badge?(props: { inhabitant: InhabitantDisplay }): unknown
}>()

// Mode detection
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

// Duplicate first name detection for disambiguation
const duplicateFirstNames = computed(() => {
  const list = inhabitantsList.value
  const firstNameCounts = new Map<string, number>()

  list.forEach(inhabitant => {
    const c = firstNameCounts.get(inhabitant.name) || 0
    firstNameCounts.set(inhabitant.name, c + 1)
  })

  return new Set(
    Array.from(firstNameCounts.entries())
      .filter(([_, c]) => c > 1)
      .map(([name, _]) => name)
  )
})

// Format name based on props
const formatName = (inhabitant: InhabitantDisplay): string => {
  if (props.useFullName) {
    return `${inhabitant.name} ${inhabitant.lastName}`
  }
  // First name with disambiguation if needed
  if (duplicateFirstNames.value.has(inhabitant.name)) {
    const lastNameInitial = inhabitant.lastName.charAt(0).toUpperCase()
    return `${inhabitant.name} ${lastNameInitial}.`
  }
  return inhabitant.name
}

// Group names as dot-separated string
const groupNamesDisplay = computed(() => {
  if (!props.showNames) return null
  return inhabitantsList.value.map(formatName).join(' · ')
})

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
    <!-- Avatar group -->
    <UAvatarGroup :max="maxAvatars" :size="avatarSize">
      <template v-for="inhabitant in inhabitantsList" :key="inhabitant.heynaboId">
        <ULink
          v-if="linkToProfile"
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
        <UTooltip v-else :text="`${inhabitant.name} ${inhabitant.lastName}`" :delay-duration="0">
          <UAvatar
            :src="inhabitant.pictureUrl ?? undefined"
            :alt="`${inhabitant.name} ${inhabitant.lastName}`"
            icon="i-heroicons-user"
            :class="ringColor ? `md:ring-2 md:ring-${ringColor}` : ''"
          />
        </UTooltip>
      </template>
    </UAvatarGroup>

    <!-- Names (when showNames=true) -->
    <span v-if="showNames && groupNamesDisplay" class="text-sm font-medium">
      {{ groupNamesDisplay }}
    </span>

    <!-- Count + label (when showNames=false) -->
    <template v-else>
      <UBadge size="sm" color="primary">
        {{ count }}
      </UBadge>
      <span v-if="label && !compact" class="text-sm">{{ label }}</span>
    </template>
  </div>

  <!-- SINGLE MODE -->
  <div v-else-if="singleInhabitant" class="flex items-start gap-3">
    <!-- Avatar -->
    <ULink
      v-if="linkToProfile"
      :to="getUserUrl(singleInhabitant.heynaboId)"
      target="_blank"
      class="hover:scale-110 hover:rotate-3 transition-transform duration-200 inline-block flex-shrink-0"
    >
      <UAvatar
        :src="singleInhabitant.pictureUrl ?? undefined"
        :alt="`${singleInhabitant.name} ${singleInhabitant.lastName}`"
        :size="avatarSize"
        icon="i-heroicons-user"
        :class="ringColor ? `md:ring-2 md:ring-${ringColor}` : ''"
      />
    </ULink>
    <UAvatar
      v-else
      :src="singleInhabitant.pictureUrl ?? undefined"
      :alt="`${singleInhabitant.name} ${singleInhabitant.lastName}`"
      :size="avatarSize"
      icon="i-heroicons-user"
      :class="ringColor ? `md:ring-2 md:ring-${ringColor}` : ''"
    />

    <!-- Name + badge slot -->
    <div v-if="showNames" class="flex flex-col gap-1">
      <span :class="compact ? 'text-sm font-medium' : 'font-semibold'">
        {{ formatName(singleInhabitant) }}
      </span>
      <slot name="badge" :inhabitant="singleInhabitant" />
    </div>
  </div>
</template>
