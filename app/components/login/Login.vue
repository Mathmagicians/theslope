<script setup lang="ts">

const {loggedIn} = storeToRefs(useAuthStore())
const {greeting} = storeToRefs(useAuthStore())
const {avatar} = storeToRefs(useAuthStore())
const {email} = storeToRefs(useAuthStore())
const {phone} = storeToRefs(useAuthStore())
const {address} = storeToRefs(useAuthStore())
const {signIn, clear} = useAuthStore()

const formEmail = ref('')
const password = ref('')
const emailError = ref('')
const passwordError = ref('')
const isLoading = ref(false)

const validateEmail = () => {
  emailError.value = ''
  if (!formEmail.value) {
    emailError.value = 'Brug den email som du er registreret med i Heynabo'
    return false
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail.value)) {
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
    const response = signIn(formEmail.value, password.value)

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
    <!-- Show login component if user is not logged in -->
    <div v-if="!loggedIn" class="max-w-md w-full p-6 ">
      <UForm :state="{ email: formEmail, password: password }" @submit="handleSubmit" class="space-y-6">
        <UCard >
          <template #header>
            <h2 class="text-xl font-bold">Log ind</h2>
          </template>

          <div class="space-y-4 ">
            <UFormField label="Email">
              <UInput
                  v-model="formEmail"
                  type="email"
                  placeholder="Indtast den email, du er oprettet i Heynabo med"
                  :error="emailError"
                  @blur="validateEmail"
              />
            </UFormField>

            <UFormField label="Adgangskode">
              <UInput
                  v-model="password"
                  color="secondary"
                  type="password"
                  placeholder="Indtast din Heynabo adgangskode"
                  :error="passwordError"
                  @blur="validatePassword"
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

    <!-- Show username, hello and logout button if user is logged in -->
    <div v-else class="flex flex-row items-center justify-between ">
      <UCard >
        <template #header>
          <h2 class="text-lg">Hej {{ greeting }}!</h2>
        </template>

        <div class="space-y-4 ">
          <UAvatar
              :src="avatar"
              class="border-2 border-pink-200 ring-2 ring-pink-300"
              size="lg"
              :alt="greeting"
              icon="i-material-symbols-person-celebrate-rounded"
          />
          <p class="flex items-center"><UIcon name="i-guidance-mail" class="mr-2 "/> <span class="mx-2 text-muted">{{ email }}</span> </p>
          <p class="flex items-center"><UIcon name="i-guidance-phone" class="mr-2"/> <span class="mx-2 text-muted">{{ phone }}</span> </p>
          <p class="flex items-center"><UIcon name="i-guidance-home-2" class="mr-2"/> <span class="mx-2 text-muted">{{ address }}</span> </p>

        </div>

        <template #footer>
          <UButton
              icon="i-tdesign-wave-bye"
              color="secondary"
              variant="outline"
              type="submit"
              @click="clear">
            Log ud
          </UButton>
        </template>
      </UCard>
    </div>
  </div>
</template>
