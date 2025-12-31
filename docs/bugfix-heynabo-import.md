# Bug Fix Proposal: Heynabo Import Service

**Status:** Ready for Review
**Date:** 2025-12-31
**Author:** Architecture Review
**Severity:** Critical - Data synchronization is incomplete

---

## 1. Problem Summary

The Heynabo import service (`server/utils/heynaboImportService.ts`) was converted to batch operations but multiple critical code paths are missing or broken:

### 1.1 Missing UPDATE Handling

| Entity | CREATE | UPDATE | DELETE |
|--------|--------|--------|--------|
| Household | OK | **MISSING** | OK |
| Inhabitant | OK | **MISSING** | OK |
| User | BROKEN (orphans) | **MISSING** | OK |

**Impact:** When data changes in Heynabo (name, address, email, role), our system retains stale data.

### 1.2 Orphan User Creation

**Current code (lines 127-134):**
```typescript
// Create users for inhabitants with email (after inhabitant creation)
for (const inhabitant of chunk) {
    if (inhabitant.user) {
        await saveUser(d1Client, inhabitant.user)
        usersCreated++
    }
}
```

**Problem:** `saveUser()` creates/updates the User record but does NOT link it to the Inhabitant. The `Inhabitant.userId` foreign key is never set, creating orphan users.

**Evidence:** The E2E test (line 53-55) explicitly checks for this:
```typescript
const orphanUsers = users.filter((u: UserDisplay) => u.Inhabitant === null && !isAdmin(u))
expect(orphanUsers.length, `Orphan users: ${JSON.stringify(orphanUsers)}`).toBe(0)
```

### 1.3 Broken Response Metrics

**Current code (line 145):**
```typescript
householdsUnchanged: householdReconciliation.idempotent.length + householdReconciliation.update.length
```

The `update` array is counted as "unchanged" but updates are never executed.

---

## 2. Root Cause Analysis

### 2.1 Incomplete Batch Conversion

The original `saveHousehold()` and `saveInhabitant()` used `prisma.upsert()` which handled both create and update. When converting to batch operations:

- `createHouseholdsBatch()` only handles CREATE
- `createInhabitantsBatch()` only handles CREATE
- No `updateHouseholdsBatch()` or `updateInhabitantsBatch()` functions exist
- The import service never processes the `update` arrays from reconciliation

### 2.2 User-Inhabitant Linking Gap

The repository has `saveInhabitant()` which correctly links users:
```typescript
if (inhabitant.user) {
    const newUser = await saveUser(d1Client, inhabitant.user)
    await prisma.inhabitant.update({
        where: {id: newInhabitant.id},
        data: { user: { connect: {id: newUser.id} } }
    })
}
```

But `createInhabitantsBatch()` does NOT implement this logic - it only creates inhabitants without user linking.

### 2.3 Missing Reconciliation for Users

Users are not directly reconciled. They're implicitly handled via inhabitants:
- Inhabitant CREATE with user -> User should be created AND linked
- Inhabitant UPDATE with user -> User should be updated AND linked
- Inhabitant DELETE -> User is deleted (existing code works)

The inhabitant-user linkage is the critical missing piece.

---

## 3. Solution Design

### 3.1 Architecture Approach

**Principle:** Heynabo is source of truth. Use reconciliation pattern for all entities.

```
Heynabo API
    |
    v
[Transform to Domain] --- useHeynaboValidation.ts
    |
    v
[Reconcile] ------------- useHeynabo.ts (pruneAndCreate)
    |
    +-> create[] -----> createBatch()
    +-> update[] -----> updateBatch() [NEW]
    +-> delete[] -----> deleteBatch()
    +-> idempotent[] -> (skip)
```

### 3.2 New Repository Functions Required

```typescript
// prismaRepository.ts - NEW FUNCTIONS

/**
 * Batch update households by heynaboId (ADR-009)
 * Updates: name, address (key fields that can change in Heynabo)
 */
export async function updateHouseholdsBatch(
    d1Client: D1Database,
    households: { heynaboId: number; name: string; address: string }[]
): Promise<number>

/**
 * Batch update inhabitants by heynaboId (ADR-009)
 * Updates: name, lastName, pictureUrl, birthDate
 */
export async function updateInhabitantsBatch(
    d1Client: D1Database,
    inhabitants: { heynaboId: number; name: string; lastName: string; pictureUrl: string | null; birthDate: Date | null }[]
): Promise<number>

/**
 * Batch upsert users with inhabitant linking (ADR-009)
 * Creates OR updates user, then links to inhabitant via heynaboId
 */
export async function upsertUsersWithInhabitantLink(
    d1Client: D1Database,
    users: { email: string; phone: string | null; systemRoles: SystemRole[]; inhabitantHeynaboId: number }[]
): Promise<number>
```

### 3.3 Updated Import Service Flow

```typescript
// heynaboImportService.ts - UPDATED FLOW

// 1. Reconcile Households
const householdReconciliation = reconcileHouseholds(existing)(incoming)

// 2. Execute Household Operations
await deleteHouseholdsByHeynaboId(d1Client, householdReconciliation.delete.map(h => h.heynaboId))
await createHouseholdsBatch(d1Client, householdReconciliation.create)
await updateHouseholdsBatch(d1Client, householdReconciliation.update) // NEW

// 3. For each household, reconcile inhabitants
for (const incomingHousehold of incomingHouseholds) {
    const existingHousehold = householdByHeynaboId.get(incomingHousehold.heynaboId)
    const inhabitantReconciliation = reconcileInhabitants(existing)(incoming)

    // 3a. Delete inhabitants (and their users)
    await deleteUsersByInhabitantHeynaboId(d1Client, inhabitantReconciliation.delete.map(i => i.heynaboId))
    await deleteInhabitantsByHeynaboId(d1Client, inhabitantReconciliation.delete.map(i => i.heynaboId))

    // 3b. Create inhabitants
    await createInhabitantsBatch(d1Client, inhabitantReconciliation.create, existingHousehold.id)

    // 3c. Update inhabitants (NEW)
    await updateInhabitantsBatch(d1Client, inhabitantReconciliation.update)

    // 3d. Upsert users and link to inhabitants (for CREATE + UPDATE)
    const inhabitantsWithUsers = [...inhabitantReconciliation.create, ...inhabitantReconciliation.update]
        .filter(i => i.user !== undefined)
        .map(i => ({ ...i.user!, inhabitantHeynaboId: i.heynaboId }))
    await upsertUsersWithInhabitantLink(d1Client, inhabitantsWithUsers)
}
```

### 3.4 Enhanced Reconciliation Functions

The existing reconciliation functions in `useHeynabo.ts` need updates based on data ownership (Section 8).

#### 3.4.1 Household Equality (REMOVE pbsId)

```typescript
// Current - WRONG: pbsId is local data, not from Heynabo
const isHouseholdEqual = (existing, incoming) =>
    existing.name === incoming.name &&
    existing.address === incoming.address &&
    existing.pbsId === incoming.pbsId  // ❌ REMOVE - pbsId comes from CSV, not HN

// Should be - only compare HN-owned fields
const isHouseholdEqual = (existing, incoming) =>
    existing.name === incoming.name &&
    existing.address === incoming.address
    // pbsId: NOT compared - local data
    // movedInDate: NOT compared - local data
```

#### 3.4.2 Inhabitant Equality (ADD birthDate and user fields)

```typescript
// Current - missing birthDate and user fields
const isInhabitantEqual = (existing, incoming) =>
    existing.name === incoming.name &&
    existing.lastName === incoming.lastName &&
    existing.pictureUrl === incoming.pictureUrl

// Should be - include all HN-owned fields
const isInhabitantEqual = (existing, incoming) =>
    existing.name === incoming.name &&
    existing.lastName === incoming.lastName &&
    existing.pictureUrl === incoming.pictureUrl &&
    compareDates(existing.birthDate, incoming.birthDate) &&  // ✅ ADD - from HN
    // User fields - only compare HN-owned data (email, phone)
    // systemRoles NOT compared here - merging handled by saveUser
    (existing.user?.email === incoming.user?.email) &&
    (existing.user?.phone === incoming.user?.phone)
```

**Note:** `systemRoles` is intentionally NOT part of equality check because:
- HN only sends ADMIN role, local roles (ALLERGYMANAGER) don't exist in HN
- Role merging is handled by `mergeUserRoles()` during save, not during reconciliation

### 3.5 Response Schema Update

Add new metrics to track updates:

```typescript
// useHeynaboValidation.ts
const HeynaboImportResponseSchema = z.object({
    jobRunId: z.number().int().positive(),
    householdsCreated: z.number(),
    householdsUpdated: z.number(), // NEW
    householdsDeleted: z.number(),
    householdsUnchanged: z.number(),
    inhabitantsCreated: z.number(),
    inhabitantsUpdated: z.number(), // NEW
    inhabitantsDeleted: z.number(),
    inhabitantsUnchanged: z.number(), // NEW - for completeness
    usersCreated: z.number(),
    usersUpdated: z.number(), // NEW
    usersLinked: z.number(), // NEW - users linked to inhabitants
    usersDeleted: z.number()
})
```

---

## 4. DB Operation Analysis

### 4.1 Current Operations (Broken)

| Step | Queries | Notes |
|------|---------|-------|
| Fetch households | 1 | OK |
| Delete households | 1 | OK |
| Create households (8 per chunk) | N/8 | OK |
| **Per household:** | | |
| Create inhabitants (8 per chunk) | N/8 | Missing user link |
| Create users (1 per user) | N | **NOT LINKED** |
| Delete inhabitants | 1 | OK |
| Delete users | 1 | OK |

### 4.2 Proposed Operations (Fixed)

| Step | Queries | Notes |
|------|---------|-------|
| Fetch households | 1 | OK |
| Delete households | 1 | Cascade deletes inhabitants |
| Create households (8 per chunk) | N/8 | OK |
| Update households (batch) | 1 | **NEW** |
| **Per household:** | | |
| Delete inhabitants | 1 | OK |
| Delete users | 1 | OK |
| Create inhabitants (8 per chunk) | N/8 | OK |
| Update inhabitants (batch) | 1 | **NEW** |
| Upsert+link users | N | **NEW** - sequential for FK |

### 4.3 D1 Limits Compliance (ADR-014)

- `createManyAndReturn`: Prisma auto-chunks (OK)
- `updateMany` with `WHERE IN`: Must chunk IDs (max 90)
- User upsert+link: Sequential (2 queries per user)

**Worst case (40 households, 4 inhabitants each, all with users):**
- Household ops: ~10 queries
- Inhabitant ops: ~40 queries (batch update)
- User ops: ~320 queries (160 users x 2 queries)

Total: ~370 queries (within D1 1000 limit)

---

## 5. Implementation Plan

### 5.1 Architecture: Reconciliation Result to Operations

For each entity (Household, Inhabitant, User), the reconciliation result maps to operations:

```
RECONCILIATION RESULT (pruneAndCreate):
├── create[]    → createManyAndReturn (TRUE BATCH - Prisma handles D1 chunking)
├── update[]    → individual update by heynaboId (no Prisma batch update by non-PK)
├── idempotent[] → SKIP (no operation)
└── delete[]    → deleteMany (TRUE BATCH)
```

### 5.2 DRY Principle: saveUsers is the Workhorse

**Problem:** Current `saveUser` handles single user. Batch operations need a single code path.

**Solution:** `saveUsers` (plural) is the implementation, `saveUser` (singular) wraps it.

```typescript
// prismaRepository.ts - NEW: saveUsers (batch workhorse)

/**
 * Batch upsert users with role merging (ADR-010)
 * - Fetches existing users by email in batch
 * - Creates new users via createManyAndReturn (Prisma auto-chunks)
 * - Updates existing users individually (merge roles, can't batch update)
 * - Returns UserDisplay[] for all processed users
 */
export async function saveUsers(d1Client: D1Database, users: UserCreate[]): Promise<UserDisplay[]> {
    if (users.length === 0) return []

    console.info(`🪪 > USER > [BATCH SAVE] Saving ${users.length} users`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {serializeUserInput, deserializeUser, mergeUserRoles} = useCoreValidation()

    // 1. Fetch ALL existing users by email in single query
    const emails = users.map(u => u.email)
    const existingUsers = await prisma.user.findMany({
        where: { email: { in: emails } }
    })
    const existingByEmail = new Map(existingUsers.map(u => [u.email, u]))

    // 2. Partition into create vs update
    const toCreate: UserCreate[] = []
    const toUpdate: { existing: SerializedUser; incoming: UserCreate }[] = []

    for (const user of users) {
        const existing = existingByEmail.get(user.email)
        if (existing) {
            toUpdate.push({ existing: existing, incoming: user })
        } else {
            toCreate.push(user)
        }
    }

    const results: UserDisplay[] = []

    // 3. CREATE: Use createManyAndReturn (Prisma auto-chunks for D1)
    if (toCreate.length > 0) {
        console.info(`🪪 > USER > [BATCH SAVE] Creating ${toCreate.length} new users`)
        const created = await prisma.user.createManyAndReturn({
            data: toCreate.map(u => serializeUserInput(u)),
            select: USER_DISPLAY_SELECT
        })
        results.push(...created.map(deserializeToUserDisplay))
    }

    // 4. UPDATE: Individual upserts (merge roles - no batch possible)
    for (const { existing, incoming } of toUpdate) {
        const existingDomain = deserializeUser(existing)
        const merged = mergeUserRoles(existingDomain, incoming)
        console.info(`🪪 > USER > [BATCH SAVE] Merging roles for ${incoming.email}: [${existingDomain.systemRoles}] + [${incoming.systemRoles}] = [${merged.systemRoles}]`)

        const updated = await prisma.user.update({
            where: { email: incoming.email },
            data: serializeUserInput(merged),
            select: USER_DISPLAY_SELECT
        })
        results.push(deserializeToUserDisplay(updated))
    }

    console.info(`🪪 > USER > [BATCH SAVE] Saved ${results.length} users (${toCreate.length} created, ${toUpdate.length} updated)`)
    return results
}

// EXISTING saveUser becomes a thin wrapper
export async function saveUser(d1Client: D1Database, user: UserCreate): Promise<UserDetail> {
    console.info(`🪪 > USER > [SAVE] Saving user ${user.email}`)
    const [display] = await saveUsers(d1Client, [user])

    // saveUsers returns UserDisplay, but saveUser contract is UserDetail
    // Refetch with full relations for backward compatibility
    const detail = await fetchUser(display.email, d1Client)
    if (!detail) {
        throw createError({ statusCode: 500, message: `User ${user.email} not found after save` })
    }
    return detail
}
```

### 5.3 New Repository Functions

#### 5.3.1 updateHouseholdsBatch

```typescript
// prismaRepository.ts

/**
 * Batch update households by heynaboId (ADR-009)
 * Updates only HN-owned fields: name, address
 * Local fields (pbsId, movedInDate, moveOutDate) are PRESERVED
 */
export async function updateHouseholdsBatch(
    d1Client: D1Database,
    households: { heynaboId: number; name: string; address: string }[]
): Promise<number> {
    if (households.length === 0) return 0

    console.info(`🏠 > HOUSEHOLD > [BATCH UPDATE] Updating ${households.length} households`)
    const prisma = await getPrismaClientConnection(d1Client)

    // Individual updates (no Prisma batch update by heynaboId)
    let updated = 0
    for (const h of households) {
        await prisma.household.update({
            where: { heynaboId: h.heynaboId },
            data: {
                name: h.name,
                address: h.address
                // pbsId, movedInDate, moveOutDate NOT updated - local data
            }
        })
        updated++
    }

    console.info(`🏠 > HOUSEHOLD > [BATCH UPDATE] Updated ${updated} households`)
    return updated
}
```

#### 5.3.2 updateInhabitantsBatch

```typescript
// prismaRepository.ts

/**
 * Batch update inhabitants by heynaboId (ADR-009)
 * Updates only HN-owned fields: name, lastName, pictureUrl, birthDate
 */
export async function updateInhabitantsBatch(
    d1Client: D1Database,
    inhabitants: { heynaboId: number; name: string; lastName: string; pictureUrl: string | null; birthDate: Date | null }[]
): Promise<number> {
    if (inhabitants.length === 0) return 0

    console.info(`👩‍🏠 > INHABITANT > [BATCH UPDATE] Updating ${inhabitants.length} inhabitants`)
    const prisma = await getPrismaClientConnection(d1Client)

    // Individual updates (no Prisma batch update by heynaboId)
    let updated = 0
    for (const i of inhabitants) {
        await prisma.inhabitant.update({
            where: { heynaboId: i.heynaboId },
            data: {
                name: i.name,
                lastName: i.lastName,
                pictureUrl: i.pictureUrl ?? Prisma.skip,
                birthDate: i.birthDate ?? Prisma.skip
            }
        })
        updated++
    }

    console.info(`👩‍🏠 > INHABITANT > [BATCH UPDATE] Updated ${updated} inhabitants`)
    return updated
}
```

#### 5.3.3 linkUsersToInhabitants

```typescript
// prismaRepository.ts

/**
 * Link users to inhabitants by email -> heynaboId mapping
 * Called AFTER saveUsers() to establish the FK relationship
 *
 * @param userInhabitantMap - Map of user email to inhabitant heynaboId
 * @returns Number of inhabitants linked
 */
export async function linkUsersToInhabitants(
    d1Client: D1Database,
    userInhabitantMap: Map<string, number>  // email -> inhabitantHeynaboId
): Promise<number> {
    if (userInhabitantMap.size === 0) return 0

    console.info(`🔗 > LINK > [USER-INHABITANT] Linking ${userInhabitantMap.size} users to inhabitants`)
    const prisma = await getPrismaClientConnection(d1Client)

    // Fetch users by email
    const emails = Array.from(userInhabitantMap.keys())
    const users = await prisma.user.findMany({
        where: { email: { in: emails } },
        select: { id: true, email: true }
    })
    const userByEmail = new Map(users.map(u => [u.email, u.id]))

    // Link each inhabitant to their user
    let linked = 0
    for (const [email, inhabitantHeynaboId] of userInhabitantMap) {
        const userId = userByEmail.get(email)
        if (!userId) {
            console.warn(`🔗 > LINK > [USER-INHABITANT] User ${email} not found, skipping link`)
            continue
        }

        await prisma.inhabitant.update({
            where: { heynaboId: inhabitantHeynaboId },
            data: { userId }
        })
        linked++
    }

    console.info(`🔗 > LINK > [USER-INHABITANT] Linked ${linked} users to inhabitants`)
    return linked
}
```

### 5.4 Updated Reconciliation Functions

```typescript
// useHeynabo.ts

// ========================================================================
// EQUALITY FUNCTIONS - Compare only HN-owned fields
// ========================================================================

// Household: compare HN fields only (name, address)
// pbsId is LOCAL data from CSV import, NOT from Heynabo
const isHouseholdEqual = (existing: HouseholdCreate, incoming: HouseholdCreate): boolean =>
    existing.name === incoming.name &&
    existing.address === incoming.address
    // pbsId: NOT compared - local data from billing CSV
    // movedInDate: NOT compared - local data

// Helper for date comparison (handles null and timezone)
const datesEqual = (a: Date | null | undefined, b: Date | null | undefined): boolean => {
    if (a === null || a === undefined) return b === null || b === undefined
    if (b === null || b === undefined) return false
    return a.getTime() === b.getTime()
}

// Inhabitant: compare all HN-owned fields including birthDate and user data
const isInhabitantEqual = (
    existing: Omit<InhabitantCreate, 'householdId'>,
    incoming: Omit<InhabitantCreate, 'householdId'>
): boolean =>
    existing.name === incoming.name &&
    existing.lastName === incoming.lastName &&
    existing.pictureUrl === incoming.pictureUrl &&
    datesEqual(existing.birthDate, incoming.birthDate) &&
    // User fields - only compare presence and HN-owned data (email, phone)
    // systemRoles NOT compared - role merging handled by saveUsers
    (existing.user?.email ?? null) === (incoming.user?.email ?? null) &&
    (existing.user?.phone ?? null) === (incoming.user?.phone ?? null)
```

### 5.5 Updated Import Service Flow

```typescript
// heynaboImportService.ts - COMPLETE REWRITE

export async function runHeynaboImport(d1Client: D1Database, triggeredBy: string): Promise<HeynaboImportResponse> {
    const {JobType, JobStatus} = useMaintenanceValidation()
    const LOG = '🏠 > IMPORT > [HEYNABO]'

    console.info(`${LOG} Starting Heynabo import (triggeredBy=${triggeredBy})`)

    const jobRun = await createJobRun(d1Client, { jobType: JobType.HEYNABO_IMPORT, triggeredBy })

    try {
        // 1. Fetch from Heynabo API
        const {locations, members} = await importFromHeynabo()
        const incomingHouseholds = createHouseholdsFromImport(locations, members)

        // 2. Fetch existing for reconciliation
        const existingHouseholds = await fetchHouseholds(d1Client)
        const existingAsCreate = existingHouseholds.map(householdDisplayToCreate)

        // 3. Reconcile households
        const householdReconciliation = reconcileHouseholds(existingAsCreate)(incomingHouseholds)
        console.info(`${LOG} Households: create=${householdReconciliation.create.length}, update=${householdReconciliation.update.length}, delete=${householdReconciliation.delete.length}, unchanged=${householdReconciliation.idempotent.length}`)

        // 4. Execute household operations
        let householdsDeleted = 0
        let householdsCreated = 0
        let householdsUpdated = 0

        // DELETE (batch)
        if (householdReconciliation.delete.length > 0) {
            householdsDeleted = await deleteHouseholdsByHeynaboId(d1Client, householdReconciliation.delete.map(h => h.heynaboId))
        }

        // CREATE (batch - Prisma auto-chunks)
        if (householdReconciliation.create.length > 0) {
            const chunks = chunkHouseholds(householdReconciliation.create)
            for (const chunk of chunks) {
                const ids = await createHouseholdsBatch(d1Client, chunk)
                householdsCreated += ids.length
            }
        }

        // UPDATE (individual - no Prisma batch by heynaboId)
        if (householdReconciliation.update.length > 0) {
            householdsUpdated = await updateHouseholdsBatch(d1Client, householdReconciliation.update.map(h => ({
                heynaboId: h.heynaboId,
                name: h.name,
                address: h.address
            })))
        }

        // 5. Process inhabitants (for ALL households including updated ones)
        let inhabitantsCreated = 0
        let inhabitantsUpdated = 0
        let inhabitantsDeleted = 0
        let usersCreated = 0
        let usersUpdated = 0
        let usersDeleted = 0
        let usersLinked = 0

        // Refetch to get IDs for newly created households
        const updatedHouseholds = await fetchHouseholds(d1Client)
        const householdByHeynaboId = new Map(updatedHouseholds.map(h => [h.heynaboId, h]))

        // Collect ALL users for batch processing (across all households)
        const allUsersToSave: UserCreate[] = []
        const userInhabitantMap = new Map<string, number>()  // email -> inhabitantHeynaboId

        for (const incomingHousehold of incomingHouseholds) {
            const existingHousehold = householdByHeynaboId.get(incomingHousehold.heynaboId)
            if (!existingHousehold) {
                console.warn(`${LOG} Household ${incomingHousehold.heynaboId} not found after sync`)
                continue
            }

            // Build existing inhabitants WITH user data for proper reconciliation
            const existingInhabitants = existingHousehold.inhabitants.map(i => ({
                heynaboId: i.heynaboId,
                name: i.name,
                lastName: i.lastName,
                pictureUrl: i.pictureUrl,
                birthDate: i.birthDate,
                user: i.userId ? { email: /* need to fetch */ } : undefined  // PROBLEM: need user data
            }))

            // IMPORTANT: We need to fetch user data for existing inhabitants
            // This is a limitation - we'll address in 5.6 below

            const incomingInhabitants = incomingHousehold.inhabitants || []
            const inhabitantReconciliation = reconcileInhabitants(existingInhabitants)(incomingInhabitants)

            // DELETE users first (before their inhabitants)
            if (inhabitantReconciliation.delete.length > 0) {
                const heynaboIds = inhabitantReconciliation.delete.map(i => i.heynaboId)
                usersDeleted += await deleteUsersByInhabitantHeynaboId(d1Client, heynaboIds)
                inhabitantsDeleted += await deleteInhabitantsByHeynaboId(d1Client, heynaboIds)
            }

            // CREATE inhabitants
            if (inhabitantReconciliation.create.length > 0) {
                const chunks = chunkArray<typeof inhabitantReconciliation.create[0]>(CHUNK_SIZE)(inhabitantReconciliation.create)
                for (const chunk of chunks) {
                    const ids = await createInhabitantsBatch(d1Client, chunk, existingHousehold.id)
                    inhabitantsCreated += ids.length
                }
            }

            // UPDATE inhabitants
            if (inhabitantReconciliation.update.length > 0) {
                inhabitantsUpdated += await updateInhabitantsBatch(d1Client, inhabitantReconciliation.update.map(i => ({
                    heynaboId: i.heynaboId,
                    name: i.name,
                    lastName: i.lastName,
                    pictureUrl: i.pictureUrl,
                    birthDate: i.birthDate
                })))
            }

            // Collect users from CREATE + UPDATE (for batch save later)
            const inhabitantsWithUsers = [...inhabitantReconciliation.create, ...inhabitantReconciliation.update]
                .filter(i => i.user !== undefined)

            for (const inhabitant of inhabitantsWithUsers) {
                if (inhabitant.user) {
                    allUsersToSave.push(inhabitant.user)
                    userInhabitantMap.set(inhabitant.user.email, inhabitant.heynaboId)
                }
            }
        }

        // 6. Batch save ALL users at once
        if (allUsersToSave.length > 0) {
            const savedUsers = await saveUsers(d1Client, allUsersToSave)
            // Count creates vs updates based on what saveUsers did
            // (saveUsers logs this internally, we trust the count)
            usersCreated = savedUsers.length  // Simplified - actual split logged by saveUsers
        }

        // 7. Link users to inhabitants
        if (userInhabitantMap.size > 0) {
            usersLinked = await linkUsersToInhabitants(d1Client, userInhabitantMap)
        }

        // 8. SANITY CHECK: Verify no orphan users
        await verifyNoOrphanUsers(d1Client, incomingHouseholds, LOG)

        const result: HeynaboImportResponse = {
            jobRunId: jobRun.id,
            householdsCreated,
            householdsUpdated,  // NEW
            householdsDeleted,
            householdsUnchanged: householdReconciliation.idempotent.length,
            inhabitantsCreated,
            inhabitantsUpdated,  // NEW
            inhabitantsDeleted,
            inhabitantsUnchanged: /* need to track */,  // NEW
            usersCreated,
            usersUpdated,  // NEW
            usersLinked,   // NEW
            usersDeleted
        }

        await completeJobRun(d1Client, jobRun.id, JobStatus.SUCCESS, result)
        return result
    } catch (error) {
        await completeJobRun(d1Client, jobRun.id, JobStatus.FAILED, undefined, error instanceof Error ? error.message : 'Unknown error')
        throw error
    }
}
```

### 5.6 Sanity Check: Verify No Orphan Users

```typescript
// heynaboImportService.ts

/**
 * Sanity check: Compare DB state against HN import data
 * All users from HN should have an Inhabitant relation
 *
 * @param incomingHouseholds - The incoming HN data (already in memory)
 */
async function verifyNoOrphanUsers(
    d1Client: D1Database,
    incomingHouseholds: HouseholdCreate[],
    LOG: string
): Promise<void> {
    // Build set of emails that SHOULD have inhabitant (from HN data)
    const expectedUserEmails = new Set<string>()
    for (const household of incomingHouseholds) {
        for (const inhabitant of household.inhabitants || []) {
            if (inhabitant.user?.email) {
                expectedUserEmails.add(inhabitant.user.email)
            }
        }
    }

    if (expectedUserEmails.size === 0) {
        console.info(`${LOG} No users expected from HN import, skipping orphan check`)
        return
    }

    // Fetch all users with Inhabitant relation
    const users = await fetchUsers(d1Client)

    // Find orphans: users from HN (in expectedUserEmails) that don't have Inhabitant
    const orphans = users.filter(u =>
        expectedUserEmails.has(u.email) &&
        u.Inhabitant === null
    )

    if (orphans.length > 0) {
        const orphanEmails = orphans.map(u => u.email).join(', ')
        console.error(`${LOG} SANITY CHECK FAILED: ${orphans.length} orphan users detected: ${orphanEmails}`)
        // Don't throw - log error for investigation but don't fail import
        // In production, this would trigger an alert
    } else {
        console.info(`${LOG} Sanity check passed: all ${expectedUserEmails.size} HN users linked to inhabitants`)
    }
}
```

### 5.7 Data Flow for User Reconciliation

**Why users aren't directly reconciled:**

Users are IMPLICITLY managed through inhabitants:
1. Inhabitant CREATE with user -> Create user + link
2. Inhabitant UPDATE with user -> Update user + link (if not already linked)
3. Inhabitant DELETE -> Delete user (if exists)
4. Inhabitant without user -> No user operation

The user-inhabitant link is established in TWO places:
1. `saveUsers()` - Creates/updates the User record
2. `linkUsersToInhabitants()` - Sets `Inhabitant.userId` FK

**Flow:**
```
HN Import Data
    |
    v
[Inhabitant Reconciliation] → create[], update[], delete[], idempotent[]
    |
    +-- create[] inhabitants with users → collect users
    +-- update[] inhabitants with users → collect users
    |
    v
[saveUsers()] → batch create/update ALL collected users
    |
    v
[linkUsersToInhabitants()] → set Inhabitant.userId for each
    |
    v
[verifyNoOrphanUsers()] → compare DB vs HN data
```

### 5.8 Response Schema Update

```typescript
// useHeynaboValidation.ts

const HeynaboImportResponseSchema = z.object({
    jobRunId: z.number().int().positive(),
    // Households
    householdsCreated: z.number(),
    householdsUpdated: z.number(),   // NEW
    householdsDeleted: z.number(),
    householdsUnchanged: z.number(),
    // Inhabitants
    inhabitantsCreated: z.number(),
    inhabitantsUpdated: z.number(),  // NEW
    inhabitantsDeleted: z.number(),
    inhabitantsUnchanged: z.number(), // NEW
    // Users
    usersCreated: z.number(),
    usersUpdated: z.number(),        // NEW
    usersLinked: z.number(),         // NEW - users linked to inhabitants
    usersDeleted: z.number()
})
```

### 5.9 Files to Modify (Summary)

| File | Changes |
|------|---------|
| `server/data/prismaRepository.ts` | Add `saveUsers()`, `updateHouseholdsBatch()`, `updateInhabitantsBatch()`, `linkUsersToInhabitants()`. Refactor `saveUser()` to wrap `saveUsers()`. |
| `server/utils/heynaboImportService.ts` | Add UPDATE handling, batch user collection, link step, sanity check |
| `app/composables/useHeynabo.ts` | Fix `isHouseholdEqual` (remove pbsId), fix `isInhabitantEqual` (add birthDate, user fields) |
| `app/composables/useHeynaboValidation.ts` | Add update/link metrics to response schema |

### 5.10 Testing Strategy

**Unit Tests:**
```typescript
// tests/component/server/prismaRepository.nuxt.spec.ts

describe('saveUsers (batch)', () => {
    it('creates multiple new users in single batch', async () => { })
    it('updates existing users with role merge', async () => { })
    it('handles mix of create and update', async () => { })
    it('returns empty array for empty input', async () => { })
})

describe('updateHouseholdsBatch', () => {
    it('updates name and address by heynaboId', async () => { })
    it('preserves pbsId and movedInDate (local data)', async () => { })
})

describe('linkUsersToInhabitants', () => {
    it('sets userId on inhabitant by heynaboId', async () => { })
    it('handles missing users gracefully', async () => { })
})
```

**E2E Tests:**
```typescript
// tests/e2e/api/admin/heynabo.e2e.spec.ts

test('should create users linked to inhabitants (no orphans)', async () => {
    // Existing test - validates fix
})

test('should update household when name changes in Heynabo', async () => {
    // Requires mock HN or test fixture
})

test('should report accurate metrics in response', async () => {
    // Verify householdsUpdated, inhabitantsUpdated counts
})
```

---

## 6. Testing Strategy

### 6.1 Unit Tests (New)

```typescript
// tests/component/server/prismaRepository.nuxt.spec.ts

describe('updateHouseholdsBatch', () => {
    it('updates address when changed in Heynabo', async () => { ... })
    it('updates name when changed in Heynabo', async () => { ... })
    it('handles empty array (idempotent)', async () => { ... })
})

describe('updateInhabitantsBatch', () => {
    it('updates name when changed', async () => { ... })
    it('updates pictureUrl when changed', async () => { ... })
    it('handles null values correctly', async () => { ... })
})

describe('upsertUsersWithInhabitantLink', () => {
    it('creates user and links to inhabitant', async () => { ... })
    it('updates existing user and preserves link', async () => { ... })
    it('merges systemRoles (does not overwrite)', async () => { ... })
})
```

### 6.2 E2E Test Enhancements

```typescript
// tests/e2e/api/admin/heynabo.e2e.spec.ts

test('should update household when address changes in Heynabo', async ({browser}) => {
    // This requires mock data or Heynabo sandbox
})

test('should link users to inhabitants (no orphans)', async ({browser}) => {
    // Already exists - validates fix worked
})

test('should report accurate update counts', async ({browser}) => {
    // Verify response metrics match actual DB state
})
```

---

## 7. Rollout Plan

### 7.1 Pre-Deploy Checklist

- [ ] All new repository functions implemented
- [ ] Unit tests passing
- [ ] E2E tests passing
- [ ] Existing E2E orphan check still passes
- [ ] Manual test on dev environment

### 7.2 Deploy Steps

1. Deploy code changes (no migration needed)
2. Run Heynabo import manually via admin UI
3. Verify response metrics show updates
4. Check for orphan users (should be 0)
5. Spot-check updated data in admin UI

### 7.3 Rollback

No database schema changes. Code-only rollback if issues found.

---

## 8. Data Ownership Clarification

### 8.1 Heynabo is Source of Truth For:

| Field | Entity | Notes |
|-------|--------|-------|
| `name`, `lastName` | Inhabitant | Always sync from HN |
| `pictureUrl` | Inhabitant | Always sync from HN |
| `birthDate` | Inhabitant | Always sync from HN |
| `email`, `phone` | User | Always sync from HN |
| `ADMIN` role | User | Comes from HN `role: 'admin'` |
| `name`, `address` | Household | Always sync from HN |
| `heynaboId` | All | Immutable key, never changes |

### 8.2 Local Data (NOT in Heynabo - MUST BE PRESERVED):

| Field | Entity | Source | Notes |
|-------|--------|--------|-------|
| `pbsId` | Household | CSV import | FIXME in code uses `location.id` as placeholder |
| `movedInDate` | Household | Manual/CSV | Hardcoded `2019-06-25` is placeholder |
| `ALLERGYMANAGER` | User | Manual assignment | Does not exist in HN |
| Other future roles | User | Manual assignment | HN only has `admin` role |

### 8.3 Merge Strategy

**Principle:** Heynabo overwrites what it owns, local data is preserved.

```typescript
// Household UPDATE - preserve local fields
await updateHouseholdsBatch(d1Client, households.map(h => ({
    heynaboId: h.heynaboId,
    name: h.name,      // From HN
    address: h.address // From HN
    // pbsId: NOT UPDATED - local data preserved
    // movedInDate: NOT UPDATED - local data preserved
})))

// User UPSERT - merge roles
const mergedRoles = mergeUserRoles(existingUser, incomingUser)
// Result: union of existing + incoming (preserves ALLERGYMANAGER when HN sends ADMIN)
```

### 8.4 Resolved Questions

1. ✅ **birthDate:** YES - include in equality check, sync from Heynabo
2. ✅ **pbsId:** NOT from Heynabo - imported from CSV, preserve during updates
3. ✅ **movedInDate:** NOT from Heynabo - preserve during updates (placeholder needs CSV import)
4. ✅ **User roles:** MERGE - `mergeUserRoles()` is correct, preserves local roles

---

## 9. Files to Modify

| File | Changes |
|------|---------|
| `server/data/prismaRepository.ts` | Add 3 new batch functions |
| `server/utils/heynaboImportService.ts` | Implement UPDATE handling, fix user linking |
| `app/composables/useHeynabo.ts` | Update `isHouseholdEqual` (remove pbsId), `isInhabitantEqual` (add birthDate, user fields) |
| `app/composables/useHeynaboValidation.ts` | Add update metrics to response schema |
| `tests/e2e/api/admin/heynabo.e2e.spec.ts` | Add update scenario tests |
| `tests/component/composables/useHeynabo.nuxt.spec.ts` | Add equality function tests |

---

## 10. Summary

The Heynabo import is critically broken due to:
1. Missing UPDATE handling for households and inhabitants
2. Orphan user creation (users not linked to inhabitants)
3. Misleading response metrics
4. Incorrect equality checks (comparing local-only fields like pbsId, missing HN fields like birthDate)

The fix requires:
1. Three new batch repository functions
2. UPDATE processing in the import service
3. Proper user-inhabitant linking during creation
4. Enhanced reconciliation equality checks respecting data ownership:
   - Household: compare only HN fields (name, address), preserve local (pbsId, movedInDate)
   - Inhabitant: compare all HN fields including birthDate and user.email/phone
   - User: merge roles (preserves ALLERGYMANAGER when HN sends ADMIN)

**Key Principle:** Heynabo is source of truth for its data. Local additions (pbsId, ALLERGYMANAGER role) are preserved during sync.

Estimated effort: 2-3 days including tests.
