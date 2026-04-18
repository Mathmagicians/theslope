# Fix: Unified day/week/month arrow navigation

## Problem

`HouseholdBookings.vue` week/month forward arrow bounces back to "today" (e.g. week 16 → 17 → 18 → 19 → 16). Day view works only by luck of a separate code path.

## Root cause

`useBookingView.navigate()` uses raw `addDays(date, 7)` / `setMonth(+1)` for week/month. Result often lands on a non-dinner date. `useDinnerDateParam.validate` rejects → `useQueryParam` falls back to `defaultValue = getNextDinnerDate(dinnerDates)` → snaps to "next dinner from today" (i.e. week 16).

## Design — one algorithm for three views

Navigation = *"find the adjacent dinner event relative to a period boundary"*. Only the boundary differs per view.

| view | forward boundary | backward boundary |
|---|---|---|
| day | `endOfDay(date)` | `startOfDay(date)` |
| week | `endOfWeek(date)` (Mon-start) | `startOfWeek(date)` (Mon-start) |
| month | `endOfMonth(date)` | `startOfMonth(date)` |

Pipe boundary into `splitDinnerEvents(events, undefined, boundary)`:
- forward → `nextDinner ?? futureDinners[0] ?? null`
- back → `pastDinners.at(-1) ?? null`

`null` ⇒ arrow hidden (`hasPrev`/`hasNext = false`). Season clamping drops out — dinners outside the season aren't in `dinnerDates`.

`endOfDay`/`startOfDay` (not raw `date`) are required so today's dinner goes to `pastDinners` after its 19:00 end-time, instead of being returned as `nextDinner`.

## Separation of concerns

| Layer | File | Role |
|---|---|---|
| Pure date util | `app/utils/date.ts` | `getPeriodBoundary(date, view, direction)` — no config |
| Pure curried factory | `app/utils/season.ts` | `getAdjacentDinner(hour, minutes)(events, boundary, direction)` — delegates to `splitDinnerEvents` |
| Configured composable | `app/composables/useSeason.ts` | Pre-applies config, exposes `getAdjacentDinner` alongside existing `splitDinnerEvents` / `getNextDinnerDate` |
| Consumer | `app/composables/useBookingView.ts` | Collapses per-view `switch` into one `findAdjacent(direction)` helper; drops unused `seasonDates` option |

Matches existing pattern for `splitDinnerEvents` / `getNextDinnerDate`.

## Navigation surface (unchanged, all get the fix transparently)

| File | Role | Change |
|---|---|---|
| `app/components/calendar/CalendarDateNav.vue` | Renders `◀ · toggle · ▶`, pure props/emits | None |
| `app/components/booking/BookingGridView.vue` | Forwards `hasPrev`/`hasNext` → `CalendarDateNav` | None |
| `app/components/dinner/DinnerDetailHeader.vue` | Embeds `CalendarDateNav` for `/dinner` + `/chef` | None |
| `app/pages/dinner/index.vue`, `app/pages/chef/index.vue`, `app/components/household/HouseholdBookings.vue` | Consume `useBookingView` | None (day-view behavior identical post-fix) |

### Out of scope

- `BaseCalendar.vue` `restrictedPrevPage`/`restrictedNextPage` — UCalendar's internal month-grid pagination (which month is *displayed*), not period navigation (which dinner is *selected*).
- `/chef` `agenda`/`calendar` tab toggle — tab mode, not date navigation.

## Tests

### `tests/component/utils/date.unit.spec.ts` — new `describe('getPeriodBoundary')`
Parametrized over {day, week, month} × {−1, +1}. Separate cases for Monday-start week edges (Sunday, Monday inputs).

### `tests/component/utils/season.unit.spec.ts` — new `describe('getAdjacentDinner')`
Config applied explicitly in test (`getAdjacentDinner(18, 60)`). Covers:
- Adjacent pick for each view × direction (incl. week skipping empty intermediate week, month skipping empty month).
- `null` at first/last dinner + empty input list.
- Unsorted input sorted deterministically.
- Regression guard: `day +1` from a dinner day (Jan 15) with boundary = `endOfDay` returns Jan 20, not Jan 15 — asserts we haven't regressed to raw `date` as boundary.

### `tests/component/composables/useBookingView.nuxt.spec.ts` — rewrite
Delete `describe('navigate()')`, `describe('hasPrev / hasNext')`, `describe('Season Bounds Clamping')`. Replace with one parametrized matrix {day, week, month} × {−1, +1} covering: normal step, empty-period skip (week & month), first/last no-op, and a "no `dinnerDates` → no-op" case. `hasPrev`/`hasNext` asserted from same matrix via `expected !== null`.

Keep untouched: `BookingViewSchema`, `dateRange`, `weeks`, `useDinnerDateParam` tests.

### `tests/e2e/ui/household.e2e.spec.ts` — new `test.describe('HouseholdBookings arrow navigation')`
Uses household + season from existing `beforeAll`:
1. Week + month forward arrow changes URL `?date=` (parametrized).
2. Week + month back arrow returns to earlier period (parametrized).
3. Forward arrow hidden at last dinner of season (loop-click-until-hidden, capped at 12).

Selectors: `data-testid="date-nav-next"` / `date-nav-prev` (already in `CalendarDateNav.vue`).

## Compliance

- `docs/adr-compliance-frontend.md` — upgrade `HouseholdBookings.vue` test status; note `getAdjacentDinner` on `useSeason()` row.
- No ADR additions. No backend changes.

## Verification

```bash
npx vitest run tests/component/utils/date.unit.spec.ts
npx vitest run tests/component/utils/season.unit.spec.ts
npx vitest run tests/component/composables/useBookingView.nuxt.spec.ts
TZ=UTC npx vitest run tests/component/utils/season.unit.spec.ts
npm run lint && npx tsc --noEmit
npx playwright test tests/e2e/ui/household.e2e.spec.ts --workers=4
```

## Risk / rollback

Isolated to `useBookingView.ts` + two pure utilities + one composable export. No API/schema/store changes. Rollback = revert PR.
