<script setup lang="ts">

import type {FormMode} from "~/types/form"
import {FORM_MODES} from "~/types/form"

interface FormModeButton {
  label: string
  icon: string
  mode: FormMode
}

interface Props {
  disabledModes?: FormMode[]
}

const {COLOR, COMPONENTS} = useTheSlopeDesignSystem()

const model = defineModel<FormMode>({default: FORM_MODES.VIEW})

const props = withDefaults(defineProps<Props>(), {
  disabledModes: () => []
})


const items: FormModeButton[] = [
  //for each formMode, create a button with icon and text, and isActive function
  {
    label: 'Vis',
    icon: 'i-heroicons-eye',
    mode: FORM_MODES.VIEW
  },
  {
    label: 'Rediger',
    icon: 'i-heroicons-pencil',
    mode: FORM_MODES.EDIT
  },
  {
    label: 'Opret',
    icon: 'i-heroicons-plus-circle',
    mode: FORM_MODES.CREATE
  }
]
const isDisabled = (mode: FormMode): boolean => props.disabledModes.includes(mode)

const handleSelect = (selected: FormMode): void => {
  model.value = selected
}

const isSelected = (mode: FormMode):boolean => model.value === mode

const getButtonVariant = (mode: FormMode) => {
  if(  isDisabled(mode) ) {
    return 'ghost'
  } else {
    return isSelected(mode) ? 'solid' : 'outline'
  }
}


</script>

<template>
  <UFieldGroup size="md" orientation="horizontal" >
    <UButton
        v-for="item in items"
        :key="item.mode"
        :data-testid="`form-mode-${item.mode}`"
        :disabled="isDisabled(item.mode)"
        :active="isSelected(item.mode)"
        :variant="getButtonVariant(item.mode)"
        :color="COLOR.info"
        :active-class="COMPONENTS.segmentedActive"
        @click="handleSelect(item.mode)"
    >
      <template #leading>
        <Icon :name="item.icon"/>
      </template>
      <span class="hidden md:block">{{ item.label }}</span>
    </UButton>
  </UFieldGroup>
</template>
