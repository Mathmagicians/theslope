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
import {ALLERGY_WORDS} from '~/config/allergyWords'

const props = withDefaults(defineProps<{
  /** Which ALERTS kind to wear - the poster wants the quiet neutral face */
  kind?: AlertKind
  message?: string
}>(), {
  kind: 'info',
  message: ALLERGY_WORDS.managers.message
})

const {ALERTS, ICONS, COMPONENTS} = useTheSlopeDesignSystem()

const store = useUsersStore()
const {allergyManagers, isAllergyManagersLoading} = storeToRefs(store)
store.loadAllergyManagers()

// An account without an inhabitant can hold the role; it has no face to show
const allergyManagerInhabitants = computed(() =>
  allergyManagers.value.flatMap(manager => manager.Inhabitant ? [manager.Inhabitant] : []))
</script>

<template>
  <Loader v-if="isAllergyManagersLoading" text="Henter allergi ansvarlige" />
  <UAlert
    v-else
    v-bind="ALERTS[props.kind]"
    :icon="ICONS.help"
    :ui="COMPONENTS.allergyManagersList.alertUi(ALERTS[props.kind].ui)"
    :title="ALLERGY_WORDS.managers.title"
  >
    <template #description>
      <p :class="COMPONENTS.allergyManagersList.message">{{ props.message }}</p>
      <UserListItem
        :inhabitants="allergyManagerInhabitants"
        :label="ALLERGY_WORDS.managers.label"
        ring="allergyManager"
      />
    </template>
  </UAlert>
</template>
