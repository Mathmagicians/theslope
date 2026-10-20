<script setup lang="ts">
import type {TableColumn} from '@nuxt/ui'
import type {SuiteResult} from '~/composables/useManifests'

interface SuiteRow {
    suite: string
    scenarios: number
    result: SuiteResult
    report: string
}

const route = useRoute()
const env = computed(() => String(route.params.env))

const {fetchManifest, exists, scenarios, resultText, resultColor, reportPath, displayVersion, shortSha} = useManifests()

// The manifest and the spec exist on the published site only, so the page renders in the browser
const {data: manifest, status} = await useAsyncData(
    () => `manifest-${env.value}`,
    () => fetchManifest(env.value),
    {server: false, watch: [env]}
)
const {data: hasOpenApi} = await useAsyncData(
    () => `openapi-${env.value}`,
    () => exists(`/environments/${env.value}/openapi.json`),
    {server: false, default: () => false, watch: [env]}
)

const deployedAt = computed(() => manifest.value?.deployedAt.slice(0, 16).replace('T', ' ') ?? '')

const rows = computed<SuiteRow[]>(() => Object.entries(manifest.value?.suites ?? {}).map(([suite, result]) => ({
    suite,
    scenarios: scenarios(result),
    result,
    report: reportPath(env.value, suite, result)
})))

const columns: TableColumn<SuiteRow>[] = [
    {accessorKey: 'suite', header: 'Suite'},
    {accessorKey: 'scenarios', header: 'Scenarios'},
    {accessorKey: 'result', header: 'Result'},
    {accessorKey: 'report', header: 'Report'}
]

// The smoke suite runs live, on the deployed environment
const reportText = (row: SuiteRow) => `Report${row.suite === 'smoke' ? ' (live)' : ''}`
</script>

<template>
  <UPage>
    <UPageHeader :title="env">
      <template #description>
        <span v-if="manifest" class="flex flex-wrap gap-x-4">
          <span>{{ displayVersion(manifest.version) }}</span>
          <span>{{ shortSha(manifest.sha) }}</span>
          <span>deployed {{ deployedAt }}</span>
          <span>run {{ manifest.run }}</span>
          <ULink v-if="manifest.url" :to="manifest.url" external target="_blank">{{ manifest.url }}</ULink>
        </span>
      </template>
    </UPageHeader>
    <UPageBody>
      <p v-if="status === 'error'">
        No manifest for {{ env }}.
      </p>
      <template v-else-if="manifest">
        <UTable :data="rows" :columns="columns">
          <template #result-cell="{ row }">
            <UBadge :color="resultColor(row.original.result)" variant="subtle">
              {{ resultText(row.original.result) }}
            </UBadge>
          </template>
          <template #report-cell="{ row }">
            <ULink :to="row.original.report" external target="_blank">
              {{ reportText(row.original) }}
            </ULink>
          </template>
        </UTable>
        <p v-if="hasOpenApi">
          <ULink :to="`/environments/${env}/openapi.json`" external target="_blank">
            API reference of this version
          </ULink>
        </p>
      </template>
    </UPageBody>
  </UPage>
</template>
