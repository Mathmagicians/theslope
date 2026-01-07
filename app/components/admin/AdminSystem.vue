<!--
AdminSystem - System administration panel with job history and manual triggers

UX MOCKUP: Admin System Jobs Panel
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌──────────────────────────────────────────────────────────────────────────────┐
│ 🔄 SYSTEM JOBS                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │       🔄        │  │       🔄        │  │       🔄        │              │
│  │                 │  │                 │  │                 │              │
│  │ Daglig          │  │ Månedlig        │  │ Heynabo         │              │
│  │ Vedligeholdelse │  │ Fakturering     │  │ Import          │              │
│  │                 │  │                 │  │                 │              │
│  │ [  Kør nu  →  ] │  │ [  Kør nu  →  ] │  │ [  Kør nu  →  ] │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

Jobs run automatically via Nitro scheduledTasks + Cloudflare Cron Triggers.
Admins can manually re-trigger jobs if they failed.
-->

<script setup lang="ts">
import type {JobRunDisplay} from '~/composables/useMaintenanceValidation'

// Design system
const { COLOR, ICONS, SIZES, TYPOGRAPHY, LAYOUTS, BG, getRandomEmptyMessage } = useTheSlopeDesignSystem()

// Maintenance helpers
const {
    jobTypeLabels,
    jobStatusLabels,
    getJobStatusColor,
    getJobStatusIcon,
    formatDuration,
    formatTriggeredBy,
    formatResultSummary,
    parseResultSummary,
    formatHeynaboStats,
    formatDailyMaintenanceStats,
    formatMonthlyBillingStats
} = useMaintenance()
const {JobRunDisplaySchema} = useMaintenanceValidation()

// Auth - check admin role
const authStore = useAuthStore()
const { isAdmin } = storeToRefs(authStore)

// Users store - for Heynabo import
const usersStore = useUsersStore()
const { isImportHeynaboLoading, heynaboImport, isImportHeynaboErrored, heynaboImportError } = storeToRefs(usersStore)
const { importHeynaboData } = usersStore

// Bookings store - for daily maintenance and monthly billing
const bookingsStore = useBookingsStore()
const { isDailyMaintenanceRunning, hasDailyMaintenanceResult, hasDailyMaintenanceError, dailyMaintenanceResult, dailyMaintenanceError } = storeToRefs(bookingsStore)
const { isMonthlyBillingRunning, hasMonthlyBillingResult, hasMonthlyBillingError, monthlyBillingResult, monthlyBillingError } = storeToRefs(bookingsStore)
const { runDailyMaintenance, runMonthlyBilling } = bookingsStore

// ============================================================================
// JOB HISTORY - fetch from API (ADR-007: useAsyncData)
// ============================================================================

const { data: jobRuns, status: jobRunsStatus, refresh: refreshJobRuns } = useFetch<JobRunDisplay[]>(
    '/api/admin/maintenance/job-run',
    {
        key: 'admin-system-job-runs',
        query: { limit: 20 },
        default: () => [],
        transform: (data) => data.map(jr => JobRunDisplaySchema.parse(jr)),
        immediate: true
    }
)

const isJobHistoryLoading = computed(() => jobRunsStatus.value === 'pending')

// Refresh job runs after manual trigger
const runDailyMaintenanceAndRefresh = async () => {
    await runDailyMaintenance()
    await refreshJobRuns()
}

const importHeynaboDataAndRefresh = async () => {
    await importHeynaboData()
    await refreshJobRuns()
}

const runMonthlyBillingAndRefresh = async () => {
    await runMonthlyBilling()
    await refreshJobRuns()
}

// Get latest job run by type (for showing history when no fresh result)
const getLatestJobRunByType = (jobType: string): JobRunDisplay | null => {
    return jobRuns.value.find(jr => jr.jobType === jobType) ?? null
}

// Empty state for job history table
const jobHistoryEmptyMessage = getRandomEmptyMessage('jobHistory')
const jobHistoryEmpty = `${jobHistoryEmptyMessage.emoji} ${jobHistoryEmptyMessage.text}`

// ============================================================================
// JOB HISTORY TABLE
// ============================================================================

const jobHistoryColumns = [
  { accessorKey: 'startedAt', header: 'Dato' },
  { accessorKey: 'jobType', header: 'Job' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'durationMs', header: 'Varighed' },
  { accessorKey: 'triggeredBy', header: 'Kilde' },
  { accessorKey: 'resultSummary', header: 'Resultat' }
]

// Format job runs for table display
const jobHistoryRows = computed(() => {
  return jobRuns.value.map(jr => ({
    id: jr.id,
    startedAt: jr.startedAt.toLocaleString('da-DK', { dateStyle: 'short', timeStyle: 'short' }),
    jobType: jobTypeLabels[jr.jobType as keyof typeof jobTypeLabels] ?? jr.jobType,
    status: jr.status,
    statusColor: getJobStatusColor(jr.status),
    statusIcon: getJobStatusIcon(jr.status),
    statusLabel: jobStatusLabels[jr.status as keyof typeof jobStatusLabels] ?? jr.status,
    durationMs: formatDuration(jr.durationMs),
    triggeredBy: formatTriggeredBy(jr.triggeredBy),
    resultSummary: formatResultSummary(jr.jobType, jr.resultSummary)
  }))
})

// ============================================================================
// APP CONFIG TREE
// ============================================================================

const appConfig = useAppConfig()

// Convert object to tree items recursively
const objectToTreeItems = (obj: Record<string, unknown>, prefix = ''): { label: string; children?: { label: string }[] }[] => {
  return Object.entries(obj).map(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return {
        label: key,
        children: objectToTreeItems(value as Record<string, unknown>, `${prefix}${key}.`)
      }
    }
    const displayValue = Array.isArray(value) ? `[${value.length} items]` : String(value)
    return { label: `${key}: ${displayValue}` }
  })
}

const configTreeItems = computed(() => objectToTreeItems(appConfig.theslope as Record<string, unknown>))

// ============================================================================
// JOB STATS FORMATTING - shared by fresh runs and historical data (DRY)
// ============================================================================

const jobIconsMap = {
  DAILY_MAINTENANCE: [ICONS.checkCircle, ICONS.ticket, ICONS.shoppingCart, ICONS.edit, ICONS.ticket],
  MONTHLY_BILLING: [ICONS.calendar, ICONS.ticket, ICONS.shoppingCart, ICONS.economy],
  HEYNABO_IMPORT: [ICONS.household, ICONS.users, ICONS.user]
} as const

// Format stats with icons for card display (used by both fresh and historical)
const formatStatsWithIcons = (
  stats: { label: string; value: string }[],
  icons: readonly string[],
  timestamp: Date
): { icon: string; text: string }[] => [
  { icon: ICONS.clock, text: timestamp.toLocaleString('da-DK', { dateStyle: 'short', timeStyle: 'short' }) },
  { icon: ICONS.checkCircle, text: 'Gennemført' },
  ...stats.map((stat, i) => ({
    icon: icons[i] ?? ICONS.info,
    text: `${stat.label}: ${stat.value}`
  }))
]

// Fresh run stats (from stores)
const hasHeynaboImportResult = computed(() => heynaboImport.value !== null)

const dailyMaintenanceStats = computed(() => {
  if (!hasDailyMaintenanceResult.value || !dailyMaintenanceResult.value) return []
  return formatStatsWithIcons(
    formatDailyMaintenanceStats(dailyMaintenanceResult.value),
    jobIconsMap.DAILY_MAINTENANCE,
    new Date()
  )
})

const monthlyBillingStats = computed(() => {
  if (!hasMonthlyBillingResult.value || !monthlyBillingResult.value?.results) return []
  return formatStatsWithIcons(
    formatMonthlyBillingStats(monthlyBillingResult.value.results),
    jobIconsMap.MONTHLY_BILLING,
    new Date()
  )
})

const heynaboImportStats = computed(() => {
  if (!hasHeynaboImportResult.value || !heynaboImport.value) return []
  return formatStatsWithIcons(
    formatHeynaboStats(heynaboImport.value),
    jobIconsMap.HEYNABO_IMPORT,
    new Date()
  )
})

// ============================================================================
// JOB DEFINITIONS
// ============================================================================

// Job definitions following feature-proposal-season-activation.md
const systemJobs = appConfig.theslope.systemJobs

// Get latest job run result formatted for display (fallback when no fresh result)
const getLatestJobStats = (jobType: string): { icon: string; text: string }[] => {
  const latestRun = getLatestJobRunByType(jobType)
  if (!latestRun || !latestRun.resultSummary) return []

  const parsed = parseResultSummary(latestRun.jobType, latestRun.resultSummary)
  if (!parsed) return []

  const icons = jobIconsMap[jobType as keyof typeof jobIconsMap] ?? []
  let stats: { label: string; value: string }[] = []

  switch (jobType) {
    case 'DAILY_MAINTENANCE':
      stats = formatDailyMaintenanceStats(parsed as Parameters<typeof formatDailyMaintenanceStats>[0])
      break
    case 'MONTHLY_BILLING':
      stats = formatMonthlyBillingStats(parsed as Parameters<typeof formatMonthlyBillingStats>[0])
      break
    case 'HEYNABO_IMPORT':
      stats = formatHeynaboStats(parsed as Parameters<typeof formatHeynaboStats>[0])
      break
  }

  return formatStatsWithIcons(stats, icons, latestRun.startedAt)
}

const jobDefinitions = computed(() => {
  // Check for historical data from database for each job type
  const hasHistoricalDailyMaintenance = getLatestJobRunByType('DAILY_MAINTENANCE') !== null
  const hasHistoricalMonthlyBilling = getLatestJobRunByType('MONTHLY_BILLING') !== null
  const hasHistoricalHeynaboImport = getLatestJobRunByType('HEYNABO_IMPORT') !== null

  return [
    {
      key: 'DAILY_MAINTENANCE',
      title: 'Daglig Vedligeholdelse',
      buttonLabel: 'Kør daglig vedligeholdelse',
      description: 'Markér middage som afholdt, luk ordrer, opret transaktioner, opret automatiske bookinger',
      schedule: systemJobs.dailyMaintenance.description,
      color: COLOR.peach,
      headerBg: BG.peach[50],
      icon: ICONS.sync,
      // Wired up via bookings store
      isRunning: isDailyMaintenanceRunning.value,
      hasResult: hasDailyMaintenanceResult.value || hasHistoricalDailyMaintenance,
      hasError: hasDailyMaintenanceError.value,
      stats: hasDailyMaintenanceResult.value ? dailyMaintenanceStats.value : getLatestJobStats('DAILY_MAINTENANCE'),
      error: dailyMaintenanceError.value,
      trigger: runDailyMaintenanceAndRefresh
    },
    {
      key: 'MONTHLY_BILLING',
      title: 'Månedlig Fakturering',
      buttonLabel: 'Kør fakturering',
      description: 'Generer fakturaer for foregående måned',
      schedule: systemJobs.monthlyBilling.description,
      color: COLOR.secondary,
      headerBg: BG.pink[50],
      icon: ICONS.ticket,
      // Wired up via bookings store
      isRunning: isMonthlyBillingRunning.value,
      hasResult: hasMonthlyBillingResult.value || hasHistoricalMonthlyBilling,
      hasError: hasMonthlyBillingError.value,
      stats: hasMonthlyBillingResult.value ? monthlyBillingStats.value : getLatestJobStats('MONTHLY_BILLING'),
      error: monthlyBillingError.value,
      trigger: runMonthlyBillingAndRefresh
    },
    {
      key: 'HEYNABO_IMPORT',
      title: 'Heynabo Import',
      buttonLabel: 'Kør import',
      description: 'Synkroniser husstande og beboere fra Heynabo',
      schedule: systemJobs.heynaboImport.description,
      color: COLOR.ocean,
      headerBg: BG.ocean[50],
      icon: ICONS.users,
      // Wired up via users store
      isRunning: isImportHeynaboLoading.value,
      hasResult: hasHeynaboImportResult.value || hasHistoricalHeynaboImport,
      hasError: isImportHeynaboErrored.value,
      stats: hasHeynaboImportResult.value ? heynaboImportStats.value : getLatestJobStats('HEYNABO_IMPORT'),
      error: heynaboImportError.value,
      trigger: importHeynaboDataAndRefresh
    }
  ]
})
</script>

<template>
  <div data-testid="admin-system" class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <UIcon :name="ICONS.sync" :class="TYPOGRAPHY.sectionIconLight" />
      <h1 :class="TYPOGRAPHY.sectionSubheadingLight">Systemjobs</h1>
    </div>

    <!-- System Jobs - ActionCard grid -->
    <div :class="LAYOUTS.gridThreeCol">
      <UCard
        v-for="job in jobDefinitions"
        :key="job.key"
        :ui="{ root: 'h-full flex flex-col', body: 'flex-1 flex flex-col' }"
      >
        <!-- Colored header with icon -->
        <template #header>
          <div
            :class="[job.headerBg, 'rounded-t-lg -mx-4 -mt-4 px-4 py-6 md:py-8 flex flex-col items-center justify-center gap-2']"
          >
            <UIcon
              :name="job.icon"
              :class="['text-5xl md:text-6xl opacity-80', job.isRunning ? 'animate-spin' : '']"
            />
            <span :class="TYPOGRAPHY.bodyTextSmall">
              {{ job.schedule }}
            </span>
          </div>
        </template>

        <!-- Title -->
        <h3 :class="[TYPOGRAPHY.cardTitle, 'mb-2']">
          {{ job.title }}
        </h3>

        <!-- Description - fixed height area -->
        <p :class="[TYPOGRAPHY.bodyTextMuted, 'mb-4 min-h-[3rem]']">
          {{ job.description }}
        </p>

        <!-- Status / Stats - this area grows to fill available space -->
        <div class="flex-1">
          <div v-if="job.hasResult && job.stats.length > 0" class="space-y-1">
            <div
              v-for="(stat, index) in job.stats"
              :key="index"
              class="flex items-center gap-2"
            >
              <UIcon :name="stat.icon" class="text-sm text-success-500" />
              <span :class="TYPOGRAPHY.bodyTextSmall">{{ stat.text }}</span>
            </div>
          </div>

          <!-- Error state -->
          <UAlert
            v-else-if="job.hasError && job.error"
            :color="COLOR.error"
            variant="subtle"
            :icon="ICONS.exclamationCircle"
          >
            <template #title>Fejl</template>
            <template #description>{{ job.error.message }}</template>
          </UAlert>

          <!-- Skeleton placeholder for not-implemented jobs OR jobs that haven't run yet -->
          <div v-else class="space-y-2">
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded-full" />
              <USkeleton class="h-4 w-32" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded-full" />
              <USkeleton class="h-4 w-24" />
            </div>
          </div>
        </div>

        <!-- Footer with CTA button -->
        <template #footer>
          <UButton
            v-if="job.trigger"
            :color="job.color"
            :size="SIZES.standard"
            :trailing-icon="ICONS.arrowRight"
            :loading="job.isRunning"
            :disabled="job.isRunning || !isAdmin"
            :name="`trigger-${job.key.toLowerCase()}`"
            block
            @click="job.trigger"
          >
            {{ job.isRunning ? 'Kører...' : job.buttonLabel }}
          </UButton>
          <UButton
            v-else
            :color="job.color"
            :size="SIZES.standard"
            :trailing-icon="ICONS.arrowRight"
            disabled
            :name="`trigger-${job.key.toLowerCase()}`"
            block
          >
            {{ job.buttonLabel }}
          </UButton>
        </template>
      </UCard>
    </div>

    <!-- Job History Panel -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-clock" class="text-lg" />
          <span class="font-semibold">Jobhistorik</span>
        </div>
      </template>

      <UTable
        :data="jobHistoryRows"
        :columns="jobHistoryColumns"
        :loading="isJobHistoryLoading"
        :empty="jobHistoryEmpty"
        caption="Seneste jobkørsler"
        class="w-full"
      >
        <!-- Custom status cell with color and icon -->
        <template #status-cell="{ row }">
          <UBadge :color="row.original.statusColor" variant="subtle" class="gap-1">
            <UIcon :name="row.original.statusIcon" class="text-xs" />
            {{ row.original.statusLabel }}
          </UBadge>
        </template>
      </UTable>
    </UCard>

    <!-- System Settings - App Config Tree -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-adjustments-horizontal" class="text-lg" />
          <span class="font-semibold">Systemindstillinger</span>
        </div>
      </template>

      <UTree :items="configTreeItems" :default-expanded="['defaultSeason', 'cookingDeadlines', 'kitchen', 'billing']" />
    </UCard>
  </div>
</template>
