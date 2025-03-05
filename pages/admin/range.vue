<script setup lang="ts">
import type {DateRange} from "~/types/dateTypes"

const toast = useToast()
const store = usePlanStore()
const {
  getModel
} = storeToRefs(store)
const {init} = store


const selected = ref<DateRange[]>([])
const holidays = computed(() => getModel?.value?.value?.holidays ?? []) // getModel is a ref of refs

const handleClose = () => {
  console.log('RANGE > model updated, selected date ranges: ', selected.value)
}

// INITIALIZATION
const {status, error} = await useAsyncData('planStore', async () => {
  await init()
  toast.add({
    id: 'seasons-loaded',
    title: 'Sæsoner indlæst',
    description: 'Sæsoner er indlæst og klar til brug',
    color: 'green'
  })
  return {initialized: true}
})
</script>

<template>
  <Suspense>
    <template #default>
      <Loader v-if="status === 'pending'"/>
      <div v-else-if="status === 'success'">
        <CalendarDateRangeListPicker :season-dates="createDateRange(new Date(2025,0,20), new Date(2025,4,25))"
                                     v-model="holidays" @close="handleClose" @update:model-value="handleClose"/>
        <p>Value from CalendarDateInput component is: {{ selected }}</p>
      </div>
      <ViewError v-else-if="error" :error="500" message="Kunne ikke loade data for admin siden" :cause="error"/>
    </template>
    <template #fallback>
      <Loader text="Henter data for fællesspisning sæsoner..."/>
    </template>
  </Suspense>
</template>
