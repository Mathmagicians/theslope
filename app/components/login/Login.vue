<!--
┌──────────────────────────────────────────────────────────────────────────────┐
│ Login - the login form, and the dashboard once logged in                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ DASHBOARD /login (logged in) - this file owns the composition                │
│ ┌ Hej Anna! 👋 ────────────────────────────────────────────────────────────┐ │
│ │ ┌ InstallPrompt ──────────────────────────────────────────────────────┐  │ │
│ │ └─────────────────────────────────────────────────────────────────────┘  │ │
│ │ ┌ UserProfileCard ([⚙ Indstillinger] in its header) ──────────────────┐  │ │
│ │ └─────────────────────────────────────────────────────────────────────┘  │ │
│ │ ┌ UserPreferencesCard ─────────────────────────┐  only while the toggle  │ │
│ │ └──────────────────────────────────────────────┘  is on (v-if)           │ │
│ │ Hvad vil du lave i dag?                                                  │ │
│ │ ┌ ActionCard ─┐ ┌ ActionCard ─┐ ┌ ActionCard ─┐                          │ │
│ │ └─────────────┘ └─────────────┘ └─────────────┘                          │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ InstallPrompt renders inside <ClientOnly> and only when the browser offers   │
│ an install path.                                                             │
│ The open state is a ref in this file (ADR-006: no persistence); each child    │
│ draws its own internals in its own header comment.                           │
└──────────────────────────────────────────────────────────────────────────────┘
-->
<script setup lang="ts">
import {hasProtocol} from 'ufo'
import type {FormSubmitEvent} from '#ui/types'
import type {LoginCredentials} from '~/composables/useCoreValidation'
import {USER_WORDS} from '~/config/userWords'

const authStore = useAuthStore()
const {loggedIn, greeting} = storeToRefs(authStore)
const {signIn} = authStore
const {LoginSchema} = useCoreValidation()
const {TYPOGRAPHY, LAYOUTS, BG, ICONS, ALERTS, COLOR, COMPONENTS} = useTheSlopeDesignSystem()

const householdShortName = computed(() => authStore.user?.Inhabitant?.household?.shortName || null)
const householdPbsId = computed(() => authStore.user?.Inhabitant?.household?.pbsId || null)

const state = reactive<LoginCredentials>({
  email: '',
  password: ''
})

const isLoading = ref(false)
const loginError = ref<string | null>(null)
const route = useRoute()

// The guard parks the original URL in ?redirect; only an internal path is followed
const redirectTarget = computed(() => {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/') && !hasProtocol(redirect, {acceptRelative: true}) ? redirect : null
})

// Own settings are revealed by the ⚙ toggle in the profile card header (ADR-006: no persistence)
const preferencesOpen = ref(false)

const handleSubmit = async (event: FormSubmitEvent<LoginCredentials>) => {
  loginError.value = null
  try {
    isLoading.value = true
    await signIn(event.data.email, event.data.password)
    console.info('🔑 > Login > lykkedes')
    if (redirectTarget.value) {
      await navigateTo(redirectTarget.value)
    }
  } catch (error: unknown) {
    console.error('🔑 Login mislykkedes:', error)
    loginError.value = USER_WORDS.login.failed
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div >
    <!-- LOGIN FORM (not logged in) -->
    <div v-if="!loggedIn" :class="COMPONENTS.login.formPage">
      <div :class="COMPONENTS.login.formColumn">
        <UForm :state="state" :schema="LoginSchema" :class="COMPONENTS.login.form" @submit="handleSubmit">
          <UCard>
            <template #header>
              <h2 :class="TYPOGRAPHY.cardTitle">{{ USER_WORDS.login.signIn }}</h2>
            </template>

            <UAlert
              v-if="loginError"
              v-bind="ALERTS.error"
              :icon="ICONS.robotDead"
              :class="COMPONENTS.login.failedAlert"
            >
              <template #title>{{ USER_WORDS.login.failedTitle }}</template>
              <template #description>{{ loginError }}</template>
            </UAlert>

            <div :class="COMPONENTS.login.fields">
              <UFormField :label="USER_WORDS.login.email.label" name="email">
                <UInput
                  v-model="state.email"
                  type="email"
                  :placeholder="USER_WORDS.login.email.placeholder"
                />
              </UFormField>

              <UFormField :label="USER_WORDS.login.password.label" name="password">
                <UInput
                  v-model="state.password"
                  :color="COLOR.secondary"
                  type="password"
                  :placeholder="USER_WORDS.login.password.placeholder"
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
                {{ USER_WORDS.login.signIn }}
              </UButton>
            </template>
          </UCard>
        </UForm>
      </div>
    </div>

    <!-- DASHBOARD (logged in) -->
    <div v-else :class="COMPONENTS.login.dashboard">
      <!-- Welcome Title -->
      <h1 :class="[TYPOGRAPHY.sectionSubheadingLight, COMPONENTS.login.greeting]">{{ USER_WORDS.login.greeting(greeting) }}</h1>

      <!-- Install guidance: capability is a browser fact, so SSR renders nothing -->
      <ClientOnly>
        <InstallPrompt />
      </ClientOnly>

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
      <h2 :class="[TYPOGRAPHY.sectionSubheadingLight, COMPONENTS.login.waysIn]">{{ USER_WORDS.login.waysIn }}</h2>

      <!-- Action Cards Grid -->
      <div :class="LAYOUTS.gridThreeCol">
        <!-- Dinner Card -->
        <ActionCard
          :icon="ICONS.dinner"
          :title="USER_WORDS.login.dinner.title"
          :description="USER_WORDS.login.dinner.description"
          :color="COLOR.peach"
          :header-bg="BG.peach[50]"
          :button-label="USER_WORDS.login.dinner.open"
          to="/dinner"
        />

        <!-- Household Card -->
        <ActionCard
          :icon="ICONS.household"
          :title="USER_WORDS.login.household.title"
          :description="USER_WORDS.login.household.description"
          :color="COLOR.secondary"
          :header-bg="BG.pink[50]"
          :button-label="USER_WORDS.login.household.open"
          :to="householdShortName && householdPbsId ? getHouseholdUrl(householdShortName, householdPbsId) : '/household'"
        />

        <!-- Cooking Team Card -->
        <ActionCard
          :icon="ICONS.chef"
          :title="USER_WORDS.login.team.title"
          :description="USER_WORDS.login.team.description"
          :color="COLOR.ocean"
          :header-bg="BG.ocean[50]"
          :button-label="USER_WORDS.login.team.open"
          to="/chef"
        />
      </div>
    </div>
  </div>
</template>
