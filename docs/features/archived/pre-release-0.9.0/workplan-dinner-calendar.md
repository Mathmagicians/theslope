# Workplan: Query Param DRY Refactoring

Core composable and dinner feature complete. Remaining work: DRY refactoring to eliminate duplicate URL sync logic.

## What's Done

- `useQueryParam.ts` - Generic composable with serialize, deserialize, validate, normalize, syncWhen
- `useQueryParam.nuxt.spec.ts` - Parametrized tests for string, Date, enum types
- `/dinner` page with URL-based navigation (`?date=dd/MM/yyyy`)
- `DinnerCalendarDisplay.vue` with click-to-navigate and selectedDate prop
- E2E tests (5 scenarios: auto-sync, invalid date, valid date, no-dinner date, calendar click)

## Remaining Work

### Phase 2: DRY Refactoring (Technical Debt)

Migrate existing composables to use `useQueryParam` internally. Currently both have manual URL sync logic.

#### 2.1 Refactor useEntityFormManager

**Current:**
```typescript
const formMode = ref<FormMode>(getInitialMode())
// Manual URL sync logic with route.query...
```

**Target:**
```typescript
const formModeParam = useQueryParam<FormMode>('mode', {
  deserialize: (s) => Object.values(FORM_MODES).includes(s as FormMode) ? s as FormMode : null,
  validate: (v) => Object.values(FORM_MODES).includes(v),
  defaultValue: FORM_MODES.VIEW,
})
```

#### 2.2 Refactor useSeasonSelector

**Current:**
```typescript
const season = computed({
  get() { return safeSeason(route.query.season as string) },
  set(shortName) { await onSeasonChange(shortName) }
})
// Manual URL sync logic with route.query...
```

**Target:**
```typescript
const seasonParam = useQueryParam<string>('season', {
  validate: (s) => seasons.value.some(season => season.shortName === s),
  normalize: (invalid) => getSelectedSeasonShortName() ?? getActiveSeasonShortName() ?? '',
  defaultValue: () => getActiveSeasonShortName() ?? '',
})
```

### Success Criteria

- [ ] `useEntityFormManager` uses `useQueryParam` internally
- [ ] `useSeasonSelector` uses `useQueryParam` internally
- [ ] All existing tests pass (no breaking changes to API)
- [ ] Single source of truth for query param logic
