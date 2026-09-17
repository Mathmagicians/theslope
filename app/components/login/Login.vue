<!--
┌──────────────────────────────────────────────────────────────────────────────┐
│ Login - the login form, and the dashboard once logged in                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ DASHBOARD /login (logged in) - this file owns the composition                │
│ ┌ Hej Anna! 👋 ────────────────────────────────────────────────────────────┐ │
│ │ ┌ UserProfileCard ([⚙ Indstillinger] in its header) ──────────────────┐  │ │
│ │ └─────────────────────────────────────────────────────────────────────┘  │ │
│ │ ┌ UserPreferencesCard ─────────────────────────┐  only while the toggle  │ │
│ │ └──────────────────────────────────────────────┘  is on (v-if)           │ │
│ │ Hvad vil du lave i dag?                                                  │ │
│ │ ┌ ActionCard ─┐ ┌ ActionCard ─┐ ┌ ActionCard ─┐                          │ │
│ │ └─────────────┘ └─────────────┘ └─────────────┘                          │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ The open state is a ref in this file (ADR-006: no persistence); each child    │
│ draws its own internals in its own header comment.                           │
└──────────────────────────────────────────────────────────────────────────────┘
-->
<script setup lang="ts">
import type {FormSubmitEvent} from '#ui/types'
import type {LoginCredentials} from '~/composables/useCoreValidation'

const authStore = useAuthStore()
const {loggedIn, greeting} = storeToRefs(authStore)
const {signIn} = authStore
const {LoginSchema} = useCoreValidation()
const {handleApiError} = useApiHandler()
const {TYPOGRAPHY, LAYOUTS, BG, ICONS, ALERTS, COLOR} = useTheSlopeDesignSystem()

const householdShortName = computed(() => authStore.user?.Inhabitant?.household?.shortName || null)
const householdPbsId = computed(() => authStore.user?.Inhabitant?.household?.pbsId || null)

const state = reactive<LoginCredentials>({
  email: '',
  password: ''
})

const isLoading = ref(false)
const loginError = ref<string | null>(null)

// Own settings are revealed by the ⚙ toggle in the profile card header (ADR-006: no persistence)
const preferencesOpen = ref(false)

const handleSubmit = async (event: FormSubmitEvent<LoginCredentials>) => {
  loginError.value = null
  try {
    isLoading.value = true
    await signIn(event.data.email, event.data.password)
    console.info('🔑 > Login > lykkedes')
  } catch (error: unknown) {
    console.error('🔑 Login mislykkedes:', error)
    loginError.value = 'Vi kunne ikke logge dig på, prøv igen. Du skal bruge dit Heynabo brugernavn og password.'
    handleApiError(error, 'login', loginError.value)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div >
    <!-- LOGIN FORM (not logged in) -->
    <div v-if="!loggedIn" class="flex items-center justify-center py-12">
      <div class="max-w-md w-full px-4">
        <UForm :state="state" :schema="LoginSchema" class="space-y-6" @submit="handleSubmit">
          <UCard>
            <template #header>
              <h2 :class="TYPOGRAPHY.cardTitle">Log ind</h2>
            </template>

            <UAlert
              v-if="loginError"
              v-bind="ALERTS.error"
              :icon="ICONS.robotDead"
              class="mb-4"
            >
              <template #title>Login mislykkedes</template>
              <template #description>{{ loginError }}</template>
            </UAlert>

            <div class="space-y-4">
              <UFormField label="Email" name="email">
                <UInput
                  v-model="state.email"
                  type="email"
                  placeholder="Indtast den email, du er oprettet i Heynabo med"
                />
              </UFormField>

              <UFormField label="Adgangskode" name="password">
                <UInput
                  v-model="state.password"
                  :color="COLOR.secondary"
                  type="password"
                  placeholder="Indtast din Heynabo adgangskode"
                />
              </UFormField>
            </div>

            <template #footer>
              <UButton
                type="submit"
                :color="COLOR.secondary"
                :loading="isLoading"
                block
              >
                Log ind
              </UButton>
            </template>
          </UCard>
        </UForm>
      </div>
    </div>

    <!-- DASHBOARD (logged in) -->
    <div v-else class="py-6 px-4 md:px-8 max-w-5xl mx-auto space-y-6">
      <!-- Welcome Title -->
      <h1 :class="[TYPOGRAPHY.sectionSubheadingLight, 'text-2xl md:text-3xl']">Hej {{ greeting }}! 👋</h1>

      <!-- User Profile Card, with the ⚙ toggle for own settings -->
      <UserProfileCard
        v-if="authStore.user"
        :user="authStore.user"
        :show-actions="true"
        :preferences-open="preferencesOpen"
        @toggle-preferences="preferencesOpen = !preferencesOpen"
      />

      <!-- Own settings: notification channels + appearance, revealed by the toggle -->
      <UserPreferencesCard v-if="authStore.user && preferencesOpen" />

      <!-- Section header -->
      <h2 :class="[TYPOGRAPHY.sectionSubheadingLight, 'pt-4']">Hvad vil du lave i dag?</h2>

      <!-- Action Cards Grid -->
      <div :class="LAYOUTS.gridThreeCol">
        <!-- Dinner Card -->
        <ActionCard
          :icon="ICONS.dinner"
          title="Fællesspisning"
          description="Se menuer og bestil billetter til kommende middage"
          :color="COLOR.peach"
          :header-bg="BG.peach[50]"
          button-label="Se kalender"
          to="/dinner"
        />

        <!-- Household Card -->
        <ActionCard
          icon="i-heroicons-home"
          title="Min husstand"
          description="Administrer madpræferencer og allergier for din familie"
          :color="COLOR.secondary"
          :header-bg="BG.pink[50]"
          button-label="Gå til husstand"
          :to="householdShortName && householdPbsId ? getHouseholdUrl(householdShortName, householdPbsId) : '/household'"
        />

        <!-- Cooking Team Card -->
        <ActionCard
          :icon="ICONS.chef"
          title="Mit madhold"
          description="Se hvornår du skal lave mad og koordiner med dit hold"
          :color="COLOR.ocean"
          :header-bg="BG.ocean[50]"
          button-label="Se madhold"
          to="/chef"
        />
      </div>
    </div>
  </div>
</template>
