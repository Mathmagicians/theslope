<!--
SeasonStatusDisplay - Intelligent season status display with activation controls

Displays appropriate status badge and activation button based on season state.
Component handles all logic internally - parent just passes season and enables button.

Props:
  - season: Season object to display status for
  - showActivationButton: Whether to show activation button (default: false)

Events:
  - activate: Emitted when user clicks activate button

UX MOCKUP: Season Status Alerts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ACTIVE SEASON:
┌──────────────────────────────────────────────────────────┐
│ ✓ Aktiv sæson 🟢                    [Igangværende Sæson]│
│ Denne sæson er synlig for alle brugere, som kan se og   │
│ booke fællesspisninger. Kun én sæson kan være aktiv.    │
└──────────────────────────────────────────────────────────┘

FUTURE SEASON:
┌──────────────────────────────────────────────────────────┐
│ 📅 Fremtidig sæson 🌱                  [Aktiver Sæson]  │
│ Denne sæson er kun synlig for administratorer. Når du   │
│ aktiverer sæsonen, kan beboere se og booke.             │
└──────────────────────────────────────────────────────────┘

CURRENT SEASON (dates match but not activated):
┌──────────────────────────────────────────────────────────┐
│ 📅 Inaktiv sæson 🟡                    [Aktiver Sæson]  │
│ Datoerne for denne sæson siger det er nu! Men den er    │
│ ikke aktiveret. Aktiver sæsonen for at gøre synlig.     │
└──────────────────────────────────────────────────────────┘

PAST SEASON:
┌──────────────────────────────────────────────────────────┐
│ 📦 Arkiveret sæson ⚪                                    │
│ Denne sæson er afsluttet og kun synlig for admins.      │
│ Gamle sæsoner kan ikke genaktiveres.                    │
└──────────────────────────────────────────────────────────┘
-->

<script setup lang="ts">
import type {Season} from '~/composables/useSeasonValidation'

interface Props {
  season: Season | null
  showActivationButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showActivationButton: false
})

const emit = defineEmits<{
  activate: []
}>()

import {SEASON_STATUS} from '~/composables/useSeasonValidation'

const {getSeasonStatus, canSeasonBeActive} = useSeason()

// Inject responsive breakpoint
const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)

// Compute season status
const status = computed(() => {
  if (!props.season) return null
  return getSeasonStatus(props.season)
})

// Get status emoji circle (matching SeasonSelector)
const getStatusEmoji = (status: string): string => {
  switch (status) {
    case SEASON_STATUS.ACTIVE:
      return '🟢'  // Solid green circle
    case SEASON_STATUS.FUTURE:
      return '🌱'  // Green seedling (no green outline emoji exists)
    case SEASON_STATUS.CURRENT:
      return '🟡'  // Solid yellow circle
    case SEASON_STATUS.PAST:
    default:
      return '⚪'  // Grey circle
  }
}

// Alert configuration - intelligent descriptions based on status
const alertConfig = computed(() => {
  if (!status.value) return null

  const emoji = getStatusEmoji(status.value)

  switch (status.value) {
    case SEASON_STATUS.ACTIVE:
      return {
        color: 'success' as const,
        icon: 'i-heroicons-check-circle-solid',
        variant: 'subtle',
        title: `Aktiv sæson ${emoji}`,
        description: 'Denne sæson er synlig for alle brugere, som kan se og booke fællesspisninger. Kun én sæson kan være aktiv ad gangen.'
      }
    case SEASON_STATUS.FUTURE:
      return {
        color: 'success' as const,
        icon: 'i-heroicons-calendar',
        variant: 'outline',
        title: `Fremtidig sæson ${emoji}`,
        description: 'Denne sæson er kun synlig for administratorer. Når du aktiverer sæsonen, kan beboere se og booke fællesspisninger.'
      }
    case SEASON_STATUS.PAST:
      return {
        color: 'neutral' as const,
        icon: 'i-heroicons-archive-box-solid',
        variant: 'outline',
        title: `Arkiveret sæson ${emoji}`,
        description: 'Denne sæson er afsluttet og kun synlig for administratorer. Gamle sæsoner kan ikke genaktiveres.'
      }
    case SEASON_STATUS.CURRENT:
      return {
        color: 'success' as const,
        icon: 'i-heroicons-calendar',
        variant: 'outline',
        title: `Inaktiv sæson ${emoji}`,
        description: 'Datoerne for denne sæson siger det er nu! Men den er ikke aktiveret. Aktiver sæsonen for at gøre den synlig for beboere.'
      }
  }
})

// Show button only if season is eligible (can be activated or already active)
const showButton = computed(() => {
  if (!props.showActivationButton || !props.season) return false
  // Show if already active (will be disabled) or if can be activated
  return props.season.isActive || canSeasonBeActive(props.season)
})

// Disable button if already active
const isActivateButtonDisabled = computed(() => {
  return props.season?.isActive ?? false
})

const handleActivate = () => {
  emit('activate')
}
</script>

<template>
  <UAlert
    v-if="alertConfig"
    :color="alertConfig.color"
    :icon="alertConfig.icon"
    :title="alertConfig.title"
    :description="alertConfig.description"
    :variant="alertConfig.variant"
  >
    <template v-if="showButton" #actions>
      <UButton
        name="activate-season"
        color="success"
        icon="i-heroicons-check-circle"
        :size="getIsMd ? 'md' : 'sm'"
        :disabled="isActivateButtonDisabled"
        @click="handleActivate"
        :square="!getIsMd"
      >
        <template v-if="getIsMd">
          {{ isActivateButtonDisabled ? 'Igangværende Sæson' : 'Aktiver Sæson' }}
        </template>
      </UButton>
    </template>
  </UAlert>
</template>
