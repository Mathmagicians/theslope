# Architecture Decision Records

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