<script setup lang="ts">
const {fetchManifests, displayVersion, shortSha, resultColor} = useManifests()

// The manifests exist on the published site only, so the cards render in the browser
const {data: manifests, status} = await useAsyncData('manifests', fetchManifests, {server: false, default: () => []})

const deployedDate = (deployedAt: string) => deployedAt.slice(0, 10)
</script>

<template>
  <p v-if="status === 'success' && manifests.length === 0">
    No environment has published a manifest yet.
  </p>
  <UPageGrid v-else>
    <UCard v-for="manifest in manifests" :key="manifest.environment">
      <template #header>
        <NuxtLink :to="`/environments/${manifest.environment}`" class="font-semibold">
          {{ manifest.environment }}
        </NuxtLink>
      </template>
      <p>{{ displayVersion(manifest.version) }} · {{ shortSha(manifest.sha) }}</p>
      <p>deployed {{ deployedDate(manifest.deployedAt) }}</p>
      <template #footer>
        <div class="flex flex-wrap gap-2">
          <UBadge
            v-for="(result, suite) in manifest.suites"
            :key="suite"
            :color="resultColor(result)"
            variant="subtle"
          >
            {{ suite }} {{ result.failed > 0 ? '✗' : '✓' }}
          </UBadge>
        </div>
      </template>
    </UCard>
  </UPageGrid>
</template>
