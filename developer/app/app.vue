<template>
  <UApp>
    <UHeader title="TheSlope developer" :toggle="false">
      <template #right>
        <UButton to="/environments" variant="ghost" color="neutral" label="Environments" />
        <UButton to="/docs" variant="ghost" color="neutral" label="Docs" />
        <UButton to="https://github.com/Mathmagicians/theslope" target="_blank" variant="ghost" color="neutral" icon="i-mdi-github" label="GitHub" />
      </template>
    </UHeader>
    <UMain>
      <UContainer>
        <NuxtPage />
      </UContainer>
    </UMain>
  </UApp>
</template>
