# Architecture Decision Records

**NOTE**: ADRs are numbered sequentially and ordered with NEWEST AT THE TOP.

## ADR-011: Booking System Schema Design

**Status:** Accepted | **Date:** 2025-11-08

### Decision

**Three-state order model with comprehensive audit trail** - Orders transition through BOOKED→RELEASED→CLOSED states with full audit logging for dispute resolution.

**Schema Design:**
- **OrderState enum**: BOOKED, RELEASED, CLOSED (no CANCELLED - deleted instead)
- **Order model**: Tracks `bookedByUserId` (financial owner), `inhabitantId` (ticket holder), `priceAtBooking` (frozen), state timestamps
- **OrderAudit model**: Preserves full history including deletions via `orderSnapshot` JSON

**CASCADE/SET NULL Strategy:**
- **CASCADE**: Order→DinnerEvent, Order→Inhabitant, Transaction→Order (existential dependencies)
- **SET NULL**: Order→User(bookedByUserId), OrderAudit→Order, OrderAudit→all actors (preserve history)

### Rationale

1. **Financial clarity**: Explicit `bookedByUserId` tracks who pays vs who eats
2. **Audit resilience**: SET NULL on audit relations preserves dispute evidence
3. **State simplicity**: Three states match business flow (no complex pending states)
4. **Price integrity**: Frozen `priceAtBooking` prevents retroactive changes
5. **D1 compatibility**: No database transactions needed - atomic operations only

### Compliance

1. Orders MUST track both `bookedByUserId` (payer) and `inhabitantId` (eater)
2. Audit entries MUST survive order/user deletion (SET NULL relations)
3. Deleted orders MUST capture `orderSnapshot` JSON before removal
4. State transitions MUST create audit entries with performer tracking
5. Migration MUST populate existing orders: CLOSED if transaction exists, BOOKED otherwise

## ADR-010: Domain-Driven Serialization Architecture

**Status:** Accepted | **Date:** 2025-10-15

### Decision

**Repository-layer serialization** - Move database format conversion (JSON strings, SQLite constraints) to repository layer, keeping all other layers working with domain types.

**Data Flow:**

```
UI/Client ←→ HTTP ←→ API ←→ Store ←→ Repository ⟷ Database
(Season)     (Season)  (Season) (Season)  (Season ⟷ SerializedSeason)
```

**Layer responsibilities:**
- **UI/Client**: Domain types (Season with Date objects, arrays)
- **HTTP**: Domain types (transparent transport via $fetch auto-serialization)
- **API**: Domain types (validate with SeasonSchema, accept/return Season)
- **Store**: Domain types (work with Season directly)
- **Repository**: Serialize before DB write, deserialize after DB read

**Elegant Schema Pattern** in composables:

```typescript
// Domain schema
const SeasonSchema = z.object({
  cookingDays: z.record(z.enum(WEEKDAYS), z.boolean()),
  holidays: z.array(DateRangeSchema)
})

// Serialized schema (database format)
const SerializedSeasonSchema = z.object({
  cookingDays: z.string(), // JSON stringified
  holidays: z.string()     // JSON stringified
})

// Transform functions
export function serializeSeason(season: Season): SerializedSeason {
  return { ...season, cookingDays: JSON.stringify(season.cookingDays) }
}

export function deserializeSeason(serialized: SerializedSeason): Season {
  return { ...serialized, cookingDays: JSON.parse(serialized.cookingDays) }
}
```

**Repository implementation:**

```typescript
async function createSeason(d1: D1Database, season: Season): Promise<Season> {
  const serialized = serializeSeason(season)
  const created = await prisma.season.create({ data: serialized })
  return deserializeSeason(created)
}
```

### Rationale

1. **Separation of concerns**: DB format is implementation detail, not API contract
2. **Type safety**: Domain types throughout application code, serialization isolated
3. **Migration flexibility**: Can change DB from SQLite JSON strings to PostgreSQL JSONB without touching API/UI
4. **Clean testing**: Factories work with domain types, no serialization in tests

### Compliance

1. API endpoints MUST accept/return domain types (Season, not SerializedSeason)
2. Validation schemas MUST use domain types (SeasonSchema for API, SerializedSeasonSchema for repository only)
3. Composables MUST export: domain schema, serialized schema, serialize/deserialize functions
4. Repository MUST serialize before writes, deserialize after reads
5. Tests MUST use domain types (no manual serialization in factories)

### Related ADRs
- **ADR-001:** Zod schemas in composables
- **ADR-002:** API validation patterns
- **ADR-005:** Repository pattern

---

## ADR-009: API Index Endpoint Data Inclusion Strategy

**Status:** Accepted | **Date:** 2025-01-28

### Decision

**Weight-based relation inclusion for index endpoints** - Include relations if ALL criteria met:

1. **Bounded Cardinality** (1:1 or 1:few, max ~20 items)
2. **Lightweight Data** (scalar fields only, max 1 level)
3. **Essential Context** (necessary to understand list item)
4. **Performance Safe** (no degradation at scale)

**Index endpoints** (`GET /api/admin/[entity]`): Display-ready data with lightweight relations
**Detail endpoints** (`GET /api/admin/[entity]/[id]`): Operation-ready data with comprehensive relations

### Examples

**✅ Household → Inhabitants (basic)**
```typescript
// GET /api/admin/household - Returns HouseholdListItem[]
export type HouseholdListItem = Household & {
  inhabitants: Pick<Inhabitant, 'id' | 'name' | 'lastName' | 'pictureUrl' | 'birthDate'>[]
}

fetchHouseholds() {
    return prisma.household.findMany({
        include: {
            inhabitants: {
                select: { id: true, name: true, lastName: true, pictureUrl: true, birthDate: true }
            }
        }
    })
}
```
Bounded (~5-10), lightweight (scalars), essential (identity), performant (single JOIN)

**❌ Season → DinnerEvents**
```typescript
// GET /api/admin/season - Returns Season[]
fetchSeasons() {
    return prisma.season.findMany() // No includes
}
```
Unbounded (100+), heavy (nested), not essential, performance risk

### Compliance

1. Use Prisma Payload types: `EntityListItem` vs `EntityDetail`
2. Use `select` for lightweight fields in included relations
3. Document criteria decisions in repository comments
4. Index = display-ready, Detail = operation-ready

---

## ADR-008: useEntityFormManager Composable Pattern

**Status:** Accepted | **Date:** 2025-01-28

### Decision

**`useEntityFormManager` composable extracts common form management logic:**
- Form mode state (`formMode`)
- URL query synchronization (`?mode=create|edit|view`)
- Mode transitions (`onModeChange`)
- Optional: Draft entity management (`currentModel`)

**Two usage patterns:**

1. **Full usage** - Deferred save (AdminPlanning):
   - Use `currentModel` for draft management
   - Explicit save button ("Gem ændringer")
   - Static default entity generation

2. **Partial usage** - Immediate operations (AdminTeams):
   - Use only `formMode` + `onModeChange` for URL/mode management
   - Component owns draft (dynamic generation)
   - Operations save immediately (no explicit save button)

### Implementation

**Full usage (static defaults, deferred save):**
```typescript
const { formMode, currentModel, onModeChange } = useEntityFormManager<Season>({
  getDefaultEntity: getDefaultSeason,
  selectedEntity: computed(() => store.selectedSeason)
})
// currentModel used directly in form
```

**Partial usage (dynamic generation, immediate save):**
```typescript
const { formMode, onModeChange } = useEntityFormManager<CookingTeam[]>({
  getDefaultEntity: () => [],
  selectedEntity: computed(() => store.teams)
})

// Component owns draft
const createDraft = ref<CookingTeam[]>([])
watch([formMode, teamCount], () => {
  if (formMode.value === FORM_MODES.CREATE) {
    createDraft.value = generateTeams(teamCount.value)
  }
})
```

### Compliance

1. MUST use `useEntityFormManager` for URL/mode synchronization in all CRUD forms
2. MAY skip `currentModel` when component needs custom draft logic
3. MUST initialize mode synchronously from URL (SSR-safe)

### Related ADRs
- **ADR-007:** Separation of Concerns (component owns formMode/draft, store owns data)
- **ADR-006:** URL-Based Navigation (mode in query parameters)

---

## ADR-007: SSR-Friendly Store Pattern with useFetch

**Status:** Accepted | **Date:** 2025-01-28
**Updated:** 2025-10-29 (reactive initialization with internal watchers)

### Decision

**Stores use `useFetch` singleton pattern with status-derived state. Components own UI state. Stores handle initialization timing internally via watchers - NO AWAITS anywhere.**

### Store Pattern

```typescript
// List fetch - static URL
const {
    data: seasons, status: seasonsStatus,
    error: seasonsError, refresh: refreshSeasons
} = useFetch<Season[]>('/api/admin/season', {
    immediate: false,
    watch: false,      // ⚠️ CRITICAL: Prevents auto-refetch on reactive deps
    default: () => []
})

// Detail fetch - reactive URL
const selectedSeasonId = ref<number | null>(null)
const {
    data: selectedSeason, status: selectedSeasonStatus,
    error: selectedSeasonError, refresh: refreshSelectedSeason
} = useFetch<Season>(
    () => `/api/admin/season/${selectedSeasonId.value}`,
    { immediate: false, watch: false }  // ⚠️ CRITICAL: watch: false required!
)

// Status-derived computed (4-state UI)
const isSeasonsLoading = computed(() => seasonsStatus.value === 'pending')
const isSeasonsErrored = computed(() => seasonsStatus.value === 'error')
const isSeasonsInitialized = computed(() => seasonsStatus.value === 'success')
const isNoSeasons = computed(() => isSeasonsInitialized.value && seasons.value.length === 0)

// Idempotent init
const initStore = async (shortName?: string) => {
    if (!isSeasonsInitialized.value || isSeasonsErrored.value) await refreshSeasons()

    const season = shortName ? seasons.value.find(s => s.shortName === shortName) : seasons.value[0]
    if (season && season.id !== selectedSeasonId.value) {
        selectedSeasonId.value = season.id
        await refreshSelectedSeason()
    }
}
```

### Responsibilities

**Store:** Server data, CRUD actions, business logic computed (disabledModes), **initialization timing**
**Component:** UI state (formMode, draft), URL sync, mode transitions, **show loaders reactively**
**Page:** Call `initStore()` (synchronous) - no await

### Reactive Initialization Pattern

**NO AWAITS** - Store initialization is fully reactive:

**Store (plan.ts:305-323):**
```typescript
const initPlanStore = (shortName?: string) => {
    // Synchronous - just sets reactive IDs
    const seasonId = shortName
        ? seasons.value.find(s => s.shortName === shortName)?.id
        : activeSeasonId.value
    if (seasonId && seasonId !== selectedSeasonId.value) loadSeason(seasonId)
}

// Internal watcher handles timing automatically
watch([isSeasonsInitialized, activeSeasonId], () => {
    if (!isSeasonsInitialized.value) return
    if (selectedSeasonId.value !== null) return // Already selected
    initPlanStore() // Auto-call when data ready
})

// Convenience computed for components
const isPlanStoreReady = computed(() =>
    isSeasonsInitialized.value && isSelectedSeasonInitialized.value
)
```

**Component/Page:**
```typescript
// Call init immediately (synchronous)
planStore.initPlanStore()

// Show reactive loaders
<template>
  <Loader v-if="!isPlanStoreReady" text="Loading..."/>
  <Content v-else :data="selectedSeason"/>
</template>
```

**Why This Works:**
- `useFetch` auto-loads lists (immediate: true by default)
- `useAsyncData` loads details when ID changes (reactive key)
- Store watcher auto-calls init when data arrives
- Components show loaders while data loads
- No SSR hydration mismatch

### Dynamic Tab Pattern

For pages with dynamic tabs:

**Parent page** (e.g., `/household/[shortname]/[tab]`):
```typescript
const householdStore = useHouseholdsStore()
householdStore.initHouseholdsStore(shortname.value) // Synchronous

// Pass minimal props
<component :is="asyncComponents[tab]" :household="selectedHousehold"/>
```

**Tab component** (e.g., `HouseholdBookings.vue`):
```typescript
const planStore = usePlanStore()
const { isPlanStoreReady } = storeToRefs(planStore)
planStore.initPlanStore() // Synchronous

<template>
  <Loader v-if="!isPlanStoreReady" text="Loading..."/>
  <Content v-else :data="activeSeason"/>
</template>
```

**Benefits:**
- Performance: Only load data when tab viewed
- Separation: Parent manages navigation, tabs manage data needs
- No hydration errors: Consistent server/client rendering
- Reactive: Loaders automatically show/hide based on status

### Error Handling

Error type is `FetchError` with `statusCode`:
```typescript
// Store exposes raw error
seasonsError  // Ref<FetchError | undefined>

// Component accesses
<ViewError :error="seasonsError?.statusCode" :cause="seasonsError" />
```

### Compliance

1. MUST use `watch: false` for all useFetch/useAsyncData in stores
2. MUST expose 4 status computeds: `isLoading`, `isErrored`, `isInitialized`, `isEmpty`
3. `isInitialized` MUST check actual data exists (not just status='success')
4. MUST expose convenience `isStoreReady` computed combining all initialization checks
5. MUST expose raw error ref for statusCode access
6. Init methods MUST be synchronous (no async/await)
7. Stores MAY use internal watchers to auto-call init when data arrives
8. Components MUST NOT contain server data state
9. Components MUST show loaders based on `isStoreReady` flag

### Critical Pattern: Data Presence Check

When using `useAsyncData` with nullable returns, status alone is insufficient:

```typescript
// ✅ CORRECT - check actual data exists
const isInitialized = computed(() =>
    status.value === 'success' && data.value !== null
)
```

**Why:** `Promise.resolve(null)` returns status='success', causing premature "ready" state. This creates hydration mismatches where server shows nothing (null → not ready) but client shows content (success → ready).

---

## ADR-006: URL-Based Navigation and Client-Side State

**Status:** Accepted | **Date:** 2025-01-27
**Updated:** 2025-01-28 (moved draft state to component per ADR-007)

### Decision

**Path-based navigation + query parameters for form mode**

```
/admin/planning              # Tab navigation
/admin/planning?mode=edit    # Form mode state
```

**Client-side draft state:** In-memory Vue ref in component (`app/components/admin/AdminPlanning.vue`)

### Compliance

1. Path-based routing for tabs (`/admin/[tab].vue`)
2. Query parameter `?mode=edit|create|view` for form mode
3. Client-side refs for draft data (no persistence) - lives in component, not store

---

## ADR-005: Aggregate Entity Deletion and Repository Patterns

**Status:** Accepted | **Date:** 2025-01-27

### Decision

**Prisma Schema-Driven Deletion** - Leverage database-level constraints to prevent race conditions (D1 has no transactions).

#### Strong vs Weak Relationships

**Strong (CASCADE):** Existential dependency - child cannot exist without parent
- Inhabitant → Household, DinnerEvent → Season, CookingTeamAssignment → CookingTeam, Order → DinnerEvent

**Weak (SET NULL):** Optional association - child can exist independently
- Inhabitant → User, DinnerEvent → CookingTeam, DinnerEvent → Inhabitant (chef)

#### Implementation Pattern

```typescript
// ✅ CORRECT: Single atomic operation, Prisma handles cascading
export async function deleteSeason(d1Client: D1Database, seasonId: number): Promise<Season> {
    const prisma = await getPrismaClientConnection(d1Client)
    return await prisma.season.delete({ where: { id: seasonId } })
    // Prisma automatically cascades strong relations, sets weak relations to null
}

// ❌ WRONG: Manual multi-step deletion creates race conditions
await prisma.cookingTeamAssignment.deleteMany({ /* ... */ })
await prisma.cookingTeam.deleteMany({ /* ... */ })
await prisma.season.delete({ /* ... */ })
```

### Compliance

1. Check Prisma schema for onDelete behavior before implementing deletion
2. Use single atomic delete operation - let Prisma handle cascading
3. E2E tests must verify both CASCADE and SET NULL behaviors

## ADR-004: Logging and Security Standards

**Status:** Accepted | **Date:** 2025-01-24

### Decision

**Log Levels:**
- `console.info` - Expected operations (200/201 responses)
- `console.warn` - Validation failures (400 responses)
- `console.error` - Server errors (500 responses)

**Security Rules:**
- NEVER log: `password`, `passwordHash`, `token`, full user objects
- SAFE: Log email/ID for identification, field names for validation errors

**Format:** `👨‍💻 > [MODULE] > [METHOD] message`

### Compliance

1. Use appropriate log level for error type
2. Never log sensitive data
3. Extract validation messages safely from Zod errors

## ADR-003: BDD-Driven Testing Strategy with Factory Pattern

**Status:** Accepted | **Date:** 2025-01-24

### Decision

**Test-First Development:** E2E Test (BDD) → Unit Tests → Implementation → Tests Pass

#### Factory Pattern

**Location:** `/tests/e2e/testDataFactories/`

```typescript
export class EntityFactory {
    // Data creation
    static readonly defaultEntity = (testSalt?: string) => ({
        entity: saltedEntity,
        serializedEntity: serialize(saltedEntity)
    })

    // HTTP operations with built-in assertions
    static readonly createEntity = async (context: BrowserContext, entity: Entity): Promise<Entity> => {
        const response = await context.request.put('/api/admin/entity', { headers, data: serialize(entity) })
        expect(response.status()).toBe(201)
        return await response.json()
    }
}
```

#### Test Structure

- **E2E tests:** GIVEN/WHEN/THEN structure, use factories, cleanup in afterAll
- **Factory methods:** `defaultEntity()`, `createEntity()`, `deleteEntity()`, `getEntity()`

### Compliance

1. Start with E2E tests defining business behavior
2. Use Factory pattern in `/tests/e2e/testDataFactories/`
3. Implement code only after tests are written
4. Include cleanup using factories in `afterAll` blocks

## ADR-002: Event Handler Error Handling and Validation Patterns

**Status:** Accepted | **Date:** 2025-01-24

### Decision

**Separate Try-Catch Blocks** for validation and business logic:

```typescript
export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation - FAIL EARLY
    let id, requestData
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        id = params.id
        requestData = await readValidatedBody(event, bodySchema.parse)
    } catch (error) {
        throw createError({ statusCode: 400, message: 'Invalid input', cause: error })
    }

    // Business logic
    try {
        const result = await businessLogic(d1Client, requestData)
        setResponseStatus(event, 200)
        return result
    } catch (error) {
        throw createError({ statusCode: 500, message: 'Server Error', cause: error })
    }
})
```

**Always use H3 validation:**
- `getValidatedRouterParams(event, schema.parse)` for route parameters
- `readValidatedBody(event, schema.parse)` for request bodies
- `getValidatedQuery(event, schema.parse)` for query parameters

**Error codes:**
- 400: Input validation failures
- 404: Resource not found
- 500: Database/server errors

### Compliance

1. Use H3 validation methods for all inputs
2. Separate try-catch blocks for validation and business logic
3. Use schema refinements for complex validation
4. Return consistent error status codes

## ADR-001: Core Framework and Technology Stack

**Status:** Accepted | **Date:** 2025-01-22
**Updated:** 2025-11-08 (Zod enum type safety pattern)

### Decision

**Stack:**
- Nuxt 4.1.1 + Vue 3 Composition API
- TypeScript 5.7.3 (strict mode)
- Zod 3.24.1 for runtime validation
- Prisma 6.3.1 + D1 (Cloudflare SQLite)
- zod-prisma-types (auto-generates Zod schemas from Prisma)
- Nuxt UI 3.3.3 + Tailwind CSS 4.1.13
- Cloudflare Workers/Pages deployment

**Key Patterns:**

```typescript
// Import Zod enums from generated schemas (NOT Prisma enums)
// These are auto-generated from schema.prisma by zod-prisma-types and guaranteed to match
import { TicketTypeSchema, OrderStateSchema } from '~~/prisma/generated/zod'

// Zod schema in composables using generated enum schemas
const OrderSchema = z.object({
  id: z.number().int().positive().optional(),
  state: OrderStateSchema,  // ✅ Use generated Zod enum
  ticketType: TicketTypeSchema,  // ✅ Type-safe across stack
  // ...
})
type Order = z.infer<typeof OrderSchema>

// API route validation
export default defineEventHandler(async (event) => {
    const data = await readValidatedBody(event, OrderSchema.parse)
    // ...
})
```

**Zod Enum Type Safety Pattern:**

**❌ WRONG - Using Prisma enums directly:**
```typescript
import { OrderState } from '@prisma/client'  // ❌ No runtime validation
const state: OrderState = 'BOOKED'  // Only TypeScript type checking
```

**✅ CORRECT - Using generated Zod enums:**
```typescript
import { OrderStateSchema } from '~~/prisma/generated/zod'  // ✅ Runtime + compile-time

// In validation composable
const OrderSchema = z.object({
  state: OrderStateSchema  // Auto-synced with Prisma schema
})

// In API endpoint
const data = await readValidatedBody(event, OrderSchema.parse)  // Runtime validation
```

**Benefits:**
1. **Single source of truth** - Prisma schema defines enums once
2. **Auto-sync** - `npm run db:generate-client` updates Zod schemas automatically
3. **Runtime validation** - Catch invalid enum values at API boundary
4. **Type safety** - Compile-time checking across client/server
5. **DRY** - No manual enum duplication between Prisma and Zod

**Auto-imports:** Utils (`~/utils/*`), composables (`~/composables/*`), components

**Repository pattern:** CRUD functions in `server/data/prismaRepository.ts`

### Rationale

- End-to-end type safety from database to frontend
- Shared validation schemas (client + server)
- Auto-generated Zod enums eliminate schema drift
- Edge deployment with global distribution
- Developer productivity through auto-imports

### Compliance

1. MUST import enum schemas from `~~/prisma/generated/zod` (NOT from `@prisma/client`)
2. MUST use generated Zod enum schemas in validation composables
3. MUST run `npm run db:generate-client` after Prisma schema enum changes
4. Use Zod schemas in composables for shared validation
5. Leverage Nuxt auto-imports (no manual imports for utils/composables)
6. Repository pattern for all database operations
7. H3 validation helpers in all API routes
