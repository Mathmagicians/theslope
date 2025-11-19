<!--
Utility component for displaying allergy types consistently

Props:
- allergyType: { name: string, icon?: string, description?: string } | null/undefined
  - If null/undefined: Shows "no allergies" state (☀️ Ingen)
- compact: boolean (default: false)
  - true: avatar only (inline display for tables, lists)
  - false: avatar + name (regular display)
- showName: boolean (default: false)
  - true: show name next to avatar
  - false: avatar only

Examples:
<AllergyTypeDisplay :allergy-type="allergyType" compact /> Avatar only, inline
<AllergyTypeDisplay :allergy-type="allergyType" show-name /> Avatar + name
<AllergyTypeDisplay />  No allergies: ☀️ (+ Ingen if showName)
-->

<script setup lang="ts">
interface AllergyTypeLike {
  name: string
  icon?: string | null
  description?: string
}

interface Props {
  allergyType?: AllergyTypeLike | null
  compact?: boolean
  showName?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  allergyType: null,
  compact: false,
  showName: false
})

// Responsive breakpoint injection
const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)

// Normalize allergyType - treat null/undefined as "no allergies" object
const normalizedAllergyType = computed(() => {
  if (!props.allergyType) {
    return { name: 'Ingen', icon: 'emojione-v1:sun-with-face', description: 'Ingen allergier' }
  }
  return props.allergyType
})

// Responsive avatar size
const avatarSize = computed(() => {
  if (props.compact) {
    return getIsMd.value ? 'xs' : '2xs'
  }
  return getIsMd.value ? 'sm' : 'xs'
})

// Determine if icon is an iconify class or emoji/text
const isIconClass = computed(() => normalizedAllergyType.value.icon?.startsWith('i-') || normalizedAllergyType.value.icon?.includes(':'))

// For UAvatar icon property (iconify classes only)
const avatarIcon = computed(() => {
  if (!normalizedAllergyType.value.icon) {
    return 'emojione-v1:sun-with-face' // Fallback if icon is missing
  }
  if (isIconClass.value) {
    return normalizedAllergyType.value.icon
  }
  return undefined // Use text instead
})

// For UAvatar text property (emojis only)
const avatarText = computed(() => {
  if (!isIconClass.value && normalizedAllergyType.value.icon) {
    return normalizedAllergyType.value.icon // Emoji
  }
  return undefined // Use icon instead
})

// Display name
const displayName = computed(() => normalizedAllergyType.value.name)
</script>

<template>
  <!-- Compact: Inline display (avatar only or avatar + name) -->
  <div v-if="compact" class="inline-flex items-center gap-1 md:gap-2" :class="!allergyType ? 'text-muted' : ''">
    <UAvatar
      :icon="avatarIcon"
      :text="avatarText"
      :size="avatarSize"
      class="flex-shrink-0 bg-white"
      :ui="{ padding: 'p-0.5' }"
    />
    <span v-if="showName" class="text-xs md:text-sm whitespace-nowrap" :class="allergyType ? 'font-medium' : ''">
      {{ displayName }}
    </span>
  </div>

  <!-- Regular: Avatar + Name (responsive sizing) -->
  <div v-else class="flex items-center gap-2" :class="!allergyType ? 'text-muted' : ''">
    <UAvatar
      :icon="avatarIcon"
      :text="avatarText"
      :size="avatarSize"
      class="flex-shrink-0 bg-white"
      :ui="{ padding: 'p-1' }"
    />
    <span v-if="showName" class="text-sm md:text-base" :class="allergyType ? 'font-medium' : ''">
      {{ displayName }}
    </span>
  </div>
</template>
