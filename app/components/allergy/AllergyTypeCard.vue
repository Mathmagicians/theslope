<script setup lang="ts">
import type {AllergyTypeDetail} from '~/composables/useAllergyValidation'

// Design system
const { COLOR, COMPONENTS, SIZES, LAYOUTS, BUTTONS, ICONS, getRandomEmptyMessage } = useTheSlopeDesignSystem()

// PROPS - allergyType absent in edit mode means CREATE.
// householdShortNames is supplied by the parent (ADR-007: no server data in this card).
const props = defineProps<{
  allergyType?: AllergyTypeDetail
  mode?: 'view' | 'edit'
  compact?: boolean
  householdShortNames?: Record<number, string>
}>()

const getHouseholdShortName = (householdId: number) => props.householdShortNames?.[householdId] ?? ''

// Age category badge - active season prices carry the age limits (HouseholdCard pattern)
const {getTicketTypeConfig} = useTicket()
const {activeSeason} = storeToRefs(usePlanStore())
const ageBadge = (birthDate: Date | null | undefined) =>
    getTicketTypeConfig(birthDate ?? null, activeSeason.value?.ticketPrices)

// EMITS
const emit = defineEmits<{
  save: [data: {name: string, description: string, icon?: string}]
  cancel: []
}>()

// FORM STATE (edit mode only) - empty when creating
const resetForm = () => ({
  name: props.allergyType?.name ?? '',
  description: props.allergyType?.description ?? '',
  icon: props.allergyType?.icon ?? undefined
})

const formData = ref(resetForm())

// Watch for allergyType changes to update form
watch(() => props.allergyType, () => {
  formData.value = resetForm()
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
  formData.value = resetForm()
  emit('cancel')
}

// COMPUTED
const isCreate = computed(() => !props.allergyType)
const inhabitantCount = computed(() => props.allergyType?.inhabitants?.length || 0)
const hasRecentAllergies = computed(() =>
    props.allergyType?.inhabitants?.some(i => isNew(i.allergyUpdatedAt)) || false
)

// Random fun empty state message from design system
const emptyStateMessage = getRandomEmptyMessage('allergy')
</script>

<template>
  <!-- EDIT MODE -->
  <div v-if="mode === 'edit'" data-testid="allergy-type-form" class="w-full max-w-2xl space-y-4">
    <h3 class="text-md font-semibold">{{ isCreate ? 'Opret allergi' : 'Rediger allergi' }}</h3>

    <UFormField label="Navn" required>
      <UInput
          v-model="formData.name"
          placeholder="F.eks. Jordnødder"
          name="allergy-name"
          class="w-full"
      />
    </UFormField>

    <UFormField label="Ikon (emoji)">
      <UInput
          v-model="formData.icon"
          placeholder="F.eks. 🥜"
          name="allergy-icon"
          class="w-full"
      />
    </UFormField>

    <UFormField label="Beskrivelse" required>
      <UTextarea
          v-model="formData.description"
          placeholder="Beskriv allergien..."
          name="allergy-description"
          :rows="3"
          class="w-full"
      />
    </UFormField>

    <div :class="LAYOUTS.formButtonRow">
      <UButton
          v-bind="BUTTONS.cancel"
          :class="LAYOUTS.cardActionButton"
          data-testid="cancel-allergy-type"
          @click="handleCancel"
      >
        Annuller
      </UButton>
      <UButton
          v-bind="BUTTONS.save"
          :class="LAYOUTS.cardActionButton"
          :disabled="!formData.name || !formData.description"
          data-testid="save-allergy-type"
          @click="handleSave"
      >
        Gem
      </UButton>
    </div>
  </div>

  <!-- COMPACT VIEW -->
  <div v-else-if="allergyType && compact" class="flex items-center gap-3 p-3">
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
        <UIcon v-if="hasRecentAllergies" :name="ICONS.new" :class="COMPONENTS.rowIconClass"/>
      </div>
      <p class="text-xs text-gray-600 dark:text-gray-400">
        {{ inhabitantCount }} beboer{{ inhabitantCount !== 1 ? 'e' : '' }}
      </p>
    </div>
  </div>

  <!-- FULL VIEW -->
  <div v-else-if="allergyType" class="space-y-4">
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

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h3 class="text-lg font-semibold break-words">{{ allergyType.name }}</h3>
          <UIcon v-if="hasRecentAllergies" :name="ICONS.new" :class="COMPONENTS.rowIconClass"/>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 break-words">
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
          <!-- Inhabitant with avatar and name; household + age category as per-person badges -->
          <div class="flex items-center gap-2">
            <UserListItem :inhabitants="inhabitant" class="min-w-0">
              <template #badge="{inhabitant: listed}">
                <UBadge
                    v-if="getHouseholdShortName(listed.householdId)"
                    :color="COLOR.neutral"
                    variant="subtle"
                    :size="SIZES.small"
                    :icon="ICONS.household"
                >
                  {{ getHouseholdShortName(listed.householdId) }}
                </UBadge>
              </template>
            </UserListItem>
            <UBadge
                :color="ageBadge(inhabitant.birthDate).color"
                variant="subtle"
                :size="SIZES.small"
                data-testid="inhabitant-age-badge"
            >
              {{ ageBadge(inhabitant.birthDate).label }}
            </UBadge>
          </div>

          <!-- Additional info: Comment and timestamp -->
          <div v-if="inhabitant.inhabitantComment || inhabitant.allergyUpdatedAt" class="pl-14 space-y-1">
            <div v-if="inhabitant.inhabitantComment" class="text-xs text-gray-700 dark:text-gray-300 italic">
              "{{ inhabitant.inhabitantComment }}"
            </div>
            <!-- NuxtTime: wall-clock text can never match between SSR and hydration -->
            <div v-if="inhabitant.allergyUpdatedAt" class="text-xs text-gray-500 dark:text-gray-500">
              <NuxtTime :datetime="inhabitant.allergyUpdatedAt" relative :locale="DATE_SETTINGS.localeString"/>
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