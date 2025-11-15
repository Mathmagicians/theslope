<script setup lang="ts">
/**
 * DinnerMenuHero - Hero panel for dinner menu display
 *
 * Shows menu title, description, picture, allergies, and action buttons
 * Full-bleed design with no rounded corners for monitor-style layout
 * Mobile-first responsive design
 */
import type {DinnerEvent} from '~/composables/useDinnerEventValidation'
import type {AllergyWithRelations} from '~/composables/useAllergyValidation'

interface Props {
  dinnerEvent?: DinnerEvent
  allergies?: AllergyWithRelations[]
  // User's current booking state (for button states)
  hasBooking?: boolean
  canSwap?: boolean
  canCancel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  dinnerEvent: undefined,
  allergies: () => [],
  hasBooking: false,
  canSwap: false,
  canCancel: false
})

// Emit events for actions (parent handles business logic)
const emit = defineEmits<{
  book: []
  swap: []
  cancel: []
  changeDiningMode: []
}>()

// Design system
const { BACKGROUNDS, TYPOGRAPHY, SIZES } = useColorSystem()
</script>

<template>
  <!-- Empty state when no dinner event -->
  <div
    v-if="!dinnerEvent"
    :class="`relative min-h-[300px] md:min-h-[400px] flex flex-col justify-center items-center text-center p-6 md:p-12 ${BACKGROUNDS.hero.mocha}`"
  >
    <div class="space-y-4 md:space-y-6">
      <div class="text-6xl md:text-8xl">🍽️</div>
      <h2 :class="TYPOGRAPHY.heroTitle">
        Ingen fællesspisning denne dag
      </h2>
      <p class="text-lg md:text-xl opacity-90">
        Vælg en anden dato i kalenderen for at se menuoplysninger
      </p>
    </div>
  </div>

  <!-- Dinner event content -->
  <div
    v-else
    :class="`relative min-h-[300px] md:min-h-[400px] flex flex-col justify-center items-center text-center p-6 md:p-12 ${BACKGROUNDS.hero.mocha}`"
    :style="dinnerEvent.menuPictureUrl
      ? `background-image: url(${dinnerEvent.menuPictureUrl}); background-size: cover; background-position: center;`
      : ''"
  >
    <!-- Overlay for better text readability when image is present -->
    <div
      v-if="dinnerEvent.menuPictureUrl"
      class="absolute inset-0 bg-black/40"
    />

    <!-- Content -->
    <div class="relative z-10 text-white space-y-4 md:space-y-6 max-w-4xl">
      <!-- Menu Title -->
      <h1 class="text-3xl md:text-5xl lg:text-6xl font-bold">
        {{ dinnerEvent.menuTitle }}
      </h1>

      <!-- Menu Description -->
      <p v-if="dinnerEvent.menuDescription" class="text-lg md:text-xl lg:text-2xl opacity-90">
        {{ dinnerEvent.menuDescription }}
      </p>

      <!-- Allergies -->
      <div v-if="allergies.length > 0" class="flex flex-wrap justify-center gap-3 md:gap-4 text-sm md:text-base">
        <span
          v-for="allergy in allergies"
          :key="allergy.id"
          class="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full"
        >
          <span v-if="allergy.allergyType.icon">{{ allergy.allergyType.icon }}</span>
          <span>{{ allergy.allergyType.name }}</span>
        </span>
      </div>

      <!-- Action buttons -->
      <div class="flex flex-wrap justify-center gap-2 md:gap-3 pt-4">
        <UButton
          v-if="!hasBooking"
          color="primary"
          :size="SIZES.standard"
          name="book-dinner"
          @click="emit('book')"
        >
          Bestil
        </UButton>
        <UButton
          v-if="canSwap"
          color="neutral"
          variant="solid"
          :size="SIZES.standard"
          name="swap-dinner"
          @click="emit('swap')"
        >
          Byt
        </UButton>
        <UButton
          v-if="canCancel"
          color="error"
          variant="solid"
          :size="SIZES.standard"
          name="cancel-dinner"
          @click="emit('cancel')"
        >
          Annuller
        </UButton>
        <UButton
          v-if="hasBooking"
          color="neutral"
          variant="solid"
          :size="SIZES.standard"
          name="change-dining-mode"
          @click="emit('changeDiningMode')"
        >
          Skift Servering
        </UButton>
      </div>
    </div>
  </div>
</template>