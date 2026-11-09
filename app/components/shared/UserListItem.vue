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
│  [👤][👤][👤][+4]                    ← seven on a phone          │
│  [👤][👤][👤][👤][👤][+2]            ← seven from md             │
│  A long names list wraps under the faces inside its cell        │
│                                                                 │
│ PROPS:                                                          │
│  inhabitants    - Single or array of InhabitantDisplay          │
│  compact        - Smaller avatars (default: false)              │
│  size           - Override avatar size                          │
│  ring           - The surface the faces sit on, which picks the │
│                   ring from md: household, inhabitant,          │
│                   allergyManager (default: none)                │
│  showNames      - Display names (default: true)                 │
│  useFullName    - Full name vs first name (default: false)      │
│  label          - Group mode label, e.g., "bofæller"            │
│  max            - Group faces before the overflow count         │
│                   (default: SIZES.avatarMax: 3, 5 from md)      │
│  linkToProfile  - Avatar links to Heynabo (default: true)       │
│  icon           - Avatar fallback icon (default: ICONS.user)    │
│                                                                 │
│ SLOTS:                                                          │
│  #badge({ inhabitant }) - Custom badges per inhabitant          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Visual check: at 375px and desktop, a group of seven or more: the /dinner team card's monitor face and the allergy
managers box (/admin/allergies) show three faces and the overflow count on a phone, five from md; the
/household/<S>/members power row shows three on both; a long names list wraps under the faces and the page does not
scroll sideways. From md the faces ring: orange on the Præferencer power row, amber on each inhabitant there, blue on
the allergy managers; on a phone no face rings.
-->
<script setup lang="ts">
import type {InhabitantDisplay} from '~/composables/useCoreValidation'
import type {NuxtUISize, UserListItemRing} from '~/composables/useTheSlopeDesignSystem'

interface Props {
  inhabitants: InhabitantDisplay | InhabitantDisplay[]
  compact?: boolean
  size?: NuxtUISize
  ring?: UserListItemRing
  showNames?: boolean
  useFullName?: boolean
  nameFormatter?: (inhabitant: InhabitantDisplay) => string
  description?: string  // Shows after names/count (e.g., "Holdets kokke")
  linkToProfile?: boolean
  icon?: string
  label?: string        // Group mode label, e.g. "bofæller"
  labelPlural?: string  // Plural form of label
  max?: number
}

const {ICONS, COLOR, TYPOGRAPHY, TEXT, COMPONENTS, SIZES} = useTheSlopeDesignSystem()

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  size: undefined,
  ring: undefined,
  showNames: true,
  useFullName: false,
  nameFormatter: undefined,
  description: undefined,
  linkToProfile: true,
  icon: undefined,
  label: undefined,
  labelPlural: undefined,
  max: undefined
})

const userListItem = COMPONENTS.userListItem

const avatarIcon = computed(() => props.icon ?? ICONS.user)

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
  // Custom formatter takes priority
  if (props.nameFormatter) {
    return props.nameFormatter(inhabitant)
  }
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

// An explicit size is fixed; the defaults step up from md through CSS
const avatarSize = computed(() => {
  if (props.size) return {size: props.size, fit: '', group: {size: props.size}}
  return props.compact ? COMPONENTS.avatar.compact : COMPONENTS.avatar.regular
})
const avatarClass = computed(() => [avatarSize.value.fit, props.ring ? userListItem.ring[props.ring] : ''])

// Heynabo integration
const heynaboUserUrl = getUserUrl(useRuntimeConfig().public.HEY_NABO_API)
</script>

<template>
  <!-- GROUP MODE -->
  <div v-if="isGroup" :class="userListItem.group">
    <!-- Description (shows above) -->
    <span v-if="description && !compact" :class="[TYPOGRAPHY.finePrint, TEXT.muted]">{{ description }}</span>

    <!-- Avatars + Names row -->
    <div :class="userListItem.groupRow">
      <!-- Avatar group -->
      <UAvatarGroup v-bind="avatarSize.group" :max="max ?? SIZES.avatarMax">
        <template v-for="inhabitant in inhabitantsList" :key="inhabitant.heynaboId">
          <ULink
            v-if="linkToProfile"
            :to="heynaboUserUrl(inhabitant.heynaboId)"
            target="_blank"
            :class="userListItem.link"
          >
            <UTooltip :text="`${inhabitant.name} ${inhabitant.lastName}`" :delay-duration="0">
              <UAvatar
                :src="inhabitant.pictureUrl ?? undefined"
                :alt="`${inhabitant.name} ${inhabitant.lastName}`"
                :icon="avatarIcon"
                :class="avatarClass"
              />
            </UTooltip>
          </ULink>
          <UTooltip v-else :text="`${inhabitant.name} ${inhabitant.lastName}`" :delay-duration="0">
            <UAvatar
              :src="inhabitant.pictureUrl ?? undefined"
              :alt="`${inhabitant.name} ${inhabitant.lastName}`"
              :icon="avatarIcon"
              :class="avatarClass"
            />
          </UTooltip>
        </template>
      </UAvatarGroup>

      <!-- Names (when showNames=true) -->
      <span v-if="showNames && groupNamesDisplay" :class="TYPOGRAPHY.bodyTextMedium">
        {{ groupNamesDisplay }}
      </span>

      <!-- Count badge (when showNames=false) -->
      <UBadge v-if="!showNames" :size="SIZES.sm" :color="COLOR.primary">
        {{ count }}
      </UBadge>
    </div>
  </div>

  <!-- SINGLE MODE -->
  <div v-else-if="singleInhabitant" :class="userListItem.single">
    <!-- Avatar -->
    <ULink
      v-if="linkToProfile"
      :to="heynaboUserUrl(singleInhabitant.heynaboId)"
      target="_blank"
      :class="userListItem.singleLink"
    >
      <UAvatar
        :src="singleInhabitant.pictureUrl ?? undefined"
        :alt="`${singleInhabitant.name} ${singleInhabitant.lastName}`"
        :size="avatarSize.size"
        :icon="avatarIcon"
        :class="avatarClass"
      />
    </ULink>
    <UAvatar
      v-else
      :src="singleInhabitant.pictureUrl ?? undefined"
      :alt="`${singleInhabitant.name} ${singleInhabitant.lastName}`"
      :size="avatarSize.size"
      :icon="avatarIcon"
      :class="avatarClass"
    />

    <!-- Name + badge slot -->
    <div v-if="showNames" :class="userListItem.nameStack">
      <span :class="compact ? TYPOGRAPHY.bodyTextMedium : userListItem.name">
        {{ formatName(singleInhabitant) }}
      </span>
      <slot name="badge" :inhabitant="singleInhabitant" />
    </div>
  </div>
</template>
