<script setup lang="ts">
import type {AllergyTypeDetail} from '~/composables/useAllergyValidation'

// Design system
const { COLOR, COMPONENTS, SIZES } = useTheSlopeDesignSystem()

// Households store for shortName lookup
const householdsStore = useHouseholdsStore()
const {households} = storeToRefs(householdsStore)

// Helper to get household shortName from householdId
const getHouseholdShortName = (householdId: number) => {
  const household = households.value.find(h => h.id === householdId)
  return household?.shortName ?? ''
}

// PROPS
const props = defineProps<{
  allergyType: AllergyTypeDetail
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
  emit('save', {
    name: formData.value.name,
    description: formData.value.description,
    icon: formData.value.icon ?? undefined
  })
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
const hasRecentAllergies = computed(() =>
    props.allergyType.inhabitants?.some(i => isNew(i.allergyUpdatedAt)) || false
)

// Funny empty state messages (rotates based on allergy ID for consistency)
const emptyStateMessages = [
  { emoji: '🤷', text: 'Ingen beboere har denne allergi... endnu' },
  { emoji: '✨', text: 'Kan spises af alle - så er køkkenlivet lidt lettere!' },
  { emoji: '🎉', text: 'Hurra! Ingen allergiske reaktioner her' },
  { emoji: '👍', text: 'Alle has sagt god for denne ingrediens' },
  { emoji: '😌', text: 'Ingen bekymringer med denne ingrediens' }
]
const emptyStateMessage = computed(() => {
  const id = props.allergyType.id || 0
  const index = id % emptyStateMessages.length
  return emptyStateMessages[index]
})
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
          :disabled="!formData.name || !formData.description"
          name="save-allergy-type"
          @click="handleSave"
      >
        Gem
      </UButton>
      <UButton
          color="neutral"
          variant="outline"
          name="cancel-allergy-type"
          @click="handleCancel"
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
        <span v-if="hasRecentAllergies" class="text-xs">🆕</span>
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
          <span v-if="hasRecentAllergies" class="text-sm">🆕</span>
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
              :inhabitants="inhabitant"
              :label="getHouseholdShortName(inhabitant.householdId)"
          />

          <!-- Additional info: Comment and timestamp -->
          <div v-if="inhabitant.inhabitantComment || inhabitant.allergyUpdatedAt" class="pl-14 space-y-1">
            <div v-if="inhabitant.inhabitantComment" class="text-xs text-gray-700 dark:text-gray-300 italic">
              "{{ inhabitant.inhabitantComment }}"
            </div>
            <div v-if="inhabitant.allergyUpdatedAt" class="text-xs text-gray-500 dark:text-gray-500">
              {{ formatRelativeTime(inhabitant.allergyUpdatedAt) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <UAlert
      v-else
      variant="soft"
      :color="COLOR.success"
      :avatar="{ text: emptyStateMessage!.emoji, size: SIZES.emptyStateAvatar }"
      :ui="COMPONENTS.emptyStateAlert"
    >
      <template #title>
        {{ emptyStateMessage!.text }}
      </template>
      <template #description>
        Ingen beboere har denne allergi
      </template>
    </UAlert>
  </div>
</template>