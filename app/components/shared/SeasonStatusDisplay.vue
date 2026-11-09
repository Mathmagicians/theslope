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
import {SEASON_STATUS, SEASON_WORDS} from '~/config/seasonWords'

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
const now = useClock()
const {BUTTONS, COLOR, ICONS, SIZES, TYPOGRAPHY, ALERTS, SEASON_STATUS_GLYPHS} = useTheSlopeDesignSystem()

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
  return getSeasonStatus(season.value, now.value)
})

// Alert configuration - intelligent descriptions based on status
const alertConfig = computed(() => {
  if (!status.value) return null

  switch (status.value) {
    case SEASON_STATUS.ACTIVE:
      return {kind: 'success' as const, icon: ICONS.checkCircle, ...SEASON_WORDS.statusAlert[SEASON_STATUS.ACTIVE]}
    case SEASON_STATUS.FUTURE:
      return {kind: 'info' as const, icon: ICONS.calendar, ...SEASON_WORDS.statusAlert[SEASON_STATUS.FUTURE]}
    case SEASON_STATUS.CURRENT:
      return {kind: 'warning' as const, icon: ICONS.calendar, ...SEASON_WORDS.statusAlert[SEASON_STATUS.CURRENT]}
    case SEASON_STATUS.PAST:
    default:
      return {kind: 'neutral' as const, icon: ICONS.archive, ...SEASON_WORDS.statusAlert[SEASON_STATUS.PAST]}
  }
})

// Show button only if season is eligible (can be activated or is already active)
const showButton = computed(() => {
  if (!props.showActivationButton || !season.value) return false
  return season.value.isActive || canSeasonBeActive(season.value, now.value)
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
    <template #title>
      {{ alertConfig.title }} <UBadge v-if="status" v-bind="SEASON_STATUS_GLYPHS[status]" data-testid="season-status-mark" />
    </template>
    <template v-if="showButton" #actions>
      <UFormField :hint="season?.isActive ? SEASON_WORDS.activation.activeHint : SEASON_WORDS.activation.inactiveHint" :ui="{hint: TYPOGRAPHY.bodyTextMuted}">
        <!-- Deactivate uses DangerButton (destructive action) -->
        <DangerButton
          v-if="season?.isActive"
          data-testid="deactivate-season"
          :label="SEASON_WORDS.activation.deactivate"
          :confirm-label="SEASON_WORDS.activation.confirmDeactivate"
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
          {{ SEASON_WORDS.activation.activate }}
        </UButton>
      </UFormField>
    </template>
  </UAlert>
</template>
