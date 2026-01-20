<script setup lang="ts" generic="E, T = unknown">
/**
 * CostEntry - Smart container for grouped economy items
 *
 * Unified component for both HouseholdEconomy and AdminEconomy.
 * Uses accessor pattern for flexible data shapes (like EconomyTable).
 *
 * Provides:
 * - Configurable stat header with icon/value/label boxes
 * - Level-based theming (ocean/peach palettes)
 * - Control sum badge integration
 * - Flexible content via default slot
 *
 * @example Basic usage (CostEntry<T> data)
 * <CostEntry
 *     :entry="dinnerGroup"
 *     :title-accessor="e => `${formatDate(e.date)} - ${e.menuTitle}`"
 *     :items-accessor="e => e.items"
 * >
 *   <template #default="{ items }">
 *     <CostLine v-for="item in items" :item="item"/>
 *   </template>
 * </CostEntry>
 *
 * @example With stat header (billing period)
 * <CostEntry
 *     :entry="periodEntry"
 *     :level="1"
 *     :title-accessor="e => e.isClosed ? 'PBS Faktura' : 'Aktuel periode'"
 *     :subtitle-accessor="e => e.billingPeriod"
 *     :stats-accessor="e => buildPeriodStats(e)"
 *     :control-sum-accessor="e => ({ computed: e.transactionSum, expected: e.totalAmount })"
 *     :items-accessor="e => e.groups"
 * >
 *   <template #default="{ items }">
 *     <UTable :data="items"/>
 *   </template>
 * </CostEntry>
 */

/**
 * Stat box configuration for header display
 */
export interface StatBox {
    icon: string
    value: string | number
    label: string
}

/**
 * Control sum for verification badge
 */
export interface ControlSum {
    computed: number
    expected: number
}

interface Props {
    /** Entry data (any shape - use accessors to extract values) */
    entry: E
    /** Theme level: 1 = ocean (primary), 2 = peach (secondary) */
    level?: 1 | 2
    /** Extract title from entry */
    titleAccessor?: (entry: E) => string
    /** Extract subtitle from entry */
    subtitleAccessor?: (entry: E) => string
    /** Extract stats from entry */
    statsAccessor?: (entry: E) => StatBox[]
    /** Extract control sum from entry */
    controlSumAccessor?: (entry: E) => ControlSum | undefined
    /** Extract items for slot (default: entry.items if exists) */
    itemsAccessor?: (entry: E) => T[]
    /** Show stat header (default: true when statsAccessor provided) */
    showHeader?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    level: 1,
    titleAccessor: undefined,
    subtitleAccessor: undefined,
    statsAccessor: undefined,
    controlSumAccessor: undefined,
    itemsAccessor: undefined,
    showHeader: undefined  // Auto-detect from statsAccessor
})

const {TYPOGRAPHY, COMPONENTS} = useTheSlopeDesignSystem()

// Auto-show header when statsAccessor is provided
const shouldShowHeader = computed(() =>
    props.showHeader ?? (props.statsAccessor !== undefined)
)

// Level-based theming classes
const headerClass = computed(() =>
    props.level === 2
        ? COMPONENTS.economyTable.level2.header
        : COMPONENTS.economyTable.level1.header
)

const statBoxClass = computed(() =>
    props.level === 2
        ? COMPONENTS.economyTable.level2.statBox
        : COMPONENTS.economyTable.level1.statBox
)

const iconClass = computed(() =>
    props.level === 2
        ? COMPONENTS.economyTable.level2.icon
        : COMPONENTS.economyTable.level1.icon
)

const borderClass = computed(() =>
    props.level === 2
        ? COMPONENTS.economyTable.level2.border
        : COMPONENTS.economyTable.level1.border
)

const footerClass = computed(() =>
    props.level === 2
        ? COMPONENTS.economyTable.level2.footer
        : COMPONENTS.economyTable.level1.footer
)

// Extract values via accessors
const displayTitle = computed(() =>
    props.titleAccessor?.(props.entry) ?? ''
)

const displaySubtitle = computed(() =>
    props.subtitleAccessor?.(props.entry)
)

const displayStats = computed((): StatBox[] =>
    props.statsAccessor?.(props.entry) ?? []
)

const displayControlSum = computed(() =>
    props.controlSumAccessor?.(props.entry)
)

// Extract items for slot (fallback to entry.items if exists)
const displayItems = computed((): T[] => {
    if (props.itemsAccessor) return props.itemsAccessor(props.entry)
    // Fallback: try entry.items if it exists
    const entryWithItems = props.entry as {items?: T[]}
    return entryWithItems.items ?? []
})
</script>

<template>
  <div :class="['rounded-lg overflow-hidden border', borderClass]">
    <!-- Stat header -->
    <div
        v-if="shouldShowHeader"
        :class="['flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4', headerClass]"
    >
      <!-- Title/subtitle -->
      <div class="md:mr-8">
        <h4 :class="TYPOGRAPHY.cardTitle">{{ displayTitle }}</h4>
        <p v-if="displaySubtitle" :class="TYPOGRAPHY.bodyTextMuted">{{ displaySubtitle }}</p>
      </div>

      <!-- Stat boxes + control badge -->
      <div class="flex flex-wrap gap-2">
        <div
            v-for="(stat, index) in displayStats"
            :key="index"
            :class="['flex items-center gap-2 px-3 py-2', statBoxClass]"
        >
          <UIcon :name="stat.icon" :class="iconClass"/>
          <div class="text-center">
            <p class="font-semibold">{{ stat.value }}</p>
            <p class="text-xs text-muted">{{ stat.label }}</p>
          </div>
        </div>
        <!-- Control sum badge -->
        <div v-if="displayControlSum" class="flex items-center px-3 py-2">
          <ControlBadge :computed="displayControlSum.computed" :expected="displayControlSum.expected"/>
        </div>
      </div>
    </div>

    <!-- Simple header fallback (title only, no stats) -->
    <div
        v-else-if="displayTitle"
        :class="['flex justify-between items-center p-4', headerClass]"
    >
      <div>
        <span :class="TYPOGRAPHY.bodyTextMedium">{{ displayTitle }}</span>
        <span v-if="displaySubtitle" :class="TYPOGRAPHY.bodyTextMuted"> · {{ displaySubtitle }}</span>
      </div>
    </div>

    <!-- Content slot (parent renders items or nested table) -->
    <div class="divide-y divide-default">
      <slot :items="displayItems" :entry="entry"/>
    </div>

    <!-- Empty state -->
    <UAlert
        v-if="displayItems.length === 0"
        :icon="ICONS.robotHappy"
        color="neutral"
        variant="subtle"
        title="Tomt her!"
        description="Ingen transaktioner i denne periode."
        class="m-4"
    />

    <!-- Footer bar (subtle color accent to match header) -->
    <div v-if="displayItems.length > 0" :class="['h-1.5', footerClass]"/>
  </div>
</template>
