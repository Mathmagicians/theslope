<!--
SeasonStatusDisplay - Intelligent season status display with activation controls

Displays appropriate status badge and activation button based on season state.
Component handles all logic internally - parent just passes season and enables button.

Props:
  - season: Season object to display status for
  - showActivationButton: Whether to show activation button (default: false)

Events:
  - activate: Emitted when user clicks activate button
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

// Compute season status
const status = computed(() => {
  if (!props.season) return null
  return getSeasonStatus(props.season)
})

// Alert configuration - intelligent descriptions based on status
const alertConfig = computed(() => {
  if (!status.value) return null

  switch (status.value) {
    case SEASON_STATUS.ACTIVE:
      return {
        color: 'success' as const,
        icon: 'i-heroicons-check-circle-solid',
        variant: 'subtle',
        title: 'Aktiv sæson',
        description: 'Denne sæson er synlig for alle brugere, som kan se og booke fællesspisninger. Kun én sæson kan være aktiv ad gangen.'
      }
    case SEASON_STATUS.FUTURE:
      return {
        color: 'warning' as const,
        icon: 'i-heroicons-calendar-outline',
        variant: 'outline',
        title: 'Fremtidig sæson',
        description: 'Denne sæson er kun synlig for administratorer. Når du aktiverer sæsonen, kan beboere se og booke fællesspisninger.'
      }
    case SEASON_STATUS.PAST:
      return {
        color: 'neutral' as const,
        icon: 'i-heroicons-archive-box-solid',
        variant: 'outline',
        title: 'Arkiveret sæson',
        description: 'Denne sæson er afsluttet og kun synlig for administratorer. Gamle sæsoner kan ikke genaktiveres.'
      }
    case SEASON_STATUS.CURRENT:
      return {
        color: 'success' as const,
        icon: 'i-heroicons-calendar-outline',
        variant: 'outline',
        title: 'Inaktiv sæson',
        description: 'Denne sæson er aktuel men ikke aktiveret. Aktiver sæsonen for at gøre den synlig for beboere.'
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
    variant="subtle"
  >
    <template v-if="showButton" #actions>
      <UButton
        name="activate-season"
        color="success"
        icon="i-heroicons-check-circle"
        size="sm"
        :disabled="isActivateButtonDisabled"
        @click="handleActivate"
        class="hidden md:inline-flex"
      >
        {{ isActivateButtonDisabled ? 'Igangværende Sæson' : 'Aktiver Sæson' }}
      </UButton>
      <UButton
        name="activate-season-mobile"
        color="success"
        icon="i-heroicons-check-circle"
        size="sm"
        :disabled="isActivateButtonDisabled"
        @click="handleActivate"
        class="md:hidden"
        square
      />
    </template>
  </UAlert>
</template>
