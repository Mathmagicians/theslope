<!--
AllergyTypeDisplay - an allergy type's own icon or emoji on a white avatar, optionally with its name

Props:
- allergyType: { name, icon?, description? } | null - without a type it shows the no-allergy state, "Ingen"
- compact: the small inline face for table cells and diner lines; otherwise the regular face
- showName: the name beside the avatar

  compact show-name:  (milk) Mælk
  no type, show-name: (sun) Ingen
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

const {COMPONENTS, ICONS, SIZES} = useTheSlopeDesignSystem()
const display = COMPONENTS.allergyTypeDisplay

const normalizedAllergyType = computed(() =>
  props.allergyType ?? {name: 'Ingen', icon: ICONS.noAllergy, description: 'Ingen allergier'}
)

const avatarSize = computed(() => props.compact ? SIZES.allergyAvatarCompact : SIZES.allergyAvatar)

// An allergy type's icon is either an iconify name or an emoji; the avatar takes the first as icon, the second as text
const isIconClass = computed(() => normalizedAllergyType.value.icon?.startsWith('i-') || normalizedAllergyType.value.icon?.includes(':'))

const avatarIcon = computed(() => {
  if (!normalizedAllergyType.value.icon) return ICONS.noAllergy
  return isIconClass.value ? normalizedAllergyType.value.icon : undefined
})

const avatarText = computed(() =>
  !isIconClass.value && normalizedAllergyType.value.icon ? normalizedAllergyType.value.icon : undefined
)

const stateClass = computed(() => props.allergyType ? undefined : display.none)
const nameWeight = computed(() => props.allergyType ? display.named : undefined)
</script>

<template>
  <div v-if="compact" :class="[display.compactRoot, stateClass]">
    <UAvatar
      :icon="avatarIcon"
      :text="avatarText"
      :size="avatarSize"
      :class="display.compactAvatar"
    />
    <span v-if="showName" :class="[display.compactName, nameWeight]">
      {{ normalizedAllergyType.name }}
    </span>
  </div>

  <div v-else :class="[display.root, stateClass]">
    <UAvatar
      :icon="avatarIcon"
      :text="avatarText"
      :size="avatarSize"
      :class="display.avatar"
    />
    <span v-if="showName" :class="[display.name, nameWeight]">
      {{ normalizedAllergyType.name }}
    </span>
  </div>
</template>
