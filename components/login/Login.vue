<script setup lang="ts">

const {loggedIn, greeting, avatar} = storeToRefs(useAuthStore())
const {signIn, clear} = useAuthStore()

const email = ref('')
const password = ref('')
const emailError = ref('')
const passwordError = ref('')
const isLoading = ref(false)

const validateEmail = () => {
  emailError.value = ''
  if (!email.value) {
    emailError.value = 'Brug den email som du er registreret med i Heynabo'
    return false
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    emailError.value = 'Indtast venligst en gyldig email'
    return false
  }
  return true
}

const validatePassword = () => {
  passwordError.value = ''
  if (!password.value) {
    passwordError.value = 'Indtast din Heynabo adgangskode'
    return false
  }
  if (password.value.length < 1) {
    passwordError.value = 'Du skal bruge din Heynabo adgangskode'
    return false
  }
  return true
}

const handleSubmit = async () => {
  emailError.value = ''
  passwordError.value = ''

  const isEmailValid = validateEmail()
  const isPasswordValid = validatePassword()

  if (!isEmailValid || !isPasswordValid) {
    return
  }

  try {
    isLoading.value = true
    const response = signIn(email.value, password.value)

    console.log('🔑> Login >lykkedes', response)

  } catch (error: any) {
    console.error('🔑 Login mislykkedes:', error)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-center bg-pink-50">
    <AuthState v-slot="{ loggedIn, clear, greeting, avatar, signIn }">
    <!-- Show login component if user is not logged in -->
    <div v-if="!loggedIn" class="max-w-md w-full p-6 ">
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <UCard :ui="{
          background: 'bg-pink-400 dark:bg-pink-500',
          divide: 'divide-pink-50 dark:divide-pink-100'
        }">
          <template #header>
            <h2 class="text-xl font-bold">Log ind</h2>
          </template>

          <div class="space-y-4 ">
            <UFormGroup label="Email">
              <UInput
                  v-model="email"
                  type="email"
                  placeholder="Indtast din email"
                  :error="emailError"
                  @blur="validateEmail"
              />
            </UFormGroup>

            <UFormGroup label="Adgangskode">
              <UInput
                  v-model="password"
                  color="pink"
                  type="password"
                  placeholder="Indtast din Heynabo adgangskode"
                  :error="passwordError"
                  @blur="validatePassword"
              />
            </UFormGroup>
          </div>

          <template #footer>
            <UButton
                type="submit"
                color="primary"
                :loading="isLoading"
                block
                to="/household"
            >
              Log ind
            </UButton>
          </template>
        </UCard>
      </form>
    </div>

    <!-- Show username, hello and logout button if user is logged in -->
    <div v-else class="flex flex-row items-center justify-between ">
      <UCard :ui="{
          background: 'bg-pink-400 dark:bg-pink-500',
          divide: 'divide-pink-50 dark:divide-pink-100'
        }">
        <template #header>
          <h2 class="text-xl font-bold">Hej {{ greeting }}</h2>
        </template>

        <div class="space-y-4 ">
          <UAvatar
              :src="avatar"
              class="border-2 border-pink-200 ring-2 ring-pink-300"
              size="lg"
              :alt="greeting"
              icon="i-material-symbols-person-celebrate-rounded"
          />
        </div>

        <template #footer>
          <UButton
              icon="i-tdesign-wave-bye"
              color="blue"
              style="link"
              type="submit"
              @click="clear">
            Log ud
          </UButton>
        </template>
      </UCard>

    </div>
    </AuthState>
  </div>
</template>
