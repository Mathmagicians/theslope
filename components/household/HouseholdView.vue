<script setup lang="ts">
const error = ref(null)

//define props for the component
defineProps({
  household: {
    type: Object,
    required: true
  }
})

</script>

<template>
  <div class="border-dashed border-blue-curacao-200">
    <div v-if="household">
      <h1 class="text-lg uppercase text-blue-curacao-900">🏠Overblik for {{ household.name }}</h1>
      <ul class="justify-center">
        <li v-for="inhabitant in household.inhabitants" class="flex flex-row items-center m-1 md:m-4 border-b-2 border-dotted border-mocha-mousse-400">
         <UAvatar :src="inhabitant.pictureUrl"
             class="border-1 border-mocha-mousse-400"
                  chip-color="orange"
                  chip-text="BARN"
                  chip-text-color="blue-curacao-100"
                  chip-position="bottom-right"
                  size="lg"
                  :alt="inhabitant.name"
                  ui="text-white"
         />
          <p class="text-sm md:text-base mx-2 md:mx-4">{{ inhabitant.name }}</p>
          <UChip position="bottom-right" color="orange" size="lg" text="BARN">
            <UIcon name="i-hugeicons-ticket-03" class="size-16 md:32 border-dotted b-2 border-mocha-mousse-400">
          </UIcon>
          </UChip>
          <UBadge variant="soft" color="orange">BARN</UBadge>


        </li>

      </ul>
    </div>
    <div v-else>
      😱Uh, oh, an error occured ${error}
    </div>


  </div>
</template>
