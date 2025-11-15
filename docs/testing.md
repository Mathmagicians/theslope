# Testing Guide

## Test Types

- **`*.unit.spec.ts`**: Pure function tests (Vitest) - no Nuxt runtime needed
- **`*.nuxt.spec.ts`**: Nuxt component tests - requires Nuxt environment for components, composables, and `$fetch`
- **`*.e2e.spec.ts`**: End-to-end tests (Playwright) - full browser automation

## Testing Guidelines

### General Principles

- **NEVER use console.log() in tests** - ALWAYS use assertions (`expect()`) to verify behavior
- Use meaningful test names that describe the behavior being tested
- Focus tests on business requirements, not implementation details
- When testing async behavior, use proper `await` patterns
- Use `vi.fn()` spies to track function calls instead of manual counters

### DRY Principles: No Boilerplate in Tests

**CRITICAL**: Every test must be DRY (Don't Repeat Yourself). If you find yourself copying code between tests:

1. **STOP** - Do not write duplicate code
2. **EXTRACT** - Move to helper function (testHelpers.ts) or factory (testDataFactories/)
3. **REUSE** - Import and use the helper/factory

**Techniques to eliminate boilerplate:**

- **Test parametrization**: Use `describe.each()` or `it.each()` for similar test cases with different data
  ```typescript
  describe.each([
    { input: 'value1', expected: 'result1' },
    { input: 'value2', expected: 'result2' }
  ])('function with $input', ({ input, expected }) => {
    it('returns $expected', () => {
      expect(myFunction(input)).toBe(expected)
    })
  })
  ```

- **Helper functions**: Extract repeated setup/interaction patterns to testHelpers.ts
  ```typescript
  // testHelpers.ts
  export const clickButton = async (page, name) => {
    await page.locator(`[name="${name}"]`).click()
    await page.waitForResponse(...)
  }
  ```

- **Factories**: Use factory pattern for test data creation (E2E only)
  ```typescript
  const season = await SeasonFactory.createSeason(context, { holidays: [] })
  ```

### Parallel Execution: Test Isolation

**CRITICAL**: All tests run in parallel. Tests MUST be isolated to prevent race conditions and flaky failures.

#### Parallel Execution Requirements

1. **Use `testSalt` for unique data**: Every E2E factory method accepts optional `testSalt` parameter
   ```typescript
   const season = SeasonFactory.defaultSeason(testSalt)  // Creates unique data per test
   ```

2. **Generate unique values**: Use factory helpers for dates, names, IDs
   ```typescript
   const uniqueDate = SeasonFactory.generateUniqueDate()  // Random year/month
   const uniqueName = `TestSeason-${Date.now()}`         // Timestamp-based
   ```

3. **Import and use testHelpers**: Located at `/tests/e2e/testHelpers.ts`
   ```typescript
   import testHelpers from '../testHelpers'
   const {validatedBrowserContext, pollUntil, selectDropdownOption} = testHelpers
   ```

4. **ALWAYS verify E2E with parallel workers**: Test with at least 4 parallel workers
   ```bash
   npx playwright test --workers=4  # Minimum for isolation verification
   npx playwright test tests/e2e/ui/MyTest.e2e.spec.ts --workers=4
   ```

**Why This Matters:**
- Tests creating "Season 2025" will conflict if run simultaneously
- Salting ensures `Season-2025-abc123` vs `Season-2025-xyz789` (unique per test run)
- Parallel execution catches race conditions and data conflicts early
- CI/CD runs tests in parallel - local testing must match

**Example: Proper Test Isolation**
```typescript
test('GIVEN unique season WHEN creating THEN succeeds', async ({ page, browser }) => {
  const testSalt = Date.now().toString()
  const context = await validatedBrowserContext(browser)

  // ✅ GOOD: Unique data per test execution
  const season = SeasonFactory.defaultSeason(testSalt)
  const created = await SeasonFactory.createSeason(context, season)

  // Cleanup with unique ID
  await SeasonFactory.cleanupSeasons(context, [created.id])
})
```

#### Test Data Naming Convention

Use Donald Duck universe names (obvious test data, will be deleted):
```typescript
const household = await HouseholdFactory.createHousehold(context, {
  name: salt('Duckburg', testSalt)
})
const inhabitant = await HouseholdFactory.createInhabitantForHousehold(
  context, householdId, 'Scrooge McDuck'
)
```

#### Use Validation Composable Helpers

Create domain objects using validation composable helpers, not manual construction:
```typescript
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'

// ✅ GOOD: Use helper
const {createDefaultWeekdayMap} = useWeekDayMapValidation({
  valueSchema: DinnerModeSchema,
  defaultValue: DinnerMode.DINEIN
})
const preferences = createDefaultWeekdayMap(DinnerMode.DINEIN)

// ❌ BAD: Manual construction (missing days, invalid structure)
const preferences = { mandag: 'DINEIN', tirsdag: 'DINEIN' }
```

#### Deserialization Pattern

API responses return serialized data - use composable deserializers:
```typescript
import {useHouseholdValidation} from '~/composables/useHouseholdValidation'
const {deserializeWeekDayMap} = useHouseholdValidation()

const inhabitant = await HouseholdFactory.getInhabitant(context, id)
const preferences = typeof inhabitant.dinnerPreferences === 'string'
  ? deserializeWeekDayMap(inhabitant.dinnerPreferences)
  : inhabitant.dinnerPreferences
```

#### Troubleshooting: Element Not Found

If `[name="..."]` selector fails, check if component forwards `name` to DOM. Add `data-testid`:
```vue
<!-- Component: Add data-testid for test selection -->
<UFieldGroup :name="name" :data-testid="name" />
```

```typescript
// Test: Use getByTestId when name doesn't forward
await page.getByTestId('element-name').click()
```

### Component Testing (Nuxt UI v4+)

After the Nuxt 3→4 and Nuxt UI 2→4 migration, specific patterns are required for reliable component testing:

#### Finding Elements

**✅ DO: Use DOM element selectors with `find()`**
```typescript
// Find by name attribute (preferred for buttons, inputs)
const button = wrapper.find('[name="submit-button"]')
await button.trigger('click')

// Helper pattern for DRY code
const ELEMENT_NAMES = {
    submitButton: 'submit-button',
    cancelButton: 'cancel-button'
} as const

const clickButton = async (wrapper: any, buttonName: string) => {
    const button = wrapper.find(`[name="${buttonName}"]`)
    await button.trigger('click')
    await nextTick()
}
```

**❌ DON'T: Use component wrappers for triggering events**
```typescript
// This returns component wrappers, not DOM elements
// trigger('click') on component wrappers doesn't emit events
const buttons = wrapper.findAllComponents({ name: 'UButton' })
const button = buttons[0]
await button.trigger('click') // ❌ No events emitted!
```

**Why?** After Nuxt UI v4, components like `UButton` have complex internal structures. Triggering events on component wrappers (from `findAllComponents()`) doesn't reach the actual clickable DOM element inside. Using `find('[name="..."]')` gets the actual DOM element where events work correctly.

#### Async Updates

**Always use `nextTick()` after triggering events:**
```typescript
import { nextTick } from 'vue'

await button.trigger('click')
await nextTick() // ✅ Wait for Vue's reactive updates
```

Vue's reactivity in Nuxt 4 is more async than before. Without `nextTick()`, assertions may run before the reactive updates complete.

#### Event Emissions

**Events emit from parent components, not child components:**
```typescript
// ✅ Correct - check parent wrapper
const wrapper = await mountSuspended(FormModeSelector, { /* ... */ })
await button.trigger('click')
const emitted = wrapper.emitted('update:modelValue') // Parent component
expect(emitted).toBeTruthy()

// ❌ Wrong - checking child component
const button = wrapper.findComponent(UButton)
await button.trigger('click')
const emitted = button.emitted('update:modelValue') // ❌ Always undefined
```

Components using `defineModel` automatically emit `update:modelValue` from the parent component, not from child UI components.

#### Working Example Pattern

See `tests/component/components/calendar/CalendarDateRangeListPicker.nuxt.spec.ts` for a complete working example:

```typescript
const ELEMENT_NAMES = {
    addButton: 'holidayRangeAddToList',
    removeButton: (index: number) => `holidayRangeRemoveFromList-${index}`
} as const

const clickAddButton = async (wrapper: any) => {
    const addButton = wrapper.find(`[name="${ELEMENT_NAMES.addButton}"]`)
    await addButton.trigger('click')
    await nextTick()
}

it('adds a holiday period', async () => {
    const wrapper = await createWrapper()
    await setDateRange(wrapper, new Date(2025, 0, 1), new Date(2025, 0, 5))
    await clickAddButton(wrapper)

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted[0][0]).toEqual([{ start: new Date(2025, 0, 1), end: new Date(2025, 0, 5) }])
})
```

### Composable Testing (Nuxt Auto-imports)

**Use `mockNuxtImport` for all Nuxt auto-imported functions:**

```typescript
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const { mockNavigateTo, mockRouteData } = vi.hoisted(() => ({
  mockNavigateTo: vi.fn(),
  mockRouteData: { path: '/simple/tab1', params: { tab: 'tab1' }, query: {}, hash: '' }
}))

mockNuxtImport('navigateTo', () => mockNavigateTo)
mockNuxtImport('useRoute', () => () => mockRouteData)  // Composables return functions
```

**Mutate mock data between tests** (don't replace object references):
```typescript
const setupRoute = (params: Record<string, string | undefined>) => {
  Object.keys(mockRouteData.params).forEach(key => delete mockRouteData.params[key])
  Object.assign(mockRouteData.params, params)
}
```

**Example:** `tests/component/composables/useTabNavigation.nuxt.spec.ts`

### Store Testing (Pinia + useFetch)

**Clear Nuxt data cache between tests:**
```typescript
import { clearNuxtData } from '#app'

beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    clearNuxtData() // ✅ Clear useFetch cache to prevent test pollution
})
```

Nuxt's `useFetch` caches responses. Without `clearNuxtData()`, cached data from previous tests can leak into subsequent tests.

**Mock endpoint registration order:**
```typescript
// ✅ CORRECT: Specific endpoints FIRST, generic endpoints LAST
registerEndpoint('/api/admin/season/1', { handler: () => mockObject })
registerEndpoint('/api/admin/season', { handler: () => [] })

// ❌ WRONG: Generic catches specific requests!
registerEndpoint('/api/admin/season', { handler: () => [] })
registerEndpoint('/api/admin/season/1', { handler: () => mockObject }) // Never reached
```

**Why?** Generic patterns match specific URLs. Always register specific before generic.

**Organize tests by mock requirements:**
```typescript
describe('with specific mocks', () => {
  it('test', async () => {
    registerEndpoint('/api/admin/season/1', { ... })
    registerEndpoint('/api/admin/season', { ... })
  })
})

describe('with shared mocks', () => {
  beforeEach(() => {
    registerEndpoint('/api/admin/season', { handler: () => [] })
  })
  // Multiple tests share the same mock
})
```

### E2E UI Testing (Playwright)

**Strategy:** Setup → Interact → Verify

```typescript
test('GIVEN user in create mode WHEN submitting form THEN season is created', async ({ page, browser }) => {
  const context = await validatedBrowserContext(browser)

  // GIVEN: Setup via API (fast, reliable)
  // (optional - only when testing edit/delete flows)

  // WHEN: Interact via UI (test user workflow)
  await page.goto('/admin/planning?mode=create')
  await page.locator('input[name="start"]').fill('01/01/2025')
  await page.locator('button[name="submit-season"]').click()

  // THEN: Verify via API (fast, reliable)
  const response = await context.request.get('/api/admin/season')
  const seasons = await response.json()
  expect(seasons.find(s => s.shortName.includes('2025'))).toBeDefined()
})
```

**Key Principles:**
- Use factories for setup (SeasonFactory, HouseholdFactory)
- Focus UI tests on user interaction, not data validation
- Verify data integrity via API, not DOM inspection
- Keep tests simple - data tests belong in API E2E tests

#### Factory Patterns

**Create with defaults:**
```typescript
const season = await SeasonFactory.createSeason(context) // Uses all defaults
const season = await SeasonFactory.createSeason(context, { holidays: [] }) // Override specific fields
```

**Cleanup:**
```typescript
let createdSeasonIds: number[] = []

test.afterAll(async ({browser}) => {
    const context = await validatedBrowserContext(browser)
    await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
})
```

**Deserialize API responses:**
```typescript
import {useSeasonValidation} from '~/composables/useSeasonValidation'
const {deserializeSeason} = useSeasonValidation()

const serializedSeason = await SeasonFactory.getSeason(context, id)
const season = deserializeSeason(serializedSeason)
expect(season.holidays).toHaveLength(0) // Now an array
```

#### Component Selection

**Use `data-testid` for complex UI components:**
```typescript
// NuxtUI v4+ components may not forward name to DOM
await page.getByTestId('season-selector').click()
```

**Use `name` for form elements:**
```typescript
await page.locator('input[name="start"]').fill('01/01/2025')
await page.locator('button[name="submit-season"]').click()
```

**Use scoped selectors for nested components:**
```typescript
await page.locator('[name="seasonDates"] input[name="start"]').fill(startDate)
await page.locator('[name="holidayRangeList"] input[name="start"]').fill(holidayStart)
```

#### Generate Unique Test Data

**For UI form submissions that create unique dates:**
```typescript
const generateUniqueSeasonDates = () => {
    const date1 = SeasonFactory.generateUniqueDate() // Random year/month
    const date2 = new Date(date1.getTime() + 90 * 24 * 60 * 60 * 1000)
    const searchPattern = `${String(date1.getMonth() + 1).padStart(2, '0')}/${String(date1.getFullYear()).slice(-2)}`

    return {
        startDate: formatDate(date1),
        endDate: formatDate(date2),
        searchPattern // For finding created season via API
    }
}
```

**Examples:**
- `tests/e2e/ui/AdminPlanning.e2e.spec.ts`
- `tests/e2e/ui/AdminPlanningSeason.e2e.spec.ts`

#### Test Helper Utilities
***IMPORTANT*** We want to keep our tests DRY. Whenever we discover repetitive, crosscutting concerns, we extract them to test helper utilities.

**Location:** `/tests/e2e/testHelpers.ts`

**Import pattern:**
```typescript
import testHelpers from '../testHelpers'
const {validatedBrowserContext, pollUntil, selectDropdownOption} = testHelpers
```

##### `validatedBrowserContext(browser)`

Creates authenticated browser context for API requests in tests.

```typescript
const context = await validatedBrowserContext(browser)
const season = await SeasonFactory.createSeason(context)
```

**Usage:** Required for all factory methods and authenticated API calls in tests.

##### `pollUntil(fetchFn, condition, maxAttempts?, initialDelay?)`

Generic polling function with exponential backoff for async operations.

```typescript
// Poll until condition is met (default: 5 attempts, 500ms initial delay)
const teams = await pollUntil(
  () => SeasonFactory.getCookingTeamsForSeason(context, seasonId),
  (teams) => teams.length === 3
)
expect(teams.length).toBe(3)

// Custom attempts and delay
const data = await pollUntil(
  fetchFn,
  (d) => d.status === 'ready',
  10,  // max attempts
  1000 // initial delay (doubles each attempt)
)
```

**Usage:** Preferred over `page.waitForTimeout()` for waiting on API operations after UI interactions.

##### `selectDropdownOption(page, dropdownTestId, optionName)`

Selects option from dropdown using test ID, handles strict mode violations on Linux.

```typescript
// Select season from dropdown
await selectDropdownOption(page, 'season-selector', 'TestSeason-123')

// Select household from dropdown
await selectDropdownOption(page, 'household-selector', 'Household A')
```

**Why?** Dropdowns on Linux show text twice (selected value + menu option), causing strict mode violations with `getByRole('option')`. This utility uses `.first()` internally to avoid the issue.

**Usage:** Always use this for dropdown selection instead of manual `getByTestId().click()` + `getByRole('option').click()` pattern.

##### `doScreenshot(page, name, isDocumentation?)`

Takes screenshots for debugging or documentation.

```typescript
// Debug screenshot (temporary, with timestamp in test-results/)
await doScreenshot(page, 'dropdown-timeout')
// Creates: test-results/dropdown-timeout-1234567890.png

// Documentation screenshot (permanent, no timestamp in docs/screenshots/)
await doScreenshot(page, 'admin/admin-planning-loaded', true)
// Creates: docs/screenshots/admin/admin-planning-loaded.png
```

**Parameters:**
- `page` - Playwright Page object
- `name` - Descriptive name (supports subdirectories like 'admin/page-name')
- `isDocumentation` - Boolean (default: false). If true, saves to docs/screenshots/ without timestamp

**Usage:**
- Debug screenshots help troubleshoot failing tests (temporary)
- Documentation screenshots capture UI state for README/docs (permanent)

#### Playwright Best Practices

**❌ AVOID: `waitForLoadState('networkidle')`** - Flaky and slow

**✅ USE: `page.waitForResponse()` for API data loading**

```typescript
// ✅ Wait for specific API response
await page.goto('/admin/teams?mode=edit')
await page.waitForResponse(
  (response) => response.url().includes('/api/admin/season') && response.status() === 200,
  { timeout: 10000 }
)
await selectDropdownOption(page, 'season-selector', season.shortName)
```

**✅ USE: URL parameters + explicit waits**

```typescript
// Navigate directly to desired state
await page.goto(`/admin/teams?mode=edit`)
await expect(page.locator('button[name="form-mode-edit"]')).toHaveClass(/ring-2/)
await expect(page.getByTestId('team-tabs').first()).toBeVisible()
```

**Key principles:**
- Use `page.waitForResponse()` for SSR apps with client-side data fetching
- Navigate directly via URL parameters instead of clicking through UI
- Wait for specific elements with `expect().toBeVisible()`, not networkidle
- Use `pollUntil()` for API verification after UI actions

## Common Issues After Framework Upgrades

### Issue: Click events not emitting

**Symptom:** `wrapper.emitted('event-name')` returns `undefined`

**Cause:** Using `findAllComponents()` + `trigger('click')` on component wrappers

**Fix:** Use `find('[name="..."]')` to get DOM elements instead

### Issue: Test pollution between tests

**Symptom:** Tests pass individually but fail when run together

**Cause:** `useFetch` caching responses between tests

**Fix:** Add `clearNuxtData()` to `beforeEach()`

### Issue: Reactive updates not visible

**Symptom:** State changes but assertions fail immediately after

**Cause:** Missing `await nextTick()` after state changes

**Fix:** Add `await nextTick()` after `trigger()`, `setProps()`, or manual state changes

### Issue: Tests pass locally (macOS) but fail on CI (Linux)

**Symptom:** E2E tests pass on local macOS but fail on GitHub Actions (Linux) with "strict mode violation" errors:
```
Error: locator('text=...') resolved to 2 elements
```

**Cause:** OS-specific browser rendering differences between macOS and Linux (not headless vs headed):
- Playwright strict mode is active in both environments
- Component rendering timing/behavior differs between platforms
- Text locators (e.g., `locator('text=...')`) may match multiple elements on Linux but only one on macOS
- Common with dropdowns where selected value AND menu option both contain same text

**Investigation:**
```bash
# Running with CI=true and headless locally (macOS) may still pass
CI=true npx playwright test tests/e2e/ui/file.spec.ts --reporter=line

# Create diagnostic test to verify strict mode is active
test('verify strict mode', async ({ page }) => {
  await page.setContent('<div>Text</div><div>Text</div>')
  await expect(async () => {
    await page.locator('text=Text').click()
  }).rejects.toThrow(/strict mode violation/)
})
```

**Fix:** Use more specific locators that only match one element:
```typescript
// ❌ BAD: Text locator can match multiple elements
await page.locator('text=TestSeason-123').click()

// ✅ GOOD: Specific role-based locator
await page.getByRole('option', { name: 'TestSeason-123' }).click()

// ✅ GOOD: Scoped selector
await page.locator('[role="listbox"] >> text=TestSeason-123').click()

// ✅ GOOD: Use first() when multiple matches are expected but you want the first
await page.locator('text=TestSeason-123').first().click()
```

**Prevention:** Always use semantic locators (`getByRole`, `getByLabel`) or scoped selectors instead of broad text matches. These work reliably across platforms.
