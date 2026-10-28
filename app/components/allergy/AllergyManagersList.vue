<!--
AllergyManagersList - the allergy managers' contact, in the alert kind the caller picks

 [help icon] Spørgsmål om allergier?
 From md:    Kontakt den allergiansvarlige, …    [face][face] Allergiansvarlige    ← each face ringed blue
 Phone:      Kontakt den allergiansvarlige, …
             [face][face] Allergiansvarlige                                       ← no ring

Visual check: at 375px and desktop, the household Allergier tab and /admin/allergies (ALERTS.info) and the poster
/admin/allergies/pdf (ALERTS.legend): the managers sit beside the message from md and below it on a phone; from md each
manager's face rings blue, on a phone no face rings.
-->
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

const {ALERTS, ICONS, COMPONENTS} = useTheSlopeDesignSystem()

const store = useUsersStore()
const {allergyManagers, isAllergyManagersLoading} = storeToRefs(store)

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
    :ui="COMPONENTS.allergyManagersList.alertUi(ALERTS[props.kind].ui)"
    title="Spørgsmål om allergier?"
  >
    <template #description>
      <p :class="COMPONENTS.allergyManagersList.message">{{ props.message }}</p>
      <UserListItem
        :inhabitants="allergyManagerInhabitants"
        label="Allergiansvarlige"
        ring="allergyManager"
      />
    </template>
  </UAlert>
</template>
