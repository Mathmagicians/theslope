# ADR-002 Compliance Violations - API Endpoints

**Generated:** 2025-01-09
**Last Updated:** 2025-11-10 (Users endpoints fully compliant: API + Repository + Tests + ADR-010 Serialization)
**Total Endpoints:** 60
**Compliant:** 35 (58%)
**Violations:** 25 (42%)

## Summary

| Issue | Count | Severity | Progress |
|-------|-------|----------|----------|
| Missing Return Type | 27 | ⚠️ Medium | ✅ Users complete (4/4) |
| Uses `readBody` (unvalidated) | 0 | ✅ None | ✅ |
| Uses `readBody` + manual parse | 4 | 💡 Acceptable | TODO |
| Missing Zod schema | 0 | ✅ None | ✅ |
| Repository no schema parse | 0 | ✅ None | ✅ Users complete |
| Missing E2E tests | Unknown | 💡 Info | ✅ Users complete (4/4) |

### Repository Column Legend
- ✅ = Repository function validates with `Schema.parse()`
- ❌ = Repository function doesn't validate (returns raw Prisma type)
- ❓ = Not yet audited

## Detailed Violations

| Endpoint | Return Type | Validation | Repository | E2E Tests | Notes |
|----------|-------------|------------|------------|-----------|-------|
| **Order Management** |
| `/api/order/swap-order.post.ts` | ❌ | ✅ OK | ❓ | ❓ | |
| `/api/order/[id].get.ts` | ❌ | ✅ OK | ❓ | ❓ | |
| **Admin - Dinner Events** |
| `/api/admin/dinner-event/[id].delete.ts` | ❌ | ✅ OK | ❓ | ❓ | |
| `/api/admin/dinner-event/[id].get.ts` | ❌ | ✅ OK | ❓ | ❓ | |
| `/api/admin/dinner-event/index.put.ts` | ❌ | ✅ OK | ❓ | ❓ | |
| **Admin - Teams** |
| `/api/admin/team/[id].delete.ts` | ❌ | ✅ OK | ❓ | ❓ | |
| `/api/admin/team/index.get.ts` | ❌ | ✅ OK | ❓ | ❓ | |
| `/api/admin/team/[id].post.ts` | ❌ | ✅ OK | ❓ | ❓ | |
| `/api/admin/team/[id].get.ts` | ❌ | ✅ OK | ❓ | ❓ | |
| `/api/admin/team/index.put.ts` | ❌ | ✅ OK | ❓ | ❓ | |
| `/api/admin/team/assignment/[id].delete.ts` | ❌ | ✅ OK | ❓ | ❓ | |
| `/api/admin/team/assignment/index.get.ts` | ❌ | ✅ OK | ❓ | ❓ | |
| `/api/admin/team/assignment/[id].get.ts` | ❌ | ✅ OK | ❓ | ❓ | |
| `/api/admin/team/assignment/index.put.ts` | ❌ | ✅ OK | ❓ | ❓ | |
| **Admin - Users** | | | | | **✅ FULLY COMPLIANT** |
| `/api/admin/users/[id].delete.ts` | ✅ | ✅ OK | ✅ | ✅ | deleteUser() validates with UserResponseSchema |
| `/api/admin/users/index.get.ts` | ✅ | ✅ OK | ✅ | ✅ | fetchUsers() validates with UserDisplaySchema |
| `/api/admin/users/index.put.ts` | ✅ | ✅ OK | ✅ | ✅ | saveUser() validates with UserResponseSchema |
| `/api/admin/users/by-role/[role].get.ts` | ✅ | ✅ OK | ✅ | ✅ | fetchUsersByRole() validates with UserDisplaySchema |
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
| `/api/admin/heynabo/import.get.ts` | ❌ | ✅ OK | |

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