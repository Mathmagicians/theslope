<script setup lang="ts">

import type {FormMode} from "~/types/form"
import {FORM_MODES} from "~/types/form"

const formMode = ref<FormMode>(FORM_MODES.VIEW)

</script>

<template>
  <div>
    <UDivider />
    <p>Form mode: {{ formMode }} </p>
    <FormModeSelector v-model="formMode"/>
    <UDivider />
  </div>

</template>
