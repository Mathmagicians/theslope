# Workplan: Query Param Refactoring + Dinner Calendar Integration

## Key Decisions

**DRY Query Params:** Create generic `useQueryParam<T>` composable for ALL query param management
**Refactor Existing:** Migrate `mode` and `season` query params to use new composable
**New Feature:** Dinner date query param using same pattern
**URL Pattern:** `/dinner?date=15/01/2025` (query param using `formatDate`)
**Date Format:** Use existing `formatDate`/`parseDate` from `utils/date.ts` (dd/MM/yyyy)
**Index Page:** Keep `/dinner/index.vue` → redirects to default date (today or next dinner)
**Calendar:** MASTER view - click navigates to new URL
**Store:** Event store with ADR-007 compliance (useAsyncData, status computeds)

## Implementation Tasks

### Phase 1: Generic Query Param Composable (DRY Foundation)

#### 1.1 Core Composable (2-3 hours)
**Create:** `composables/useQueryParam.ts`

**API:**
```typescript
useQueryParam<T>(key: string, options: {
  serialize?: (value: T) => string
  deserialize?: (value: string) => T | null
  validate?: (value: T) => boolean
  normalize?: (value: T | null) => T
  defaultValue: T | (() => T)
  preserveOtherParams?: boolean
  replaceHistory?: boolean
})

Returns: {
  value: WritableComputedRef<T>  // Two-way binding
  setValue: (newValue: T) => Promise<void>
  needsSync: ComputedRef<boolean>  // For auto-sync guards
}
```

**Features:**
- Generic type parameter for type safety
- Reads from URL query on mount (SSR-safe)
- Updates URL when value changes
- Preserves other query params by default
- Supports validation and normalization
- Auto-sync detection for invalid states

**Test:** `tests/component/composables/useQueryParam.nuxt.spec.ts`
- Parametrized tests for string, Date, enum types
- Test serialization, deserialization, validation
- Test URL updates and preservation of other params
- Test normalize vs default fallback
- Test needsSync detection

### Phase 2: Refactor Existing Query Params

#### 2.1 Refactor FormMode (2 hours)
**Modify:** `composables/useEntityFormManager.ts`

**Before:**
```typescript
const formMode = ref<FormMode>(getInitialMode())
// Manual URL sync logic...
```

**After:**
```typescript
const formModeParam = useQueryParam<FormMode>('mode', {
  deserialize: (s) => Object.values(FORM_MODES).includes(s as FormMode) ? s as FormMode : null,
  validate: (v) => Object.values(FORM_MODES).includes(v),
  defaultValue: FORM_MODES.VIEW,
})

// Keep existing wrapper for business logic
const formMode = computed({
  get: () => formModeParam.value,
  set: (mode) => {
    onModeChange(mode)  // Business logic
    formModeParam.setValue(mode)  // URL update
  }
})
```

**Test:** Verify existing tests still pass (no breaking changes to API)

#### 2.2 Refactor Season Selector (2 hours)
**Modify:** `composables/useSeasonSelector.ts`

**Before:**
```typescript
const season = computed({
  get() { return safeSeason(route.query.season as string) },
  set(shortName) { await onSeasonChange(shortName) }
})
// Manual URL sync logic...
```

**After:**
```typescript
const seasonParam = useQueryParam<string>('season', {
  serialize: (s) => s,
  deserialize: (s) => s,
  validate: (s) => seasons.value.some(season => season.shortName === s),
  normalize: (invalid) => {
    // Normalize to selected or active season
    return getSelectedSeasonShortName() ?? getActiveSeasonShortName() ?? ''
  },
  defaultValue: () => getActiveSeasonShortName() ?? '',
})

// Keep existing wrapper for business logic
const season = computed({
  get: () => seasonParam.value,
  set: async (shortName) => {
    const seasonObject = seasons.value.find(s => s.shortName === shortName)
    if (seasonObject && seasonObject.id !== selectedSeasonId.value) {
      onSeasonSelect(seasonObject.id)
    }
    await seasonParam.setValue(shortName)
  }
})

// Auto-sync guard
watchPostEffect(() => {
  if (seasons.value.length === 0) return
  if (selectedSeasonId.value === null) return
  if (seasonParam.needsSync.value) {
    season.value = seasonParam.value
  }
})
```

**Test:** Verify existing tests still pass (no breaking changes to API)

### Phase 3: Dinner Date Feature (New)

#### 3.1 Dinner Date Navigation (1-2 hours)
**Create:** `composables/useDinnerDateNavigation.ts`

**Implementation:**
```typescript
export function useDinnerDateNavigation(options: {
  availableDates: ComputedRef<Date[]>
  onDateSelect: (date: Date) => void
}) {
  const { availableDates, onDateSelect } = options

  const dateParam = useQueryParam<Date>('date', {
    serialize: (date) => formatDate(date),  // "15/01/2025"
    deserialize: (str) => {
      const parsed = parseDate(str)
      return isValid(parsed) ? parsed : null
    },
    validate: (date) => availableDates.value.some(d => isSameDay(d, date)),
    defaultValue: () => new Date(),  // Today
    normalize: (invalid) => {
      // Find nearest available date (today or next dinner)
      const today = new Date()
      const todayDinner = availableDates.value.find(d => isSameDay(d, today))
      if (todayDinner) return today

      const upcoming = availableDates.value
        .filter(d => d > today)
        .sort((a, b) => a.getTime() - b.getTime())
      return upcoming[0] ?? today
    },
  })

  const selectedDate = computed({
    get: () => dateParam.value,
    set: async (date: Date) => {
      onDateSelect(date)
      await dateParam.setValue(date)
    }
  })

  // Auto-sync guard
  watchPostEffect(() => {
    if (availableDates.value.length === 0) return
    if (dateParam.needsSync.value) {
      selectedDate.value = dateParam.value
    }
  })

  return { selectedDate, needsSync: dateParam.needsSync }
}
```

**Test:** `tests/component/composables/useDinnerDateNavigation.nuxt.spec.ts`
- Test date serialization/deserialization
- Test normalization to nearest dinner (today vs next)
- Test integration with useQueryParam

#### 3.2 Event Store (2-3 hours)
**Implement:** `app/stores/event.ts` (ADR-007)
- `useAsyncData` with reactive date key
- Status computeds: `isLoading`, `isErrored`, `isInitialized`, `isEventStoreReady`
- Business logic: `findNextDinnerDate()`, `getDefaultDate()`
- Init: `initEventStore(dateString?)` - synchronous

**Data:**
- `selectedDate: Ref<Date | null>`
- `selectedDinnerEvent: Ref<DinnerEvent | null>`
- `dinnerOrders: Ref<Order[]>`

**Test:** `tests/component/stores/event.nuxt.spec.ts`
- Default date logic (today vs next)
- findNextDinnerDate
- Status computeds
- CRUD actions

#### 3.3 Calendar Enhancement (1 hour)
**Modify:** `app/components/calendar/CalendarDisplay.vue`
- Add prop: `selectedDate?: Date`
- Add emit: `dateSelected: [date: Date]`
- Add click handler for dinner dates
- Highlight selected date (ring-2)

**Test:** `tests/component/components/calendar/CalendarDisplay.nuxt.spec.ts`
- Click emits event
- Selected date highlighted
- Only dinner dates clickable

#### 3.4 Dinner Page (2 hours)
**Modify:** `app/pages/dinner/index.vue`

**Logic:**
```typescript
const route = useRoute()
const planStore = usePlanStore()
const eventStore = useEventStore()
const { dinnerEvents } = storeToRefs(planStore)

// Available dates for validation
const availableDates = computed(() => dinnerEvents.value.map(e => e.date))

// Date navigation with query param
const { selectedDate } = useDinnerDateNavigation({
  availableDates,
  onDateSelect: (date) => {
    eventStore.loadDinnerByDate(date)
  }
})

// Init stores
planStore.initPlanStore()
eventStore.initEventStore(route.query.date as string)
```

**UI Changes:**
- Remove mock data
- Connect to `selectedDinnerEvent`, `dinnerOrders` from store
- Add CalendarDisplay to master-detail layout
- Pass `selectedDate` prop to calendar
- Wire `@date-selected="selectedDate = $event"`

#### 3.5 Menu Navigation (30 min)
**Modify:** `app/components/PageHeader.vue`
- Add: `eventStore.findNextDinnerDate()`
- Update: Dinner link to `/dinner?date={formatDate(nextDate)}`

#### 3.6 E2E Tests (1-2 hours)
**Create:** `tests/e2e/ui/Dinner.e2e.spec.ts`

**Tests:**
- Navigate to `/dinner` → redirects to default date
- Today has dinner → shows today
- Today no dinner → shows next dinner
- Calendar click → navigates to new date
- Menu link → navigates to next dinner
- Invalid date → normalizes to valid date

**Cleanup:** Use factories for test data

## Files Summary

**Create:**
- `composables/useQueryParam.ts` ⭐ Core generic composable
- `composables/useDinnerDateNavigation.ts`
- `tests/component/composables/useQueryParam.nuxt.spec.ts`
- `tests/component/composables/useDinnerDateNavigation.nuxt.spec.ts`
- `tests/component/stores/event.nuxt.spec.ts`
- `tests/component/components/calendar/CalendarDisplay.nuxt.spec.ts`
- `tests/e2e/ui/Dinner.e2e.spec.ts`

**Modify (Refactor):**
- `composables/useEntityFormManager.ts` (use useQueryParam internally)
- `composables/useSeasonSelector.ts` (use useQueryParam internally)

**Modify (New Feature):**
- `app/stores/event.ts` (implement from empty)
- `app/pages/dinner/index.vue` (query param routing + store integration)
- `app/components/calendar/CalendarDisplay.vue` (add interaction)
- `app/components/PageHeader.vue` (dynamic dinner link)

**Update Docs:**
- `docs/adr.md` (add ADR for useQueryParam pattern)
- `docs/adr-compliance-frontend.md` (add /dinner route + event store)

## ADR Compliance

- ✅ ADR-001: Import from validation composables (`useDinnerEventValidation`)
- ✅ ADR-006: URL-based navigation (query param for date, mode, season)
- ✅ ADR-007: Event store with useAsyncData, status computeds, synchronous init
- ✅ ADR-010: Domain types (DinnerEvent, Order)
- ✅ NEW: Generic query param pattern (DRY)

## Estimated Timeline

**Phase 1: Core Composable (2-3 hours)**
- Implement useQueryParam + comprehensive tests

**Phase 2: Refactor Existing (4 hours)**
- Migrate mode query param (2 hours)
- Migrate season query param (2 hours)

**Phase 3: Dinner Feature (8-10 hours)**
- Navigation composable (1-2 hours)
- Event store (2-3 hours)
- Calendar enhancement (1 hour)
- Dinner page (2 hours)
- Menu navigation (30 min)
- E2E tests (1-2 hours)

**Total: 14-17 hours (2-3 days)**
- Core + Refactor: 6-7 hours (Day 1)
- Dinner feature: 8-10 hours (Day 2-3)

## Success Criteria

**Core Composable:**
- [ ] `useQueryParam` implemented with full test coverage
- [ ] Parametrized tests pass for all types (string, Date, enum)

**Refactored Existing:**
- [ ] Mode query param uses useQueryParam internally
- [ ] Season query param uses useQueryParam internally
- [ ] All existing tests still pass (no breaking changes)

**Dinner Feature:**
- [ ] `/dinner` redirects to default date
- [ ] Calendar highlights selected date
- [ ] Calendar click navigates URL
- [ ] Menu links to next dinner
- [ ] Store follows ADR-007 pattern
- [ ] Component tests green
- [ ] E2E tests green

**DRY Achievement:**
- [ ] Single source of truth for query param logic
- [ ] No duplicate URL sync code
- [ ] Consistent patterns across mode, season, date
