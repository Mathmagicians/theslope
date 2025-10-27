# Architecture Decision Records

**NOTE**: ADRs are numbered sequentially and ordered with NEWEST AT THE TOP.

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
**Updated:** 2025-10-27 (component-driven initialization for dynamic tabs)

### Decision

**Stores use `useFetch` singleton pattern with status-derived state. Components own UI state. For dynamic tabs with varying dependencies, components initialize their own stores.**

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

**Store:** Server data, CRUD actions, business logic computed (disabledModes)
**Component:** UI state (formMode, draft), URL sync, mode transitions, **initialize own store dependencies**
**Page:** Call `await initStore()` at top-level for shared data only

### Dynamic Tab Pattern

For pages with dynamic tabs and varying data dependencies:

**Parent page** (e.g., `/household/[shortname]/[tab]`):
```typescript
// Initialize only core shared data
const householdStore = useHouseholdsStore()
await householdStore.initHouseholdsStore(shortname.value)

// Pass minimal props
<component :is="asyncComponents[tab]" :household="selectedHousehold"/>
```

**Tab component** (e.g., `HouseholdBookings.vue`):
```typescript
interface Props { household: HouseholdWithInhabitants }
const props = defineProps<Props>()

// Component initializes its own dependencies
const planStore = usePlanStore()
const { activeSeason, isSelectedSeasonLoading, isSelectedSeasonInitialized } = storeToRefs(planStore)
await planStore.initPlanStore()

<template>
  <Loader v-if="isSelectedSeasonLoading" text="Loading..."/>
  <Content v-else-if="isSelectedSeasonInitialized" :data="activeSeason"/>
</template>
```

**Benefits:**
- Performance: Only load data when tab viewed
- Separation: Parent manages navigation, tabs manage data needs
- Scalability: Add tabs without modifying parent
- SSR-compatible: Idempotent init prevents duplicate requests

### Error Handling

Error type is `FetchError` with `statusCode`:
```typescript
// Store exposes raw error
seasonsError  // Ref<FetchError | undefined>

// Component accesses
<ViewError :error="seasonsError?.statusCode" :cause="seasonsError" />
```

### Compliance

1. MUST use `immediate: false, watch: false` for all useFetch in stores
2. MUST expose 4 status computeds: `isLoading`, `isErrored`, `isInitialized`, `isEmpty`
3. MUST expose raw error ref for statusCode access
4. Init MUST be idempotent: `!isInitialized || isErrored`
5. Components MUST NOT contain server data state
6. **Dynamic tabs:** Components initialize their own stores, handle loading/error states

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

### Decision

**Stack:**
- Nuxt 4.1.1 + Vue 3 Composition API
- TypeScript 5.7.3 (strict mode)
- Zod 3.24.1 for runtime validation
- Prisma 6.3.1 + D1 (Cloudflare SQLite)
- Nuxt UI 3.3.3 + Tailwind CSS 4.1.13
- Cloudflare Workers/Pages deployment

**Key Patterns:**

```typescript
// Zod schema in composables
const SeasonSchema = z.object({
  id: z.number().int().positive().optional(),
  shortName: z.string().min(4),
  cookingDays: z.record(z.enum(WEEKDAYS), z.boolean()),
  // ...
})
type Season = z.infer<typeof SeasonSchema>

// API route validation
export default defineEventHandler(async (event) => {
    const data = await readValidatedBody(event, schema.parse)
    // ...
})
```

**Auto-imports:** Utils (`~/utils/*`), composables (`~/composables/*`), components

**Repository pattern:** CRUD functions in `server/data/prismaRepository.ts`

### Rationale

- End-to-end type safety from database to frontend
- Shared validation schemas (client + server)
- Edge deployment with global distribution
- Developer productivity through auto-imports

### Compliance

1. Use Zod schemas in composables for shared validation
2. Leverage Nuxt auto-imports (no manual imports for utils/composables)
3. Repository pattern for all database operations
4. H3 validation helpers in all API routes
