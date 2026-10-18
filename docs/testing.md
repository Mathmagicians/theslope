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

### Rule 0: One Level per Behaviour, the Lowest That Proves It

| Level | Proves |
|---|---|
| Unit | a pure function: parsing, a calculation, a schema, a token getter |
| Component | one component with its real children and stores: what it renders for its props and store state, which token it binds, what it emits |
| E2E | interaction and integration: a user's flow across pages, the URL, the server and the database (a booking lands as an order, a landing syncs its parameters, a claim moves a ticket) |

A behaviour a unit or component spec proves gets no e2e case. A glyph, a colour, an alignment or a label is a component
spec plus the browser check; the e2e case asserts the flow around it, in GIVEN/WHEN/THEN, as what the system does for
the user.

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

**Factories on disk:** `AllergyFactory`, `BillingFactory`, `DinnerEventFactory`, `ExpenseFactory`, `FeedbackFactory`, `HouseholdFactory`, `NotificationFactory`, `OrderFactory`, `SeasonFactory`, `SeasonImportFactory`, `SenderFactory`, `SettingFactory`, `TicketFactory`, `UserFactory`, `WaitlistFactory`; `reconciliationTestData.ts` holds the data for the four reconciliation outcomes of households, inhabitants and users, shared by unit and e2e specs.

**Scenario methods:**
- `SeasonFactory.createActiveSeason(context)` - the singleton active season `TestSeason-E2E-Singleton`: the `setup-season` project (`tests/e2e/season.setup.ts`) creates and activates it once per run, before the spec workers start; a spec's call returns it, and global teardown deletes it after the run
- `SeasonFactory.createActiveSeasonFromTomorrow(context, testSalt, {days, deadline?, cookingDays?, startInDays?})` - a serial spec's own active season, returned as `{season, dinnerEvents}`: starts `startInDays` days from today at midnight (1 by default) and ends `days` days after the start, inside the pre-booking window (ADR-015); `cookingDays` picks `'all'` or `'weekdays'` over the default Mon/Wed/Fri; `deadline` is the cancel deadline in days. Serial only: activating it displaces the singleton active season
- `SeasonFactory.createCookingTeamWithChefAndDinner(context, season, chefInhabitantId, {teamName?, dinner?, day?})` - a cooking team of the season with the chef as CHEF and a dinner of the team with that chef, returned as `{team, dinner}`: `dinner` sets the dinner's fields (`chefId: null` leaves the duty vacant); `day` places the dinner on a free day of the season (`'free'`, a browser spec) or alone on a given day (a serial spec), else on the date `dinner` names, tomorrow by default
- `DinnerEventFactory.createDinnerEventOnFreeDay(context, season, data?)` - a browser spec's dinner alone on a free day of the season, picked at random after the season's last dinner where one is free; a day that turns double in the meantime gives the dinner up and another day is tried
- `DinnerEventFactory.createDinnerEventAloneOnDay(context, season, day, data?)` - a serial spec's dinner alone on `day`: the dinners the season holds on that day give way. Serial only: a parallel spec's dinner on the day goes with them

### Rule 3: E2E Tests MUST Be Parallel-Safe

```typescript
// ❌ REJECTED: Hardcoded identifiers
const season = { shortName: 'Season-2025' }  // Will conflict in parallel

// ✅ REQUIRED: Salted unique data
const testSalt = Date.now().toString()
const season = SeasonFactory.defaultSeason(testSalt)  // Season-2025-1733650000000
```

**ALWAYS verify:** `npx playwright test path/to/test.e2e.spec.ts --workers=4`

**One dinner per day in browser specs:** the dinner and chef pages select a dinner by date, and a new team receives the season's generated dinners. A browser spec creates its dinner with `DinnerEventFactory.createDinnerEventOnFreeDay(context, season, data)`, which puts it alone on a free day of the season, opens the page with `?date=` on that day, and deletes the dinner in `afterAll`.

### Rule 3a: E2E Interactions Wait for Hydration

The server renders a page's controls before Vue attaches their handlers, so a click or fill that lands first is lost. A test that interacts with a page waits for hydration after every navigation, through `gotoHydrated`; `page.goto` alone is for tests that only read.

```typescript
// ❌ REJECTED: the fill lands on a dead control
await page.goto('/admin/teams?mode=create')
await page.locator('input#team-count').fill('2')

// ✅ REQUIRED: navigate, then wait for hydration
await testHelpers.gotoHydrated(page, '/admin/teams?mode=create')
await page.locator('input#team-count').fill('2')
```

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
| Pinia stores | **REAL** | `resetStores()` in `beforeEach`: fresh stores over a fresh data layer per test; the store fetches from the registered endpoints |
| HTTP | **FAKE** | `registerEndpoint()` per route - specific FIRST, generic LAST |
| Nuxt runtime the test drives (`useRoute`, `navigateTo`, `useUserSession`) | FAKE when the test steers it | `mockNuxtImport()` over `tests/component/hoistedMocks.ts` (`mockRouteAndNavigation`, `mockSession`) |
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
| An e2e case asserting a class, a colour, a glyph or a label | Component spec plus the browser check (Rule 0) |
| `page.waitForTimeout()` | `pollUntil()` or `waitForResponse()` |
| A hand-picked `{timeout: N}` on a wait | `pollUntil()` or the response (`waitForApi`) |
| `name` or `data-test-id` on buttons | `data-testid` + `getByTestId()` |
| `<button type="submit">` in `UForm` tests | `formRef?.submit()` + `flushPromises()` (see [Testing UForm Submission](#testing-uform-submission)) |
| Hardcoded formatted values (`'15/05/2026'`) | Call the same utility the component uses (`formatDate(date)`) |
| `z.coerce.date()` in form schemas | `z.date()` — strict rejects `null` (coerce turns `null` into 1970-01-01) |
| `mockComponent()` of a house component | Render it - supply its context (`mountWithTooltipProvider()`) and register its endpoints (Rule 6) |
| `mockNuxtImport('useXStore', …)` in a component test | Real store + `registerEndpoint()` - fake the HTTP, not the code (Rule 6) |
| `#empty-state` on a `UTable` (Nuxt UI v2 name - silently never renders) | `#empty` (Nuxt UI 4 slot name); assert the empty text, not just the absence of rows |

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

### Hydration and request helpers

| Helper | Use |
|--------|-----|
| `gotoHydrated(page, url)` | Navigates and waits for hydration: the entry point for a test that interacts with the page |
| `collectHydrationWarnings(page)` | Collects the console messages Vue logs on a hydration mismatch; attach it before the navigation |
| `expectHydratedWithoutMismatch(page, url)` | Navigates, waits for hydration and asserts Vue logged no hydration mismatch on the way |
| `waitForApi(page, path, method, options?)` | The next response to a `method` request whose url contains `path`; attach it before the action that sends the request |

### Component helpers: `/tests/component/testHelpers.ts`

```typescript
import {mountWithTooltipProvider, findByTestId, findAllByTestId, clickByTestId, pollFor, resetStores, registerEmptyStoreEndpoints, VIEWPORTS, kitchenConfig, useTestScope} from '~~/tests/component/testHelpers'
```

| Helper | Use |
|--------|-----|
| `mountWithTooltipProvider(Component, {props?, isMd?})` | `mountSuspended` under reka-ui's `TooltipProvider` (the context `UApp` supplies in the app). Returns the component's own wrapper, so `find`, `text`, `emitted` and `props` read the component, not the shell. `isMd` provides the layout's responsive breakpoint ref when given (`null` before the layout has measured); pass a ref to change the breakpoint after mount |
| `withTooltipProvider(Component, props)` | The bare wrapper definition, for the rare spec that needs the root wrapper |
| `findByTestId(wrapper, id)` / `findAllByTestId(wrapper, id)` | `data-testid` lookups - never hand-build the selector string |
| `findLoadingRow(wrapper)` / `findAllLoadingRows(wrapper)` | The row UTable renders from its `#loading` slot while it binds `loading` and holds no rows |
| `isTableLoading(wrapper)` | Whether the UTable under the wrapper binds `loading`: its loading bar runs under the column headers and carries no attribute to find |
| `registerScaffoldEndpoint()` | The scaffold endpoint for a component that previews: `answers.preview` and `answers.expected` set the replies of the dry run and the empty-draft read (`OrderFactory.defaultScaffoldOrdersResponse()` until set), and `sent` records each request's query and body |
| `holdEndpoint(url, body)` | An endpoint that answers `body` once the test calls `release()`: the window in which a dataset is pending; `unregister()` in `afterEach` hands the url back to the registration before it |
| `untilTrue(condition)` | Resolves once a reactive condition holds (store state, a flag), watching it rather than polling; the test's own timeout bounds it |
| `clickByTestId(wrapper, id)` | Click + `await nextTick()` |
| `pollFor(condition, maxAttempts?)` | Poll a predicate across ticks (store readiness) |
| `resetStores()` | Fresh stores over a fresh data layer per test: the stores of the app's pinia and of the active one are disposed, the app's pinia stays active so a spec and the components it mounts share one store instance, and the keyed `useAsyncData` entries earlier stores registered go with them |
| `registerEmptyStoreEndpoints()` | The datasets the stores request on creation, answered empty; a spec's own route for one of them registers after this call, as the last registration of a url answers |
| `VIEWPORTS` | The two layouts a responsive token answers for, the phone (`isMd: false`) and md and up (`isMd: true`), as the table of a `describe.each` |
| `lockedDinnerSupply(byType?, queuedByType?)` | A locked dinner's supply (`ReleasedTicketCounts`) from its tickets for sale and its waiting list per ticket type, with the totals and the compact counts |
| `kitchenConfig()` | The kitchen's rates the money components calculate with, read from the app config inside a hook or a test |
| `useTestScope()` | A scope per test for the composables a test body creates: the watchers they start stop with the test, as they do when a component unmounts |

Shared `data-testid` contracts live next to the specs that share them: `tests/component/components/allergy/allergyTestIds.ts` (the allergy catalog UI), `cooking-team/jokerSlotIds.ts` (JokerSlotForm and the team card's joker box, shared with the AdminTeams e2e spec) and `dinner/waitlistTestIds.ts` (the waiting list UI).

### Hoisted mocks: `/tests/component/hoistedMocks.ts`

The runtime a spec fakes before Nuxt boots. `mockNuxtImport` rewrites each call into a hoisted `vi.mock`, so its factory sees hoisted bindings only; a spec builds them inside `vi.hoisted` and hands them to the macro:

```typescript
const {session, useUserSession} = await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).mockSession())
mockNuxtImport('useUserSession', () => useUserSession)

const {mockRoute, mockNavigateTo, useRoute} = await vi.hoisted(async () =>
    (await import('~~/tests/component/hoistedMocks')).mockRouteAndNavigation({path: '/admin/economy'}))
mockNuxtImport('useRoute', () => useRoute)
mockNuxtImport('navigateTo', () => mockNavigateTo)
```

| Helper | Use |
|--------|-----|
| `mockSession(user?)` | The session nuxt-auth-utils hydrates from a cookie the test runtime lacks; the auth store reading it is real. `session.user` is the one switch: `loggedIn` follows it, and a spec that gates on login alone writes `loggedIn` itself |
| `mockRouteAndNavigation({path?, params?, query?})` | The route a page reads and the navigation it writes, with no router in the test runtime. `mockRoute` is reactive, so the computeds over `route.query` follow a write; `mockNavigateTo` records the calls, and `mockNavigateTo.mockImplementation(landNavigation)` lands each call on the route, as the router does |

---

## Component Testing (Nuxt UI v4+)

### Nuxt test environment (@nuxt/test-utils 4)

The Nuxt app starts in a per-file `beforeAll`. Rules for `*.nuxt.spec.ts`:

- A composable whose chain reaches `useAppConfig()`/`useNuxtApp()` (`useSeason`, `useBooking`, `useBookingUi`, `useBilling`,
  `useMaintenance`) runs in `beforeAll` or in the test — at module level or in a `describe` body it throws `NUXT_E1001`.
  Declare `let` bindings and destructure in one `beforeAll` per file; call sites stay unchanged.
- Collection-time data (`it.each` tables, module constants) reads the config via `import appConfig from '~/app.config'`.
- Override a module per export: spread `importOriginal()` and replace the one export the spec steers
  (`vue-router`'s `useRoute`), or `mockNuxtImport` for an auto-import (`useToast`, `navigateTo`). The runtime boots the
  real router and the real config; a wholesale `vue-router`, `#imports` or `useRuntimeConfig` mock breaks the boot.
- The nuxt vitest project (`vitest.config.ts`) sets `hookTimeout: 60_000` (a cold app boot under full parallel load passes
  the 10s default) and `runtimeConfig.public.HEY_NABO_API` for specs that render Heynabo links.

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

## Architecture Tests

`tests/component/architecture/*.unit.spec.ts` read sources — the `.vue` files under `app/`, the SQL under `migrations/`,
the palettes under `app/assets/css/palettes/` — and fail on a *pattern*, not on a render. They are how a design-system
sweep stays swept: once every `<UAlert>` binds an `ALERTS` kind, the test is what stops the 57th one from being written
with a raw `:color` (ADR-018). Violations are reported as `file:line`, so a failure names the sites to fix.

| Spec | Reads | Rule |
|------|-------|------|
| `designSystemUsage.unit.spec.ts` | `.vue` under `app/` | The ADR-018 usage rules, one case each (below) |
| `fetchUsage.unit.spec.ts` | `app/` | ADR-007: a `$fetch(` or `useRequestFetch(` outside `app/composables/useApiHandler.ts` fails — stores read through `storeAsyncData` and write through `apiRequest` |
| `migrations.unit.spec.ts` | `migrations/*.sql` from `0015` on | A migration adds a column with `ALTER TABLE … ADD COLUMN` and keeps every table: D1 runs a migration inside a transaction where `PRAGMA foreign_keys=OFF` is a no-op, so a table rebuild (`DROP TABLE`, `-- RedefineTables`) fires the children's ON DELETE actions |
| `designSystemContrast.unit.spec.ts` | the tokens and the palettes | EN 301 549 / WCAG 2.1 contrast of every pair the tokens define (next section) |
| `designSystemColourVision.unit.spec.ts` | the palettes and `designSystemMeanings.ts` | WCAG 2.1 §1.4.1: the meaning pairs stay apart under colour vision deficiency (next section) |

`contrast.ts`, `colourVision.ts`, `designSystemPairs.ts`, `designSystemMeanings.ts` and `palettes.ts` hold the colour
maths, the simulation, the pair inventory, the meaning inventory and the palette list, shared with the palette generator.

`designSystemUsage.unit.spec.ts` asserts: a `<UAlert>` binds an `ALERTS` kind and takes `color`, `variant` and `type`
from it; a `<UCalendar>` binds `COMPONENTS.calendarGrid`; a `<UTable>` binds a `COMPONENTS.table` token; a table under
`app/` is a `UTable` on a table token (a raw `<table>` fails; the print page `pages/admin/allergies/pdf.vue` is exempt);
a team `<UTabs>` (one whose file renders `CookingTeamBadges`) binds `COMPONENTS.teamTabs`; a `<UCollapsible>` that
styles itself does so through a `COMPONENTS.collapsible` token; a labelled `<USeparator>` binds a `COMPONENTS.separator`
kind; a `.vue` names its colours through tokens (a Tailwind palette shade or a literal colour prop fails); a `<UButton>`,
`<UBadge>`, `<UAvatar>` or `<UAvatarGroup>` takes `size`, `variant` and `icon` from a token; the form button row binds
`LAYOUTS.formButtonRow`; the layout (`layouts/default.vue`) provides the breakpoint and the design system reads it (an
`inject` of `isMd` in another `.vue` fails); a table empty state is the `#empty` slot (the Nuxt UI v2 name `#empty-state` fails).

Add one whenever a fix to a Nuxt UI component family becomes a token: add the token, sweep all instances, add the rule.

A property check runs one case per dimension — a rule, a palette and mode — that collects every failing item and prints
them in its message (`expect(misses).toEqual([])`). One case per item turns a 50-case suite into thousands and says the
same thing.

### `designSystemContrast.unit.spec.ts` — the palette's contrast, not its class strings

The one architecture test that reads *values* instead of sources, and it is still a property, not a token value: it
encodes **EN 301 549 → WCAG 2.1** contrast. It resolves every colour the design system names through the same
stylesheets the browser reads (`main.css` `@theme static`, Tailwind 4's oklch defaults, `app.config.ts` `ui.colors`,
Nuxt UI's `--ui-*` semantics), composites the alpha surfaces (`bg-primary/10`, `bg-gray-800/50`), and measures
`(L1 + 0.05) / (L2 + 0.05)` for every pair the tokens define — light **and** dark. Thresholds: **4.5:1** body text
(1.4.3 AA), **3:1** borders, rings and outlines (1.4.11 AA), **7:1** for the `Høj kontrast` palette preset (1.4.6 AAA).
The colour maths lives in `tests/component/architecture/contrast.ts` (`hexToRgb`, `oklchToHex`, `relativeLuminance`,
`contrastRatio`, `composite`) so the palette generator reuses the same functions it is measured by — no colour
dependency, no second implementation.

The pairs are **derived by walking the exported tokens**, so a token added tomorrow is measured tomorrow. Four groups:
text on the neutral surfaces (`BG.panel`, `BG.inset`, …), a token that carries both its ink and its fill (hero
backgrounds, calendar days, kitchen panels, Pantone chips), borders/rings against the page and `BG.panel` (an edge that carries meaning on a token with its own
fill, `MEANINGFUL_EDGES_ON_FILL` such as the ticket faces, also against that fill), and the Nuxt
UI semantic slots (`text-<slot>` on the page and on the soft `bg-<slot>/10` alert surface, `text-inverted` on the solid
fill). Three scoping rules keep the inventory on the standard: a token whose own classes make its text large-scale
(24px, or 18.66px bold) is measured at the 3:1 rung of 1.4.3; a fill takes its bar from the typography a component
places on it (`INK_ON_FILL`, one row per surface with the component and line that draws it); and the dividers and
table banding listed in docs/ui.md "Palettes" sit outside 1.4.11.

Every palette under `app/assets/css/palettes/` — the base `default.css` and each preset — is measured at the level its
`PALETTES` entry carries (`tests/component/architecture/palettes.ts` derives the list from the registry). `color="neutral"`
badges, buttons and alerts are measured on the faces Nuxt UI gives them (`bg-inverted`, `bg-elevated`, `bg-elevated/50`).
One case per palette and mode lists every pair below its bar and expects exactly the pairs listed in `PRESET_FINDINGS`.
The palette files are generated and committed, and the specs measure them as committed: after a change to the `main.css`
scales, `ui.colors` or a token that adds a fill or an ink, `make palettes` regenerates them before the specs run.

`designSystemColourVision.unit.spec.ts` measures the meaning pairs of `designSystemMeanings.ts` (shared with the generator)
under protanopia, deuteranopia and tritanopia for the base and every `colourSafe` palette, and the rainbow stops apart in
every palette; its case per palette and mode expects exactly the pairs listed in `FINDINGS` (the base's meaning pairs).

**When it fails, fix the token — never the threshold.** A listed pair cuts both ways: a green pair that starts failing
and a listed pair that starts passing both fail the case, and the second asks for the entry to be deleted. Never add an
entry to silence a new failure — a new miss is a regression.

**Do NOT assert design-token values.** `expect(ui.title).toContain('text-lg')` restates the design and guards nothing —
the colour, size and padding of a token are the user's visual check. Architecture tests assert *usage*; component specs
assert *behaviour* (text renders, CTA present or absent, events emitted); e2e asserts no horizontal overflow at 375px
(`MobileViewport.e2e.spec.ts`). A getter that branches on `isMd` may get one case per branch.

---

## Composable Testing

### Mock Nuxt Auto-imports

The route and the navigation come from `tests/component/hoistedMocks.ts` (see [Hoisted mocks](#hoisted-mocks-testscomponenthoistedmocksts)):

```typescript
import {mockNuxtImport} from '@nuxt/test-utils/runtime'

const {mockNavigateTo, mockRoute: mockRouteData, useRoute} = await vi.hoisted(async () =>
  (await import('~~/tests/component/hoistedMocks')).mockRouteAndNavigation({path: '/household/test/bookings'}))

mockNuxtImport('navigateTo', () => mockNavigateTo)
mockNuxtImport('useRoute', () => useRoute)
```

### Mutate Mock Data Between Tests

`mockRoute` is reactive, so a write to its `params` or `query` reaches the computeds under test:

```typescript
const setupRoute = (query: Record<string, string | undefined>) => {
  for (const key in mockRouteData.query) {
    if (Object.hasOwn(mockRouteData.query, key)) Reflect.deleteProperty(mockRouteData.query, key)
  }
  Object.assign(mockRouteData.query, query)
}
```

---

## Store Testing (Pinia)

### Clear Cache Between Tests

`resetStores()` gives each test fresh stores over a fresh data layer: the stores of the app's pinia and of the active one
are disposed, the app's pinia stays active so a spec and the components it mounts share one store instance, and the
keyed `useAsyncData` entries earlier stores registered go with them.

```typescript
import {resetStores} from '~~/tests/component/testHelpers'

beforeEach(() => {
    resetStores()
    vi.clearAllMocks()
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
  await testHelpers.gotoHydrated(page, '/admin/planning?mode=create')
  await testHelpers.fillDateField(page.locator('[name="seasonDates"]'), 'start', '01/01/2025')
  await page.getByTestId('submit-season').click()

  // THEN: Verify via API (reliable)
  const seasons = await SeasonFactory.getAllSeasons(context)
  expect(seasons.find(s => s.shortName.includes(testSalt))).toBeDefined()
})
```

### Selectors

```typescript
// Buttons and interactive elements - use getByTestId
await page.getByTestId('season-selector').click()
await page.getByTestId('submit-season').click()

// Form inputs - name attribute works (native HTML)
await page.locator('input[name="pbsId"]').fill('123')

// Date fields are typed segments (UInputDate): fill and read through the helpers,
// scoped to the picker's [name] wrapper; a range field holds start and end
await testHelpers.fillDateField(page.locator('[name="seasonDates"]'), 'start', '01/01/2025')
const start = await testHelpers.readDateField(page.locator('[name="seasonDates"]'), 'start')
```

### Waiting Patterns

```typescript
// ✅ Wait for API BEFORE navigation
const responsePromise = page.waitForResponse(
    (r) => r.url().match(/\/api\/admin\/season\/\d+$/)
)
await page.goto('/admin/planning')
const response = await responsePromise
expect(response.status()).toBe(200)

// ✅ Wait for loader to disappear
await pollUntil(
    async () => await page.locator('text=Loading').isVisible(),
    (isVisible) => !isVisible
)

// ✅ Navigate and wait for hydration before the first click or fill (Rule 3a): the server-rendered markup is
// visible seconds before Vue attaches the handlers, and an early click is lost
await gotoHydrated(page, '/admin/households')

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

**Project dependency:** each serial project depends on its parallel project (`chromium-api-serial` on `chromium-api`, `chromium-ui-serial` on `chromium-ui`). `npm run test:e2e` runs the suites one after another, in the order of the CI steps.

**Running the suites:**

```bash
# Full suite: API (parallel, then serial), UI parallel, UI serial
npm run test:e2e

# API suite (parallel, then serial)
npm run test:e2e:api

# UI suite (parallel)
npm run test:e2e:ui

# Serial suites without their parallel dependency
npm run test:e2e:api:seq
npm run test:e2e:ui:serial

# One serial spec
npx playwright test tests/e2e/api/serial/admin/scaffold-prebookings.e2e.spec.ts --project=chromium-api-serial --no-deps --reporter=line
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
// The factory creates the season with its dinner events from tomorrow and activates it (one season is active at a time)
testSeason = await SeasonFactory.createActiveSeasonFromTomorrow(adminContext, testSalt, {days: 10, deadline: 2, cookingDays: 'all'})
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
| Test pollution | Pass alone, fail together | `resetStores()` in `beforeEach()` (`tests/component/testHelpers.ts`) |
| Reactive updates | Assertion fails after trigger | Add `await nextTick()` |
| Linux CI failures | Strict mode violation | Use `getByRole()` or `.first()` for dropdowns |
| Tooltip provider error | `UTooltip` needs the `TooltipProvider` context `UApp` supplies in the app | Mount via `mountWithTooltipProvider()` (`tests/component/testHelpers.ts`) |
| "Factory HTTP methods are e2e-only" thrown in a component test | The spec called a factory method that asserts with playwright's `expect` — `@playwright/test` resolves to a stub in the vitest projects (`tests/component/playwrightStub.ts`) | Use the factory's data builders; HTTP methods run under playwright in `tests/e2e` |

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

# E2E suites (Serial Tests above)
npm run test:e2e
npm run test:e2e:api
npm run test:e2e:ui
npm run test:e2e:ui:serial

# E2E, one spec (ALWAYS verify parallel isolation)
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
