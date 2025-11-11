# ADR-002 Compliance Violations - API Endpoints

**Generated:** 2025-01-09
**Last Updated:** 2025-11-11 (Dinner Events - Full ADR-002 & ADR-010 compliance)

### Repository Column Legend
- ✅ = Repository function validates with `Schema.parse()`
- ❌ = Repository function doesn't validate (returns raw Prisma type)
- ❓ = Not yet audited

## Detailed Violations

| Endpoint | Return Type | Validation | Repository | E2E Tests | Notes                                                                                            |
|----------|-------------|------------|------------|-----------|--------------------------------------------------------------------------------------------------|
| **Order Management** | | | | | **✅ FULLY COMPLIANT** (4/5 endpoints implemented)                                               |
| `/api/order/index.put.ts` | ✅ | ✅ OK | ✅ | ✅ | createOrder() validates with OrderSchema                                                         |
| `/api/order/index.get.ts` | ✅ | ✅ OK | ✅ | ✅ | fetchOrders() validates with OrderSchema                                                         |
| `/api/order/[id].get.ts` | ✅ | ✅ OK | ✅ | ✅ | fetchOrder() validates with OrderSchema                                                          |
| `/api/order/[id].delete.ts` | ✅ | ✅ OK | ✅ | ✅ | deleteOrder() validates with OrderSchema                                                         |
| `/api/order/swap-order.post.ts` | N/A | N/A | N/A | N/A | Stub - not yet implemented                                                                       |
| **Admin - Dinner Events** | | | | | **✅ FULLY COMPLIANT**                                                                            |
| `/api/admin/dinner-event/[id].delete.ts` | ✅ | ✅ OK | ✅ | ✅ | deleteDinnerEvent() validates with DinnerEventResponseSchema                                     |
| `/api/admin/dinner-event/[id].get.ts` | ✅ | ✅ OK | ✅ | ✅ | fetchDinnerEvent() validates with DinnerEventResponseSchema                                      |
| `/api/admin/dinner-event/index.get.ts` | ✅ | ✅ OK | ✅ | ✅ | fetchDinnerEvents() validates with DinnerEventResponseSchema                                     |
| `/api/admin/dinner-event/index.put.ts` | ✅ | ✅ OK | ✅ | ✅ | saveDinnerEvent() validates with DinnerEventResponseSchema                                       |
| **Admin - Teams** |
| `/api/admin/team/[id].delete.ts` | ❌ | ✅ OK | ❓ | ❓ |                                                                                                  |
| `/api/admin/team/index.get.ts` | ❌ | ✅ OK | ❓ | ❓ |                                                                                                  |
| `/api/admin/team/[id].post.ts` | ❌ | ✅ OK | ❓ | ❓ |                                                                                                  |
| `/api/admin/team/[id].get.ts` | ❌ | ✅ OK | ❓ | ❓ |                                                                                                  |
| `/api/admin/team/index.put.ts` | ❌ | ✅ OK | ❓ | ❓ |                                                                                                  |
| `/api/admin/team/assignment/[id].delete.ts` | ❌ | ✅ OK | ❓ | ❓ |                                                                                                  |
| `/api/admin/team/assignment/index.get.ts` | ❌ | ✅ OK | ❓ | ❓ |                                                                                                  |
| `/api/admin/team/assignment/[id].get.ts` | ❌ | ✅ OK | ❓ | ❓ |                                                                                                  |
| `/api/admin/team/assignment/index.put.ts` | ❌ | ✅ OK | ❓ | ❓ |                                                                                                  |
| **Admin - Users** | | | | | **✅ FULLY COMPLIANT**                                                                            |
| `/api/admin/users/[id].delete.ts` | ✅ | ✅ OK | ✅ | ✅ | deleteUser() validates with UserResponseSchema                                                   |
| `/api/admin/users/index.get.ts` | ✅ | ✅ OK | ✅ | ✅ | fetchUsers() validates with UserDisplaySchema                                                    |
| `/api/admin/users/index.put.ts` | ✅ | ✅ OK | ✅ | ✅ | saveUser() validates with UserResponseSchema                                                     |
| `/api/admin/users/by-role/[role].get.ts` | ✅ | ✅ OK | ✅ | ✅ | fetchUsersByRole() validates with UserDisplaySchema                                              |
| **Admin - Households** |
| `/api/admin/household/[id].delete.ts` | ❌ | ✅ OK | |
| `/api/admin/household/inhabitants/[id].delete.ts` | ❌ | ✅ OK | |
| **Admin - Seasons** |
| `/api/admin/season/[id].delete.ts` | ❌ | ✅ OK | |
| `/api/admin/season/[id].post.ts` | ❌ | ✅ OK | |
| `/api/admin/season/active.get.ts` | ❌ | ✅ OK | |
| `/api/admin/season/activeId.get.ts` | ❌ | ✅ OK | |
| `/api/admin/season/[id]/assign-cooking-teams.post.ts` | ❌ | ✅ OK | |
| `/api/admin/season/[id]/assign-team-affinities.post.ts` | ❌ | ✅ OK | |
| **Admin - Allergy Types** |
| `/api/admin/allergy-type/[id].delete.ts` | ❌ | ✅ OK | |
| `/api/admin/allergy-type/[id].post.ts` | ❌ | 💡 readBody+parse | Use readValidatedBody |
| `/api/admin/allergy-type/index.put.ts` | ❌ | 💡 readBody+parse | Use readValidatedBody |
| **Household - Allergies** |
| `/api/household/allergy/[id].delete.ts` | ❌ | ✅ OK | |
| `/api/household/allergy/index.get.ts` | ❌ | ✅ OK | |
| `/api/household/allergy/[id].post.ts` | ❌ | 💡 readBody+parse | Use readValidatedBody |
| `/api/household/allergy/[id].get.ts` | ❌ | ✅ OK | |
| `/api/household/allergy/index.put.ts` | ❌ | 💡 readBody+parse | Use readValidatedBody |
| **Teams (Public)** |
| `/api/team/index.get.ts` | ❌ | ✅ OK | |
| `/api/team/[id].get.ts` | ❌ | ✅ OK | |
| `/api/team/my.get.ts` | ❌ | ✅ OK | |
| **Other** |
| `/api/chefing/team.ts` | ❌ | ✅ OK | |
| `/api/calendar/index.get.ts` | ❌ | ✅ OK | |
| `/api/calendar/feed.ts` | ❌ | ✅ OK | |
| `/api/auth/login.post.ts` | ❌ | ✅ OK | |
| **Admin - Heynabo** | | | | | **✅ COMPLIANT**                                                                                  |
| `/api/admin/heynabo/import.get.ts` | ✅ | ✅ OK | ✅ | ✅ | GET endpoint with proper business logic try-catch, uses transformation functions from composable |

## Recent Improvements

### 2025-11-11: Dinner Event Endpoints - Full ADR-002 & ADR-010 Compliance ✅

**ADR-002 Violations Fixed:**
1. ✅ Added explicit return types to all 4 endpoints (`Promise<DinnerEvent>` / `Promise<DinnerEvent[]>`)
2. ✅ Added `setResponseStatus(event, 200)` to GET and DELETE endpoints
3. ✅ Added `setResponseStatus(event, 201)` to PUT (create) endpoint
4. ✅ Fixed `console.log` → `console.info` in index.put.ts (ADR-004 compliance)
5. ✅ Removed unused Vue component import from [id].get.ts
6. ✅ Fixed variable scoping in [id].get.ts
7. ✅ Added missing `createError` import in [id].get.ts

**ADR-010 Repository Compliance (CRITICAL FIX):**
1. ✅ Removed Prisma `DinnerEvent` type import from repository
2. ✅ Imported domain `DinnerEvent` type from `~/composables/useDinnerEventValidation`
3. ✅ Updated all 5 repository functions to parse with `DinnerEventResponseSchema` before returning:
   - `saveDinnerEvent()` - Parse created event
   - `fetchDinnerEvents()` - Parse array with `.map(de => DinnerEventResponseSchema.parse(de))`
   - `fetchDinnerEvent()` - Parse single event or return null
   - `updateDinnerEvent()` - Parse updated event
   - `deleteDinnerEvent()` - Parse deleted event
4. ✅ Repository now returns domain types, not Prisma types (ADR-010 pattern)

**Test Coverage:**
1. ✅ All 6 E2E tests passing (dinnerEvent.e2e.spec.ts)
2. ✅ Tests verify: CRUD operations, seasonId filtering, validation errors
3. ✅ Proper cleanup using SeasonFactory (CASCADE behavior per ADR-005)

**Files Modified:**
- `server/routes/api/admin/dinner-event/[id].delete.ts` - Return type, setResponseStatus, domain types
- `server/routes/api/admin/dinner-event/[id].get.ts` - Return type, setResponseStatus, domain types, imports
- `server/routes/api/admin/dinner-event/index.get.ts` - Domain types
- `server/routes/api/admin/dinner-event/index.put.ts` - Return type, console.info, domain types
- `server/data/prismaRepository.ts` - Removed Prisma DinnerEvent import, added domain type + validation parsing

**Key Pattern (ADR-010):**
```typescript
// ✅ CORRECT - Domain types from composable, Prisma types stay in repository
import type {DinnerEvent} from "~/composables/useDinnerEventValidation"
import {useDinnerEventValidation} from "~/composables/useDinnerEventValidation"

export async function fetchDinnerEvent(d1Client: D1Database, id: number): Promise<DinnerEvent | null> {
    const {DinnerEventResponseSchema} = useDinnerEventValidation()
    const prismaEvent = await prisma.dinnerEvent.findFirst({where: {id}})
    if (prismaEvent) {
        return DinnerEventResponseSchema.parse(prismaEvent) // Convert Prisma → Domain
    }
    return null
}
```

**Compliance:**
- ADR-002: ✅ Separate try-catch, H3 validation, explicit return types, setResponseStatus
- ADR-004: ✅ console.info for operations, console.error for errors
- ADR-010: ✅ Domain types in API + Repository return values, Prisma types internal only

### 2025-11-11: Heynabo Import Endpoint - Full Refactor & ADR Compliance ✅

**Architecture Refactor:**
1. ✅ Extracted pure transformation functions to `useHeynaboValidation` composable
2. ✅ Created `server/integration/heynabo/heynaboClient.ts` for HTTP/API operations only
3. ✅ Separated concerns: composable (transformation), client (HTTP), endpoint (orchestration)
4. ✅ Removed console logging from pure functions (moved to endpoint per ADR-004)
5. ✅ Uses `useUserValidation()` to get `SystemRoleSchema` (ADR-001 compliance, no Prisma imports)

**ADR-002 Compliance:**
1. ✅ Single try-catch wrapping entire business logic (fetch → transform → save)
2. ✅ Explicit return type `defineEventHandler<Household[]>`
3. ✅ No validation try-catch needed (GET endpoint with no user input)
4. ✅ Proper error handling with `h3eFromCatch` and `setResponseStatus(event, 200)`
5. ✅ Clear 3-step orchestration with detailed logging at each step

**Test Coverage:**
1. ✅ 27 unit tests total (16 new transformation tests + 11 existing schema tests)
2. ✅ DRY parametrized tests using `it.each()` for all transformation functions
3. ✅ E2E test passing (heynabo.e2e.spec.ts)
4. ✅ Tests verify: role mapping, inhabitant creation, location filtering, household assembly

**Key Transformations (Pure Functions):**
- `mapHeynaboRoleToSystemRole(role)` - Maps 'admin' → [SystemRole.ADMIN]
- `inhabitantFromMember(locationId, member)` - HeynaboMember → InhabitantCreate
- `findInhabitantsByLocation(locationId, members)` - Filters and transforms members
- `createHouseholdsFromImport(locations, members)` - Complete household assembly

**Updated ADR-001:**
Added composable naming conventions and responsibilities:
- `useEntityValidation` - Schemas + transformations (simple helpers)
- `useEntity` - Business logic (when intricate)

**Files Modified:**
- `app/composables/useHeynaboValidation.ts` - Added 4 transformation functions
- `server/integration/heynabo/heynaboClient.ts` - New file, HTTP operations only
- `server/routes/api/admin/heynabo/import.get.ts` - ADR-002 compliant orchestration
- `tests/component/composables/useHeynaboValidation.unit.spec.ts` - 16 new parametrized tests
- `docs/adr.md` - Updated ADR-001 with composable patterns
- Deleted `server/integration/heynabo.ts` (old monolithic file)

## Recent Improvements

### 2025-11-10: ADR-010 Serialization Architecture ✅

**Schema Architecture (DRY Principles):**
1. ✅ Created `SerializedUserInputSchema` for database writes (omits auto-generated fields)
2. ✅ Created `SerializedUserSchema` for database reads (requires id, createdAt, updatedAt)
3. ✅ Refactored `UserDisplaySchema` to extend `BaseUserSchema.omit({passwordHash})`
4. ✅ Refactored `UserWithInhabitantSchema` to extend `UserDisplaySchema` (proper inheritance)
5. ✅ Created `InhabitantScalarsSchema` shared between UserDisplay and UserWithInhabitant

**Serialization Functions (ADR-010):**
1. ✅ `serializeUserInput(user: UserCreate): SerializedUserInput` - Domain → Database (create/update)
2. ✅ `deserializeUser(serialized: SerializedUser): User` - Database → Domain (read)
3. ✅ Repository uses `serializeUserInput()` before writes, `deserializeUser()` after reads
4. ✅ Updated SELECT clause to include `createdAt` and `updatedAt` for proper deserialization

**Phone Validation Fix (Heynabo Data):**
1. ✅ Updated regex from `/^\+?\d+$/` to `/^\+?[\d\s]+$/` to accept spaces
2. ✅ Handles Heynabo phone format: `+45 12 34 56 78` (spaces between digits)
3. ✅ Union schema accepts: valid phone | empty string → null | null | undefined
4. ✅ Transform converts empty string `''` to `null`

**Test Improvements:**
1. ✅ Added parametrized serialization/deserialization tests (DRY)
2. ✅ Added phone validation tests for spaces (Heynabo format)
3. ✅ Round-trip serialization test verifies data integrity
4. ✅ All 37 unit tests + 7 E2E tests passing

**Key Learnings:**
- **Root cause analysis**: Avoided bandaid (accepting literal string "null"), found real issue (phone regex didn't accept spaces from Heynabo)
- **ADR-010 pattern**: Separate schemas for database input (SerializedUserInput) vs output (SerializedUser) because auto-generated fields (id, timestamps) only exist after database insert
- **Schema inheritance**: UserWithInhabitantSchema extends UserDisplaySchema extends BaseUserSchema (DRY hierarchy)

**Files Modified:**
- `app/composables/useUserValidation.ts` - ADR-010 serialization schemas + phone regex fix
- `server/data/prismaRepository.ts` - Uses `serializeUserInput()` and includes timestamps in SELECT
- `tests/component/composables/useUserValidation.unit.spec.ts` - Serialization tests + phone tests
- `app/stores/users.ts` - Refactored to ADR-007 pattern with `useAsyncData`

### 2025-01-10: Users Endpoints - Initial Compliance ✅

**What was fixed:**
1. ✅ Added `Promise<UserDisplay[]>` / `Promise<User>` return types to all 4 endpoints
2. ✅ Added repository validation with `UserDisplaySchema.parse()` and `UserResponseSchema.parse()`
3. ✅ Fixed `UserDisplaySchema.phone` field to accept `null` (was `.optional()`, now `.nullable().optional()`)
4. ✅ Added email normalization to accept RFC 5322 format (`Display Name <email@domain.com>`)

**Test improvements:**
1. ✅ Replaced `any` types with `UserDisplay` in all tests
2. ✅ Replaced string literals (`'ADMIN'`) with enum values (`SystemRole.ADMIN`)
3. ✅ Replaced manual property checks with `UserDisplaySchema.parse()` validation
4. ✅ Added parametrized unit tests for email validation and normalization

**Key learnings:**
- Found real-world data issue: `"Rikke Baggesen <rikke@baggesen.org>"` in database
- Solution: Accept both standard and RFC 5322 email formats, normalize on save
- Pattern: Use union schema with `.transform()` to normalize incoming data

## ADR-002 Requirements

Per ADR-002, all event handlers MUST:

1. **Separate try-catch blocks** for validation vs business logic
2. **Use H3 validation helpers:**
   - `getValidatedRouterParams(event, schema.parse)` for route parameters
   - `readValidatedBody(event, schema.parse)` for request bodies
   - `getValidatedQuery(event, schema.parse)` for query parameters
3. **Define explicit return types:** `defineEventHandler(async (event): Promise<Type> => { ... })`
4. **Use Zod schemas** from composables for all input/output validation

## Recommended Fixes

### Priority 1: Add Return Types (35 files)

**Example Fix:**
```typescript
// ❌ Before
export default defineEventHandler(async (event) => {
    const users = await fetchUsers(d1Client)
    return users
})

// ✅ After
export default defineEventHandler(async (event): Promise<User[]> => {
    const users = await fetchUsers(d1Client)
    return users
})
```

### Priority 2: Standardize Validation (4 files)

**Files to update:**
- `/api/admin/allergy-type/[id].post.ts`
- `/api/admin/allergy-type/index.put.ts`
- `/api/household/allergy/[id].post.ts`
- `/api/household/allergy/index.put.ts`

**Example Fix:**
```typescript
// ❌ Before (works but verbose)
const body = await readBody(event)
allergyTypeData = AllergyTypeUpdateSchema.parse({...body, id: allergyTypeId})

// ✅ After (ADR-002 pattern)
allergyTypeData = await readValidatedBody(event, (body) =>
    AllergyTypeUpdateSchema.parse({...body, id: allergyTypeId})
)
```

## Compliance Checklist

Use this checklist when creating/reviewing API endpoints:

- [ ] Separate try-catch for validation vs business logic
- [ ] Use `getValidatedRouterParams` for path params
- [ ] Use `readValidatedBody` for request body
- [ ] Define explicit return type `Promise<Type>`
- [ ] Import types from composables (not Prisma directly)
- [ ] Follow logging standards (ADR-004)
- [ ] Add JSDoc comments for complex endpoints

## Fully Compliant Examples

Reference these endpoints for correct ADR-002 implementation:

- ✅ `/api/admin/users/by-role/[role].get.ts` - Route validation + return type
- ✅ `/api/admin/allergy-type/[id].get.ts` - ID validation + return type + error handling
- ✅ `/api/admin/household/[id].get.ts` - Complete pattern
- ✅ `/api/order/[id].delete.ts` - DELETE pattern with validation
