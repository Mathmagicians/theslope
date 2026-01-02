# Feature Proposal: Preference-Triggered Re-Scaffolding

**Status:** ✅ Complete | **Date:** 2025-12-31 | **Completed:** 2026-01-02

## ✅ WORK DONE

- `POST /api/admin/household/inhabitants/[id]` → returns `InhabitantUpdateResponse` with `scaffoldResult`
- `scaffoldPrebookings` refactored: accepts `{seasonId?, householdId?}` options object
- `InhabitantUpdateResponseSchema` added to `useBookingValidation.ts`
- `getScaffoldableDinnerEvents` extracted to `useSeason.ts`
- E2E tests: preference→DINEIN creates orders, →NONE deletes, USER_CANCELLED respected, householdId filter works
- Fixed year-rollover bug in `seasonImport` (shortName from CSV dates, not current year)

## Summary

When a user updates their weekly dinner preferences, automatically re-scaffold their bookings for the active season's rolling window. **Reuses existing scaffolding infrastructure unchanged** - same logic as season activation and daily maintenance.

**Key Business Rule:** USER_CANCELLED entries (user explicitly cancelled a specific dinner) are ALWAYS respected. Preference changes affect the weekly pattern, not specific dinner cancellations.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  USER ACTION: Save Preferences (single or power mode)                       │
│  POST /api/admin/household/inhabitants/[id]?seasonId=123                    │
│  Body: { dinnerPreferences: {...} }                                         │
│  Query: seasonId (optional) - if not provided, uses active season           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  BACKEND: scaffoldHouseholdPrebookings(d1Client, householdId, seasonId?)    │
│  1. Fetch season (by seasonId if provided, else active season)              │
│  2. Call existing createHouseholdOrderScaffold (same logic everywhere)      │
│  3. Return ScaffoldResult { created, deleted, unchanged }                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  RESPONSE: { inhabitant, scaffoldResult }                                   │
│  Frontend shows toast with counts                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Concepts

### Same Scaffolding Logic Everywhere

| Trigger | Scaffolding Behavior |
|---------|---------------------|
| **Season activation** | Scaffold all households, respect USER_CANCELLED |
| **Daily maintenance** | Scaffold all households, respect USER_CANCELLED |
| **Preference change** | Scaffold single household, respect USER_CANCELLED |

**No special cases.** The scaffolder always:
1. Generates desired orders from current preferences
2. Reconciles with existing orders (create/delete/idempotent via `pruneAndCreate`)
3. Respects USER_CANCELLED keys (specific dinner cancellations)

### USER_CANCELLED vs Preference Change

| Action | Meaning | Scaffolder Behavior |
|--------|---------|---------------------|
| **Cancel dinner** | "I can't make THIS specific dinner" | Creates USER_CANCELLED audit, scaffolder skips this dinner forever |
| **Change preference** | "My weekly pattern changed" | Updates preference, scaffolder creates/deletes based on new pattern |

Example: User cancelled Monday Jan 15th but still has DINEIN preference for Mondays → other Monday dinners get scaffolded but Jan 15th stays cancelled.

### Scaffold Scope

| Update Type | Scaffold Scope |
|-------------|----------------|
| Single inhabitant | Whole household |
| Power mode (all inhabitants) | Whole household |
| Admin update | Whole household |

**Rationale:** Always scaffold the whole household for consistency. The scaffolder is idempotent.

---

## Architectural Decisions

### AD-1: Endpoint Design

**Decision:** Extend existing `POST /api/admin/household/inhabitants/[id]`

- Add optional `seasonId` to request body
- After updating preferences, call `scaffoldHouseholdPrebookings(d1Client, householdId, seasonId?)`
- Return `{ inhabitant, scaffoldResult }`

**Rationale:** DRY - one endpoint handles update + scaffolding. Preference change SHOULD trigger scaffolding.

### AD-2: Code Reuse

**Decision:** New utility `scaffoldHouseholdPrebookings(d1Client, householdId, seasonId?)`

- Calls existing `createHouseholdOrderScaffold` (curried pure function)
- If `seasonId` provided → fetch that season
- If `seasonId` omitted → fetch active season (production behavior)
- Same batching, same cancellation key logic, same everything

**Location:** `server/utils/scaffoldHouseholdPrebookings.ts`

### AD-3: Test Strategy

**Decision:** Optional `seasonId` parameter enables parallel-safe testing

| Test Type | Season Strategy |
|-----------|-----------------|
| **API E2E tests** | Create dedicated season per test, pass explicit `seasonId` as query param |
| **UI E2E tests** | Use singleton active season (existing pattern) |
| **Unit tests** | Mock scaffolder, test pure functions |

**Rationale:** API tests run in parallel - each needs isolated season. UI tests are sequential and can share singleton.

### AD-4: Response Type Architecture

**Decision:** Create explicit `InhabitantUpdateResponse` operation result type

**Location:** `app/composables/useBookingValidation.ts` (where `ScaffoldResultSchema` lives)

**Schema:**
```typescript
InhabitantUpdateResponseSchema = z.object({
    inhabitant: InhabitantDetailSchema,
    scaffoldResult: ScaffoldResultSchema.nullable()
})
```

**Rationale:**
- ADR-009's "two types per entity" applies to **entities**, not **operation responses**
- Precedent: `CreateOrdersResult`, `BillingImportResponse`, `DailyMaintenanceResult`
- `InhabitantDetail` remains unchanged (ADR-009 compliant)
- Response type is explicit, not "secret attributes"
- Lives in `useBookingValidation.ts` to avoid circular dependency (it already imports from `useCoreValidation`)

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `server/utils/scaffoldHouseholdPrebookings.ts` | Create | Household-scoped scaffolding utility |
| `server/routes/api/admin/household/inhabitants/[id].post.ts` | Modify | Call scaffolder after preference update, return `InhabitantUpdateResponse` |
| `app/composables/useBookingValidation.ts` | Modify | Add `InhabitantUpdateResponseSchema` |
| `app/composables/useSeason.ts` | Modify | Add `createScaffoldResultMessage` pure function |
| `app/stores/households.ts` | Modify | Return scaffold result from update methods |
| `app/components/household/HouseholdCard.vue` | Modify | Show toast with scaffold counts |

---

## UX: Toast Messages (Danish)

| Scenario | Title | Description |
|----------|-------|-------------|
| Orders created | "Bookinger opdateret" | "3 bookinger oprettet" |
| Orders deleted | "Bookinger opdateret" | "2 bookinger fjernet" |
| Mixed | "Bookinger opdateret" | "2 bookinger oprettet, 1 booking fjernet" |
| No changes | "Ingen ændringer" | "Dine bookinger matcher allerede dine præferencer" |
| No active season | (no toast) | Preferences saved, no scaffolding |

---

## Testing Strategy

### API E2E Tests (`tests/e2e/api/admin/inhabitant.e2e.spec.ts`)

| Test Case | Setup | Assertion |
|-----------|-------|-----------|
| Preference NONE→DINEIN creates orders | Dedicated season with dinner events | scaffoldResult.created > 0 |
| Preference DINEIN→NONE deletes orders | Pre-scaffolded orders | scaffoldResult.deleted > 0 |
| USER_CANCELLED respected | Order with USER_CANCELLED audit | Order NOT recreated |
| No active season | No seasonId, no active season | scaffoldResult.skipped = true |

### Unit Tests (`tests/component/composables/useSeason.unit.spec.ts`)

| Function | Test Cases |
|----------|------------|
| `createScaffoldResultMessage` | 0/0→"Ingen ændringer", 1/0→"1 booking oprettet", 2/1→"2 oprettet, 1 fjernet" |

---

## Query Budget

| Operation | Queries |
|-----------|---------|
| Update inhabitant | 1 |
| Fetch season (by ID or active) | 1 |
| Fetch household | 1 |
| Fetch orders for events | 1 |
| Fetch cancellation keys | 1 |
| Create orders (batched) | ~2 |
| Delete orders (batched) | ~4 |
| **Total** | **~11** |

Well within D1 limits (1,000 queries/invocation).

---

## ADR Compliance

| ADR | Compliance |
|-----|------------|
| **ADR-001** | Pure functions in composable, types from validation layer |
| **ADR-002** | Separate try-catch in endpoint, Zod validation |
| **ADR-004** | Logging with emoji prefix, no sensitive data |
| **ADR-007** | Store handles async, component shows loading |
| **ADR-009** | `InhabitantUpdateResponse` is operation result type (not third entity type) |
| **ADR-010** | Domain types throughout, serialization in repository |
| **ADR-014** | Reuses `chunkOrderBatch`, `pruneAndCreate` |
| **ADR-015** | Idempotent operation, rolling window respected |
