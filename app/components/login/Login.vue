<script setup lang="ts">
import type {FormSubmitEvent} from '#ui/types'
import type {LoginCredentials} from '~/composables/useCoreValidation'

const authStore = useAuthStore()
const {loggedIn, greeting, name, lastName, avatar, email, phone, systemRoles, isAdmin, isAllergyManager} = storeToRefs(authStore)
const {signIn, clear} = authStore
const {LoginSchema, SystemRoleSchema} = useCoreValidation()
const {handleApiError} = useApiHandler()
const {TYPOGRAPHY, LAYOUTS, SIZES, COLOR, BG, ICONS} = useTheSlopeDesignSystem()

const fullName = computed(() => `${name.value} ${lastName.value}`.trim())
const householdShortName = computed(() => authStore.user?.Inhabitant?.household?.shortName || null)
const householdName = computed(() => authStore.user?.Inhabitant?.household?.name || null)
const householdAddress = computed(() => authStore.user?.Inhabitant?.household?.address || null)

// Role display labels
const roleLabels: Record<string, { label: string; icon: string; color: string }> = {
  [SystemRoleSchema.enum.ADMIN]: { label: 'Admin', icon: 'i-heroicons-shield-check', color: 'primary' },
  [SystemRoleSchema.enum.ALLERGYMANAGER]: { label: 'Allergichef', icon: 'i-heroicons-heart', color: 'success' }
}

const state = reactive<LoginCredentials>({
  email: '',
  password: ''
})

const isLoading = ref(false)
const loginError = ref<string | null>(null)

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
  <div class="min-h-screen bg-pink-50">
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
              color="error"
              variant="soft"
              icon="i-mage-robot-dead"
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
                  color="secondary"
                  type="password"
                  placeholder="Indtast din Heynabo adgangskode"
                />
              </UFormField>
            </div>

            <template #footer>
              <UButton
                type="submit"
                color="secondary"
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
      <!-- User Profile Card -->
      <UCard>
        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <!-- User info -->
          <div class="flex items-start gap-4">
            <UAvatar
              :src="avatar ?? undefined"
              :alt="fullName"
              :size="SIZES.large"
              icon="i-heroicons-user"
              class="ring-2 ring-pink-300"
            />
            <div class="space-y-2">
              <!-- Name and email -->
              <div>
                <h2 :class="TYPOGRAPHY.cardTitle">{{ fullName }}</h2>
                <p :class="TYPOGRAPHY.bodyTextMuted">{{ email }}</p>
                <p v-if="phone" :class="TYPOGRAPHY.bodyTextMuted">{{ phone }}</p>
              </div>

              <!-- System role badges -->
              <div v-if="systemRoles.length > 0" class="flex flex-wrap gap-2">
                <UBadge
                  v-for="role in systemRoles"
                  :key="role"
                  :color="roleLabels[role]?.color || 'neutral'"
                  variant="subtle"
                  size="sm"
                >
                  <UIcon :name="roleLabels[role]?.icon || 'i-heroicons-user'" class="mr-1" />
                  {{ roleLabels[role]?.label || role }}
                </UBadge>
              </div>

              <!-- Household info -->
              <div v-if="householdName" class="flex items-center gap-2 pt-2">
                <UIcon name="i-heroicons-home" class="opacity-70" />
                <span :class="TYPOGRAPHY.bodyTextSmall">{{ householdName }}</span>
                <span v-if="householdAddress" :class="TYPOGRAPHY.bodyTextMuted">{{ householdAddress }}</span>
              </div>
            </div>
          </div>

          <!-- Logout button -->
          <UButton
            icon="i-heroicons-arrow-right-on-rectangle"
            color="neutral"
            variant="outline"
            :size="SIZES.small"
            @click="clear"
          >
            Log ud
          </UButton>
        </div>
      </UCard>

      <!-- Section header -->
      <h2 :class="[TYPOGRAPHY.sectionSubheading, 'pt-4']">Hvad vil du i dag?</h2>

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
          :to="`/household/${encodeURIComponent(householdShortName || '')}`"
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
