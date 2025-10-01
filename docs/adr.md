# Architecture Decision Records

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