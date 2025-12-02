<script setup lang="ts">
import type {FormSubmitEvent} from '#ui/types'
import type {LoginCredentials} from '~/composables/useCoreValidation'

const authStore = useAuthStore()
const {loggedIn, greeting, name, lastName, avatar, email, phone} = storeToRefs(authStore)
const {signIn, clear} = authStore
const {LoginSchema} = useCoreValidation()

const fullName = computed(() => `${name.value} ${lastName.value}`.trim())
const householdShortName = computed(() => authStore.user?.Inhabitant?.household?.shortName || null)

const state = reactive<LoginCredentials>({
  email: '',
  password: ''
})

const isLoading = ref(false)

const handleSubmit = async (event: FormSubmitEvent<LoginCredentials>) => {
  try {
    isLoading.value = true
    await signIn(event.data.email, event.data.password)
    console.log('🔑> Login >lykkedes')
  } catch (error: unknown) {
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
      <UForm :state="state" :schema="LoginSchema" class="space-y-6" @submit="handleSubmit">
        <UCard >
          <template #header>
            <h2 class="text-xl font-bold">Log ind</h2>
          </template>

          <div class="space-y-4 ">
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

    <!-- Show username, hello and logout button if user is logged in -->
    <div v-else class="flex flex-row items-center justify-between ">
      <UCard >
        <template #header>
          <h2 class="text-lg">Hej {{ greeting }}!</h2>
        </template>

        <div class="space-y-4 ">
          <div class="flex items-center gap-4">
            <UAvatar
                :src="avatar"
                class="border-2 border-pink-200 ring-2 ring-pink-300"
                size="lg"
                :alt="fullName"
                icon="i-material-symbols-person-celebrate-rounded"
            />
            <span class="font-medium">{{ fullName }}</span>
          </div>
          <p class="flex items-center">
            <UIcon name="i-guidance-mail" class="mr-2 "/>
            <span class="mx-2 text-muted">{{ email }}</span>
          </p>
          <p class="flex items-center">
            <UIcon name="i-guidance-phone" class="mr-2"/>
            <span class="mx-2 text-muted">{{ phone }}</span>
          </p>
          <p class="flex items-center">
            <UIcon name="i-guidance-home-2" class="mr-2"/>
            <NuxtLink
              :to="`/household/${encodeURIComponent(householdShortName || '')}`"
              class="mx-2 text-primary hover:underline"
            >
              {{ householdShortName }}
            </NuxtLink>
          </p>
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
