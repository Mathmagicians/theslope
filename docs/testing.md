# Testing Guide

## Test Types

| Type | Pattern | Framework | Data Source |
|------|---------|-----------|-------------|
| Unit | `*.unit.spec.ts` | Vitest | Parametrization |
| Component | `*.nuxt.spec.ts` | Nuxt Test Utils | Parametrization / factories |
| E2E | `*.e2e.spec.ts` | Playwright | **Factories REQUIRED** |

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

**Location:** `/tests/e2e/testHelpers.ts`

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

---

## Component Testing (Nuxt UI v4+)

### Finding Elements

```typescript
// ✅ DO: DOM selectors
const button = wrapper.find('[name="submit-button"]')
await button.trigger('click')

// ❌ DON'T: Component wrappers (events don't emit)
const button = wrapper.findAllComponents({ name: 'UButton' })[0]
await button.trigger('click')  // No events!
```

### Async Updates

```typescript
await button.trigger('click')
await nextTick()  // Always wait for Vue reactivity
```

### Event Emissions

```typescript
// ✅ Check parent wrapper
const emitted = wrapper.emitted('update:modelValue')

// ❌ Don't check child component
const emitted = button.emitted('update:modelValue')  // Always undefined
```

### Working Pattern

```typescript
const ELEMENT_NAMES = {
    addButton: 'holidayRangeAddToList',
    removeButton: (index: number) => `holidayRangeRemoveFromList-${index}`
} as const

const clickAddButton = async (wrapper: any) => {
    await wrapper.find(`[name="${ELEMENT_NAMES.addButton}"]`).trigger('click')
    await nextTick()
}
```

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
  await page.locator('button[name="submit"]').click()

  // THEN: Verify via API (reliable)
  const seasons = await SeasonFactory.getSeasons(context)
  expect(seasons.find(s => s.shortName.includes(testSalt))).toBeDefined()
})
```

### Selectors

```typescript
// Complex UI components
await page.getByTestId('season-selector').click()

// Form elements
await page.locator('input[name="start"]').fill('01/01/2025')

// Nested components
await page.locator('[name="seasonDates"] input[name="start"]').fill(startDate)
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

---

## Troubleshooting

| Issue | Symptom | Fix |
|-------|---------|-----|
| Click not emitting | `emitted()` undefined | Use `find('[name="..."]')` not `findAllComponents()` |
| Test pollution | Pass alone, fail together | Add `clearNuxtData()` to `beforeEach()` |
| Reactive updates | Assertion fails after trigger | Add `await nextTick()` |
| Linux CI failures | Strict mode violation | Use `getByRole()` or `.first()` for dropdowns |

### Linux vs macOS Differences

```typescript
// ❌ Text locator matches multiple on Linux
await page.locator('text=TestSeason').click()

// ✅ Specific locators work everywhere
await page.getByRole('option', { name: 'TestSeason' }).click()
await page.locator('text=TestSeason').first().click()
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

- [ ] **DRY:** No duplicate code between tests
- [ ] **Parametrized:** Similar cases use `describe.each()` / `it.each()`
- [ ] **Factories:** E2E data created via factories
- [ ] **Salted:** E2E data uses `testSalt` for uniqueness
- [ ] **Helpers:** Repeated patterns in testHelpers.ts
- [ ] **Parallel:** E2E verified with `--workers=4`
- [ ] **No console.log:** Only `expect()` assertions

**If ANY fails → STOP and refactor.**
