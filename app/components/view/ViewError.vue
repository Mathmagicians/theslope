<script setup lang="ts">

export interface ViewErrorProps {
  statusCode?: number
  message?: string
  cause?: {
    stack?: string
  }
}
const props = defineProps<ViewErrorProps>()

const icons = Array.from({length: 16}, (_, i) => i)

function getRotationClass(i: number) {

  switch (i % 6) {
    case 0:
      return 'rotate-0'
      break
    case 1:
      return 'rotate-6'
      break
    case 2:
      return '-rotate-12'
      break
    case 3:
      return 'rotate-45'
      break
    case 4:
      return '-rotate-24'
      break
    case 5:
      return '-rotate-180'
      break
  }
}
</script>

<template>
  <div class="relative w-screen h-screen min-w-screen min-h-screen">
    <div class="flex flex-wrap gap-4  md:gap-8">
      <UIcon
          v-for="(item,i) in icons"
          :key="i"
          :name="i%2 ? 'mage:robot-dead': 'fluent-emoji-high-contrast:confused-face'"
          class="size-32 md:size-64 lg:size-128 text-red-500"
          :class="getRotationClass(i)"/>
    </div>

    <!-- Error Content -->
    <div class="absolute z-50 top-10 left-10 md:top-20 md:left-20 grow items-start min-w-1/2 opacity-90 bg-red-100 flex flex-col p-2 md:p-4">
      <!-- Error Code -->
      <UIcon name="i-mage-robot-dead" size="64"/>
      <p v-if="props.statusCode"
         class="text-2xl md:text-4xl font-mono font-bold bg-red-100 text-red-900 rounded inline-block mb-2">
        FEJL {{ props.statusCode }}
      </p>

      <!-- Error Message -->
      <p v-if="props.message" class="text-base md:text-lg text-red-700">
        {{ props.message }}
      </p>


      <p class="text-base md:text-lg text-red-700">
        <NuxtLink to="/">Fejl kan ske ... Lad os lige <span class="underline bold text-red-900">starte forfra</span></NuxtLink>
      </p>

      <!-- Error Cause -->
      <UPopover v-if="props.cause">
        <template #trigger>
          <UButton
              color="error"
              size="sm"
              variant="ghost"
              icon="i-heroicons-exclamation-triangle"
              label="Se stacktrace"/>
        </template>
        <template #panel>
          <div class="text-xs text-gray-400 whitespace-pre-wrap overflow-auto max-h-[300px]">
            {{ props.cause.stack }}
          </div>
        </template>
      </UPopover>

    </div>
  </div>
</template>
