# ADR-011: Unified Authorization Architecture

**Status:** Proposed | **Date:** 2025-11-04

## Context

Current implementation lacks systematic authorization. All endpoints are under `/api/admin/*` but serve both ADMIN and USER roles without proper access control. Users could potentially access/modify other households' data, creating security vulnerabilities.

## Decision

**Service-layer authorization with AccessContext pattern** - Implement authorization checks in a dedicated service layer between API routes and repository, using an AccessContext object to encapsulate user permissions.

### Authorization Matrix

| Entity | User Read | User Write | Admin Read | Admin Write | Authorization Logic |
|--------|-----------|------------|------------|-------------|-------------------|
| **Household** | All | Own only | All | All | Write: `household.id === ctx.householdId` |
| **Inhabitant** | All | Own household | All | All | Write: `inhabitant.householdId === ctx.householdId` |
| **Allergy** | All | Own household | All | All | Write: via inhabitant check |
| **Order** | All | Own household | All | All | Write: via inhabitant check |
| **DinnerEvent** | All | Chef/team member | All | All | Write: `chefId === ctx.inhabitantId OR isTeamMember()` |
| **CookingTeamAssignment** | All | Own only | All | All | Write: `assignment.inhabitantId === ctx.inhabitantId` |
| **CookingTeam** | All | None | All | All | Write: Admin only |
| **Season** | All | None | All | All | Write: Admin only |
| **Invoice** | Own only | None | All | All | Read: `invoice.householdId === ctx.householdId` |
| **Transaction** | Own only | None | All | All | Read: via invoice check |

### Implementation Strategy

#### 1. AccessContext Type

```typescript
// server/types/authorization.ts
export interface AccessContext {
  systemRole: SystemRole
  userId?: number
  householdId?: number
  inhabitantId?: number
  isAdmin: boolean
}
```

#### 2. Enhanced Guard

```typescript
// server/utils/guard.ts
export async function requireAuth(event: H3Event): Promise<AccessContext> {
  const session = await requireAuthSession(event)
  const user = await getUserByEmail(event.context.cloudflare.env.DB, session.user.email)

  const inhabitant = user.Inhabitant?.[0]

  return {
    systemRole: user.systemRole,
    userId: user.id,
    householdId: inhabitant?.householdId,
    inhabitantId: inhabitant?.id,
    isAdmin: user.systemRole === 'ADMIN'
  }
}
```

#### 3. AuthorizationService

```typescript
// server/services/authorizationService.ts
export class AuthorizationService {
  static canEditHousehold(ctx: AccessContext, household: Household): boolean {
    return ctx.isAdmin || household.id === ctx.householdId
  }

  static canEditInhabitant(ctx: AccessContext, inhabitant: Inhabitant): boolean {
    return ctx.isAdmin || inhabitant.householdId === ctx.householdId
  }

  static canEditDinnerEvent(ctx: AccessContext, event: DinnerEvent): boolean {
    if (ctx.isAdmin) return true
    if (event.chefId === ctx.inhabitantId) return true
    // TODO: Check team membership when assignments loaded
    return false
  }

  static canViewFinancial(ctx: AccessContext, householdId: number): boolean {
    return ctx.isAdmin || householdId === ctx.householdId
  }

  static filterFinancialQuery(ctx: AccessContext): Prisma.InvoiceWhereInput | undefined {
    return ctx.isAdmin ? undefined : { householdId: ctx.householdId }
  }
}
```

#### 4. Repository Pattern Update

```typescript
// server/data/prismaRepository.ts
export async function fetchInvoices(
  d1Client: D1Database,
  ctx: AccessContext
): Promise<Invoice[]> {
  const prisma = await getPrismaClientConnection(d1Client)
  return await prisma.invoice.findMany({
    where: AuthorizationService.filterFinancialQuery(ctx),
    include: { transactions: true }
  })
}

export async function updateInhabitant(
  d1Client: D1Database,
  ctx: AccessContext,
  id: number,
  data: Inhabitant
): Promise<Inhabitant> {
  const prisma = await getPrismaClientConnection(d1Client)

  // Fetch to check authorization
  const existing = await prisma.inhabitant.findUnique({ where: { id } })
  if (!existing) throw createError({ statusCode: 404 })

  if (!AuthorizationService.canEditInhabitant(ctx, existing)) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  return await prisma.inhabitant.update({ where: { id }, data })
}
```

#### 5. API Route Pattern

```typescript
// server/routes/api/admin/inhabitant/[id].put.ts
export default defineEventHandler(async (event) => {
  const ctx = await requireAuth(event)
  const { id } = await getValidatedRouterParams(event, schema)
  const data = await readValidatedBody(event, InhabitantSchema)

  // Authorization handled in repository layer
  const result = await updateInhabitant(event.context.cloudflare.env.DB, ctx, id, data)

  setResponseStatus(event, 200)
  return result
})
```

### Error Strategy

- **404 Not Found**: Resource doesn't exist OR user can't view it (financial data)
- **403 Forbidden**: Resource exists, user can view but not modify
- **401 Unauthorized**: No valid session

## Trade-offs Considered

1. **Service Layer vs Middleware**: Service layer chosen for explicit control and testability
2. **AccessContext vs User Object**: Context provides flattened, ready-to-use permission data
3. **Repository vs API Authorization**: Repository ensures consistent enforcement across all access paths

## Open Questions

1. Should we cache AccessContext in event.context for request lifecycle?
2. How to handle team membership checks efficiently (avoid N+1 queries)?
3. Should financial filtering return empty array or 403 for unauthorized households?
4. Do we need audit logging for authorization failures?

## Compliance

1. **MUST** pass AccessContext from guard to all repository methods
2. **MUST** check authorization before any write operation
3. **MUST** filter financial data by householdId for USER role
4. **MUST** return 404 (not 403) for private resources user cannot access
5. **MUST NOT** create duplicate `/api/household/*` endpoints
6. **SHOULD** add authorization tests for each entity type
7. **SHOULD** log authorization failures for security monitoring

## Related ADRs

- **ADR-002:** Event handler patterns (error handling)
- **ADR-005:** Repository patterns (where authorization checks occur)
- **ADR-007:** Store patterns (frontend handles 403/404 appropriately)
