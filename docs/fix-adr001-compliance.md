# ADR-001 Zod Enum Type Safety Compliance Report

**Generated:** 2025-11-08
**Status:** 🔴 **CRITICAL VIOLATIONS FOUND**

---

## Executive Summary

**Overall Compliance:** 6/19 files compliant (32%)

| Violation Category | Count | Severity |
|-------------------|-------|----------|
| Manual Enum Definitions | 3 | 🔴 CRITICAL |
| String Literal Usage | 11 instances | 🟡 HIGH |
| Schema Mismatches | 2 | 🔴 CRITICAL |

**Risk Assessment:**
- **Schema Drift Risk:** 🔴 HIGH - Manual enums won't update with Prisma schema changes
- **Type Safety Risk:** 🟡 MEDIUM - String literals bypass TypeScript checking
- **Data Integrity Risk:** 🔴 HIGH - Invalid `HUNGRY_BABY` enum value

---

## Available Prisma Enum Schemas

Generated at `prisma/generated/zod/index.ts`:

| Prisma Enum | Generated Zod Schema | Values |
|-------------|---------------------|--------|
| `SystemRole` | `SystemRoleSchema` | `ADMIN`, `ALLERGYMANAGER` |
| `Role` | `RoleSchema` | `CHEF`, `COOK`, `JUNIORHELPER` |
| `TicketType` | `TicketTypeSchema` | `ADULT`, `CHILD`, `BABY` |
| `DinnerMode` | `DinnerModeSchema` | `TAKEAWAY`, `DINEIN`, `DINEINLATE`, `NONE` |
| `OrderState` | `OrderStateSchema` | `BOOKED`, `RELEASED`, `CLOSED` |

---

## 🔴 CRITICAL: Manual Enum Definitions

### Violation 1: useDinnerEventValidation.ts

| Property | Value |
|----------|-------|
| **File** | `app/composables/useDinnerEventValidation.ts` |
| **Line** | 8 |
| **Severity** | 🔴 CRITICAL |
| **Issue** | Manual enum definition **MISSING `DINEINLATE`** |

**Current Code:**
```typescript
const DinnerModeSchema = z.enum(['TAKEAWAY', 'DINEIN', 'NONE'])
```

**Expected Values (from Prisma):**
```typescript
['TAKEAWAY', 'DINEIN', 'DINEINLATE', 'NONE']  // ⚠️ Missing DINEINLATE!
```

**Required Fix:**
```typescript
// Remove line 8
- const DinnerModeSchema = z.enum(['TAKEAWAY', 'DINEIN', 'NONE'])

// Add import at top of file
+ import { DinnerModeSchema } from '~~/prisma/generated/zod'
```

**Impact:** Runtime validation will reject valid `DINEINLATE` values from database.

---

### Violation 2: useCookingTeamValidation.ts

| Property | Value |
|----------|-------|
| **File** | `app/composables/useCookingTeamValidation.ts` |
| **Line** | 25 |
| **Severity** | 🔴 CRITICAL |
| **Issue** | Manual enum duplicates Prisma `Role` enum |

**Current Code:**
```typescript
const TeamRoleSchema = z.enum(['CHEF', 'COOK', 'JUNIORHELPER'])
```

**Required Fix:**
```typescript
// Remove line 25
- const TeamRoleSchema = z.enum(['CHEF', 'COOK', 'JUNIORHELPER'])

// Add import at top of file
+ import { RoleSchema } from '~~/prisma/generated/zod'

// Rename RoleSchema to TeamRoleSchema for backwards compatibility
+ const TeamRoleSchema = RoleSchema
```

**Alternative Fix (Better):**
```typescript
// Import and use RoleSchema directly, update all references
+ import { RoleSchema } from '~~/prisma/generated/zod'

// Update return statement (line 122)
- TeamRoleSchema,
+ RoleSchema,

// Update re-export (line 143)
- export type TeamRole = z.infer<ReturnType<typeof useCookingTeamValidation>['TeamRoleSchema']>
+ export type TeamRole = z.infer<typeof RoleSchema>
```

**Impact:** Schema drift if Prisma `Role` enum changes.

---

### Violation 3: useTicketPriceValidation.ts

| Property | Value |
|----------|-------|
| **File** | `app/composables/useTicketPriceValidation.ts` |
| **Line** | 10, 18 |
| **Severity** | 🔴 CRITICAL |
| **Issue** | Invalid enum value `HUNGRY_BABY` not in Prisma schema |

**Current Code:**
```typescript
// Line 10
const TICKET_TYPES = ['ADULT', 'CHILD', 'BABY', 'HUNGRY_BABY'] as const

// Line 18
ticketType: z.enum(TICKET_TYPES),
```

**Expected Values (from Prisma):**
```typescript
['ADULT', 'CHILD', 'BABY']  // ⚠️ HUNGRY_BABY doesn't exist!
```

**Required Fix:**
```typescript
// Remove lines 10-18 constant and replace with import
- const TICKET_TYPES = ['ADULT', 'CHILD', 'BABY', 'HUNGRY_BABY'] as const

// Add import at top of file
+ import { TicketTypeSchema } from '~~/prisma/generated/zod'

// Update TicketPriceSchema (line 15-22)
const TicketPriceSchema = z.object({
    id: z.number().int().positive().optional(),
    seasonId: z.number().int().positive().optional(),
-   ticketType: z.enum(TICKET_TYPES),
+   ticketType: TicketTypeSchema,
    price: z.number().int().nonnegative(),
    description: z.string().optional().nullable(),
    maximumAgeLimit: z.number().int().nonnegative().optional().nullable()
})

// Remove or update exports (line 73)
- TICKET_TYPES,
```

**Impact:** 🔴 **DATABASE CONSTRAINT VIOLATION** - Attempting to save `HUNGRY_BABY` will fail.

---

## 🟡 HIGH: String Literal Usage Violations

### Composables

| File | Line | Current Code | Required Fix |
|------|------|--------------|--------------|
| None found | - | - | - |

### Stores

| File | Line | Current Code | Required Fix |
|------|------|--------------|--------------|
| `app/stores/auth.ts` | 33 | `systemRoles.value.includes('ADMIN')` | `import { SystemRoleSchema } from '~~/prisma/generated/zod'`<br/>`systemRoles.value.includes(SystemRoleSchema.enum.ADMIN)` |
| `app/stores/auth.ts` | 34 | `systemRoles.value.includes('ALLERGYMANAGER')` | `systemRoles.value.includes(SystemRoleSchema.enum.ALLERGYMANAGER)` |
| `app/stores/users.ts` | 18 | `$fetch('/api/admin/users/by-role/ALLERGYMANAGER')` | `import { SystemRoleSchema } from '~~/prisma/generated/zod'`<br/>``$fetch(`/api/admin/users/by-role/${SystemRoleSchema.enum.ALLERGYMANAGER}`)`` |

### Components

| File | Line | Current Code | Required Fix |
|------|------|--------------|--------------|
| `app/components/admin/AdminUsers.vue` | 11 | `case 'ADMIN': return 'error'` | `import { SystemRoleSchema } from '~~/prisma/generated/zod'`<br/>`case SystemRoleSchema.enum.ADMIN: return 'error'` |
| `app/components/admin/AdminUsers.vue` | 12 | `case 'ALLERGYMANAGER': return 'warning'` | `case SystemRoleSchema.enum.ALLERGYMANAGER: return 'warning'` |
| `app/components/admin/AdminUsers.vue` | 54 | `role === 'ALLERGYMANAGER' ? 'ALLERGIER' : role` | `role === SystemRoleSchema.enum.ALLERGYMANAGER ? 'ALLERGIER' : role` |

### Configuration

| File | Line | Current Code | Required Fix |
|------|------|--------------|--------------|
| `app/app.config.ts` | 11 | `ticketType: 'BABY'` | `import { TicketTypeSchema } from '~~/prisma/generated/zod'`<br/>`ticketType: TicketTypeSchema.enum.BABY` |
| `app/app.config.ts` | 12 | `ticketType: 'CHILD'` | `ticketType: TicketTypeSchema.enum.CHILD` |
| `app/app.config.ts` | 14 | `ticketType: 'ADULT'` | `ticketType: TicketTypeSchema.enum.ADULT` |

### Server Code

| File | Line | Current Code | Required Fix |
|------|------|--------------|--------------|
| `server/integration/heynabo.ts` | 204 | `member?.role === 'admin' ? ['ADMIN'] : []` | `import { SystemRoleSchema } from '~~/prisma/generated/zod'`<br/>`? [SystemRoleSchema.enum.ADMIN] : []` |

---

## ℹ️ INFO: Type Annotation Violations

| File | Line | Current Code | Required Fix |
|------|------|--------------|--------------|
| `app/components/cooking-team/CookingTeamCard.vue` | 8, 48 | `role: 'CHEF' \| 'COOK' \| 'JUNIORHELPER'` | `import type { TeamRole } from '~/composables/useCookingTeamValidation'`<br/>`role: TeamRole` |
| `app/components/cooking-team/InhabitantSelector.vue` | 22, 43, 129 | `role: 'CHEF' \| 'COOK' \| 'JUNIORHELPER'` | `import type { TeamRole } from '~/composables/useCookingTeamValidation'`<br/>`role: TeamRole` |

---

## ✅ Compliant Files (Reference Examples)

These files demonstrate correct ADR-001 compliance:

| File | Compliance Pattern |
|------|-------------------|
| `app/composables/useUserValidation.ts` | ✅ Imports `SystemRoleSchema` from `~~/prisma/generated/zod` (line 2) |
| `app/composables/useOrderValidation.ts` | ✅ Imports `TicketTypeSchema`, `OrderStateSchema` from `~~/prisma/generated/zod` (line 4) |
| `app/composables/useOrderValidation.ts` | ✅ Correctly defines custom `OrderActionSchema` (not a Prisma enum) (line 7) |

---

## Remediation Priority

### P0 - Critical (Fix Immediately)

| Priority | File | Reason |
|----------|------|--------|
| **P0.1** | `useTicketPriceValidation.ts` | Invalid `HUNGRY_BABY` enum causes database constraint violations |
| **P0.2** | `useDinnerEventValidation.ts` | Missing `DINEINLATE` rejects valid database values |

### P1 - High (Fix This Sprint)

| Priority | File | Reason |
|----------|------|--------|
| **P1.1** | `useCookingTeamValidation.ts` | Manual enum creates schema drift risk |
| **P1.2** | `app/stores/auth.ts` | Core authentication uses string literals |
| **P1.3** | `app/stores/users.ts` | API calls use hardcoded role strings |

### P2 - Medium (Fix Next Sprint)

| Priority | File | Reason |
|----------|------|--------|
| **P2.1** | `app/components/admin/AdminUsers.vue` | UI logic uses string literals |
| **P2.2** | `app/app.config.ts` | Configuration uses string literals |
| **P2.3** | `server/integration/heynabo.ts` | Server integration uses string literals |

### P3 - Low (Refactor When Touching Code)

| Priority | File | Reason |
|----------|------|--------|
| **P3.1** | `app/components/cooking-team/CookingTeamCard.vue` | Type annotations only (no runtime impact) |
| **P3.2** | `app/components/cooking-team/InhabitantSelector.vue` | Type annotations only (no runtime impact) |

---

## Implementation Checklist

### Phase 1: Critical Fixes (P0)

- [ ] **Fix useTicketPriceValidation.ts**
  - [ ] Import `TicketTypeSchema` from `~~/prisma/generated/zod`
  - [ ] Remove `TICKET_TYPES` constant
  - [ ] Update `TicketPriceSchema.ticketType` to use `TicketTypeSchema`
  - [ ] Remove `TICKET_TYPES` from exports
  - [ ] Search codebase for `HUNGRY_BABY` references and remove/migrate
  - [ ] Run tests: `npm run test`
  - [ ] Verify: `npx vitest run tests/component/composables/useTicketPriceValidation.unit.spec.ts`

- [ ] **Fix useDinnerEventValidation.ts**
  - [ ] Import `DinnerModeSchema` from `~~/prisma/generated/zod`
  - [ ] Remove manual `DinnerModeSchema` definition (line 8)
  - [ ] Run tests: `npm run test`
  - [ ] Add test case for `DINEINLATE` value

### Phase 2: Store Fixes (P1)

- [ ] **Fix app/stores/auth.ts**
  - [ ] Import `SystemRoleSchema` from `~~/prisma/generated/zod`
  - [ ] Replace `'ADMIN'` with `SystemRoleSchema.enum.ADMIN` (line 33)
  - [ ] Replace `'ALLERGYMANAGER'` with `SystemRoleSchema.enum.ALLERGYMANAGER` (line 34)
  - [ ] Run tests: `npm run test`

- [ ] **Fix app/stores/users.ts**
  - [ ] Import `SystemRoleSchema` from `~~/prisma/generated/zod`
  - [ ] Update fetch URL to use template literal with `SystemRoleSchema.enum.ALLERGYMANAGER`
  - [ ] Run tests: `npm run test`

- [ ] **Fix useCookingTeamValidation.ts**
  - [ ] Import `RoleSchema` from `~~/prisma/generated/zod`
  - [ ] Remove manual `TeamRoleSchema` definition
  - [ ] Add alias: `const TeamRoleSchema = RoleSchema` OR update all references
  - [ ] Run tests: `npm run test`

### Phase 3: Component Fixes (P2)

- [ ] **Fix app/components/admin/AdminUsers.vue**
  - [ ] Import `SystemRoleSchema` from `~~/prisma/generated/zod`
  - [ ] Update switch cases (lines 11-12)
  - [ ] Update template conditional (line 54)
  - [ ] Test UI manually

- [ ] **Fix app/app.config.ts**
  - [ ] Import `TicketTypeSchema` from `~~/prisma/generated/zod`
  - [ ] Update all `ticketType` properties
  - [ ] Verify app config loads correctly

- [ ] **Fix server/integration/heynabo.ts**
  - [ ] Import `SystemRoleSchema` from `~~/prisma/generated/zod`
  - [ ] Replace `['ADMIN']` with `[SystemRoleSchema.enum.ADMIN]`
  - [ ] Run integration tests

### Phase 4: Type Annotations (P3)

- [ ] **Fix app/components/cooking-team/CookingTeamCard.vue**
  - [ ] Import `TeamRole` type from `~/composables/useCookingTeamValidation`
  - [ ] Replace union type with `TeamRole`

- [ ] **Fix app/components/cooking-team/InhabitantSelector.vue**
  - [ ] Import `TeamRole` type from `~/composables/useCookingTeamValidation`
  - [ ] Replace union types with `TeamRole`

---

## Verification Steps

After each fix:

1. **Run type checking:** `npx tsc --noEmit`
2. **Run unit tests:** `npm run test`
3. **Run E2E tests:** `npm run test:e2e`
4. **Build verification:** `npm run build`

After all fixes:

1. **Search for remaining violations:**
   ```bash
   # Search for string literals
   grep -r "'ADMIN'" app/ server/
   grep -r "'CHEF'" app/ server/
   grep -r "'BOOKED'" app/ server/
   grep -r "'TAKEAWAY'" app/ server/
   grep -r "'ADULT'" app/ server/

   # Search for manual enum definitions
   grep -r "z.enum\[" app/composables/
   ```

2. **Verify all Prisma enums are imported:**
   ```bash
   grep -r "from '~~/prisma/generated/zod'" app/composables/
   ```

---

## Testing Requirements

### New Test Cases Required

1. **useDinnerEventValidation.ts**
   - Test validation accepts `DINEINLATE` value
   - Test all 4 enum values parse successfully

2. **useTicketPriceValidation.ts**
   - Test `HUNGRY_BABY` is rejected (after removal)
   - Test all 3 valid ticket types parse successfully

3. **Integration Tests**
   - Test role-based access control with enum values
   - Test dinner mode selection across all values
   - Test ticket type determination with all types

---

## ADR-001 Compliance Pattern Reference

### ✅ Correct Pattern

```typescript
// Import generated Zod enum schemas
import { SystemRoleSchema, RoleSchema, TicketTypeSchema, DinnerModeSchema, OrderStateSchema } from '~~/prisma/generated/zod'

// Use in validation schemas
const UserSchema = z.object({
  systemRoles: z.array(SystemRoleSchema)
})

// Use .enum property for runtime values
const isAdmin = user.systemRoles.includes(SystemRoleSchema.enum.ADMIN)

// Use Zod inference for types
type SystemRole = z.infer<typeof SystemRoleSchema>

// In switch statements
switch (role) {
  case RoleSchema.enum.CHEF:
    return 'Chef'
  case RoleSchema.enum.COOK:
    return 'Cook'
  default:
    return 'Helper'
}

// In conditionals
if (state === OrderStateSchema.enum.BOOKED) {
  // ...
}

// In object literals
const config = {
  ticketType: TicketTypeSchema.enum.ADULT,
  dinnerMode: DinnerModeSchema.enum.DINEIN
}
```

### ❌ Incorrect Pattern (Violations)

```typescript
// ❌ Manual enum definition
const DinnerModeSchema = z.enum(['TAKEAWAY', 'DINEIN', 'NONE'])

// ❌ String literals in conditionals
if (role === 'ADMIN') { }

// ❌ String literals in switch
switch (state) {
  case 'BOOKED': return 'Active'
}

// ❌ String literals in arrays
systemRoles: ['ADMIN', 'ALLERGYMANAGER']

// ❌ String literals in object properties
{ ticketType: 'ADULT' }

// ❌ Union type annotations
role: 'CHEF' | 'COOK' | 'JUNIORHELPER'
```

### ✅ Exception: Custom Enums

Only define custom enums for application-level values NOT in Prisma schema:

```typescript
// ✅ CORRECT - OrderAction is NOT a Prisma enum
const OrderActionSchema = z.enum(['CREATED', 'RELEASED', 'CLAIMED', 'CLOSED', 'DELETED'])
```

---

## Risk Mitigation

### Immediate Risks

1. **Data Integrity:** `HUNGRY_BABY` enum value will cause database insert failures
2. **Feature Gaps:** Missing `DINEINLATE` prevents using valid dinner mode
3. **Runtime Errors:** String literal typos won't be caught until runtime

### Long-term Risks

1. **Schema Drift:** Manual enums won't update when Prisma schema changes
2. **Maintenance Burden:** Duplicated enum definitions require synchronized updates
3. **Type Safety Erosion:** String literals bypass TypeScript's type checking

### Prevention Strategy

1. **Pre-commit Hook:** Add lint rule to detect string literal enum usage
2. **CI/CD Check:** Add grep search for common enum string literals
3. **Code Review:** Enforce ADR-001 compliance in pull request reviews
4. **Documentation:** Update developer onboarding to emphasize ADR-001

---

## Estimated Effort

| Phase | Estimated Time | Files |
|-------|---------------|-------|
| **P0 - Critical** | 2-4 hours | 2 files |
| **P1 - High** | 2-3 hours | 3 files |
| **P2 - Medium** | 2-3 hours | 3 files |
| **P3 - Low** | 1-2 hours | 2 files |
| **Testing & Verification** | 2-3 hours | All |
| **Total** | **9-15 hours** | **10 files** |

---

## Success Criteria

- [ ] Zero manual Prisma enum definitions in composables
- [ ] Zero string literal enum usage in runtime code
- [ ] All tests passing
- [ ] Build successful
- [ ] Grep searches for violations return empty results
- [ ] ADR-001 compliance reaches 100%
