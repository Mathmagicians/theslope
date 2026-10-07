# Architecture Decision Records

**NOTE**: ADRs are numbered sequentially and ordered with NEWEST AT THE TOP.
## ADR-018: Design System Owns Shared UI Patterns

**Status:** Accepted | **Date:** 2026-09-16

### Context

Shared UI values had drifted into per-component colour, variant and `:ui` patches; a token sweep that merged near-identical values changed the design.

### Decision

**`useTheSlopeDesignSystem` owns every shared UI value. Components bind a token and pass domain props only.**

| Pattern | Token | Bind |
|---|---|---|
| Colour | `COLOR`, `BG`, `TEXT`, `BORDER`, `RING`; surface palettes `CHEF_CALENDAR`, `DINNER_CALENDAR`, `PLANNING_CALENDAR`, `TICKET_TYPE_COLORS`, `ORDER_STATE_COLORS`, `PANTONE_CHIPS` | `:class="TEXT.muted"`, `:color="COLOR.primary"` |
| Alerts | `ALERTS.<kind>` — `info`, `neutral`, `success`, `warning`, `error`, `legend`, `emptyState`, `emptyStateCompact` — plus the `withActions` modifier | `v-bind="ALERTS.warning"`, `v-bind="{...ALERTS.info, ...ALERTS.withActions}"` |
| Buttons | `BUTTONS.<kind>` with `ICONS` | `v-bind="BUTTONS.secondaryAction" :color="COLOR.primary" :icon="ICONS.edit"` |
| Calendars | `COMPONENTS.calendarGrid`, `CALENDAR.picker`, `dayCircleClasses(variant)` | `v-bind="COMPONENTS.calendarGrid"`; every day circle renders through the helper |
| Table empty states | the `UTable` `#empty` slot | one empty state per table, inside the slot |

A token holds exactly one value. Two values are two tokens, named by where they are used. Merging values is a design
decision the user takes from a visual proposal.

### Enforcement

`tests/component/architecture/designSystemUsage.unit.spec.ts` reads every `.vue` under `app/` and fails on a rule breach; the rule inventory lives in `docs/testing.md` (Architecture Tests). Tests assert usage and behaviour, never a token's value.

### Compliance

1. A new Nuxt UI component family gets a token before its first use, and its architecture rule lands in the same change
2. Token sweeps are value-preserving; the proof is a before/after comparison of the classes each template renders
3. The design system is client-only and never imported from `server/` (ADR-017)
4. `docs/ui.md` documents every token and names the visual check a change requires

### Key Files

| File | Role |
|------|------|
| `app/composables/useTheSlopeDesignSystem.ts` | Tokens and the responsive factories `createResponsiveAlerts`, `createResponsiveButtons`, `createDayCircleClasses` |
| `tests/component/architecture/designSystemUsage.unit.spec.ts` | The six rules |
| `docs/ui.md` | Token reference, alert kinds, edit affordances, calendar presets |

### Related ADRs

- **ADR-017**: the design system is a client-only composable; `use<Domain>Ui` composables carry domain presentation on top of it
- **ADR-001**: the design system carries no domain types; those come from validation composables

---

## ADR-017: Isomorphic Composables, Pure UI Composables and Per-Context Type Checking

**Status:** Accepted | **Date:** 2026-09-02

### Context

Nuxt builds two bundles: app auto-imports (`app/composables`, `app/utils`, Vue, Pinia, nuxt-auth-utils app composables) exist only in the app bundle; the Nitro bundle auto-imports `server/utils` and h3 only. ADR-001 allows `server/` to import selected composables explicitly, so those composables run in both bundles — a bare auto-imported call in one typechecks under the legacy root tsconfig and throws on the first server call.

### Decision

**Composables the server imports are isomorphic; presentation lives in pure UI composables; `pre:all` typechecks every generated project.**

| Kind | Location / naming | Rules |
|------|-------------------|-------|
| **Isomorphic composable** | `app/composables/use<Domain>.ts`, `use<Domain>Validation.ts` — anything imported from `server/` | Explicit imports only (no auto-imports). No Vue reactivity, Pinia stores, nuxt-auth-utils app composables (`useUserSession`), NuxtUI or design-system calls. Types shared with the repository live in validation composables (`TransactionCreateData`), never imported from `server/` |
| **Pure UI composable** | `app/composables/use<Domain>Ui.ts` (`useBookingUi`, `useUserRolesUi`) | Client-only, never imported from `server/`. Owns badges, icons, labels, action previews, store-aware predicates. May use auto-imports |
| **Design system** | `useTheSlopeDesignSystem.ts` | Owns every shared UI value (ADR-018); not booking- or user-aware; never server-reachable |
| **Session predicates** | `app/stores/auth.ts` | `isMemberOfHousehold` and other session-aware checks wrap the isomorphic predicates from `usePermissions` |
| **Type augmentations** | `shared/types/*.d.ts` (or `server/types/` when server-only) | Nuxt 4 rule: augmentations outside `app/`, `server/`, `shared/` are invisible to the per-context projects |

### Gate

`npm run pre:all` (lint + the three typecheck projects — commands in `CLAUDE.md`) runs in CI before unit tests; a bare auto-import in a server-reachable composable fails as `TS2304` in `ts:server`.

**Follow-up:** adopt Nuxt 4's root `references` layout + `nuxt typecheck` (`vue-tsc -b`) once nuxt/nuxt#34385 is fixed; until then `server/tsconfig.json` is the gate target.

### Compliance

1. A composable imported from `server/` MUST NOT contain a bare auto-imported call; `npm run ts:server` MUST be clean
2. Presentation code (icons, colors, labels, badge factories, store-aware predicates) MUST live in `use<Domain>Ui`, stores or components — never in isomorphic composables
3. `use<Domain>Ui` and the design system MUST NOT be imported from `server/`
4. App code MUST NOT import from `~~/server/**`; shared types go through validation composables
5. New type augmentations go in `shared/types/` or `server/types/`

### Key Files

| File | Role |
|------|------|
| `app/composables/useBookingUi.ts` | Deadline badges, `STEP_ICONS`, action preview |
| `app/composables/useUserRolesUi.ts` | Role labels/icons/visibility (auth store) |
| `app/composables/useUserRoles.ts` | Server-safe role reconciliation |
| `shared/types/cloudflare.d.ts` | `H3EventContext.cloudflare`, Nitro `TaskContext.cloudflare` |
| `server/tsconfig.json` | Extends `.nuxt/tsconfig.server.json`; target of `ts:server` |

### Related ADRs

- **ADR-001**: Three-layer type architecture (exceptions list now points here)
- **ADR-010**: Domain types cross layers through validation composables

---


## ADR-016: Unified Booking Through Scaffold

**Status:** Accepted | **Date:** 2026-01-11 | **Updated:** 2026-03-04

### Context

Abstract composite keys (`inhabitantId-dinnerEventId`) caused bugs:
1. NONE after deadline deletes instead of releases
2. Single-user edit deletes other household members
3. Guest tickets indistinguishable (same abstract key)

### Decision

**Use `orderId` for updates. Generator decides intent → Scaffolder executes.**

### Architecture

| Stage | File | Role |
|-------|------|------|
| **Generator** | `useBooking.ts` | `decideOrderAction(input) → { bucket, order } \| null` — pure function, returns bucket `create \| update \| delete \| idempotent`, sets `state` (BOOKED/RELEASED) and `dinnerMode`. Entry points: `resolveDesiredOrdersToBuckets` (user mode), `resolveOrdersFromPreferencesToBuckets` (system mode) |
| **Scaffolder** | `scaffoldPrebookings.ts` | Transforms `DesiredOrder → OrderCreateWithPrice` (adds `bookedByUserId`, `priceAtBooking`, `householdId`) and executes the buckets: `createOrders()`, `updateOrder()` + `releasedAt` for releases, `deleteOrder()`, skip idempotent |

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

### Residency Period Filtering

`isHouseholdActiveOnDay(movedInDate, moveOutDate)` curried predicate filters dinner events per-household before generators run. Events on move-in/move-out day are included.

### Re-scaffold on Field Change

`rescaffoldOnFieldChange` triggers immediate re-scaffold when `dinnerPreferences`, `birthDate`, `moveOutDate`, or `movedInDate` change.

### Two Modes

| Mode | Trigger | Generator | Use Case |
|------|---------|-----------|----------|
| **System** | Preference change, cron, field change | `resolveOrdersFromPreferencesToBuckets` | Scaffolding, preference updates, residency changes |
| **User** | UI booking | `resolveDesiredOrdersToBuckets` | Grid view, single booking |

### Compliance

1. Generator MUST set `state` and `dinnerMode` - scaffolder doesn't re-derive
2. Scaffolder ONLY enriches (`priceAtBooking`, `bookedByUserId`, `releasedAt`)
3. UI MUST include `orderId` from existing orders for updates
4. Guest orders preserved (not managed by preferences)
5. User cancellations tracked in `cancelledKeys` set
6. Generators MUST receive dinner events filtered by `isHouseholdActiveOnDay`
7. Booking-relevant field changes MUST trigger immediate re-scaffold via `rescaffoldOnFieldChange`

### Key Files

| File | Role |
|------|------|
| `app/composables/useBooking.ts` | Generator: `decideOrderAction`, bucket resolvers |
| `app/composables/useBookingValidation.ts` | Schemas: `DesiredOrderSchema`, `ScaffoldResultSchema` |
| `app/composables/useHousehold.ts` | `isHouseholdActiveOnDay` residency predicate |
| `server/utils/scaffoldPrebookings.ts` | Scaffolder: transforms, executes, `rescaffoldOnFieldChange` |

### Related ADRs

- **ADR-011**: Booking system schema (three-state order model)
- **ADR-014**: Batch operations and D1 limits
- **ADR-015**: Idempotent operations with pruneAndCreate pattern

---

## ADR-015: Idempotent Automated Jobs with Rolling Window

**Status:** Accepted | **Date:** 2025-12-12

### Context

Automated jobs (daily cron, season activation, billing imports) run on Cloudflare Workers, where a run can fail mid-execution, fire twice, or be re-run manually after an outage.

### Decision

**All automated jobs are idempotent and operate within a rolling time window.**

| Principle | Implementation |
|-----------|----------------|
| **Idempotent operations** | Running a job twice produces the same result as running it once |
| **Rolling window** | Pre-bookings scaffold for `today → today + 60 days` (configurable via `prebookingWindowDays`) |
| **Catch-up resilient** | Jobs process all qualifying records, not just "since last run" |
| **User agency preserved** | Users can manually book beyond the automated window |

### Rolling Window Pattern

Daily maintenance consumes past dinners (SCHEDULED/ANNOUNCED → CONSUMED), closes orders on consumed dinners (BOOKED/RELEASED → CLOSED), creates transactions for closed orders without one, then scaffolds pre-bookings for `today → today + 60 days`. A re-run after an outage catches up by itself: each step processes all qualifying records and the scaffold window starts from the current day. Users book manually beyond the window.

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

The Prisma D1 adapter splits queries instead of using `relationJoins`: when a parent query returns many rows, a nested include generates `WHERE <fk> IN (?,?,?...)` past the 100 variable limit (`D1_ERROR: too many SQL variables`). Use raw SQL with JOINs when a nested include targets a relation with unbounded cardinality, the parent query may return 50+ rows with 2+ nested relations, or the read is a performance-critical bulk read. Reference: `fetchOrders()` in `financesRepository.ts`.

### Prisma Bulk Operations

```typescript
// Bulk insert: createManyAndReturn (Prisma auto-chunks for D1); per-row creates hit the 1,000 query limit
await prisma.order.createManyAndReturn({ data: orders })

// Updates: chunk IDs, Promise.all per batch (param limit on IN clauses)
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

**Status:** Accepted | **Date:** 2025-01-30 | **Updated:** 2026-08-19

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

### Heynabo Import Routing (Multiple Households per Address)

`Household.heynaboId` is NOT unique — multiple households can share an address (old family leaving, new family arriving). The import service uses `buildResolvedHouseholdMap` (Decision 4 in `feature-proposal-move-out-date.md`) to deterministically pick one household per heynaboId for reconciliation and inhabitant routing. All households at the same heynaboId receive Heynabo-owned field updates (name, address); each household's TheSlope-owned fields (pbsId, movedInDate, moveOutDate) are preserved individually via `mergeHouseholdForUpdate`.

### Household & Inhabitant Lifecycle (Decided 2026-08-19)

| Entity | Lifecycle rule |
|--------|----------------|
| **Household** | **Preserved on move-out.** The row keeps `moveOutDate` for billing history; the import keeps the row while its address exists in Heynabo. |
| **Inhabitant** | **Always follows Heynabo.** Deleted in Heynabo → hard-deleted in TheSlope (no tombstones, no view-level residency filtering as a substitute). Identity is global via `Inhabitant.heynaboId @unique`, so reconciliation MUST be global (all existing vs all incoming) — household-scoped reconciliation lets inhabitants in sibling households at the same address escape deletion. |
| **User** | Deleted before its inhabitant (import order). Payer identity survives in `Transaction.userSnapshot`. |

**Deletion safety is schema-designed, not caller-guarded** (ADR-005 + ADR-011): `Allergy`/`Order`/`CookingTeamAssignment` CASCADE; billing survives via `Transaction.orderSnapshot` (SET NULL); audit survives via `OrderHistory`'s denormalized `inhabitantId`/`dinnerEventId`/`seasonId`. Past dinners lose chef attribution (`chefId → null`); no view renders past chefs, and duty roster (`DutyHistory`) owns attribution history. Business-level chef-loss handling (Heynabo event delete + `CHEF_LOSS_DINNER_UPDATES` + allergen clear) lives in ONE shared server routine — callers MUST NOT duplicate guard logic.

**Operational timing:** Heynabo admins delete users ~1 month AFTER move-out, and orders are never scaffolded past `moveOutDate` (#88). By deletion time no unbilled orders exist, so the nightly cron order (heynabo-import 01:00 UTC before daily-maintenance 02:00 UTC) is intentionally safe — do not reorder.

### Compliance

1. External IDs MUST be nullable fields
2. Chef sync: use user's token, fail on error
3. Admin sync: use system credentials, warn on error (don't block local changes)
4. Heynabo updates MUST use PATCH
5. Image uploads: non-blocking (warn on failure)
6. External ID → internal ID resolution is an integration concern (import service / routing module), NOT a persistence concern. Repository MUST NOT resolve ambiguous external IDs.
7. `Map.groupBy` is NOT available in Cloudflare Workers runtime. Use `groupBy` from `~/utils/batchUtils.ts` for server-side grouping.

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
5. Repository WHERE clauses MUST use unique fields (`id` or `@unique` constraints). Non-unique lookups MUST be resolved by caller before reaching the repository.

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

**The "two types per entity" rule applies to ENTITIES, not operation responses.** Operation result types (`<Operation>Result` / `<Operation>Response`, e.g. `ScaffoldResult`, `BillingImportResponse`) are response envelopes for operations with side effects — batch mutations, imports, maintenance jobs, and operations returning entities plus metadata (counts, errors, jobRunId). They describe what the operation did, not the entities. Define them in the validation composable where the operation's domain logic lives; the inventory lives in `docs/adr-compliance-frontend.md` (Composable Compliance).

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

**Status:** Accepted | **Date:** 2025-01-28 | **Updated:** 2026-10-07

### Decision

**Stores read through `storeAsyncData` and write through `apiRequest`, both from `useApiHandler`. State is status-derived. NO AWAITS anywhere.**

| Call | Shape | What it owns |
|------|-------|--------------|
| `storeAsyncData(key, url, {schema, default, errorMessage?, enabled?, dependsOn?, ...options})` | `useAsyncData` over the request fetch (`useRequestFetch`, captured once) | The dataset's type is the schema's output (`schema: ZodType<T>` → `data: Ref<T>`); `transform` parses with the schema; a failed request or parse goes through `handleApiError` with `errorMessage`; `key` and `url` take a value or a getter, and the dataset refetches when its url changes or its gate opens; `enabled` gates the request: while it is false the dataset reads `idle` with its default; `dependsOn: [dataset, …]` resolves the url and the gate once those datasets have loaded, so the server render awaits the chain; `watch`, `immediate`, `lazy`, `deep` pass through |
| `apiRequest(url, {action, errorMessage?, schema?, ...fetchOptions})` | The request fetch for a write or a one-shot read | Parses the response with `schema` when given; a failure goes through `handleApiError` and rethrows |

### Store Pattern (Reference: `app/stores/plan.ts`)

```typescript
const {storeAsyncData, apiRequest} = useApiHandler()

// List endpoint: typed Ref<Season[]> by the schema
const {data: seasons, status, error, refresh} = storeAsyncData('plan-store-seasons', '/api/admin/season', {
    schema: SeasonSchema.array(),
    default: () => []
})

// Selection-driven detail: the url reads the selection, `enabled` gates it, `dependsOn` awaits the
// datasets the selection resolves from; the key stays constant because the id resolves mid-render
const selectedSeasonId = computed(() => chosenSeasonId.value ?? getDefaultSeasonId())
const {data: selectedSeason} = storeAsyncData(
    'plan-store-selected-season',
    () => `/api/admin/season/${selectedSeasonId.value}`,
    {
        schema: SeasonSchema.nullable(), default: () => null, errorMessage: 'Kunne ikke hente sæson',
        enabled: () => !!selectedSeasonId.value,
        dependsOn: [seasonsDataset, activeSeasonIdDataset]
    }
)

// Write: the store action owns the request, the refresh and the success toast
const updateSeason = async (season: Season) => {
    const result = await apiRequest(`/api/admin/season/${season.id}`, {
        method: 'POST', body: season, schema: SeasonUpdateResponseSchema, action: 'updateSeason'
    })
    await refresh()
    toast.add({title: 'Sæson opdateret', description: formatSeasonUpdate(result), color: COLOR.success})
    return result
}

// Status computeds (4-state UI)
const isLoading = computed(() => status.value === 'pending')
const isErrored = computed(() => status.value === 'error')
const isInitialized = computed(() => status.value === 'success' && data.value !== null)
const isStoreReady = computed(() => /* combine all checks */)
```

### Responsibilities

| Layer | Owns |
|-------|------|
| **Store** | Server data, CRUD, business logic, initialization timing, the toast that reports a store action's result |
| **Component** | UI state (formMode, draft), URL sync, reactive loaders |
| **Page** | Call `initStore()` (synchronous, no await) |

### Component-Local Data Exception

Components MAY use `useAsyncData` directly when:
- Data is component-specific (not shared)
- Multiple instances need separate data
- Fetch calls **store methods** built on `apiRequest` (`planStore.fetchTeamDetail`, `bookingsStore.fetchOrderDetail`)

### Compliance

1. Store reads MUST use `storeAsyncData`; writes and one-shot reads MUST use `apiRequest`
2. MUST expose: `isLoading`, `isErrored`, `isInitialized`, `isEmpty`, `isStoreReady`
3. `isInitialized` MUST check data exists (not just status='success')
4. Init methods MUST be synchronous
5. Components MUST NOT contain server data (exception: component-local)
6. Components MUST show loaders based on `isStoreReady`
7. `tests/component/architecture/fetchUsage.unit.spec.ts` fails a `$fetch(` or `useRequestFetch(` under `app/` outside `app/composables/useApiHandler.ts`
8. A gated read puts its condition on `enabled`; the dataset reads `idle` while the condition is false, and the store's ready flag counts the datasets the store requests
9. A dataset reads its selection through getters (`planStore.selectedSeasonId`, `householdsStore.selectedHouseholdId`, the store's own selected ids) and declares the datasets that selection resolves from in `dependsOn`; its key stays constant. A page calls a setter for a scope no store holds (`loadOrdersForDinners`, `loadUpcomingOrders`, `loadHouseholdBilling`)

---

## ADR-006: URL-Based Navigation and Client-Side State

**Status:** Accepted | **Date:** 2025-01-27 | **Updated:** 2026-03-04

### Decision

```
/admin/planning              # Path-based tab navigation
/admin/planning?mode=edit    # Query param for form mode
/household/S_31/bookings?pbs=12345  # Household disambiguation
```

Draft state: In-memory Vue ref in component (no persistence).

### Household URL Disambiguation

`?pbs=X` query param on household routes. `pbsId` is always unique. `getHouseholdUrl(shortName, pbsId, tab?)` utility builds all household URLs. Store persists init args in refs so watchers can re-invoke after async data loads.

**Resolution priority:** `pbsId` → match by `pbsId`. No `pbsId`, one `shortName` match → use it. No `pbsId`, multiple `shortName` matches → user's own household, else first match. No match → current selection or user's household.

### Compliance

1. Path-based routing for tabs
2. Query param `?mode=edit|create|view` for form mode
3. Draft data in component refs, not store
4. Household URLs MUST use `getHouseholdUrl()` to include `?pbs=X`

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

**Generated:** Committed to git, regenerate with `make d1-prisma`

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
- Composables imported by `server/`: explicit imports only, no UI dependencies - see ADR-017
