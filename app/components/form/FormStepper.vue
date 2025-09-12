<script setup lang="ts">

interface Step {
  label: string
  icon: string
}

//steps count from 1..n, with an extra button for prev and next
const model = defineModel<number>({default: 1})
const props = defineProps<{ steps: Step[] }>()

const isFirst = computed(() => model.value === 1)
const isLast = computed(() => model.value === props.steps.length)

const handlePrev = () => () => model.value = Math.max(1, model.value - 1)
const handleNext = () => () => model.value = Math.min(props.steps.length, model.value + 1)

const buttons = computed(() => {
  return [
    {
      label: 'Tilbage',
      icon: 'i-heroicons-chevron-left',
      onClick: handlePrev()
    },
    ...props.steps,
    {
      label: 'Næste',
      icon: 'i-heroicons-chevron-right',
      onClick: handleNext()
    }
  ]
})

const isSelected = (index: number) => {
  if (index === 0) return false
  if (index === buttons.value.length - 1) return false
  return index <= model.value
}

const isDisabled = (index: number): boolean => {
  if (index === 0) return isFirst.value
  if (index === buttons.value.length - 1) return isLast.value
  return false
}

const isNavigation = (index: number): boolean => index === 0 || index === buttons.value.length - 1

</script>

<template>

    <UButtonGroup size="md" orientation="horizontal" :ui="{ rounded: 'rounded-xl' }" >
      <UButton
          v-for="(step, index ) in buttons"
          :key="index"
          :value="step.label"
          :disabled="isDisabled(index)"
          :active="isSelected(index)"
          :variant="isSelected(index) ? 'solid': 'outline'"
          :color="isSelected(index)? 'orange' : 'blue'"
          :active-class="`ring-2 border-2 ring-lavender-200 shadow-md ${index === model.value ? 'underline' : ''}`"
          @click="step.onClick  "
      >
        <template #trailing>
          <Icon  :name="step.icon" />
        </template>
        <span v-if="!isNavigation(index)" class="rounded-full  border-2 ring-1 border-lavender-300 ring-lavender-100 font-bold px-1.5"> {{ index }}  </span>
        <span  v-if="!isNavigation(index) "  class="hidden lg:block"> {{ step.label }} </span>
      </UButton>
    </UButtonGroup>

</template>
