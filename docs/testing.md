# Testing Guide

## Test Types

- **`*.unit.spec.ts`**: Pure function tests (Vitest) - no Nuxt runtime needed
- **`*.nuxt.spec.ts`**: Nuxt component tests - requires Nuxt environment for components, composables, and `$fetch`
- **`*.e2e.spec.ts`**: End-to-end tests (Playwright) - full browser automation

## Testing Guidelines

### General Principles

- Prefer assertions over console logs (`expect()` instead of `console.log()`)
- Use meaningful test names that describe the behavior being tested
- Focus tests on business requirements, not implementation details
- When testing async behavior, use proper `await` patterns

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

**Example:** `tests/e2e/ui/AdminSeason.e2e.spec.ts`

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