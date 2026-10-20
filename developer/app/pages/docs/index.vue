<script setup lang="ts">
const {data: docs} = await useAsyncData('docs-index', () =>
    queryCollection('docs').select('path', 'title', 'description').order('path', 'ASC').all()
)
</script>

<template>
  <UPage>
    <UPageHeader title="Docs" description="The repository's docs, as they are" />
    <UPageBody>
      <UPageList>
        <UPageCard
          v-for="doc in docs"
          :key="doc.path"
          :to="doc.path"
          :title="doc.title"
          :description="doc.description"
          variant="ghost"
        />
      </UPageList>
    </UPageBody>
  </UPage>
</template>
