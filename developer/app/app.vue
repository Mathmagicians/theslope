<template>
  <UApp>
    <UHeader title="TheSlope developer" :toggle="false">
      <template #right>
        <UButton to="/environments" variant="ghost" color="neutral" label="Environments" />
        <UButton to="/docs" variant="ghost" color="neutral" label="Docs" />
      </template>
    </UHeader>
    <UMain>
      <UContainer>
        <NuxtPage />
      </UContainer>
    </UMain>
  </UApp>
</template>
