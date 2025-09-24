# Architecture Decision Records

## ADR-003: BDD-Driven Testing Strategy with Factory Pattern

**Date:** 2025-01-24
**Status:** Accepted
**Deciders:** Development Team

### Context

TheSlope follows a Test-Driven Development (TDD) approach where tests drive the implementation of features. We need a consistent approach that:

- **Starts with BDD**: Formulate end-to-end tests for non-existing code to define business requirements
- **Uses Test-First Development**: Write tests before implementing functionality
- **Maintains DRY Tests**: Use factory patterns for object creation to keep tests maintainable
- **Ensures Consistency**: Standardized patterns across all test types (unit, integration, e2e)

### Decision

We adopt a **BDD-First Testing Strategy** with **Factory Pattern** for test data creation:

#### 1. BDD-First Development Cycle

**Process Flow:**
```
1. Write E2E Test (BDD) → 2. Write Unit Tests → 3. Implement Code → 4. Tests Pass
```

**E2E Tests Define Business Behavior:**
```typescript
test(`DELETE /api/admin/team/[id] should remove all cooking team assignments and unassign team from dinner events`, async ({browser}) => {
    // GIVEN: A team with cooking assignments and dinner events
    const context = await validatedBrowserContext(browser)
    const newTeam = TeamFactory.defaultTeam()
    const createdTeam = await TeamFactory.createTeam(context, newTeam.team)

    // AND: Team has member assignments
    await TeamFactory.assignMembers(context, createdTeam.id, testMembers)

    // AND: Team is assigned to dinner events
    await DinnerEventFactory.assignTeam(context, dinnerEventId, createdTeam.id)

    // WHEN: Team is deleted
    const deleteResponse = await context.request.delete(`/api/admin/team/${createdTeam.id}`)

    // THEN: Delete succeeds and returns team data
    expect(deleteResponse.status()).toBe(200)
    const deletedTeam = await deleteResponse.json()

    // AND: Team no longer exists
    const verifyResponse = await context.request.get(`/api/admin/team/${createdTeam.id}`)
    expect(verifyResponse.status()).toBe(404)

    // AND: Dinner events are unassigned (cookingTeamId = null)
    const dinnerEvent = await DinnerEventFactory.getEvent(context, dinnerEventId)
    expect(dinnerEvent.cookingTeamId).toBeNull()
})
```

#### 2. Factory Pattern for Test Data Creation

**Factory Structure:**
```typescript
// tests/e2e/testDataFactories/entityFactory.ts
export class EntityFactory {
    // Data creation (no HTTP calls)
    static readonly defaultEntity = (testSalt?: string) => {
        const saltedEntity = {...this.defaultEntityData, name: salt(name, testSalt)}
        return {
            entity: saltedEntity,              // Raw object for API calls
            serializedEntity: serialize(saltedEntity)  // Pre-serialized when needed
        }
    }

    // HTTP operations (with built-in assertions)
    static readonly createEntity = async (context: BrowserContext, entity: Entity): Promise<Entity> => {
        const response = await context.request.put('/api/admin/entity', {
            headers: headers,
            data: serialize(entity)
        })

        expect(response.status(), 'Create should return 201').toBe(201)
        const responseBody = await response.json()
        expect(responseBody.id, 'Response should include ID').toBeDefined()
        return responseBody
    }

    static readonly deleteEntity = async (context: BrowserContext, id: number): Promise<Entity> => {
        const deleteResponse = await context.request.delete(`/api/admin/entity/${id}`)
        expect(deleteResponse.status()).toBe(200)
        return await deleteResponse.json()
    }
}
```

#### 3. Test Structure Patterns

**E2E Test Implementation:**
```typescript
// tests/e2e/api/admin/entity.e2e.spec.ts
const newEntity = EntityFactory.defaultEntity()
let createdEntityIds: number[] = []

test.describe('Entity Management', () => {
    test.beforeAll(async ({browser}) => {
        // Setup test dependencies (seasons, users, etc.)
        const context = await validatedBrowserContext(browser)
        // Create dependent entities using factories
    })

    test('Business behavior description', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Initial state using factories
        const created = await EntityFactory.createEntity(context, newEntity.entity)
        createdEntityIds.push(created.id)

        // WHEN: Action being tested
        // THEN: Expected outcomes with assertions
    })

    test.afterAll(async ({browser}) => {
        // Cleanup using factories
        const context = await validatedBrowserContext(browser)
        for (const id of createdEntityIds) {
            try {
                await EntityFactory.deleteEntity(context, id)
            } catch (error) {
                console.log(`Failed to cleanup entity ${id}:`, error)
            }
        }
    })
})
```

**Unit Test Implementation:**
```typescript
// tests/component/data/entityRepository.unit.spec.ts
describe('EntityRepository', () => {
    test('should handle entity deletion with related record cleanup', async () => {
        // GIVEN: Entity with related records
        const mockD1 = createMockD1Database()
        const entity = EntityFactory.defaultEntity().entity

        // WHEN: Delete is called
        const result = await deleteEntity(mockD1, entity.id)

        // THEN: Entity and related records are removed
        expect(result.id).toBe(entity.id)
        // Verify related records cleanup
    })
})
```

#### 4. Factory Method Conventions

**Naming Patterns:**
- `defaultEntity()` - Creates test data objects
- `createEntity()` - HTTP POST/PUT operations
- `updateEntity()` - HTTP POST operations
- `deleteEntity()` - HTTP DELETE operations
- `getEntity()` - HTTP GET operations
- `assignRelatedEntity()` - Relationship management

**Method Signatures:**
```typescript
// Data factories (synchronous)
static readonly defaultEntity = (testSalt?: string) => EntityData

// HTTP factories (async with context)
static readonly createEntity = async (context: BrowserContext, entity: Entity): Promise<Entity>
static readonly deleteEntity = async (context: BrowserContext, id: number): Promise<Entity>
```

#### 5. Test-First Implementation Process

**Step 1: Write E2E Test (Business Behavior)**
```typescript
test('DELETE should remove team and clean up assignments', async ({browser}) => {
    // Test written before any implementation exists
    // Defines the exact business behavior expected
})
```

**Step 2: Write Unit Tests (Implementation Details)**
```typescript
describe('deleteTeam repository function', () => {
    test('should remove team assignments in transaction', () => {
        // Unit tests define the implementation contract
    })
})
```

**Step 3: Implement Code to Pass Tests**
```typescript
export async function deleteTeam(d1Client: D1Database, id: number): Promise<CookingTeam> {
    // Implementation written to satisfy the test contract
}
```

**Step 4: Verify All Tests Pass**
```bash
npm run test  # All tests must pass before feature is complete
```

### Implementation Examples

**Current Factory: SeasonFactory**
```typescript
// ✅ Working implementation in tests/e2e/testDataFactories/seasonFactory.ts
export class SeasonFactory {
    static readonly defaultSeason = (testSalt?: string) => ({
        season: saltedSeasonObject,
        serializedSeason: serializeSeason(saltedSeasonObject)
    })

    static readonly createSeason = async (context: BrowserContext, season: Season): Promise<Season> => {
        const response = await context.request.put('/api/admin/season', {
            headers: headers,
            data: serializeSeason(season)
        })
        expect(response.status()).toBe(201)
        return await response.json()
    }

    static readonly deleteSeason = async (context: BrowserContext, id: number): Promise<Season> => {
        const deleteResponse = await context.request.delete(`/api/admin/season/${id}`)
        expect(deleteResponse.status()).toBe(200)
        return await deleteResponse.json()
    }
}
```

**Usage in Tests:**
```typescript
// E2E Test Usage
const newSeason = SeasonFactory.defaultSeason()
const created = await SeasonFactory.createSeason(context, newSeason.season)
expect(created.shortName).toBe(newSeason.season.shortName)
await SeasonFactory.deleteSeason(context, created.id)
```

### Rationale

#### Why BDD-First?
- **Business Focus**: Tests express business requirements, not implementation details
- **Living Documentation**: E2E tests serve as executable specifications
- **Early Validation**: Business logic is validated before implementation begins
- **Stakeholder Communication**: BDD scenarios can be shared with non-technical stakeholders

#### Why Factory Pattern?
- **DRY Principle**: Eliminates duplicate test data creation code
- **Consistency**: Standardized object creation across all tests
- **Maintenance**: Changes to data structure only require factory updates
- **Built-in Assertions**: Factory methods include success/failure validations

#### Why Test-First?
- **Design Driver**: Tests drive better API design and implementation
- **Regression Prevention**: Comprehensive test coverage from the start
- **Confidence**: Implementation guided by clear behavioral contracts
- **Documentation**: Tests serve as implementation documentation

### Consequences

#### Positive
- **Quality Assurance**: Business requirements tested before implementation
- **Maintainable Tests**: Factory pattern reduces test maintenance burden
- **Clear Requirements**: BDD scenarios define exact business behavior
- **Consistent Patterns**: Standardized approach across all features
- **Living Documentation**: Tests document actual system behavior

#### Negative
- **Upfront Investment**: More time required before implementing features
- **Learning Curve**: Developers must understand factory patterns and BDD
- **Test Maintenance**: Factory methods require maintenance as APIs evolve

#### Neutral
- **Development Speed**: Slower initial development, faster feature delivery
- **Test Coverage**: Higher coverage requirements but better quality assurance

### Compliance

All new features must:

1. **Start with E2E Tests**: Write BDD-style tests defining business behavior
2. **Use Factory Pattern**: Create factories for all test data and HTTP operations
3. **Follow Test-First**: Implement code only after tests are written
4. **Include Cleanup**: Use factories for test cleanup in `afterAll` blocks
5. **Validate Business Logic**: Focus tests on business requirements, not implementation

**Required Factory Structure:**
- Located in `tests/e2e/testDataFactories/`
- Export class with static readonly methods
- Separate data creation from HTTP operations
- Include built-in assertions in HTTP methods
- Follow consistent naming conventions

**Required Test Structure:**
- BDD-style test names expressing business behavior
- GIVEN/WHEN/THEN structure in test implementations
- Factory-based test data creation
- Proper cleanup using factories
- Integration between unit and e2e tests

## ADR-002: Event Handler Error Handling and Validation Patterns

**Date:** 2025-01-24
**Status:** Accepted
**Deciders:** Development Team

### Context

As the API surface grows, we need consistent patterns for event handler implementation that ensure:
- Robust error handling without nested try-catch blocks
- Early validation failure to prevent invalid data processing
- Aggressive schema validation using H3 framework methods
- Clear separation of concerns between input validation and business logic
- Consistent error responses across all endpoints

### Decision

We adopt the following patterns for all API event handlers:

#### 1. Fail Early Validation Pattern

**Separate Try-Catch Blocks:**
```typescript
export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id, requestData
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        id = params.id
        requestData = await readValidatedBody(event, bodySchema.parse)
    } catch (error) {
        console.error("Input validation error:", error)
        throw createError({
            statusCode: 400,
            message: 'Invalid input data',
            cause: error
        })
    }

    // Database operations try-catch - separate concerns
    try {
        const result = await businessLogic(d1Client, requestData)
        setResponseStatus(event, 200)
        return result
    } catch (error) {
        console.error("Business logic error:", error)
        throw createError({
            statusCode: 500,
            message: 'Server Error',
            cause: error
        })
    }
})
```

#### 2. H3 Framework Validation Methods

**Always use H3 validation helpers:**
- `getValidatedRouterParams(event, schema.parse)` for route parameters
- `readValidatedBody(event, schema.parse)` for request bodies
- `getValidatedQuery(event, schema.parse)` for query parameters

**Never use manual parsing:**
```typescript
// ❌ Manual parsing
const id = getRouterParam(event, 'id')
const body = await readBody(event)

// ✅ H3 validation
const { id } = await getValidatedRouterParams(event, idSchema.parse)
const requestData = await readValidatedBody(event, bodySchema.parse)
```

#### 3. Schema Refinements for Complex Validation

**Move validation logic into schemas:**
```typescript
// Schema-based ID consistency validation
const createUpdateSchema = (expectedId: number) =>
    BaseSchema
        .refine(data => data.id, {
            message: 'ID is required for updates',
            path: ['id']
        })
        .refine(data => !data.id || data.id === expectedId, {
            message: 'ID in URL does not match ID in request body',
            path: ['id']
        })
```

#### 4. Error Handling Principles

**Consistent error responses:**
- `400 Bad Request`: Input validation failures
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Database/server errors

**No nested try-catch blocks:**
- One try-catch for input validation
- One try-catch for business logic
- No throwing from within try blocks (re-throwing)

### Implementation Examples

**Route Parameter + Body Validation:**
```typescript
const idSchema = z.object({
    id: z.coerce.number().int().positive('ID must be a positive integer')
})

const createUpdateSeasonSchema = (expectedId: number) =>
    SerializedSeasonValidationSchema
        .refine(season => season.id === expectedId, {
            message: 'Season ID in URL does not match ID in request body',
            path: ['id']
        })
```

**Query Parameter Validation:**
```typescript
const querySchema = z.object({
    seasonId: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().min(1).default(1)
})

// Input validation
try {
    const query = await getValidatedQuery(event, querySchema.parse)
    // Use validated query...
} catch (error) {
    throw createError({
        statusCode: 400,
        message: 'Invalid query parameters',
        cause: error
    })
}
```

### Rationale

#### Why Separate Try-Catch Blocks?
- **Clear separation of concerns**: Input validation vs business logic errors
- **Fail early principle**: Stop processing immediately on invalid input
- **No nested complexity**: Flat error handling structure
- **Appropriate error codes**: 400 for validation, 500 for server errors

#### Why H3 Validation Methods?
- **Framework consistency**: Use H3's built-in validation capabilities
- **Type safety**: Automatic TypeScript inference from schemas
- **Error handling**: H3 methods throw appropriate errors automatically
- **DRY principle**: Avoid manual parsing and validation logic

#### Why Schema Refinements?
- **Declarative validation**: Complex logic expressed in schemas
- **Reusable validation**: Schema functions can be reused across endpoints
- **Single responsibility**: Schemas handle all validation concerns
- **Better error messages**: Zod provides detailed validation feedback

### Consequences

#### Positive
- **Consistent error handling**: All endpoints follow the same pattern
- **Early failure detection**: Invalid requests fail immediately
- **Maintainable code**: Clear structure and separation of concerns
- **Type safety**: Full TypeScript integration with validation
- **Better debugging**: Clear error sources and consistent logging

#### Negative
- **Learning curve**: Developers must understand the specific patterns
- **Verbose schemas**: Complex validation requires detailed schema definitions
- **Rigid structure**: Less flexibility in error handling approaches

### Compliance

All new API endpoints must:
1. Use H3 validation methods for all inputs
2. Implement separate try-catch blocks for validation and business logic
3. Use schema refinements for complex validation rules
4. Return consistent error status codes and messages
5. Avoid nested try-catch patterns

## ADR-001: Core Framework and Technology Stack

**Date:** 2025-01-22
**Status:** Accepted
**Deciders:** Development Team

### Context

TheSlope is a community dining management platform that requires a modern, scalable web application architecture. The application needs to handle user authentication, complex form validation, real-time data management, and integration with external APIs while maintaining type safety and developer productivity.

Key requirements:
- Type safety across the entire application stack
- Robust form validation with client and server-side consistency
- Modern Vue.js development patterns
- Integration with Cloudflare edge computing platform
- SQLite database compatibility for edge deployment
- Responsive UI with component-based architecture

### Decision

We have adopted the following core technology stack:

#### 1. Nuxt 3 as the Primary Framework
- **Framework:** Nuxt 4.1.1 with Vue 3 Composition API
- **Rendering:** Universal rendering with Cloudflare Workers deployment
- **Auto-imports:** Leveraging Nuxt's auto-import system for components, composables, and utilities

#### 2. TypeScript for Type Safety
- **Language:** TypeScript 5.7.3 with strict configuration
- **Type Safety:** End-to-end type safety from database to frontend

#### 3. Zod for Runtime Validation and Type Inference
- **Validation Library:** Zod 3.24.1 for both client and server-side validation
- **Type Inference:** Leveraging Zod schemas for automatic TypeScript type generation
- **Integration:** Deep integration with Nuxt API routes using validation helpers

#### 4. Vue 3 Composition API
- **Component Architecture:** Vue 3 with `<script setup>` syntax
- **State Management:** Pinia 3.0.3 for application state
- **Reactivity:** Vue 3's enhanced reactivity system

#### 5. Database and ORM
- **Database:** SQLite with D1 (Cloudflare's distributed SQLite)
- **ORM:** Prisma 6.3.1 with D1 adapter
- **Type Generation:** Automatic Zod schema generation from Prisma models

#### 6. UI Framework and Styling
- **UI Library:** Nuxt UI 3.3.3 with Tailwind CSS 4.1.13
- **Styling:** Utility-first CSS with design system consistency

#### 7. Deployment Platform
- **Platform:** Cloudflare Workers/Pages
- **Edge Computing:** Leveraging Cloudflare's global edge network
- **Database:** Cloudflare D1 for distributed SQLite

### Implementation Patterns

#### Zod Integration Examples

**Shared Validation Schemas (Composables):**
```typescript
// app/composables/useSeasonValidation.ts
import {z} from 'zod'

const WeekDayMapSchema = z.record(z.enum(WEEKDAYS), z.boolean())
  .refine((map) => Object.values(map).some(v => v), {
    message: "Man skal lave mad mindst en dag om ugen"
  })

const SeasonSchema = z.object({
  id: z.number().int().positive().optional(),
  shortName: z.string().min(4),
  seasonDates: dateRangeSchema,
  isActive: z.boolean(),
  cookingDays: WeekDayMapSchema,
  holidays: holidaysSchema,
  ticketIsCancellableDaysBefore: z.number().min(0).max(31),
  diningModeIsEditableMinutesBefore: z.number().min(0).max(1440)
})

// Type inference from Zod schema
type Season = z.infer<typeof SeasonSchema>
```

**API Route Validation:**
```typescript
// server/routes/api/auth/login.post.ts
import { z } from 'zod'

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().nonempty(),
})

export default defineEventHandler(async (event) => {
    const { email, password } = await readValidatedBody(event, body => loginSchema.parse(body))
    // Implementation continues...
})
```

**Advanced Validation with Error Handling:**
```typescript
// server/routes/api/admin/users/index.put.ts
export const userSchema = z.object({
    email: z.string().email('Email-adressen er ikke gyldig'),
    phone: z.string()
        .regex(/^\+?\d+$/, 'Telefonnummer må kun indeholde tal og eventuelt et plus-tegn i starten')
        .optional(),
    passwordHash: z.string().default('caramba'),
    systemRole: z.nativeEnum(SystemRole).default(SystemRole.USER)
})

export default defineEventHandler(async (event) => {
    try {
        const userFromQuery = await getValidatedQuery(event, userSchema.parse)
        // Implementation...
    } catch (error) {
        if (error instanceof H3Error) {
            throw createError({
                statusCode: 400,
                message: 'Forkert brugerinput',
                cause: error
            })
        }
        // Server error handling...
    }
})
```

**Client-Side Validation Utilities:**
```typescript
// app/utils/validtation.ts
import {type ZodError} from 'zod'

export const mapZodErrorsToFormErrors = (error: ZodError): Map<string, string[]> => {
    return new Map(
        error.errors.map(err => [err.path[0]?.toString() || '_', [err.message]])
    )
}
```

#### Auto-Import Strategy
- **Utils:** Placed in `~/utils/*` for automatic import
- **Composables:** Placed in `~/composables/*` for automatic import
- **Components:** Auto-imported from components directory
- **No Manual Imports:** Leveraging Nuxt's auto-import capabilities

#### Repository Pattern
```typescript
// server/data/prismaRepository.ts
export async function saveUser(d1Client: D1Database, user: UserCreateInput): Promise<User> {
    const prisma = await getPrismaClientConnection(d1Client)
    const newUser = await prisma.user.upsert({
        where: {email: user.email},
        create: user,
        update: user
    })
    return newUser
}
```

### Rationale

#### Why Nuxt 3?
- **Universal Rendering:** Supports both SSR and SPA modes for optimal performance
- **Developer Experience:** Auto-imports, file-based routing, and built-in optimizations
- **Cloudflare Integration:** Native support for Cloudflare Workers deployment
- **Vue 3 Integration:** Seamless integration with Vue 3 Composition API

#### Why Zod?
- **Type Safety:** Runtime validation with automatic TypeScript type inference
- **Schema Reuse:** Same schemas work for both client and server validation
- **Error Handling:** Rich error messages with path-specific validation feedback
- **Prisma Integration:** Generated Zod schemas from Prisma models via `zod-prisma-types`
- **Composable Validation:** Complex validation logic in reusable composables

#### Why TypeScript?
- **Compile-time Safety:** Catch errors during development rather than runtime
- **Developer Productivity:** Enhanced IDE support and autocomplete
- **Refactoring Confidence:** Safe refactoring with type checking
- **API Contract Enforcement:** Consistent types between client and server

#### Why Prisma with D1?
- **Type Safety:** Generated TypeScript types from database schema
- **Edge Compatibility:** D1 adapter for Cloudflare Workers deployment
- **Migration Management:** Robust database migration system
- **ORM Benefits:** Simplified database operations with type safety

#### Why Cloudflare?
- **Edge Performance:** Global distribution with minimal latency
- **Integrated Stack:** D1 database, Workers, and Pages in unified platform
- **Cost Effectiveness:** Competitive pricing for edge computing
- **Developer Experience:** Integrated tooling with Wrangler CLI

### Consequences

#### Positive
- **End-to-end Type Safety:** From database schema to frontend components
- **Validation Consistency:** Same validation logic across client and server
- **Developer Productivity:** Auto-imports and strong typing reduce boilerplate
- **Performance:** Edge deployment with global distribution
- **Maintainability:** Clear patterns and strong typing reduce bugs
- **Scalability:** Cloudflare's edge infrastructure handles scaling automatically

#### Negative
- **Learning Curve:** Developers must understand Zod schema patterns and Nuxt conventions
- **Cloudflare Lock-in:** Platform-specific deployment and database solution
- **Edge Limitations:** Some Node.js libraries may not work in Workers environment
- **Complex Validation:** Advanced Zod schemas can become complex for intricate business rules

#### Neutral
- **Bundle Size:** Zod adds runtime validation overhead but provides significant value
- **Development Complexity:** More setup required but pays dividends in maintenance
- **Migration Path:** Future migration from Cloudflare would require significant effort

### Compliance

This architecture supports:
- **Security:** Input validation, type safety, and platform security features
- **Performance:** Edge deployment, optimized bundling, and reactive updates
- **Maintainability:** Strong typing, clear patterns, and comprehensive testing
- **Scalability:** Edge infrastructure and stateless architecture
- **Developer Experience:** Auto-imports, type safety, and integrated tooling

### Related Decisions

Future ADRs will document:
- Authentication and authorization patterns
- Testing strategy and implementation
- State management patterns with Pinia
- Component architecture and design system
- API design and integration patterns