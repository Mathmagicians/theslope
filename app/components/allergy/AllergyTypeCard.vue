<script setup lang="ts">
import type {AllergyType} from '~/composables/useAllergyValidation'

// PROPS
const props = defineProps<{
  allergyType: AllergyType
  mode?: 'view' | 'edit'
  compact?: boolean
}>()

// EMITS
const emit = defineEmits<{
  save: [data: {name: string, description: string, icon?: string}]
  cancel: []
}>()

// FORM STATE (edit mode only)
const formData = ref({
  name: props.allergyType.name,
  description: props.allergyType.description,
  icon: props.allergyType.icon
})

// Watch for allergyType changes to update form
watch(() => props.allergyType, (newValue) => {
  formData.value = {
    name: newValue.name,
    description: newValue.description,
    icon: newValue.icon
  }
})

// HANDLERS
const handleSave = () => {
  emit('save', formData.value)
}

const handleCancel = () => {
  formData.value = {
    name: props.allergyType.name,
    description: props.allergyType.description,
    icon: props.allergyType.icon
  }
  emit('cancel')
}

// COMPUTED
const inhabitantCount = computed(() => props.allergyType.inhabitants?.length || 0)
const showNewBadge = computed(() => isNew(props.allergyType.createdAt || ''))
</script>

<template>
  <!-- EDIT MODE -->
  <div v-if="mode === 'edit'" class="space-y-4 max-w-2xl">
    <h3 class="text-md font-semibold">Rediger allergi</h3>

    <UFormField label="Navn" required>
      <UInput
          v-model="formData.name"
          placeholder="F.eks. Jordnødder"
          name="allergy-name"
      />
    </UFormField>

    <UFormField label="Ikon (emoji)">
      <UInput
          v-model="formData.icon"
          placeholder="F.eks. 🥜"
          name="allergy-icon"
      />
    </UFormField>

    <UFormField label="Beskrivelse" required>
      <UTextarea
          v-model="formData.description"
          placeholder="Beskriv allergien..."
          name="allergy-description"
          :rows="3"
      />
    </UFormField>

    <div class="flex gap-2">
      <UButton
          color="primary"
          @click="handleSave"
          :disabled="!formData.name || !formData.description"
          name="save-allergy-type"
      >
        Gem
      </UButton>
      <UButton
          color="neutral"
          variant="outline"
          @click="handleCancel"
          name="cancel-allergy-type"
      >
        Annuller
      </UButton>
    </div>
  </div>

  <!-- COMPACT VIEW -->
  <div v-else-if="compact" class="flex items-center gap-3 p-3">
    <!-- Icon -->
    <div class="flex items-center justify-center w-10 h-10 rounded-full ring-1 md:ring-2 ring-red-700 flex-shrink-0">
      <UIcon
          v-if="allergyType.icon?.startsWith('i-')"
          :name="allergyType.icon"
          class="text-xl"
      />
      <span v-else class="text-xl">
        {{ allergyType.icon || '🏷️' }}
      </span>
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <h4 class="font-medium text-sm">{{ allergyType.name }}</h4>
        <span v-if="showNewBadge" class="text-xs">🆕</span>
      </div>
      <p class="text-xs text-gray-600 dark:text-gray-400">
        {{ inhabitantCount }} beboer{{ inhabitantCount !== 1 ? 'e' : '' }}
      </p>
    </div>
  </div>

  <!-- FULL VIEW -->
  <div v-else class="space-y-4">
    <!-- Header with Icon and Title -->
    <div class="flex items-start gap-4">
      <div class="flex items-center justify-center w-16 h-16 rounded-full ring-1 md:ring-2 ring-red-700 flex-shrink-0">
        <UIcon
            v-if="allergyType.icon?.startsWith('i-')"
            :name="allergyType.icon"
            class="text-3xl"
        />
        <span v-else class="text-3xl">
          {{ allergyType.icon || '🏷️' }}
        </span>
      </div>

      <div class="flex-1">
        <div class="flex items-center gap-2">
          <h3 class="text-lg font-semibold">{{ allergyType.name }}</h3>
          <span v-if="showNewBadge" class="text-sm">🆕</span>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {{ allergyType.description }}
        </p>
      </div>
    </div>

    <!-- Inhabitants List -->
    <div v-if="allergyType.inhabitants && allergyType.inhabitants.length > 0" class="space-y-3">
      <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Berørte beboere ({{ inhabitantCount }})
      </h4>

      <div class="space-y-3">
        <div
            v-for="inhabitant in allergyType.inhabitants"
            :key="inhabitant.id"
            class="space-y-2"
        >
          <!-- Inhabitant with avatar and name -->
          <UserListItem
              :to-display="inhabitant"
              :label="inhabitant.householdName"
          />

          <!-- Additional info: Comment and timestamp -->
          <div v-if="inhabitant.inhabitantComment || inhabitant.updatedAt" class="pl-14 space-y-1">
            <div v-if="inhabitant.inhabitantComment" class="text-xs text-gray-700 dark:text-gray-300 italic">
              "{{ inhabitant.inhabitantComment }}"
            </div>
            <div v-if="inhabitant.updatedAt" class="text-xs text-gray-500 dark:text-gray-500">
              {{ formatRelativeTime(inhabitant.updatedAt) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-6 text-sm text-gray-500">
      Ingen beboere har denne allergi endnu
    </div>
  </div>
</template>