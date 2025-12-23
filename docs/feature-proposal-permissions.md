# Feature Proposal: Authorization System

**Status:** Proposed
**Date:** 2025-12-23
**Author:** Architecture Review

---

## Problem Statement

TheSlope has **authentication** (session-based via nuxt-auth-utils) but **no authorization**:

| Issue | Impact |
|-------|--------|
| Any logged-in user can mutate ALL admin endpoints | Non-admins can create/delete seasons, users, etc. |
| User endpoints don't validate data ownership | User A can delete user B's orders/allergies |
| Frontend has role checks but backend doesn't enforce | UI disables buttons, but API accepts requests anyway |

**Current state:**
```
Frontend (auth.ts)          Backend (guard.ts)
├── isAdmin (computed)      ├── Checks session exists ✅
├── isAllergyManager        └── No role/ownership checks ❌
└── UI conditionals only
```

---

## Proposed Solution

### Core Design: Three Permission Predicates

| Predicate | Usage | Example Routes |
|-----------|-------|----------------|
| `isAdmin(user)` | Most admin mutations | `/api/admin/season/*`, `/api/admin/household/*` |
| `canMutateAllergies(user)` | ADMIN OR ALLERGYMANAGER | `/api/admin/allergy-type/*` |
| `isInHousehold(user, householdId)` | User data ownership | `/api/order/*`, `/api/household/allergy/*` |

### Architecture: Shared Composable (DRY)

```
┌─────────────────────────────────────────────────────────────┐
│              usePermissions.ts (SHARED)                      │
│                                                              │
│   // Base predicates                                         │
│   isAdmin(user): boolean                                     │
│   isAllergyManager(user): boolean                            │
│   isInHousehold(user, householdId): boolean                  │
│                                                              │
│   // Composed predicate                                      │
│   canMutateAllergies(user) = isAdmin || isAllergyManager     │
│                                                              │
│   // Route permission table                                  │
│   ROUTE_PERMISSIONS: Array<{pattern, methods, check}>        │
└─────────────────────────────────────────────────────────────┘
              ↓                           ↓
┌─────────────────────────┐   ┌─────────────────────────────────┐
│       auth.ts           │   │   server/middleware/1.authorize │
│  (reactive wrappers)    │   │   (direct function calls)       │
└─────────────────────────┘   └─────────────────────────────────┘
```

---

## Route Permission Table

Evaluated **in order** (most specific first, fallback at bottom):

```typescript
export const ROUTE_PERMISSIONS = [
    // ===== ADMIN ROUTES (most specific first) =====

    // Allergy types: ADMIN or ALLERGYMANAGER can mutate
    { pattern: /^\/api\/admin\/allergy-type/, methods: ['PUT', 'POST', 'DELETE'], check: canMutateAllergies },

    // All other admin mutations: ADMIN only
    { pattern: /^\/api\/admin\//, methods: ['PUT', 'POST', 'DELETE'], check: isAdmin },

    // Admin GET: all authenticated users (view access)
    { pattern: /^\/api\/admin\//, methods: ['GET'], check: isAuthenticated },

    // ===== USER ROUTES (ownership checked per-endpoint) =====

    { pattern: /^\/api\/order\//, methods: null, check: isAuthenticated },
    { pattern: /^\/api\/household\//, methods: null, check: isAuthenticated },
    { pattern: /^\/api\/team\//, methods: null, check: isAuthenticated },

    // ===== FALLBACK =====

    { pattern: /^\/api\//, methods: null, check: isAuthenticated },
]
```

### Permission Matrix

| Route | GET | PUT/POST/DELETE |
|-------|-----|-----------------|
| `/api/admin/allergy-type/*` | Any authenticated | ADMIN or ALLERGYMANAGER |
| `/api/admin/season/*` | Any authenticated | ADMIN only |
| `/api/admin/household/*` | Any authenticated | ADMIN only |
| `/api/admin/team/*` | Any authenticated | ADMIN only |
| `/api/admin/users/*` | Any authenticated | ADMIN only |
| `/api/order/*` | Own household | Own household |
| `/api/household/allergy/*` | Own household | Own household |

---

## Implementation Overview

### New Files

| File | Purpose |
|------|---------|
| `app/composables/usePermissions.ts` | Shared predicates + route table |
| `server/utils/authorizationHelper.ts` | Backend helpers using `throwH3Error` |
| `server/middleware/1.authorize.ts` | Route authorization middleware |

### Modified Files

| File | Change |
|------|--------|
| `app/stores/auth.ts` | Use shared predicates instead of inline logic |
| `server/routes/api/order/*.ts` | Add `requireHouseholdAccess()` |
| `server/routes/api/household/allergy/*.ts` | Add `requireHouseholdAccess()` |

---

## Code Examples

### Permission Predicates

```typescript
// app/composables/usePermissions.ts

export const isAdmin = (user: UserDetail): boolean =>
    user.systemRoles?.includes('ADMIN') ?? false

export const isAllergyManager = (user: UserDetail): boolean =>
    user.systemRoles?.includes('ALLERGYMANAGER') ?? false

export const isInHousehold = (user: UserDetail, householdId: number): boolean =>
    user.Inhabitant?.householdId === householdId

export const canMutateAllergies = (user: UserDetail): boolean =>
    isAdmin(user) || isAllergyManager(user)
```

### Backend Authorization Helper

```typescript
// server/utils/authorizationHelper.ts

import eventHandlerHelper from '~/server/utils/eventHandlerHelper'
const { throwH3Error } = eventHandlerHelper
const PREFIX = '🔒 > [AUTHORIZE]'

export const requireHouseholdAccess = async (
    event: H3Event,
    targetHouseholdId: number
): Promise<UserDetail> => {
    const user = await getRequiredUser(event)

    if (!isInHousehold(user, targetHouseholdId)) {
        return throwH3Error(
            `${PREFIX} User ${user.email} denied access to household ${targetHouseholdId}`,
            new Error('Access denied to this household'),
            403
        )
    }
    return user
}
```

### Frontend (Unchanged API)

```vue
<template>
  <!-- Existing pattern continues to work -->
  <UButton :disabled="!isAdmin" @click="deleteSeason">Delete</UButton>
</template>

<script setup>
const { isAdmin } = storeToRefs(useAuthStore())
</script>
```

### User Endpoint with Ownership Check

```typescript
// server/routes/api/order/[id].delete.ts

export default defineEventHandler(async (event): Promise<OrderDisplay> => {
    const order = await fetchOrder(d1Client, id)

    // Ownership validation
    await requireHouseholdAccess(event, order.inhabitant.householdId)

    // ... existing deletion logic
})
```

---

## Migration Impact

### Admin Endpoints (Automatic via Middleware)

No code changes needed - middleware handles authorization:

| Role | Before | After |
|------|--------|-------|
| ADMIN | Can mutate everything | Can mutate everything ✅ |
| ALLERGYMANAGER | Can mutate everything ❌ | Can only mutate allergy-type ✅ |
| Regular user | Can mutate everything ❌ | Can only view (GET) ✅ |

### User Endpoints (Manual Ownership Checks)

Each endpoint needs explicit `requireHouseholdAccess()`:

| Endpoint | Required Change |
|----------|-----------------|
| `PUT /api/order` | Add ownership check on body.inhabitantId |
| `GET/POST/DELETE /api/order/[id]` | Fetch order → check inhabitant.householdId |
| `PUT /api/household/allergy` | Lookup inhabitant → check householdId |
| `GET/POST/DELETE /api/household/allergy/[id]` | Fetch allergy → check inhabitant.householdId |

---

## Test Strategy

### Unit Tests (`permissions.unit.spec.ts`)

```typescript
describe.each([
    ['ADMIN', '/api/admin/season', 'DELETE', true],
    ['ALLERGYMANAGER', '/api/admin/season', 'DELETE', false],
    ['ALLERGYMANAGER', '/api/admin/allergy-type', 'DELETE', true],
    ['USER', '/api/admin/season', 'GET', true],
    ['USER', '/api/admin/season', 'DELETE', false],
])('%s accessing %s %s → %s', (role, path, method, expected) => {
    // Test permission predicates
})
```

### E2E Tests (`authorization.e2e.spec.ts`)

| Scenario | Expected |
|----------|----------|
| ADMIN mutates `/api/admin/season` | 200 |
| Non-admin mutates `/api/admin/season` | 403 |
| ALLERGYMANAGER mutates `/api/admin/allergy-type` | 200 |
| ALLERGYMANAGER mutates `/api/admin/season` | 403 |
| User accesses own household order | 200 |
| User accesses other household order | 403 |

---

## Benefits

1. **DRY** - Single source of truth for frontend AND backend
2. **Consistent** - UI disables match backend enforcement
3. **Automatic** - Admin routes protected via middleware (no endpoint changes)
4. **Explicit** - User endpoint ownership checks are clear and auditable
5. **Extensible** - New roles = add predicate + update route table
6. **Testable** - Pure functions for all permission logic

---

## Future Extensibility

Adding a new role (e.g., `CHEF_COORDINATOR`):

1. Add to Prisma enum:
```prisma
enum SystemRole {
  ADMIN
  ALLERGYMANAGER
  CHEF_COORDINATOR  // NEW
}
```

2. Add predicate + update route table:
```typescript
export const isChefCoordinator = (user: UserDetail): boolean =>
    user.systemRoles?.includes('CHEF_COORDINATOR') ?? false

export const canManageTeams = (user: UserDetail): boolean =>
    isAdmin(user) || isChefCoordinator(user)

// In ROUTE_PERMISSIONS:
{ pattern: /^\/api\/admin\/team/, methods: ['PUT', 'POST', 'DELETE'], check: canManageTeams },
```

Both frontend and backend automatically use the new permission.

---

## Decision Required

**Approve this design to proceed with implementation?**

- [ ] Approved - proceed with implementation
- [ ] Changes requested - see comments
