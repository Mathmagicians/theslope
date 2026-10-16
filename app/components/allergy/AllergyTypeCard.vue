<script setup lang="ts">
import type {Form, FormSubmitEvent} from '@nuxt/ui'
import type {AllergyTypeCreate, AllergyTypeDetail} from '~/composables/useAllergyValidation'
import {FORM_MODES} from '~/types/form'

// Design system
const { COLOR, COMPONENTS, SIZES, LAYOUTS, BUTTONS, ICONS, ALERTS, TYPOGRAPHY, TEXT, RING, getRandomEmptyMessage, NOISE } = useTheSlopeDesignSystem()

// PROPS - allergyType absent in edit mode means CREATE.
// householdShortNames is supplied by the parent (ADR-007: no server data in this card).
const props = defineProps<{
  allergyType?: AllergyTypeDetail
  mode?: typeof FORM_MODES.VIEW | typeof FORM_MODES.EDIT
  compact?: boolean
  householdShortNames?: Record<number, string>
}>()

const getHouseholdShortName = (householdId: number) => props.householdShortNames?.[householdId] ?? ''

// Age category badge - the active season's ticket prices carry the age limits
const {activeSeason} = storeToRefs(usePlanStore())
const ageBadge = (birthDate: Date | null | undefined) =>
    resolveTicketTypePresentation(birthDate ?? null, activeSeason.value?.ticketPrices)

// EMITS
const emit = defineEmits<{
  save: [data: AllergyTypeCreate]
  cancel: []
}>()

// FORM STATE (edit mode only) - empty when creating
const {AllergyTypeCreateSchema} = useAllergyValidation()
const formRef = useTemplateRef<Form<AllergyTypeCreate>>('formRef')

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
const handleSave = (event: FormSubmitEvent<AllergyTypeCreate>) => emit('save', event.data)

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
  <UForm
      v-if="mode === FORM_MODES.EDIT"
      ref="formRef"
      :schema="AllergyTypeCreateSchema"
      :state="formData"
      data-testid="allergy-type-form"
      :class="COMPONENTS.allergyTypeCard.form"
      @submit="handleSave"
  >
    <h3 :class="COMPONENTS.allergyTypeCard.formTitle">{{ isCreate ? 'Opret allergi' : 'Rediger allergi' }}</h3>

    <UFormField label="Navn" name="name" required>
      <UInput
          v-model="formData.name"
          placeholder="F.eks. Jordnødder"
          name="allergy-name"
          :class="COMPONENTS.allergyTypeCard.field"
      />
    </UFormField>

    <UFormField label="Ikon (emoji)" name="icon">
      <UInput
          v-model="formData.icon"
          placeholder="F.eks. 🥜"
          name="allergy-icon"
          :class="COMPONENTS.allergyTypeCard.field"
      />
    </UFormField>

    <UFormField label="Beskrivelse" name="description" required>
      <UTextarea
          v-model="formData.description"
          placeholder="Beskriv allergien..."
          name="allergy-description"
          :rows="3"
          :class="COMPONENTS.allergyTypeCard.field"
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
          data-testid="save-allergy-type"
          @click="formRef?.submit()"
      >
        Gem
      </UButton>
    </div>
  </UForm>

  <!-- COMPACT VIEW -->
  <div v-else-if="allergyType && compact" :class="COMPONENTS.allergyTypeCard.compact">
    <!-- Icon -->
    <div :class="[COMPONENTS.allergyTypeCard.compactGlyph, RING.red[700]]">
      <UIcon
          v-if="allergyType.icon?.startsWith('i-')"
          :name="allergyType.icon"
          :class="COMPONENTS.allergyTypeCard.compactIcon"
      />
      <span v-else :class="COMPONENTS.allergyTypeCard.compactIcon">
        {{ allergyType.icon || '🏷️' }}
      </span>
    </div>

    <!-- Content -->
    <div :class="COMPONENTS.allergyTypeCard.content">
      <div :class="COMPONENTS.allergyTypeCard.titleRow">
        <h4 :class="COMPONENTS.allergyTypeCard.compactName">{{ allergyType.name }}</h4>
        <UIcon v-if="hasRecentAllergies" :name="ICONS.new" :class="COMPONENTS.rowIconClass"/>
      </div>
      <p :class="[TYPOGRAPHY.finePrint, TEXT.toned]">
        {{ inhabitantCount }} beboer{{ inhabitantCount !== 1 ? 'e' : '' }}
      </p>
    </div>
  </div>

  <!-- FULL VIEW -->
  <div v-else-if="allergyType" :class="COMPONENTS.allergyTypeCard.full">
    <!-- Header with Icon and Title -->
    <div :class="COMPONENTS.allergyTypeCard.header">
      <div :class="[COMPONENTS.allergyTypeCard.fullGlyph, RING.red[700]]">
        <UIcon
            v-if="allergyType.icon?.startsWith('i-')"
            :name="allergyType.icon"
            :class="COMPONENTS.allergyTypeCard.fullIcon"
        />
        <span v-else :class="COMPONENTS.allergyTypeCard.fullIcon">
          {{ allergyType.icon || '🏷️' }}
        </span>
      </div>

      <div :class="COMPONENTS.allergyTypeCard.content">
        <div :class="COMPONENTS.allergyTypeCard.titleRow">
          <h3 :class="COMPONENTS.allergyTypeCard.fullName">{{ allergyType.name }}</h3>
          <UIcon v-if="hasRecentAllergies" :name="ICONS.new" :class="COMPONENTS.rowIconClass"/>
        </div>
        <p :class="[TYPOGRAPHY.bodyTextMuted, COMPONENTS.allergyTypeCard.description]">
          {{ allergyType.description }}
        </p>
      </div>
    </div>

    <!-- Inhabitants List -->
    <div v-if="allergyType.inhabitants && allergyType.inhabitants.length > 0" :class="COMPONENTS.allergyTypeCard.inhabitantSection">
      <h4 :class="TYPOGRAPHY.sectionSubheading">
        Berørte beboere ({{ inhabitantCount }})
      </h4>

      <div :class="COMPONENTS.allergyTypeCard.inhabitantList">
        <div
            v-for="inhabitant in allergyType.inhabitants"
            :key="inhabitant.id"
            :class="COMPONENTS.allergyTypeCard.inhabitant"
        >
          <!-- Inhabitant with avatar and name; household + age category as per-person badges -->
          <UserListItem :inhabitants="inhabitant">
            <template #badge="{inhabitant: listed}">
              <div :class="COMPONENTS.allergyTypeCard.badges">
                <UBadge
                    v-if="getHouseholdShortName(listed.householdId)"
                    :color="COLOR.neutral"
                    :variant="NOISE.subtle"
                    :size="SIZES.small"
                    :icon="ICONS.household"
                >
                  {{ getHouseholdShortName(listed.householdId) }}
                </UBadge>
                <UBadge
                    :color="ageBadge(listed.birthDate).color"
                    :variant="NOISE.subtle"
                    :size="SIZES.small"
                    data-testid="inhabitant-age-badge"
                >
                  {{ ageBadge(listed.birthDate).label }}
                </UBadge>
              </div>
            </template>
          </UserListItem>

          <!-- Additional info: Comment and timestamp -->
          <div v-if="inhabitant.inhabitantComment || inhabitant.allergyUpdatedAt" :class="COMPONENTS.allergyTypeCard.details">
            <div v-if="inhabitant.inhabitantComment" :class="[TYPOGRAPHY.finePrint, TEXT.strong, COMPONENTS.allergyTypeCard.comment]">
              "{{ inhabitant.inhabitantComment }}"
            </div>
            <!-- NuxtTime: wall-clock text can never match between SSR and hydration -->
            <div v-if="inhabitant.allergyUpdatedAt" :class="[TYPOGRAPHY.finePrint, TEXT.timestamp]">
              <NuxtTime :datetime="inhabitant.allergyUpdatedAt" relative :locale="DATE_SETTINGS.localeString"/>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <UAlert
      v-else
      v-bind="ALERTS.emptyState"
      :avatar="{ text: emptyStateMessage!.emoji, size: SIZES.emptyStateAvatar }"
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