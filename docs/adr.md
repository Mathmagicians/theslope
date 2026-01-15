# Architecture Decision Records

**NOTE**: ADRs are numbered sequentially and ordered with NEWEST AT THE TOP.

## ADR-016: Unified Booking Through Scaffold

**Status:** Accepted | **Date:** 2026-01-11 | **Updated:** 2026-01-12

### Context

Abstract composite keys (`inhabitantId-dinnerEventId`) caused bugs:
1. NONE after deadline deletes instead of releases
2. Single-user edit deletes other household members
3. Guest tickets indistinguishable (same abstract key)

### Decision

**Use `orderId` for updates. Generator decides intent → Scaffolder executes.**

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GENERATOR (useBooking.ts)                   │
├─────────────────────────────────────────────────────────────────────┤
│ decideOrderAction(input) → { bucket, order } | null                 │
│   - Pure function, no side effects                                  │
│   - Returns bucket: create | update | delete | idempotent           │
│   - Sets state (BOOKED/RELEASED) and dinnerMode                     │
├─────────────────────────────────────────────────────────────────────┤
│ resolveDesiredOrdersToBuckets() - User mode (explicit orders)       │
│ resolveOrdersFromPreferencesToBuckets() - System mode (preferences) │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SCAFFOLDER (scaffoldPrebookings.ts)              │
├─────────────────────────────────────────────────────────────────────┤
│ Transform: DesiredOrder → OrderCreateWithPrice                      │
│   - Add bookedByUserId (from context)                               │
│   - Lookup priceAtBooking (from ticketPrices)                       │
│   - Add householdId                                                 │
├─────────────────────────────────────────────────────────────────────┤
│ Execute buckets:                                                    │
│   - create → createOrders()                                         │
│   - update → updateOrder() + releasedAt for releases                │
│   - delete → deleteOrder()                                          │
│   - idempotent → skip                                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Decision Matrix

| `orderId` | `dinnerMode` | `existing` | `deadline` | → Action |
|-----------|--------------|------------|------------|----------|
| absent | ≠ NONE | N/A | any | **CREATE** (state=BOOKED) |
| absent | = NONE | N/A | any | SKIP |
| present | = NONE | found | before | **DELETE** |
| present | = NONE | found | after | **UPDATE** (state=RELEASED) |
| present | ≠ NONE | RELEASED | any | **UPDATE** (state=BOOKED, reclaim) |
| present | ≠ NONE | same | any | **IDEMPOTENT** |
| present | ≠ NONE | diff | any | **UPDATE** (mode/price change) |
| present | any | not found | any | SKIP (stale) |

### DesiredOrder Schema

```typescript
DesiredOrderSchema = {
  inhabitantId: number,
  dinnerEventId: number,
  dinnerMode: DinnerMode,
  ticketPriceId: number,
  isGuestTicket: boolean,
  state: OrderState,           // Generator sets: BOOKED or RELEASED
  orderId?: number,            // Present for updates, absent for creates
  allergyTypeIds?: number[]    // Guest allergies
}
```

### Two Modes

| Mode | Trigger | Generator | Use Case |
|------|---------|-----------|----------|
| **System** | Preference change, cron | `resolveOrdersFromPreferencesToBuckets` | Scaffolding, preference updates |
| **User** | UI booking | `resolveDesiredOrdersToBuckets` | Grid view, single booking |

### Frontend Pattern

UI components emit `DesiredOrder[]` with `orderId` for existing orders:

```typescript
// Component emits orders with orderId from existing
const desiredOrders = selectedInhabitants.map(inhabitant => ({
  inhabitantId: inhabitant.id,
  dinnerEventId: event.id,
  dinnerMode: selectedMode,
  ticketPriceId: ticketPrice.id,
  isGuestTicket: false,
  state: OrderState.BOOKED,
  orderId: existingOrder?.id  // Key: include orderId for updates
}))
```

### Compliance

1. Generator MUST set `state` and `dinnerMode` - scaffolder doesn't re-derive
2. Scaffolder ONLY enriches (`priceAtBooking`, `bookedByUserId`, `releasedAt`)
3. UI MUST include `orderId` from existing orders for updates
4. Guest orders preserved (not managed by preferences)
5. User cancellations tracked in `cancelledKeys` set

### Key Files

| File | Role |
|------|------|
| `app/composables/useBooking.ts` | Generator: `decideOrderAction`, bucket resolvers |
| `app/composables/useBookingValidation.ts` | Schemas: `DesiredOrderSchema`, `ScaffoldResultSchema` |
| `server/utils/scaffoldPrebookings.ts` | Scaffolder: transforms and executes |

### Related ADRs

- **ADR-011**: Booking system schema (three-state order model)
- **ADR-014**: Batch operations and D1 limits
- **ADR-015**: Idempotent operations with pruneAndCreate pattern

---

## ADR-015: Idempotent Automated Jobs with Rolling Window

**Status:** Accepted | **Date:** 2025-12-12

### Context

TheSlope runs automated maintenance jobs (daily cron, season activation, billing imports) that must be resilient to failures, retries, and manual re-runs. In a serverless environment (Cloudflare Workers), jobs can fail mid-execution, be triggered multiple times, or need manual intervention after outages.

### Decision

**All automated jobs are idempotent and operate within a rolling time window.**

| Principle | Implementation |
|-----------|----------------|
| **Idempotent operations** | Running a job twice produces the same result as running it once |
| **Rolling window** | Pre-bookings scaffold for `today → today + 60 days` (configurable via `prebookingWindowDays`) |
| **Catch-up resilient** | Jobs process all qualifying records, not just "since last run" |
| **User agency preserved** | Users can manually book beyond the automated window |

### Rolling Window Pattern

```
Day 0 (Season Activation):
├── Scaffold pre-bookings: Day 1 → Day 60
└── Users can manually book: Day 61+

Day 1 (Daily Maintenance):
├── Consume past dinners (SCHEDULED/ANNOUNCED → CONSUMED)
├── Close orders on consumed dinners (BOOKED/RELEASED → CLOSED)
├── Create transactions for closed orders without one
└── Scaffold pre-bookings: Day 2 → Day 61 (window rolls forward)

Day N (After 3-day outage, manual re-run):
├── Consume ALL past unconsumed dinners (catch-up)
├── Close ALL pending orders on consumed dinners (catch-up)
├── Create transactions for ALL untransacted closed orders (catch-up)
└── Scaffold: Day N+1 → Day N+60 (current window)
```

### Idempotency Patterns

| Job | Idempotency Mechanism |
|-----|----------------------|
| **scaffoldPrebookings** | `pruneAndCreate` reconciles existing vs desired orders by `inhabitantId-dinnerEventId` key |
| **consumeDinners** | Only updates dinners with `state NOT IN (CONSUMED, CANCELLED)` that are past (already consumed = no-op) |
| **closeOrders** | Only updates orders with `state IN (BOOKED, RELEASED)` on CONSUMED dinners (already closed = no-op) |
| **createTransactions** | Only creates for orders with `Transaction: null` (existing transaction = skipped) |
| **generateDinnerEvents** | Uses `pruneAndCreate` to reconcile by date key |

### Configuration

```typescript
// app.config.ts
theslope: {
    prebookingWindowDays: 60  // Rolling window size
}
```

### Test Requirements

**E2E tests using date-filtered operations MUST create data within the rolling window:**

```typescript
// ❌ WRONG: Far-future dates outside 60-day window
seasonDates: { start: new Date('2099-01-01'), end: new Date('2099-01-03') }

// ✅ CORRECT: Dates within prebooking window
const tomorrow = new Date()
tomorrow.setDate(tomorrow.getDate() + 1)
seasonDates: { start: tomorrow, end: threeDaysFromNow }
```

### Benefits

1. **Resilience**: Server outages don't corrupt state - just re-run the job
2. **Simplicity**: No "last run" tracking or complex delta logic
3. **Debuggability**: Admin can trigger any job manually at any time
4. **User flexibility**: 60-day automated booking + unlimited manual booking ahead

### Compliance

1. Automated jobs MUST be safe to re-run at any time
2. Jobs MUST NOT depend on "time since last run" - always process current state
3. Jobs MUST use reconciliation patterns (`pruneAndCreate`, state checks) for idempotency
4. Date-filtered operations MUST respect the rolling window (`getPrebookingWindowDays()`)
5. Tests MUST use dates within the rolling window when testing scaffolding/maintenance

---

## ADR-014: Batch Operations and Utility Functions

**Status:** Accepted | **Date:** 2025-12-06 | **Updated:** 2026-01-15

### Decision

**Batch operations use curried chunking utilities and Prisma bulk methods to stay within D1 limits.**

D1 limits: **1,000 queries/invocation**, **100 bound parameters/statement**.

### Prisma D1 Adapter Auto-Chunking

Since Prisma 5.15.0, the D1 adapter automatically chunks certain queries to stay within D1's 100 variable limit.

**Confirmed behavior (tested 2025-12-13):**

| Operation | Auto-chunks? | Manual chunking needed? |
|-----------|--------------|------------------------|
| `createManyAndReturn` | ✅ Yes | No - Prisma handles it |
| `findMany` with includes | ✅ Yes | No - Prisma handles it |
| `updateMany` with `WHERE IN` | ❌ No | **Yes** - must chunk IDs |
| `deleteMany` with `WHERE IN` | ❌ No | **Yes** - must chunk IDs |

**Production evidence:** `updateMany` with 100 IDs + 2 data params failed with `D1_ERROR: too many SQL variables`. Reduced to 90 IDs to stay under limit.

### Raw SQL Workaround for Nested Includes

**Problem (2026-01-15):** Prisma's nested includes with large result sets exceed D1's 100 variable limit.

```
Query 1: SELECT orders WHERE dinnerEventId = ? (returns 139 orders) ✅
Query 2: SELECT orderHistory WHERE orderId IN (?,?,?...139 IDs...) ❌ D1_ERROR
```

Prisma D1 adapter does NOT support `relationJoins` (uses query splitting instead). When a parent query returns many rows, nested includes generate `WHERE IN (?,?,?...)` with too many variables.

**Solution:** Use raw SQL with proper JOINs for high-cardinality relations:

```typescript
// ❌ Prisma nested include - fails with 100+ parent rows
const orders = await prisma.order.findMany({
    where: { dinnerEventId },
    include: { OrderHistory: true }  // Generates WHERE orderId IN (?,?,?...)
})

// ✅ Raw SQL with JOIN - no variable limit issue
const sql = `
    SELECT o.*, oh.auditData
    FROM "Order" o
    LEFT JOIN (
        SELECT orderId, auditData,
            ROW_NUMBER() OVER (PARTITION BY orderId ORDER BY timestamp DESC) as rn
        FROM OrderHistory WHERE action = 'USER_CLAIMED'
    ) oh ON oh.orderId = o.id AND oh.rn = 1
    WHERE o.dinnerEventId = ?
`
const results = await d1Client.prepare(sql).bind(dinnerEventId).all()
```

**When to use raw SQL:**
- Nested includes on relations with unbounded cardinality
- Parent query may return 50+ rows with 2+ nested relations
- Performance-critical bulk reads

**Reference:** `fetchOrders()` in `financesRepository.ts` uses this pattern for provenance data.

### Prisma Bulk Operations

```typescript
// ✅ Use createManyAndReturn (Prisma auto-chunks for D1)
await prisma.order.createManyAndReturn({ data: orders })

// ❌ Not Promise.all of individual creates (N queries, hits 1000 query limit)
await Promise.all(events.map(e => prisma.dinnerEvent.create({ data: e })))

// ✅ For updates - batch to avoid param limit on IN clause
for (const batch of batches) {
    await Promise.all(batch.map(item => prisma.entity.update({ where: { id: item.id }, data: item })))
}
```

### Batch Utilities (`~/utils/batchUtils.ts`)

**`chunkArray<T>(size)`** - Curried array chunker:
```typescript
const chunkOrderBatch = chunkArray<Order>(200)  // Conservative, Prisma may handle more
const batches = chunkOrderBatch(orders)
```

| Operation | Batch Size | Rationale |
|-----------|------------|-----------|
| Order inserts (`createManyAndReturn`) | 200 | Conservative; Prisma auto-chunks |
| ID arrays for `updateMany`/`deleteMany` | 90 | D1 100 limit minus ~2 data params |
| Individual updates (`Promise.all`) | 50 | Each update ~2 params |

**`pruneAndCreate<T, K>(getKey, isEqual)`** - Reconcile existing vs incoming arrays:
```typescript
const reconcile = pruneAndCreate<TicketPrice, number>(
    tp => tp.id,
    (a, b) => a.price === b.price && a.ticketType === b.ticketType
)
const { create, update, idempotent, delete: toDelete } = reconcile(existing)(incoming)
```

### Compliance

1. Bulk inserts MUST use `createManyAndReturn`
2. Manual chunking is defense-in-depth; Prisma auto-chunks for D1
3. Curried chunkers MUST be defined in composables, not endpoints
4. Single mutations returning Detail MUST fetch after bulk create (ADR-009)

---

## ADR-013: External System Integration Pattern

**Status:** Accepted | **Date:** 2025-01-30 | **Updated:** 2025-11-26

### Decision

**TheSlope is source of truth; external systems are sync targets.**

| Principle | Rule |
|-----------|------|
| **Ownership** | Chef ops: user's token. Admin ops: system credentials |
| **Sync Direction** | Push on state change; lazy fetch inbound |
| **Idempotency** | Store external IDs (e.g., `heynaboEventId`) |
| **Error Handling** | Chef: fail with error. Admin: best-effort (warn, don't fail) |

### Heynabo API

| Method | Endpoint | Notes |
|--------|----------|-------|
| POST/GET/PATCH/DELETE | `/members/events/{id}` | ✅ PATCH for updates (PUT returns 501) |
| POST | `/members/events/{id}/files` | Image upload (FormData) |

**Note:** Heynabo uses `CANCELED` (one L).

### Compliance

1. External IDs MUST be nullable fields
2. Chef sync: use user's token, fail on error
3. Admin sync: use system credentials, warn on error (don't block local changes)
4. Heynabo updates MUST use PATCH
5. Image uploads: non-blocking (warn on failure)

---

## ADR-012: Prisma.skip for Optional Field Updates

**Status:** Accepted | **Date:** 2025-11-24 | **Updated:** 2026-01-02

### Decision

**Use `Prisma.skip` to omit optional fields in `data` objects only** - Never pass explicit `undefined` to Prisma `data` objects.

```typescript
// ✅ Use Prisma.skip in DATA objects
data: { optionalField: field === undefined ? Prisma.skip : serializeField(field) }

// ❌ Explicit undefined causes runtime error
data: { optionalField: field ? serializeField(field) : undefined }
```

**Semantics:** `Prisma.skip` = "don't update", `null` = "set to NULL"

### WHERE Clause Patterns

**CRITICAL: `Prisma.skip` does NOT work in WHERE clauses** - it silently fails to filter.

```typescript
// ❌ WRONG: Prisma.skip in WHERE - filter silently ignored!
where: householdId ? { id: householdId } : Prisma.skip

// ✅ CORRECT: Empty object for "no filter"
where: householdId !== undefined ? { id: householdId } : {}

// ✅ ALSO CORRECT: Spread pattern acceptable in WHERE
where: { ...(householdId && { id: householdId }) }
```

**Production bug (2026-01-02):** `Prisma.skip` in WHERE clause caused scaffolding to process ALL households instead of filtering to one, creating race conditions in parallel tests.

### Compliance

1. MUST use `Prisma.skip` for conditional field omission in `data` objects
2. MUST NOT use `Prisma.skip` in `where` clauses - use `{}` or spread pattern
3. MUST NOT use spread patterns in `data` objects (use `Prisma.skip`)
4. `undefined` in `where` clauses is acceptable (Prisma ignores undefined conditions)

---

## ADR-011: Booking System Schema Design

**Status:** Accepted | **Date:** 2025-11-08

### Decision

**Three-state order model with audit trail:** BOOKED → RELEASED → CLOSED

| Model | Key Fields |
|-------|------------|
| **Order** | `bookedByUserId` (payer), `inhabitantId` (eater), `priceAtBooking` (frozen), state timestamps |
| **OrderAudit** | `orderSnapshot` JSON preserves history including deletions |

**Cascade Strategy:**
- **CASCADE:** Order→DinnerEvent, Order→Inhabitant, Transaction→Order
- **SET NULL:** Order→User, OrderAudit→Order (preserve audit history)

### Compliance

1. Orders MUST track both `bookedByUserId` and `inhabitantId`
2. Audit entries MUST survive order/user deletion (SET NULL)
3. Deleted orders MUST capture `orderSnapshot` before removal
4. State transitions MUST create audit entries

---

## ADR-010: Domain-Driven Serialization Architecture

**Status:** Accepted | **Date:** 2025-10-15

### Decision

**Repository-layer serialization** - All layers work with domain types; only repository handles DB format.

```
UI ←→ HTTP ←→ API ←→ Store ←→ Repository ⟷ Database
(Season)                        (Season ⟷ SerializedSeason)
```

**Pattern in composables:**
```typescript
// Domain schema (arrays, objects)
const SeasonSchema = z.object({ holidays: z.array(DateRangeSchema) })

// Serialized schema (JSON strings)
const SerializedSeasonSchema = z.object({ holidays: z.string() })

// Transform functions
export const serializeSeason = (s: Season) => ({ ...s, holidays: JSON.stringify(s.holidays) })
export const deserializeSeason = (s: SerializedSeason) => ({ ...s, holidays: JSON.parse(s.holidays) })
```

### Compliance

1. API endpoints MUST accept/return domain types
2. Repository MUST serialize before writes, deserialize after reads
3. Composables MUST export: domain schema, serialized schema, transform functions
4. Tests MUST use domain types (no manual serialization)

---

## ADR-009: API Index Endpoint Data Inclusion Strategy

**Status:** Accepted | **Date:** 2025-01-28 | **Updated:** 2025-12-01

### Decision

**Include relations in index endpoints only if ALL criteria met:**
1. Bounded cardinality (max ~20 items)
2. Lightweight data (scalars only, 1 level deep)
3. Essential context
4. Performance safe

**Two types per entity only:**
- `EntityDisplay` - Index endpoints (lightweight)
- `EntityDetail` - Detail endpoints + mutations (comprehensive)

```typescript
GET  /api/admin/entity     → EntityDisplay[]
GET  /api/admin/entity/:id → EntityDetail
PUT  /api/admin/entity     → EntityDetail
POST /api/admin/entity/:id → EntityDetail
```

### Batch Operations and D1 Limits

**Batch operations MUST use Display types** to avoid exceeding D1's 1,000 query limit.

```typescript
// ❌ Detail type: 170 events × 10 queries = 1,700 queries (EXCEEDS LIMIT)
// ✅ Display type: 170 events × 1 query = 170 queries (OK)
```

Create lightweight repository functions for bulk updates (>10 entities).

### Operation Result Types

**The "two types per entity" rule applies to ENTITIES, not operation responses.**

Operation result types are **response envelopes** for operations with side effects (imports, scaffolding, maintenance jobs). They describe what the operation did, not the entities themselves.

| Category | Naming Pattern | Examples |
|----------|----------------|----------|
| **Entity types** | `EntityDisplay`, `EntityDetail` | `OrderDisplay`, `SeasonDetail` |
| **Operation results** | `OperationResult`, `OperationResponse` | `ScaffoldResult`, `BillingImportResponse` |

**When to use operation result types:**
- Batch operations that create/update/delete multiple entities
- Import operations summarizing what was processed
- Maintenance jobs reporting counts and side effects
- Operations returning both entities AND metadata (counts, errors, jobRunId)

**Codebase examples:**

| Composable | Operation Result Types |
|------------|------------------------|
| `useBookingValidation` | `CreateOrdersResult`, `ScaffoldResult`, `DailyMaintenanceResult` |
| `useBillingValidation` | `BillingImportResponse`, `BillingGenerationResult`, `MonthlyBillingResponse` |
| `useHeynaboValidation` | `HeynaboImportResponse` |
| `useMaintenanceValidation` | `SeasonImportResponse` |

**Placement:** Define operation result types in the validation composable where the operation's domain logic lives.

### Compliance

1. Index = display-ready, Detail = operation-ready
2. Mutations MUST return Detail schema
3. **ONLY 2 types per entity** - NO EntityResponse, Entity, etc.
4. Batch operations MUST use Display types
5. Prisma types MUST NOT leave repository layer (ADR-010)
6. Operation result types are NOT entity types - they MAY be added as needed for side-effect operations

---

## ADR-008: useEntityFormManager Composable Pattern

**Status:** Accepted | **Date:** 2025-01-28

### Decision

**Extract common form management:** mode state, URL sync (`?mode=create|edit|view`), transitions.

**Two patterns:**

| Pattern | Usage | Draft Management |
|---------|-------|------------------|
| **Full** | Deferred save (AdminPlanning) | Use `currentModel` from composable |
| **Partial** | Immediate save (AdminTeams) | Component owns draft |

```typescript
// Full usage
const { formMode, currentModel, onModeChange } = useEntityFormManager<Season>({
  getDefaultEntity: getDefaultSeason,
  selectedEntity: computed(() => store.selectedSeason)
})

// Partial usage - component owns draft
const { formMode, onModeChange } = useEntityFormManager<CookingTeam[]>({ ... })
const createDraft = ref<CookingTeam[]>([])
```

### Compliance

1. MUST use `useEntityFormManager` for URL/mode sync in CRUD forms
2. MUST initialize mode synchronously from URL (SSR-safe)

---

## ADR-007: SSR-Friendly Store Pattern with useAsyncData

**Status:** Accepted | **Date:** 2025-01-28 | **Updated:** 2025-11-11

### Decision

**Stores use `useAsyncData` with status-derived state. NO AWAITS anywhere.**

**Why `useAsyncData`:** Explicit `refresh()`, comprehensive status refs, works for static and reactive URLs.

### Store Pattern (Reference: `app/stores/plan.ts`)

```typescript
// List endpoint
const { data: seasons, status, error, refresh } = useAsyncData<Season[]>(
    'plan-store-seasons',
    () => $fetch('/api/admin/season'),
    { default: () => [], transform: data => data.map(s => SeasonSchema.parse(s)) }
)

// Detail endpoint with reactive key
const selectedId = ref<number | null>(null)
const { data: selected } = useAsyncData<Season | null>(
    computed(() => `season-${selectedId.value}`),
    () => selectedId.value ? $fetch(`/api/admin/season/${selectedId.value}`) : null
)

// Status computeds (4-state UI)
const isLoading = computed(() => status.value === 'pending')
const isErrored = computed(() => status.value === 'error')
const isInitialized = computed(() => status.value === 'success' && data.value !== null)
const isStoreReady = computed(() => /* combine all checks */)
```

### Responsibilities

| Layer | Owns |
|-------|------|
| **Store** | Server data, CRUD, business logic, initialization timing |
| **Component** | UI state (formMode, draft), URL sync, reactive loaders |
| **Page** | Call `initStore()` (synchronous, no await) |

### Component-Local Data Exception

Components MAY use `useAsyncData` directly when:
- Data is component-specific (not shared)
- Multiple instances need separate data
- Fetch calls **store methods** (NEVER direct `$fetch`)

### Compliance

1. MUST prefer `useAsyncData` over `useFetch`
2. MUST expose: `isLoading`, `isErrored`, `isInitialized`, `isEmpty`, `isStoreReady`
3. `isInitialized` MUST check data exists (not just status='success')
4. Init methods MUST be synchronous
5. Components MUST NOT contain server data (exception: component-local)
6. Components MUST show loaders based on `isStoreReady`

---

## ADR-006: URL-Based Navigation and Client-Side State

**Status:** Accepted | **Date:** 2025-01-27

### Decision

```
/admin/planning              # Path-based tab navigation
/admin/planning?mode=edit    # Query param for form mode
```

Draft state: In-memory Vue ref in component (no persistence).

### Compliance

1. Path-based routing for tabs
2. Query param `?mode=edit|create|view` for form mode
3. Draft data in component refs, not store

---

## ADR-005: Aggregate Entity Deletion and Repository Patterns

**Status:** Accepted | **Date:** 2025-01-27

### Decision

**Schema-driven deletion** - Let Prisma handle cascading (D1 has no transactions).

| Type | Behavior | Examples |
|------|----------|----------|
| **CASCADE** | Child deleted with parent | Inhabitant→Household, Order→DinnerEvent |
| **SET NULL** | Child preserved, FK nulled | Inhabitant→User, DinnerEvent→CookingTeam |

```typescript
// ✅ Single atomic operation - Prisma handles cascading
await prisma.season.delete({ where: { id: seasonId } })

// ❌ Manual multi-step deletion creates race conditions
```

### Compliance

1. Check Prisma schema for `onDelete` behavior before implementing
2. Use single atomic delete - let Prisma cascade
3. E2E tests must verify CASCADE and SET NULL behaviors

---

## ADR-004: Logging and Security Standards

**Status:** Accepted | **Date:** 2025-01-24

### Decision

| Level | Usage |
|-------|-------|
| `console.info` | Expected operations (200/201) |
| `console.warn` | Validation failures (400) |
| `console.error` | Server errors (500) |

**NEVER log:** `password`, `passwordHash`, `token`, full user objects

**Format:** `👨‍💻 > [MODULE] > [METHOD] message`

---

## ADR-003: BDD-Driven Testing Strategy with Factory Pattern

**Status:** Accepted | **Date:** 2025-01-24

### Decision

**Test-First:** E2E Test (BDD) → Unit Tests → Implementation → Tests Pass

**Factory Location:** `/tests/e2e/testDataFactories/`

```typescript
export class EntityFactory {
    static readonly defaultEntity = (testSalt?: string) => ({ entity, serializedEntity })
    static readonly createEntity = async (context, entity) => { /* PUT + assert 201 */ }
}
```

### Compliance

1. Start with E2E tests defining business behavior
2. Use Factory pattern for test data
3. Cleanup in `afterAll` using factories
4. Singleton test data cleaned up by global teardown only

---

## ADR-002: Event Handler Error Handling and Validation Patterns

**Status:** Accepted | **Date:** 2025-01-24

### Decision

**Separate try-catch blocks** for validation vs business logic:

```typescript
export default defineEventHandler(async (event) => {
    const d1Client = event.context.cloudflare.env.DB

    // Validation - FAIL EARLY (400)
    let id, data
    try {
        id = (await getValidatedRouterParams(event, idSchema.parse)).id
        data = await readValidatedBody(event, bodySchema.parse)
    } catch (e) { throw createError({ statusCode: 400, message: 'Invalid input', cause: e }) }

    // Business logic (500)
    try {
        return await businessLogic(d1Client, data)
    } catch (e) { throw createError({ statusCode: 500, message: 'Server Error', cause: e }) }
})
```

**H3 validation:** `getValidatedRouterParams`, `readValidatedBody`, `getValidatedQuery`

**Error codes:** 400 (validation), 404 (not found), 500 (server)

---

## ADR-001: Core Framework and Technology Stack

**Status:** Accepted | **Date:** 2025-01-22 | **Updated:** 2025-11-11

### Decision

**Stack:** Nuxt 4.1.1, Vue 3, TypeScript 5.7.3 (strict), Zod 3.24.1, Prisma 6.3.1 + D1, zod-prisma-types, Nuxt UI 3.3.3, Tailwind 4.1.13, Cloudflare Workers/Pages

### Three-Layer Type Architecture

```
Generated Layer          →  Validation Layer              →  Application Layer
(~~/prisma/generated/zod)   (composables/use*Validation.ts)  (stores, components, pages)
```

| Layer | Imports From | Exports |
|-------|--------------|---------|
| **Generated** | Prisma schema (auto) | Zod enum schemas, base types |
| **Validation** | Generated layer ONLY | Schemas, types (`z.infer`), re-exported enums |
| **Application** | Validation composables ONLY | N/A |

**Pattern:**
```typescript
// Validation composable
import { OrderStateSchema } from '~~/prisma/generated/zod'

export const useOrderValidation = () => ({
    OrderSchema: z.object({ state: OrderStateSchema, ... }),
    OrderStateSchema  // Re-export for app code
})
export type Order = z.infer<...>

// Application code
const { OrderStateSchema } = useOrderValidation()
if (order.state === OrderStateSchema.enum.BOOKED) { }
```

**Composable naming:**
- `useEntityValidation` - Schemas, types, transformations (required)
- `useEntity` - Business logic, calculations (optional, when intricate)

### Compliance

**Generated:** Committed to git, regenerate with `make prisma`

**Validation composables:**
1. MUST import enums from generated layer
2. MUST re-export enums for application code
3. MUST export types via `z.infer`

**Application code:**
1. MUST import from validation composables
2. MUST use `.enum` property for values
3. MUST NOT import from `~~/prisma/generated/zod` or `@prisma/client`

**Exceptions:**
- Build-time config (`app.config.ts`): MUST import from generated layer
- Server utilities: MUST import from generated layer (no auto-imports)
