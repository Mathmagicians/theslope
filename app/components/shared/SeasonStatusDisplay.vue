<!--
SeasonStatusDisplay - Reusable component for displaying season status

Shows status badge for active/future/past seasons with contextual information
and optional activation button for future seasons.

Props:
  - season: Season object to display status for
  - showActivationButton: Whether to show "Activate Season" button (default: false)

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

const {getSeasonStatus, canSeasonBeActive} = useSeason()

// Compute season status
const status = computed(() => {
  if (!props.season) return null
  return getSeasonStatus(props.season)
})

// Alert configuration based on status
const alertConfig = computed(() => {
  if (!status.value) return null

  switch (status.value) {
    case 'active':
      return {
        color: 'success' as const,
        icon: 'i-heroicons-check-circle',
        title: 'AKTIV SÆSON',
        description: 'Denne sæson er synlig for alle beboere og kan bookes'
      }
    case 'future':
      return {
        color: 'warning' as const,
        icon: 'i-heroicons-clock',
        title: 'FREMTIDIG SÆSON',
        description: 'Denne sæson er kun synlig for administratorer'
      }
    case 'past':
      return {
        color: 'neutral' as const,
        icon: 'i-heroicons-archive-box',
        title: 'ARKIVERET SÆSON',
        description: 'Denne sæson er afsluttet og kun synlig for administratorer'
      }
  }
})

// Show activation card for future seasons
const showActivationCard = computed(() => {
  return props.showActivationButton &&
         status.value === 'future' &&
         props.season &&
         canSeasonBeActive(props.season)
})

const handleActivate = () => {
  emit('activate')
}
</script>

<template>
  <div v-if="alertConfig" class="space-y-4">
    <!-- Status Badge -->
    <UAlert
      :color="alertConfig.color"
      :icon="alertConfig.icon"
      :title="alertConfig.title"
      :description="alertConfig.description"
      variant="subtle"
    />

    <!-- Activation Card (Future Seasons Only) -->
    <UCard v-if="showActivationCard" color="primary" variant="subtle">
      <template #header>
        <div class="flex items-start gap-3">
          <UIcon name="i-heroicons-light-bulb" class="w-5 h-5 text-yellow-500 mt-0.5" />
          <div class="flex-1">
            <h3 class="text-base font-semibold">Gør denne sæson aktiv?</h3>
          </div>
        </div>
      </template>

      <div class="space-y-3">
        <p class="text-sm text-gray-700 dark:text-gray-300">
          Når du aktiverer denne sæson:
        </p>
        <ul class="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
          <li>Beboere kan se og booke fællesspisninger</li>
          <li>Den nuværende aktive sæson deaktiveres automatisk</li>
        </ul>
      </div>

      <template #footer>
        <div class="flex justify-end">
          <UButton
            name="activate-season"
            color="success"
            icon="i-heroicons-check-circle"
            @click="handleActivate"
          >
            Aktiver denne sæson
          </UButton>
        </div>
      </template>
    </UCard>

    <!-- Past Season Info Card -->
    <UCard v-else-if="status === 'past'" color="neutral" variant="subtle">
      <template #header>
        <div class="flex items-start gap-3">
          <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-gray-500 mt-0.5" />
          <div class="flex-1">
            <h3 class="text-base font-semibold">Arkiverede sæsoner</h3>
          </div>
        </div>
      </template>

      <p class="text-sm text-gray-700 dark:text-gray-300">
        Gamle sæsoner kan ikke genaktiveres. De bevares til regnskab og historik.
      </p>
    </UCard>
  </div>
</template>
