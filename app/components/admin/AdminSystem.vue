<!--
AdminSystem - System administration panel with job history and manual triggers

UX MOCKUP: Admin System Jobs Panel
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ (sync icon) SYSTEM JOBS                                                                                │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                        │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌──────────────────────────────┐  │
│  │       (clipboard icon)       │  │        (ticket icon)         │  │         (users icon)         │  │
│  │                              │  │                              │  │                              │  │
│  │ Daglig                       │  │ Månedlig                     │  │ Heynabo                      │  │
│  │ Vedligeholdelse              │  │ Fakturering                  │  │ Import                       │  │
│  │                              │  │                              │  │                              │  │
│  │ [ Kør daglig vedligeholdelse │  │ [ Kør fakturering            │  │ [ Kør import                 │  │
│  │   (arrow icon)             ] │  │   (arrow icon)             ] │  │   (arrow icon)             ] │  │
│  └──────────────────────────────┘  └──────────────────────────────┘  └──────────────────────────────┘  │
│                                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘

Jobs run automatically via Nitro scheduledTasks + Cloudflare Cron Triggers.
Admins can manually re-trigger jobs if they failed.

UX MOCKUP: Job history on a phone
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────┐
│ (clock icon) Jobhistorik        │
├──────────────────┬──────────┬───┼ - - - - - - - - - - - - - - - - -
│ Dato             │ Job      │ St│atus      Varighed  Kilde  Resultat
│ 26/10/2026 18:43 │ Daglig … │ [b│adge]     7.0s      ADMIN  Middage …
└─────────────────────────────────┘
The table keeps its six columns and scrolls sideways inside its card.

UX MOCKUP: Job boxes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A box after a failed run:
┌─────────────────────────────────┐
│ (users icon)  Dagligt kl. 02:00 │
│ Heynabo Import                  │
│ Synkroniser husstande og ...    │
│ (clock icon)  26/10/2026 14:02  │
│ (status icon) Fejlet            │
│ ┌ Fejl ───────────────────────┐ │
│ │ the request's error message │ │
│ └─────────────────────────────┘ │
│ [ Kør import ]                  │
└─────────────────────────────────┘
A box whose job never ran: the same card with the line "Ingen kørsler endnu" in place of the run lines. A box shows the skeleton while its job runs or its latest run is read.
Each stat line wears the icon of its own stat.

Visual check: /admin/system, each box after a run (the daily box with and without the scaffold step), phone and desktop.
-->

<script setup lang="ts">
import type {TreeItem} from '@nuxt/ui'
import type {JobRunDisplay} from '~/composables/useMaintenanceValidation'
import {MAINTENANCE_WORDS} from '~/config/maintenanceWords'

// The parent decides who may run a job
interface Props {
  canEdit?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  canEdit: false
})

const { COLOR, ICONS, SIZES, TYPOGRAPHY, LAYOUTS, ALERTS, COMPONENTS, getRandomEmptyMessageText, getRainbowBand, NOISE } = useTheSlopeDesignSystem()

const {
    jobTypeLabels,
    jobStatusLabels,
    getJobStatusColor,
    getJobStatusIcon,
    formatDuration,
    formatResultSummary,
    jobRunStats
} = useMaintenance()
const {JobRunDisplaySchema, JobType} = useMaintenanceValidation()

const usersStore = useUsersStore()
const { isImportHeynaboLoading, heynaboImportError } = storeToRefs(usersStore)
const { importHeynaboData } = usersStore

const householdsStore = useHouseholdsStore()
const { loadHouseholds, refreshSelectedHousehold } = householdsStore

const bookingsStore = useBookingsStore()
const { isDailyMaintenanceRunning, dailyMaintenanceError } = storeToRefs(bookingsStore)
const { isMonthlyBillingRunning, monthlyBillingError } = storeToRefs(bookingsStore)
const { runDailyMaintenance, runMonthlyBilling } = bookingsStore

// ============================================================================
// JOB RUNS - read here only, so component-local (ADR-007)
// ============================================================================

const {storeAsyncData} = useApiHandler()
const {data: jobRuns, isLoading: isJobHistoryLoading, refresh: refreshJobHistory} = storeAsyncData(
    'admin-system-job-runs', '/api/admin/maintenance/job-run?limit=20',
    {schema: JobRunDisplaySchema.array(), default: () => []}
)

// A job's box shows its latest run, which the latest runs of all jobs may not hold
const latestJobRunOf = (jobType: JobRunDisplay['jobType']) => storeAsyncData(
    `admin-system-latest-job-run-${jobType}`, `/api/admin/maintenance/job-run?jobType=${jobType}&limit=1`,
    {schema: JobRunDisplaySchema.array(), default: () => []}
)
const latestJobRuns = {
    [JobType.HEYNABO_IMPORT]: latestJobRunOf(JobType.HEYNABO_IMPORT),
    [JobType.DAILY_MAINTENANCE]: latestJobRunOf(JobType.DAILY_MAINTENANCE),
    [JobType.MONTHLY_BILLING]: latestJobRunOf(JobType.MONTHLY_BILLING)
}
type SystemJobType = keyof typeof latestJobRuns
const latestJobRun = (jobType: SystemJobType) => latestJobRuns[jobType].data.value[0] ?? null
const isLatestRunLoading = (jobType: SystemJobType) => latestJobRuns[jobType].isLoading.value

// A run writes its job run, succeeded or failed; the box and the list read again either way
const runAndRefresh = async (jobType: SystemJobType, run: () => Promise<void>) => {
    try {
        await run()
    } catch {
        // The failure stays in its store, which has toasted it
    } finally {
        await Promise.all([refreshJobHistory(), latestJobRuns[jobType].refresh()])
    }
}

// The import changes households and inhabitants on the server; the households store reads them again
const importAndReloadHouseholds = async () => {
    await importHeynaboData()
    await loadHouseholds()
    await refreshSelectedHousehold()
}

const now = useClock()
const jobHistoryEmpty = getRandomEmptyMessageText('jobHistory', now.value)

// ============================================================================
// JOB HISTORY TABLE
// ============================================================================

const jobHistoryColumns = [
  { accessorKey: 'startedAt', header: 'Dato' },
  { accessorKey: 'jobType', header: 'Job' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'duration', header: 'Varighed' },
  { accessorKey: 'triggeredBy', header: 'Kilde' },
  { accessorKey: 'resultSummary', header: 'Resultat' }
]

const jobHistoryRows = computed(() => {
  return jobRuns.value.map(jr => ({
    id: jr.id,
    startedAt: formatDate(jr.startedAt, DATE_SETTINGS.DATE_TIME_MASK),
    jobType: jobTypeLabels[jr.jobType],
    status: jr.status,
    statusColor: getJobStatusColor(jr.status),
    statusIcon: getJobStatusIcon(jr.status),
    statusLabel: jobStatusLabels[jr.status],
    duration: formatDuration(jr.durationMs),
    triggeredBy: jr.triggeredBy,
    resultSummary: formatResultSummary(jr.jobType, jr.resultSummary)
  }))
})

// ============================================================================
// APP CONFIG TREE
// ============================================================================

const appConfig = useAppConfig()

const isConfigBranch = (value: unknown): value is object => typeof value === 'object' && value !== null && !Array.isArray(value)

const objectToTreeItems = (branch: object): TreeItem[] => {
  return Object.entries(branch).map(([key, value]: [string, unknown]) => {
    if (isConfigBranch(value)) {
      return {
        label: key,
        children: objectToTreeItems(value)
      }
    }
    const displayValue = Array.isArray(value) ? `[${value.length} items]` : String(value)
    return { label: `${key}: ${displayValue}` }
  })
}

const configTreeItems = computed(() => objectToTreeItems(appConfig.theslope))
const CONFIG_TREE_EXPANDED = ['defaultSeason', 'cookingDeadlines', 'kitchen', 'billing'] satisfies (keyof typeof appConfig.theslope)[]

// ============================================================================
// JOB BOXES
// ============================================================================

// The box shows its job's latest run: when it started, how it ended, then its stats, each with its own icon;
// a run without a result shows when and how it ended
const latestRunLines = (jobType: SystemJobType): { icon: string; text: string }[] => {
  const run = latestJobRun(jobType)
  if (!run) return []
  return [
    { icon: ICONS.clock, text: formatDate(run.startedAt, DATE_SETTINGS.DATE_TIME_MASK) },
    { icon: getJobStatusIcon(run.status), text: jobStatusLabels[run.status] },
    ...(jobRunStats(run.jobType, run.resultSummary) ?? []).map(stat => ({ icon: stat.icon, text: formatJobStat(stat) }))
  ]
}

const systemJobs = appConfig.theslope.systemJobs

const jobDefinitions = computed(() => [
  {
    key: JobType.HEYNABO_IMPORT,
    ...MAINTENANCE_WORDS.boxes[JobType.HEYNABO_IMPORT],
    schedule: systemJobs.heynaboImport.description,
    color: COLOR.ocean,
    headerBg: getRainbowBand(2),
    icon: ICONS.users,
    isRunning: isImportHeynaboLoading.value,
    isLoading: isImportHeynaboLoading.value || isLatestRunLoading(JobType.HEYNABO_IMPORT),
    stats: latestRunLines(JobType.HEYNABO_IMPORT),
    error: heynaboImportError.value,
    trigger: () => runAndRefresh(JobType.HEYNABO_IMPORT, importAndReloadHouseholds)
  },
  {
    key: JobType.DAILY_MAINTENANCE,
    ...MAINTENANCE_WORDS.boxes[JobType.DAILY_MAINTENANCE],
    schedule: systemJobs.dailyMaintenance.description,
    color: COLOR.peach,
    headerBg: getRainbowBand(4),
    icon: ICONS.clipboard,
    isRunning: isDailyMaintenanceRunning.value,
    isLoading: isDailyMaintenanceRunning.value || isLatestRunLoading(JobType.DAILY_MAINTENANCE),
    stats: latestRunLines(JobType.DAILY_MAINTENANCE),
    error: dailyMaintenanceError.value,
    trigger: () => runAndRefresh(JobType.DAILY_MAINTENANCE, runDailyMaintenance)
  },
  {
    key: JobType.MONTHLY_BILLING,
    ...MAINTENANCE_WORDS.boxes[JobType.MONTHLY_BILLING],
    schedule: systemJobs.monthlyBilling.description,
    color: COLOR.secondary,
    headerBg: getRainbowBand(0),
    icon: ICONS.ticket,
    isRunning: isMonthlyBillingRunning.value,
    isLoading: isMonthlyBillingRunning.value || isLatestRunLoading(JobType.MONTHLY_BILLING),
    stats: latestRunLines(JobType.MONTHLY_BILLING),
    error: monthlyBillingError.value,
    trigger: () => runAndRefresh(JobType.MONTHLY_BILLING, runMonthlyBilling)
  }
])
</script>

<template>
  <div data-testid="admin-system" :class="COMPONENTS.adminSystem.root">
    <div :class="COMPONENTS.adminSystem.header">
      <UIcon :name="ICONS.sync" :class="TYPOGRAPHY.sectionIconLight" />
      <h1 :class="TYPOGRAPHY.sectionSubheadingLight">Systemjobs</h1>
    </div>

    <div :class="LAYOUTS.gridThreeCol">
      <UCard
        v-for="job in jobDefinitions"
        :key="job.key"
        v-bind="COMPONENTS.adminSystem.jobCard"
      >
        <template #header>
          <div
            :class="[job.headerBg, COMPONENTS.adminSystem.jobHeader]"
          >
            <UIcon
              :name="job.isRunning ? ICONS.sync : job.icon"
              :class="[COMPONENTS.adminSystem.jobIcon, job.isRunning && COMPONENTS.adminSystem.jobIconRunning]"
            />
            <span :class="TYPOGRAPHY.bodyTextSmall">
              {{ job.schedule }}
            </span>
          </div>
        </template>

        <h3 :class="COMPONENTS.adminSystem.jobTitle">
          {{ job.title }}
        </h3>

        <p :class="COMPONENTS.adminSystem.jobDescription">
          {{ job.description }}
        </p>

        <div :class="COMPONENTS.adminSystem.jobBody">
          <!-- Skeleton while the run is in flight or the box's latest run is being read -->
          <div v-if="job.isLoading" :class="COMPONENTS.adminSystem.skeletons">
            <div :class="COMPONENTS.adminSystem.skeletonRow">
              <USkeleton :class="COMPONENTS.adminSystem.skeletonDot" />
              <USkeleton :class="COMPONENTS.adminSystem.skeletonLong" />
            </div>
            <div :class="COMPONENTS.adminSystem.skeletonRow">
              <USkeleton :class="COMPONENTS.adminSystem.skeletonDot" />
              <USkeleton :class="COMPONENTS.adminSystem.skeletonShort" />
            </div>
          </div>
          <div v-else-if="job.stats.length > 0" :class="COMPONENTS.adminSystem.stats">
            <div
              v-for="(stat, index) in job.stats"
              :key="index"
              :class="COMPONENTS.adminSystem.stat"
              data-testid="job-run-line"
            >
              <UIcon :name="stat.icon" :class="COMPONENTS.adminSystem.statIcon" />
              <span :class="TYPOGRAPHY.bodyTextSmall">{{ stat.text }}</span>
            </div>
          </div>
          <p v-else :class="TYPOGRAPHY.bodyTextSmall">Ingen kørsler endnu</p>

          <UAlert v-if="!job.isLoading && job.error" v-bind="ALERTS.error">
            <template #title>Fejl</template>
            <template #description>{{ job.error.message }}</template>
          </UAlert>
        </div>

        <template #footer>
          <UButton
            :color="job.color"
            :size="SIZES.standard"
            :trailing-icon="ICONS.arrowRight"
            :loading="job.isRunning"
            :disabled="job.isRunning || !props.canEdit"
            :data-testid="`trigger-${job.key.toLowerCase()}`"
            block
            @click="job.trigger"
          >
            {{ job.isRunning ? MAINTENANCE_WORDS.running : job.buttonLabel }}
          </UButton>
        </template>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div :class="COMPONENTS.adminSystem.panelHeader">
          <UIcon :name="ICONS.clock" :class="COMPONENTS.adminSystem.panelIcon" />
          <span :class="COMPONENTS.adminSystem.panelTitle">Jobhistorik</span>
        </div>
      </template>

      <UTable
        :data="jobHistoryRows"
        :columns="jobHistoryColumns"
        :loading="isJobHistoryLoading"
        caption="Seneste jobkørsler"
        :class="COMPONENTS.adminSystem.historyTable"
        :ui="COMPONENTS.table.ui"
      >
        <template #status-cell="{ row }">
          <UBadge :color="row.original.statusColor" :variant="NOISE.subtle" :class="COMPONENTS.adminSystem.statusBadge">
            <UIcon :name="row.original.statusIcon" :class="COMPONENTS.adminSystem.statusIcon" />
            {{ row.original.statusLabel }}
          </UBadge>
        </template>

        <template #loading>
          <div :class="COMPONENTS.table.loadingRow">
            <UIcon :name="ICONS.sync" :size="SIZES.smallIconSize" :class="COMPONENTS.table.loadingSpinner" />
            Henter jobhistorik...
          </div>
        </template>

        <template #empty>{{ jobHistoryEmpty }}</template>
      </UTable>
    </UCard>

    <UCard>
      <template #header>
        <div :class="COMPONENTS.adminSystem.panelHeader">
          <UIcon :name="ICONS.preferences" :class="COMPONENTS.adminSystem.panelIcon" />
          <span :class="COMPONENTS.adminSystem.panelTitle">Systemindstillinger</span>
        </div>
      </template>

      <UTree :items="configTreeItems" :default-expanded="CONFIG_TREE_EXPANDED" />
    </UCard>
  </div>
</template>
