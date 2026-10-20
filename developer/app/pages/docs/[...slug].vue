<script setup lang="ts">
const route = useRoute()

const {data: page} = await useAsyncData(`doc-${route.path}`, () => queryCollection('docs').path(route.path).first())

if (!page.value) {
    throw createError({statusCode: 404, statusMessage: 'Page not found', fatal: true})
}

useHead({title: page.value.title})
</script>

<template>
  <UPage>
    <UPageBody>
      <ContentRenderer v-if="page" :value="page" />
    </UPageBody>
  </UPage>
</template>
