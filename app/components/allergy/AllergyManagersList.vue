<script setup lang="ts">
import type {AlertKind} from '~/composables/useTheSlopeDesignSystem'

const props = withDefaults(defineProps<{
  /** Which ALERTS kind to wear - the poster wants the quiet neutral face (ADR-018) */
  kind?: AlertKind
  message?: string
}>(), {
  kind: 'info',
  message: 'Kontakt den allergiansvarlige, hvis du har brug for at snakke om allergier i din familie:'
})

const {ALERTS, ICONS} = useTheSlopeDesignSystem()

// The managers sit beside the message on desktop, below it on a phone - merged on top of
// the kind so the wrap classes survive (a bare :ui would replace them)
const alertUi = computed(() => ({
  ...ALERTS[props.kind].ui,
  description: `${ALERTS[props.kind].ui.description} flex flex-col md:flex-row md:items-center gap-3`
}))

const store = useUsersStore()
const {allergyManagers, isAllergyManagersLoading} = storeToRefs(store)

// Extract Inhabitant objects - they already match InhabitantLike interface
const allergyManagerInhabitants = computed(() => {
  if (!allergyManagers.value) return []
  return allergyManagers.value
    .filter(m => m.Inhabitant)
    .map(m => m.Inhabitant!)
})
</script>

<template>
  <Loader v-if="isAllergyManagersLoading" text="Henter allergi ansvarlige" />
  <UAlert
    v-else
    v-bind="ALERTS[props.kind]"
    :icon="ICONS.help"
    :ui="alertUi"
    title="Spørgsmål om allergier?"
  >
    <template #description>
      <p class="text-sm md:flex-1">{{ props.message }}</p>
      <UserListItem
        :inhabitants="allergyManagerInhabitants"
        label="Allergiansvarlige"
        ring-color="ocean-500"
      />
    </template>
  </UAlert>
</template>
