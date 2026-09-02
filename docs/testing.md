# Testing Guide

## Test Types

| Type | Pattern | Framework | Data Source |
|------|---------|-----------|-------------|
| Unit | `*.unit.spec.ts` | Vitest | Parametrization |
| Component | `*.nuxt.spec.ts` | Nuxt Test Utils | Parametrization / factories |
| E2E | `*.e2e.spec.ts` | Playwright | **Factories REQUIRED** |
| Smoke | `@smoke` tag in title | Playwright | Post-deployment verification |

## Smoke Tests

Smoke tests run after CI/CD deployment to verify the deployed environment works.

**Tag a test:** Add `@smoke` to the test title:
```typescript
test('@smoke / has title', async ({page}) => { ... })
```

**Run locally:**
```bash
npm run test:e2e:smoke
```

**CI/CD:** Runs automatically after deployment using GitHub Environment credentials (`dev` or `prod`).

## NON-NEGOTIABLE RULES

### Rule 1: Tests MUST Be DRY

**STOP** before writing ANY test code and ask:
- Am I copying code from another test? → **EXTRACT to helper/factory**
- Am I writing similar test cases? → **USE `describe.each()` / `it.each()`**
- Am I constructing test data manually? → **USE FACTORY**

```typescript
// ❌ REJECTED: Manual data construction
const inhabitant = { id: 1, name: 'Anna', lastName: 'Hansen' }

// ✅ REQUIRED: Factory usage
const inhabitant = { ...HouseholdFactory.defaultInhabitantData('test-salt'), id: 1 }
```

```typescript
// ❌ REJECTED: Repeated test cases
it('validates ADULT ticket', () => { ... })
it('validates CHILD ticket', () => { ... })
it('validates BABY ticket', () => { ... })

// ✅ REQUIRED: Parametrized tests
describe.each(['ADULT', 'CHILD', 'BABY'])('validates %s ticket', (ticketType) => { ... })
```

### Rule 2: E2E Tests MUST Use Factories

**Location:** `/tests/e2e/testDataFactories/`

```typescript
// ❌ REJECTED: Direct API calls or manual data
const response = await context.request.put('/api/admin/season', { data: { ... } })

// ✅ REQUIRED: Factory methods
const season = await SeasonFactory.createSeason(context, SeasonFactory.defaultSeason(testSalt))
```

**Factory methods:**
- `EntityFactory.defaultEntity(testSalt)` - Create unique test data
- `EntityFactory.createEntity(context, data)` - HTTP create with assertion
- `EntityFactory.deleteEntity(context, id)` - Cleanup
- `EntityFactory.getEntity(context, id)` - Fetch for verification

### Rule 3: E2E Tests MUST Be Parallel-Safe

```typescript
// ❌ REJECTED: Hardcoded identifiers
const season = { shortName: 'Season-2025' }  // Will conflict in parallel

// ✅ REQUIRED: Salted unique data
const testSalt = Date.now().toString()
const season = SeasonFactory.defaultSeason(testSalt)  // Season-2025-1733650000000
```

**ALWAYS verify:** `npx playwright test path/to/test.e2e.spec.ts --workers=4`

### Rule 4: Extract Repeated Patterns

**Locations:** `/tests/e2e/testHelpers.ts` (Playwright) and `/tests/component/testHelpers.ts` (Vitest)

If you write the same pattern twice → **EXTRACT IT**

```typescript
// ❌ REJECTED: Repeated dropdown selection
await page.getByTestId('season-selector').click()
await page.getByRole('option', { name: seasonName }).first().click()

// ✅ REQUIRED: Use helper
await testHelpers.selectDropdownOption(page, 'season-selector', seasonName)
```

### Rule 5: No console.log in Tests

```typescript
// ❌ REJECTED
console.log('result:', result)

// ✅ REQUIRED
expect(result).toBe(expectedValue)
```

### Rule 6: Component Tests Test REAL Code

**Guiding principle:** a component test exercises the real component tree, the real composables and the real stores. The only thing faked is what the test environment cannot provide - and in practice that is HTTP.

A mock proves nothing about the code it replaces. When a spec renders a hand-written `UserListItem` stand-in, it keeps passing after the real `UserListItem` renames its `#badge` slot - while the page breaks. Every mocked house component is a second copy of a contract, maintained by hand, that the suite has silently stopped checking.

| Layer | In component tests | How |
|-------|--------------------|-----|
| Component under test and its children | **REAL** | Render them. Supply the context they need: `mountWithTooltipProvider()` for anything containing `UTooltip` |
| Composables, validation schemas, utils | **REAL** | Nothing to do |
| Pinia stores | **REAL** | `setActivePinia(createPinia())` + `clearNuxtData()` in `beforeEach`; the store fetches from the registered endpoints |
| HTTP | **FAKE** | `registerEndpoint()` per route - specific FIRST, generic LAST |
| Nuxt runtime the test drives (`useRoute`, `navigateTo`) | FAKE when the test steers it | `mockNuxtImport()` |
| Browser-only or third-party APIs the environment lacks | FAKE, with a reason | `mockNuxtImport()` + a comment naming the gap |

```typescript
// ❌ REJECTED: mocking a house component to dodge a provider
mockComponent('UserListItem', {setup: () => () => h('div')})

// ❌ REJECTED: mocking a store to dodge its fetch
mockNuxtImport('useUsersStore', () => () => ({allergyManagers: ref([])}))

// ✅ REQUIRED: real component, real store, faked HTTP
registerEndpoint('/api/admin/users/by-role/ALLERGYMANAGER', () => [])
const wrapper = await mountWithTooltipProvider(AdminAllergies, {props: {canEdit: true}, isMd: false})
```

**Every remaining mock needs a comment naming what the environment cannot provide.** "To avoid tooltip issues" is not a reason - it is a missing helper. Specs that still mock stores or house components are debt: migrate them when you touch them.

## Anti-Patterns Quick Reference

| Anti-Pattern | Correct Approach |
|--------------|------------------|
| Manual object construction | Factory `defaultEntity(testSalt)` |
| Copy-paste test cases | `describe.each()` / `it.each()` |
| Hardcoded test identifiers | `testSalt` parameter |
| Repeated setup code | `beforeEach` or helper |
| Direct `$fetch` in E2E tests | Factory methods |
| `console.log()` | `expect()` assertions |
| `page.waitForTimeout()` | `pollUntil()` or `waitForResponse()` |
| `name` or `data-test-id` on buttons | `data-testid` + `getByTestId()` |
| `<button type="submit">` in `UForm` tests | `formRef?.submit()` + `flushPromises()` (see [Testing UForm Submission](#testing-uform-submission)) |
| Hardcoded formatted values (`'15/05/2026'`) | Call the same utility the component uses (`formatDate(date)`) |
| `z.coerce.date()` in form schemas | `z.date()` — strict rejects `null` (coerce turns `null` into 1970-01-01) |
| `mockComponent()` of a house component | Render it - supply its context (`mountWithTooltipProvider()`) and register its endpoints (Rule 6) |
| `mockNuxtImport('useXStore', …)` in a component test | Real store + `registerEndpoint()` - fake the HTTP, not the code (Rule 6) |

---

## Test Helper Utilities

**Location:** `/tests/e2e/testHelpers.ts`

```typescript
import testHelpers from '../testHelpers'
const { validatedBrowserContext, pollUntil, selectDropdownOption } = testHelpers
```

### `validatedBrowserContext(browser)`

Authenticated browser context for API requests.

```typescript
const context = await validatedBrowserContext(browser)
const season = await SeasonFactory.createSeason(context)
```

### `pollUntil(fetchFn, condition, maxAttempts?, initialDelay?)`

Polling with exponential backoff. Preferred over `page.waitForTimeout()`.

```typescript
const teams = await pollUntil(
  () => SeasonFactory.getCookingTeamsForSeason(context, seasonId),
  (teams) => teams.length === 3
)
```

### `selectDropdownOption(page, dropdownTestId, optionName)`

Handles Linux strict mode violations with dropdowns.

```typescript
await selectDropdownOption(page, 'season-selector', 'TestSeason-123')
```

### `doScreenshot(page, name, isDocumentation?)`

Debug or documentation screenshots.

```typescript
await doScreenshot(page, 'dropdown-timeout')  // Debug: test-results/
await doScreenshot(page, 'admin/page', true)  // Docs: docs/screenshots/
```

### Component helpers: `/tests/component/testHelpers.ts`

```typescript
import {mountWithTooltipProvider, findByTestId, findAllByTestId, clickByTestId, pollFor} from '~~/tests/component/testHelpers'
```

| Helper | Use |
|--------|-----|
| `mountWithTooltipProvider(Component, {props?, isMd?})` | `mountSuspended` under reka-ui's `TooltipProvider` (the context `UApp` supplies in the app). Returns the component's own wrapper, so `find`, `text`, `emitted` and `props` read the component, not the shell. `isMd` provides the layout breakpoint ref |
| `withTooltipProvider(Component, props)` | The bare wrapper definition, for the rare spec that needs the root wrapper |
| `findByTestId(wrapper, id)` / `findAllByTestId(wrapper, id)` | `data-testid` lookups - never hand-build the selector string |
| `clickByTestId(wrapper, id)` | Click + `await nextTick()` |
| `pollFor(condition, maxAttempts?)` | Poll a predicate across ticks (store readiness) |

Shared `data-testid` contracts live next to the specs that share them, e.g. `tests/component/components/allergy/allergyTestIds.ts`.

---

## Component Testing (Nuxt UI v4+)

### Render Real Components

Rule 6 in practice: mount the component with its real children and let the store fetch from registered endpoints.

```typescript
registerEndpoint('/api/admin/allergy-type', () => AllergyFactory.createMockAllergyTypesWithInhabitants())
registerEndpoint('/api/admin/users/by-role/ALLERGYMANAGER', () => [])

const mountAdmin = async (props = {}, isMd = false) => {
    await useAllergiesStore().loadAllergyTypes()
    const wrapper = await mountWithTooltipProvider(AdminAllergies, {props: {canEdit: true, ...props}, isMd})
    await flushPromises()
    await nextTick()
    return wrapper
}
```

`isMd` provides the layout's breakpoint ref, so one spec runs its cases on both viewports with `describe.each`.

### Finding Elements

```typescript
// ✅ DO: data-testid via the shared helpers
const button = findByTestId(wrapper, 'submit-button')
await clickByTestId(wrapper, 'submit-button')  // click + nextTick

// ❌ DON'T: Component wrappers (events don't emit)
const button = wrapper.findAllComponents({ name: 'UButton' })[0]
await button.trigger('click')  // No events!
```

### Async Updates

```typescript
await button.trigger('click')
await nextTick()  // Always wait for Vue reactivity (clickByTestId does both)
```

### Event Emissions

```typescript
// ✅ Check parent wrapper
const emitted = wrapper.emitted('update:modelValue')

// ❌ Don't check child component
const emitted = button.emitted('update:modelValue')  // Always undefined
```

`mountWithTooltipProvider()` returns the component's own wrapper, so `wrapper.emitted()` reads the component even though a provider sits above it.

### Working Pattern

```typescript
const TEST_IDS = {
    addButton: 'holiday-range-add',
    removeButton: (index: number) => `holiday-range-remove-${index}`
} as const

await clickByTestId(wrapper, TEST_IDS.addButton)
await clickByTestId(wrapper, TEST_IDS.removeButton(0))
```

### Testing `UForm` Submission

**The Problem:** In happy-dom, `trigger('click')` on a `<button type="submit">` inside a `<form>` does NOT reliably fire the form's `@submit` handler. Validation-gated emits appear to silently drop.

**The Solution — NuxtUI `useTemplateRef` pattern:**

Component wires the button outside the implicit form-submit flow and calls the form's `submit()` method via ref. This is the [NuxtUI-documented pattern](https://ui.nuxt.com/components/form#methods) for buttons outside `<form>` scope (modal footers, UCard `#footer`, etc.) — and it happens to be test-friendly.

```vue
<script setup lang="ts">
import type {Form, FormSubmitEvent} from '@nuxt/ui'

const formRef = useTemplateRef<Form<MyFormData>>('formRef')

const handleSubmit = (event: FormSubmitEvent<MyFormData>) => {
    emit('save', event.data)
}
</script>

<template>
    <UForm ref="formRef" :state="formState" :schema="MyFormSchema" @submit="handleSubmit">
        <!-- fields -->
        <template #footer>
            <UButton
                v-bind="BUTTONS.save"
                data-testid="my-form-submit"
                @click="formRef?.submit()"
            >
                Gem
            </UButton>
        </template>
    </UForm>
</template>
```

**Test pattern — click the button, flush promises:**

```typescript
import {flushPromises} from '@vue/test-utils'

const clickSubmit = async (wrapper: Awaited<ReturnType<typeof mount>>) => {
    const submitBtn = wrapper.findAll('button').find(b => b.text().includes('Gem'))
    await submitBtn!.trigger('click')
    // UForm.submit() validates schema + contextual rules asynchronously
    await flushPromises()
    await nextTick()
}

it('emits save with valid data', async () => {
    const wrapper = await mount()
    // ...fill fields...
    await clickSubmit(wrapper)
    expect(wrapper.emitted('save')).toBeTruthy()
})

it('does not emit save when validation fails', async () => {
    const wrapper = await mount()
    // ...fill only some fields or violate contextual rules...
    await clickSubmit(wrapper)
    expect(wrapper.emitted('save')).toBeFalsy()
})
```

**Key rules:**

1. **Always use `ref="formRef"` on `UForm`** + `@click="formRef?.submit()"` on the submit button. Do NOT rely on `type="submit"` — it works in production but is flaky in tests.
2. **Always `await flushPromises()` then `await nextTick()`** after click. Schema + `:validate` function both run async; the emit happens after they resolve.
3. **Never hardcode formatted values.** Use the same utility the component uses (e.g. `formatDate()` from `~/utils/date`) so the assertion stays correct if the format changes.
4. **Dates in form state should be strict `z.date()` in form schemas** — not `z.coerce.date()`. Coercion silently accepts `null` as 1970-01-01 and fails your "missing date blocks submit" tests.

**Reference implementation:** `tests/component/components/admin/HouseholdCreateForm.nuxt.spec.ts`

---

## Composable Testing

### Mock Nuxt Auto-imports

```typescript
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const { mockNavigateTo, mockRouteData } = vi.hoisted(() => ({
  mockNavigateTo: vi.fn(),
  mockRouteData: { path: '/tab1', params: { tab: 'tab1' }, query: {}, hash: '' }
}))

mockNuxtImport('navigateTo', () => mockNavigateTo)
mockNuxtImport('useRoute', () => () => mockRouteData)
```

### Mutate Mock Data Between Tests

```typescript
const setupRoute = (params: Record<string, string | undefined>) => {
  Object.keys(mockRouteData.params).forEach(key => delete mockRouteData.params[key])
  Object.assign(mockRouteData.params, params)
}
```

---

## Store Testing (Pinia)

### Clear Cache Between Tests

```typescript
import { clearNuxtData } from '#app'

beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    clearNuxtData()  // Prevent useFetch cache pollution
})
```

### Mock Endpoint Order

```typescript
// ✅ Specific FIRST, generic LAST
registerEndpoint('/api/admin/season/1', { handler: () => mockObject })
registerEndpoint('/api/admin/season', { handler: () => [] })

// ❌ Generic catches specific!
registerEndpoint('/api/admin/season', { handler: () => [] })
registerEndpoint('/api/admin/season/1', { handler: () => mockObject })  // Never reached
```

---

## E2E Testing (Playwright)

### Strategy: Setup → Interact → Verify

```typescript
test('GIVEN create mode WHEN submit THEN created', async ({ page, browser }) => {
  const context = await validatedBrowserContext(browser)
  const testSalt = Date.now().toString()

  // GIVEN: Setup via factory (fast)
  // WHEN: Interact via UI
  await page.goto('/admin/planning?mode=create')
  await page.locator('input[name="start"]').fill('01/01/2025')
  await page.getByTestId('submit-season').click()

  // THEN: Verify via API (reliable)
  const seasons = await SeasonFactory.getSeasons(context)
  expect(seasons.find(s => s.shortName.includes(testSalt))).toBeDefined()
})
```

### Selectors

```typescript
// Buttons and interactive elements - use getByTestId
await page.getByTestId('season-selector').click()
await page.getByTestId('submit-season').click()

// Form inputs - name attribute works (native HTML)
await page.locator('input[name="start"]').fill('01/01/2025')
```

### Waiting Patterns

```typescript
// ✅ Wait for API BEFORE navigation
const responsePromise = page.waitForResponse(
    (r) => r.url().match(/\/api\/admin\/season\/\d+$/),
    { timeout: 10000 }
)
await page.goto('/admin/planning')
const response = await responsePromise
expect(response.status()).toBe(200)

// ✅ Wait for loader to disappear
await pollUntil(
    async () => await page.locator('text=Loading').isVisible(),
    (isVisible) => !isVisible
)

// ✅ Wait for hydration before the first click/fill after page.goto
// SSR markup is visible (isVisible passes) seconds before Vue attaches listeners in dev mode;
// an early click is silently lost. Polls `useNuxtApp().isHydrating === false`.
await page.goto('/admin/households')
await waitForHydration(page)

// ❌ AVOID
await page.waitForLoadState('networkidle')  // Flaky
await page.waitForTimeout(1000)  // Arbitrary
```

### Cleanup

```typescript
let createdIds: number[] = []

test.afterAll(async ({ browser }) => {
    const context = await validatedBrowserContext(browser)
    await SeasonFactory.cleanupSeasons(context, createdIds)
})
```

### Serial Tests

Some E2E tests must run serially due to shared state. Two categories:

| Category | Location | Reason |
|----------|----------|--------|
| **API Serial** | `tests/e2e/api/serial/` | Process ALL entities (scaffold, maintenance) |
| **UI Serial** | `tests/e2e/ui/serial/` | Need independent ACTIVE season |

**Project dependency:** Playwright config sets serial projects to depend on parallel projects, ensuring isolation.

**Running serial tests:**

```bash
# Full suite (parallel first, then serial) - DEFAULT
npm run test:e2e:api

# Serial tests only (skip parallel dependency)
npm run test:e2e:api:seq

# Single test independently (bypass all dependencies)
npx playwright test tests/e2e/api/serial/admin/scaffold-prebookings.e2e.spec.ts --no-deps --reporter=line
npx playwright test tests/e2e/ui/serial/HouseholdScaffolding.e2e.spec.ts --project=chromium-ui-serial --no-deps --reporter=line
```

**Key:** Use `--no-deps` flag to run serial tests without waiting for parallel tests.

---

## Testing Time-Sensitive Behavior (Deadlines)

### The Problem

Business logic often depends on deadlines (e.g., "can only cancel 2 days before dinner"). Tests must:
1. Use the **same deadline logic** as the application
2. Create predictable test data that guarantees specific deadline scenarios
3. Not rely on UI defaults (which may use singleton season with different config)

### Strategy: Control the Season, Control the Deadline

**Serial tests create their own season** with specific deadline configuration:

```typescript
// Season config for predictable deadline scenarios:
// - ALL days cooking (Mon-Sun) → predictable event count regardless of day-of-week
// - 2-day deadline → tomorrow is ALWAYS after deadline
// - 10-day duration → guarantees both before/after deadline events exist
const allDaysCooking = createBooleanWeekdayMap([true, true, true, true, true, true, true])

const tomorrow = new Date()
tomorrow.setDate(tomorrow.getDate() + 1)
tomorrow.setHours(0, 0, 0, 0)

const tenDaysFromTomorrow = new Date(tomorrow)
tenDaysFromTomorrow.setDate(tenDaysFromTomorrow.getDate() + 10)

testSeason = await SeasonFactory.createSeasonWithDinnerEvents(adminContext, testSalt, {
    cookingDays: allDaysCooking,
    seasonDates: {start: tomorrow, end: tenDaysFromTomorrow},
    ticketIsCancellableDaysBefore: 2  // Key: short deadline
})

// MUST activate the test season (only one season can be active)
await SeasonFactory.activateSeason(adminContext, testSeason.season.id!)
```

**Result with 2-day deadline:**
- Events 3+ days away → **BEFORE deadline** (can CREATE, DELETE)
- Events 1-2 days away → **AFTER deadline** (can only RELEASE, CLAIM)

### Use Application's Deadline Logic

**CRITICAL:** Tests MUST use the same deadline calculation as the application.

```typescript
// ❌ WRONG: Custom calculation that differs from application
const daysAway = Math.ceil((de.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
const isAfterDeadline = daysAway <= deadline

// ✅ CORRECT: Use application's pure utility functions
import {isBeforeDeadline, getDinnerTimeRange} from '~/utils/season'

// Hardcoded from app.config.ts (Nuxt auto-imports not available in Playwright)
const DEFAULT_DINNER_START_HOUR = 18

const canModifyOrders = (dinnerEventDate: Date): boolean => {
    const dinnerStartTime = getDinnerTimeRange(dinnerEventDate, DEFAULT_DINNER_START_HOUR, 0).start
    return isBeforeDeadline(testSeason.season.ticketIsCancellableDaysBefore, 0)(dinnerStartTime)
}

const beforeDeadlineEvents = dinnerEvents.filter(de => canModifyOrders(de.date))
const afterDeadlineEvents = dinnerEvents.filter(de => !canModifyOrders(de.date))
```

### Setup via API with Explicit Parameters

**Problem:** UI endpoints may use `fetchActiveSeasonId()` internally, which could return a different season than expected.

**Solution:** Use factory methods with explicit `seasonId` parameter:

```typescript
// ❌ WRONG: Relies on UI which uses active season (might not be test season)
await page.getByTestId('inhabitant-123-preferences-edit-mandag-DINEIN').click()
await page.getByTestId('save-preferences').click()

// ✅ CORRECT: API with explicit seasonId ensures correct deadline calculation
await HouseholdFactory.updateInhabitantPreferences(
    adminContext,
    inhabitant.id,
    preferences,
    200,
    testSeason.season.id!  // Explicit seasonId
)
```

### Testing Scaffolder Buckets (ADR-016)

The scaffolder has four action buckets based on deadline:

| Bucket | When | Action |
|--------|------|--------|
| **CREATE** | Before deadline, no existing order | Create new BOOKED order |
| **DELETE** | Before deadline, existing order, prefs=NONE | Delete order |
| **RELEASE** | After deadline, existing order, prefs=NONE | Update to RELEASED (not delete!) |
| **CLAIM** | After deadline, released ticket available | Claim from marketplace |

**Test pattern for RELEASE bucket:**

```typescript
test('RELEASE bucket: after-deadline orders are RELEASED not deleted', async ({browser}) => {
    const adminContext = await validatedBrowserContext(browser)
    const {userId: adminUserId} = await getSessionUserInfo(adminContext)

    // GIVEN: Inhabitant with DINEIN preferences
    const dineInPrefs = createDinnerModeWeekdayMap(DinnerMode.DINEIN)
    const inhabitant = await HouseholdFactory.createInhabitantWithConfig(adminContext, householdId, {
        name: salt('Test', testSalt),
        dinnerPreferences: dineInPrefs
    })

    // GIVEN: Trigger scaffold to create orders for BEFORE-deadline events
    await HouseholdFactory.updateInhabitantPreferences(
        adminContext, inhabitant.id, dineInPrefs, 200, testSeason.season.id!
    )

    // GIVEN: Manually create orders for AFTER-deadline events
    // (Scaffold can't create these by design - deadline has passed)
    for (const afterDeadlineEvent of afterDeadlineEvents) {
        await OrderFactory.createOrder(adminContext, {
            householdId,
            dinnerEventId: afterDeadlineEvent.id,
            orders: [{
                inhabitantId: inhabitant.id,
                bookedByUserId: adminUserId,
                ticketPriceId: ticketPrice.id,
                dinnerMode: DinnerMode.DINEIN
            }]
        })
    }

    // WHEN: Change preferences to NONE
    const nonePrefs = createDinnerModeWeekdayMap(DinnerMode.NONE)
    await HouseholdFactory.updateInhabitantPreferences(
        adminContext, inhabitant.id, nonePrefs, 200, testSeason.season.id!
    )

    // THEN: After-deadline orders should be RELEASED (not deleted)
    const ordersAfter = await OrderFactory.getOrdersForDinnerEventsViaAdmin(adminContext, eventIds)
    const releasedOrders = ordersAfter.filter(o =>
        o.inhabitantId === inhabitant.id && o.state === OrderState.RELEASED
    )
    expect(releasedOrders.length).toBe(afterDeadlineEvents.length)

    // THEN: Before-deadline orders should be DELETED (not in results)
    const bookedOrders = ordersAfter.filter(o =>
        o.inhabitantId === inhabitant.id && o.state === OrderState.BOOKED
    )
    expect(bookedOrders.length).toBe(0)
})
```

**Key insights:**
1. **Serial because:** Test activates its own season (only one active at a time)
2. **All-days cooking:** Predictable event count regardless of what day tests run
3. **Short deadline (2 days):** Guarantees after-deadline events exist
4. **Manual after-deadline orders:** Scaffold can't create past-deadline orders, so test creates them directly
5. **API with explicit seasonId:** Ensures scaffold uses test season's deadline config

---

## Troubleshooting

| Issue | Symptom | Fix |
|-------|---------|-----|
| Click not emitting | `emitted()` undefined | Use `findByTestId()` not `findAllComponents()` |
| Test pollution | Pass alone, fail together | Add `clearNuxtData()` to `beforeEach()` |
| Reactive updates | Assertion fails after trigger | Add `await nextTick()` |
| Linux CI failures | Strict mode violation | Use `getByRole()` or `.first()` for dropdowns |
| Tooltip provider error | `UTooltip` needs the `TooltipProvider` context `UApp` supplies in the app | Mount via `mountWithTooltipProvider()` (`tests/component/testHelpers.ts`) |

### Linux vs macOS Differences

```typescript
// ❌ Text locator matches multiple on Linux
await page.locator('text=TestSeason').click()

// ✅ Specific locators work everywhere
await page.getByRole('option', { name: 'TestSeason' }).click()
await page.locator('text=TestSeason').first().click()
```

---

## Temporal Testing (Timezone Independence)

Tests must pass in both Copenhagen and UTC (CI runs in UTC).

```typescript
// ❌ WRONG: Local time differs by timezone
const duringDinner = new Date(2025, 0, 8, 18, 30)  // 18:30 CPH ≠ 18:30 UTC

// ✅ CORRECT: Use createDateInTimezone for Copenhagen-specific moments
const duringDinner = createDateInTimezone(jan8, 18, 30)  // Always 18:30 CPH
```

**Rule:** Use `createDateInTimezone()` for reference times testing dinner boundaries and expected outputs. Use plain `new Date()` for input data (dinner dates).

```bash
# Always verify both timezones
npx vitest run tests/component/utils/season.unit.spec.ts
TZ=UTC npx vitest run tests/component/utils/season.unit.spec.ts
```

---

## Commands

```bash
# Unit/Component
npx vitest run tests/component/path/file.spec.ts --reporter=verbose

# E2E (ALWAYS verify parallel isolation)
npx playwright test tests/e2e/path/file.e2e.spec.ts --workers=4 --reporter=line

# Watch mode
npx vitest --watch
npx playwright test --ui
```

## Pre-Completion Checklist

Before completing ANY test task:

- [ ] **Real:** Component tests render real components and stores; only HTTP is faked (`registerEndpoint`), every other mock carries a reason comment
- [ ] **DRY:** No duplicate code between tests
- [ ] **Parametrized:** Similar cases use `describe.each()` / `it.each()`
- [ ] **Factories:** E2E data created via factories
- [ ] **Salted:** E2E data uses `testSalt` for uniqueness
- [ ] **Helpers:** Repeated patterns in testHelpers.ts
- [ ] **Parallel:** E2E verified with `--workers=4`
- [ ] **No console.log:** Only `expect()` assertions

**If ANY fails → STOP and refactor.**
