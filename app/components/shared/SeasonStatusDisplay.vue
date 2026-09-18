<!--
SeasonStatusDisplay - Intelligent season status display with activation controls

Displays appropriate status badge and activation button based on season state.
Component is reactive to store changes - fetches season by ID and updates when activeSeasonId changes.

Props:
  - seasonId: ID of season to display status for (number | null)
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
import {usePlanStore} from '~/stores/plan'
import {SEASON_STATUS} from '~/composables/useSeasonValidation'

interface Props {
  seasonId: number | null
  showActivationButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showActivationButton: false
})

const emit = defineEmits<{
  activate: []
  deactivate: []
}>()

const planStore = usePlanStore()
const {getSeasonStatus, canSeasonBeActive} = useSeason()
const {BUTTONS, COLOR, ICONS, SIZES, TYPOGRAPHY, ALERTS} = useTheSlopeDesignSystem()

// Reactively get season from store - updates when store changes
const season = computed(() => {
  if (!props.seasonId) return null
  return planStore.seasons.find(s => s.id === props.seasonId) ?? null
})

// Get loading state from store for activation operations (compound state tracks API + refreshes)
const isActivatingSeason = computed(() => planStore.isActivatingSeasonFlowInProgress)

// Compute season status
const status = computed(() => {
  if (!season.value) return null
  return getSeasonStatus(season.value)
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
        kind: 'success' as const,
        icon: ICONS.checkCircle,
        title: `Aktiv sæson ${emoji}`,
        description: 'Denne sæson er synlig for alle brugere, som kan se og booke fællesspisninger. Kun én sæson kan være aktiv ad gangen.'
      }
    case SEASON_STATUS.FUTURE:
      return {
        kind: 'info' as const,
        icon: ICONS.calendar,
        title: `Fremtidig sæson ${emoji}`,
        description: 'Denne sæson er kun synlig for administratorer. Når du aktiverer sæsonen, kan beboere se og booke fællesspisninger.'
      }
    case SEASON_STATUS.CURRENT:
      return {
        kind: 'warning' as const,
        icon: ICONS.calendar,
        title: `Inaktiv sæson ${emoji}`,
        description: 'Datoerne for denne sæson siger det er nu! Men den er ikke aktiveret. Aktiver sæsonen for at gøre den synlig for beboere.'
      }
    case SEASON_STATUS.PAST:
    default:
      return {
        kind: 'neutral' as const,
        icon: ICONS.archive,
        title: `Arkiveret sæson ${emoji}`,
        description: 'Denne sæson er afsluttet og kun synlig for administratorer. Gamle sæsoner kan ikke genaktiveres.'
      }
  }
})

// Show button only if season is eligible (can be activated or is already active)
const showButton = computed(() => {
  if (!props.showActivationButton || !season.value) return false
  return season.value.isActive || canSeasonBeActive(season.value)
})
</script>

<template>
  <UAlert
    v-if="alertConfig"
    v-bind="{...ALERTS[alertConfig.kind], ...ALERTS.withActions}"
    :icon="alertConfig.icon"
    :title="alertConfig.title"
    :description="alertConfig.description"
  >
    <template v-if="showButton" #actions>
      <UFormField :hint="season?.isActive ? 'Fællesspisnings sæson er i gang' : 'Denne sæson er ikke aktiv'" :ui="{hint: TYPOGRAPHY.bodyTextMuted}">
        <!-- Deactivate uses DangerButton (destructive action) -->
        <DangerButton
          v-if="season?.isActive"
          data-testid="deactivate-season"
          label="Deaktiver Sæson"
          confirm-label="Tryk igen for at deaktivere..."
          :loading="isActivatingSeason"
          :size="SIZES.small"
          @confirm="emit('deactivate')"
        />
        <!-- Activate uses regular button (constructive action) -->
        <UButton
          v-else
          v-bind="BUTTONS.primaryAction"
          data-testid="activate-season"
          :color="COLOR.success"
          :icon="ICONS.playCircle"
          :trailing-icon="ICONS.arrowRight"
          :size="SIZES.small"
          :loading="isActivatingSeason"
          :disabled="isActivatingSeason"
          @click="emit('activate')"
        >
          Aktiver Sæson
        </UButton>
      </UFormField>
    </template>
  </UAlert>
</template>
