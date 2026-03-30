# Fix: Month/week navigation uses splitDinnerEvents

## Overview

Month view forward arrow fails (March → April). `navigate()` uses raw `setMonth()` preserving day-of-month — if target day isn't a cooking day, `useDinnerDateParam` validate rejects it. Week view has same latent bug with `addDays(date, 7)`.

**Fix:** Use `splitDinnerEvents` from `useSeason()` to split dinner events at the period boundary and pick from the correct bucket. Same utility already used by chef, dinner, bookings store, and calendar displays.

## Code Changes

### `app/composables/useBookingView.ts`

```ts
const {splitDinnerEvents} = useSeason()

const getPeriodBoundary = (date: Date, viewType: BookingView, direction: 1 | -1): Date => {
    switch (viewType) {
        case 'day': return date
        case 'week': return direction === 1 ? endOfWeek(date, {weekStartsOn: 1}) : startOfWeek(date, {weekStartsOn: 1})
        case 'month': return direction === 1 ? endOfMonth(date) : startOfMonth(date)
    }
}

const findAdjacentDinner = (dinnerDates: Date[], boundary: Date, direction: 1 | -1): Date | null => {
    if (dinnerDates.length === 0) return null
    const events = dinnerDates.map(d => ({date: d}))
    const {pastDinners, nextDinner, futureDinners} = splitDinnerEvents(events, undefined, boundary)
    return direction === 1
        ? nextDinner?.date ?? futureDinners[0]?.date ?? null
        : pastDinners.at(-1)?.date ?? null
}

const canNavigate = (direction: 1 | -1): boolean => {
    const dinnerDates = options?.dinnerDates?.() ?? []
    return findAdjacentDinner(dinnerDates, getPeriodBoundary(selectedDate.value, view.value, direction), direction) !== null
}

const navigate = async (direction: 1 | -1) => {
    const dinnerDates = options?.dinnerDates?.() ?? []
    const newDate = findAdjacentDinner(dinnerDates, getPeriodBoundary(selectedDate.value, view.value, direction), direction)
    if (newDate) await setDate(newDate)
}
```

Eliminates raw `setMonth()`, `addDays(date, 7)`, inline sort+index arithmetic, season bounds clamping, and separate logic per view.

## Unit Tests

### `tests/component/composables/useBookingView.nuxt.spec.ts`

```ts
describe('navigate() with splitDinnerEvents', () => {
    const dinnerDates = [
        new Date('2025-01-13'), new Date('2025-01-15'), // Jan, week 3
        new Date('2025-01-20'),                          // Jan, week 4
        new Date('2025-02-03'), new Date('2025-02-05'), // Feb
        new Date('2025-03-03'),                          // Mar
    ]

    it.each([
        {view: 'month', date: '2025-01-15', dir: 1, expected: '2025-02-03'},
        {view: 'month', date: '2025-02-05', dir: -1, expected: '2025-01-20'},
        {view: 'week', date: '2025-01-15', dir: 1, expected: '2025-01-20'},
        {view: 'week', date: '2025-01-20', dir: -1, expected: '2025-01-15'},
        {view: 'day', date: '2025-01-13', dir: 1, expected: '2025-01-15'},
        {view: 'day', date: '2025-01-15', dir: -1, expected: '2025-01-13'},
    ])('$view $dir from $date → $expected', ...)

    it.each([
        {view: 'month', date: '2025-03-03', dir: 1},
        {view: 'month', date: '2025-01-13', dir: -1},
        {view: 'week', date: '2025-03-03', dir: 1},
    ])('does not navigate at boundary: $view $dir from $date', ...)

    it.each([
        {view: 'month', date: '2025-01-15', dir: 1, expected: true},
        {view: 'month', date: '2025-03-03', dir: 1, expected: false},
        {view: 'month', date: '2025-01-13', dir: -1, expected: false},
    ])('canNavigate $view $dir from $date = $expected', ...)
})
```

## E2E Tests

### `tests/e2e/ui/household.e2e.spec.ts`

```ts
test.describe('Booking view month navigation', () => {
    // Uses existing household + active season from beforeAll

    test('Forward arrow navigates to next month', async ({page}) => {
        await page.goto(buildUrl('bookings', 'view=month'))
        await waitForTabVisible(page, tabs[0]!)
        const nextButton = page.getByTestId('calendar-nav-next')
        await nextButton.click()
        // Verify date changed to next month
    })

    test('Backward arrow navigates to previous month', async ({page}) => {
        // Navigate to month 2, then go back to month 1
    })
})
```

## Verification

```bash
npx vitest run tests/component/composables/useBookingView.nuxt.spec.ts --reporter=verbose
npm run lint && npm run typecheck
npx playwright test tests/e2e/ui/household.e2e.spec.ts --reporter=line
```
