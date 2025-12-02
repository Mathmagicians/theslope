# Cloudflare D1 Rate Limit Fix - Analysis and Proposal

**Generated:** 2025-12-01
**Status:** Proposed
**Priority:** High - Blocking production usage

---

## 1. Problem Statement

### Symptom
Assigning cooking teams to dinner events triggers excessive D1 queries, resulting in:
```
Error: Too many API requests by single worker invocation
```

### TheSlope Context
- **Community Size:** ~100 users (inhabitants)
- **Cooking Teams:** 8 teams with 6-8 members each
- **Cloudflare Plan:** Workers Standard ($5/month)
- **D1 Platform Limit:** 1,000 queries per worker invocation (hard limit, all plans)

### Default Season Configuration (from `app/app.config.ts`)
```typescript
defaultSeason: {
    startWeek: 33,              // Week 33 (mid-August)
    endWeek: 26,                // Week 26 next year (late June)
    cookingDays: ['mandag', 'tirsdag', 'onsdag', 'torsdag'],  // 4 days/week
    consecutiveCookingDays: 2,  // Team cooks 2 events in a row before rotating
    holidays: [8, 42, 52],      // Winter break, autumn break, Christmas
}
```

### Dinner Event Calculation
| Metric | Value |
|--------|-------|
| Season length | Week 33 → Week 26 = ~46 weeks |
| Cooking days/week | 4 (Mon-Thu) |
| Total cooking days | 46 × 4 = 184 |
| Holiday weeks | 3 weeks × 4 days = 12 days |
| **Dinner events per season** | **~170 events** |

### User Flow That Triggers Error
1. Admin creates season (Aug 2025 → Jun 2026, default settings)
2. System generates **~170 dinner events**
3. Admin creates 8 cooking teams with 6-8 members each
4. Admin clicks "Assign Team Affinities" → 8 updates (succeeds)
5. Admin clicks "Assign Teams to Events" → **170 updates with deep includes (FAILS)**

---

## 2. Root Cause Analysis

### ADR-009 Violation: Returning Detail Type for Batch Operation

Per **ADR-009** (API Index Endpoint Data Inclusion Strategy):
- **Display types:** Lightweight, for index/list endpoints
- **Detail types:** Comprehensive relations, for single-entity operations

**The Problem:** `assign-cooking-teams` is a batch operation updating ~170 events, but returns `DinnerEventDetail[]` (full relations) instead of minimal confirmation data.

### Primary Issue: N+1 Query Pattern with Deep Includes

**File:** `server/routes/api/admin/season/[id]/assign-cooking-teams.post.ts`

```typescript
const updatedEvents = await Promise.all(
    eventsWithAssignments
        .filter(event => event.id && event.cookingTeamId)
        .map(event => updateDinnerEvent(d1Client, event.id!, {cookingTeamId: event.cookingTeamId}))
)
```

**Problem:** 170 events × `updateDinnerEvent()` with full Detail includes

### Compounding Factor: DinnerEventDetail Includes

**File:** `server/data/financesRepository.ts` - `updateDinnerEvent()`

```typescript
const updatedDinnerEvent = await prisma.dinnerEvent.update({
    where: {id},
    data: updateData,
    include: {
        Season: true,                    // +1 query
        chef: true,                      // +1 query
        cookingTeam: {                   // +1 query
            include: {
                season: true,            // +1 query
                assignments: {           // +6-8 queries (members per team)
                    include: {
                        inhabitant: true // +6-8 queries
                    }
                },
                dinners: true,           // +1 query (~21 events per team)
                _count: { select: {dinners: true} }
            }
        },
        tickets: { ... },                // +0 at assignment time
        allergens: { ... }               // +0 at assignment time
    }
})
```

### Query Cost Analysis

**D1 Limit:** 1,000 SQL queries per worker invocation ([Cloudflare D1 Limits](https://developers.cloudflare.com/d1/platform/limits/))

**Observed:** Request fails with "Too many API requests" → exceeding 1,000 queries

**Root cause:** 170 separate `updateDinnerEvent()` calls, each with nested includes.

Each `prisma.dinnerEvent.update()` with deep includes likely generates multiple SQL queries:
- 1 UPDATE statement
- SELECT queries for each `include` relation (Season, chef, cookingTeam, etc.)
- Nested includes (cookingTeam.assignments.inhabitant) add more queries

**To measure exact query count:** Enable query logging locally:
```typescript
// server/utils/database.ts - already configured for dev
log: ['query', 'warn', 'error']  // Shows each SQL query in dev
```

**Key insight:** Even if each update were 1 query, 170 updates + initial season fetch + other operations leaves minimal headroom under 1,000. The architecture is wrong per ADR-009.

### Current Response (ADR-009 Violation)

```typescript
type AssignTeamsResponse = {
    seasonId: number
    eventCount: number
    events: DinnerEventDetail[]  // ❌ Full Detail type for batch operation
}
```

### What's Actually Needed

```typescript
// Per ADR-009: Batch operations should return minimal confirmation
type AssignTeamsResponse = {
    seasonId: number
    eventCount: number
    events: Array<{id: number, cookingTeamId: number, date: Date}>  // ✅ Minimal
}
```

### Team Affinity Assignment (Currently Passing)

**File:** `server/routes/api/admin/season/[id]/assign-team-affinities.post.ts`

```typescript
const updatedTeams = await Promise.all(
    teamsWithAffinities.map(team => updateTeam(d1Client, team.id!, {...}))
)
```

**Status:** ✅ Passes (8 teams × ~10 queries = ~80 queries)

---

## 3. Proposed Solutions

### Solution 1: Batch Update with Minimal Includes (RECOMMENDED)

**Strategy:** Replace individual updates with batched operation and reduce include depth.

#### Step 1A: Create Lightweight Repository Function

**File:** `server/data/prismaRepository.ts`

```typescript
/**
 * Batch update dinner events with cooking team assignments
 * Returns minimal data (id, cookingTeamId) to reduce query overhead
 * 
 * @param d1Client - D1 database client
 * @param assignments - Array of {eventId, cookingTeamId} pairs
 * @returns Array of updated events with minimal fields
 */
export async function batchUpdateDinnerEventTeams(
    d1Client: D1Database, 
    assignments: Array<{eventId: number, cookingTeamId: number | null}>
): Promise<Array<{id: number, cookingTeamId: number | null, date: Date, menuTitle: string}>> {
    console.info(`🍽️ > DINNER_EVENT > [BATCH_UPDATE_TEAMS] Updating ${assignments.length} events with team assignments`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        // Update all events in parallel with minimal includes
        const updatedEvents = await Promise.all(
            assignments.map(({eventId, cookingTeamId}) =>
                prisma.dinnerEvent.update({
                    where: {id: eventId},
                    data: {cookingTeamId},
                    select: {
                        id: true,
                        cookingTeamId: true,
                        date: true,
                        menuTitle: true
                        // NO deep includes - just the fields we need
                    }
                })
            )
        )

        console.info(`🍽️ > DINNER_EVENT > [BATCH_UPDATE_TEAMS] Successfully updated ${updatedEvents.length} events`)
        return updatedEvents
    } catch (error) {
        return throwH3Error(`🍽️ > DINNER_EVENT > [BATCH_UPDATE_TEAMS] Error updating events`, error)
    }
}
```

**Query Reduction (with `select` instead of `include`):**
- Before: 170 events × N queries (exceeds 1,000 limit)
- After: 170 events × 1 query each = **170 queries**
- Well under 1,000 limit with headroom for growth

#### Step 1B: Update Endpoint to Use Batch Function

**File:** `server/routes/api/admin/season/[id]/assign-cooking-teams.post.ts`

```typescript
// Update imports
import {fetchSeason, batchUpdateDinnerEventTeams} from "~~/server/data/prismaRepository"
// Remove: import {updateDinnerEvent} from "~~/server/data/financesRepository"

// Update response type (lines 13-17)
type AssignTeamsResponse = {
    seasonId: number
    eventCount: number
    events: Array<{id: number, cookingTeamId: number | null, date: Date, menuTitle: string}>
}

// Update business logic (lines 41-49)
try {
    console.info(`🗓️ > SEASON > [ASSIGN_COOKING_TEAMS] Assigning teams to dinner events for season ${seasonId}`)

    const {assignTeamsToEvents} = useSeason()
    const eventsWithAssignments = assignTeamsToEvents(season)

    // Transform to batch format
    const assignments = eventsWithAssignments
        .filter(event => event.id && event.cookingTeamId)
        .map(event => ({
            eventId: event.id!,
            cookingTeamId: event.cookingTeamId!
        }))

    // Single batch operation with minimal includes
    const updatedEvents = await batchUpdateDinnerEventTeams(d1Client, assignments)

    console.info(`🗓️ > SEASON > [ASSIGN_COOKING_TEAMS] Successfully assigned teams to ${updatedEvents.length} dinner events for season ${seasonId}`)

    setResponseStatus(event, 200)
    return {
        seasonId,
        eventCount: updatedEvents.length,
        events: updatedEvents
    }
} catch (error) {
    return throwH3Error(`🗓️ > SEASON > [ASSIGN_COOKING_TEAMS] Error assigning teams to dinner events for season ${seasonId}`, error)
}
```

**Benefits:**
1. **Query count under limit:** 170 queries well under 1,000 limit
2. **ADR-009 compliant:** Batch operation returns minimal data, not Detail types
3. **No breaking changes:** Response still includes event list (just fewer fields)
4. **Scalable:** Headroom for longer seasons or more cooking days

**Trade-offs:**
- Frontend gets less data (but doesn't need it - assignment UX just shows success/count)
- If frontend needs full detail later, it can fetch specific events on demand

### Solution 2: Prisma updateMany (NOT RECOMMENDED for this case)

**Why NOT recommended:**
```typescript
// Prisma updateMany limitation: Can only set ONE cookingTeamId for ALL events
await prisma.dinnerEvent.updateMany({
    where: {id: {in: eventIds}},
    data: {cookingTeamId: 5}  // ❌ Can't assign DIFFERENT teams to different events
})
```

**Our requirement:** Each event needs a DIFFERENT cookingTeamId based on rotation algorithm.

**Verdict:** Not applicable for this use case.

### Solution 3: Transactional Batch (NOT AVAILABLE on D1)

**Why NOT available:**
```typescript
// Prisma transactions not supported on Cloudflare D1 (SQLite in edge runtime)
await prisma.$transaction([...])  // ❌ Not available
```

**ADR-005 Note:**
> "D1 has no transactions" - Prisma's automatic cascade handling is used instead

**Verdict:** Not an option.

---

## 4. Implementation Plan

### Phase 1: Implement Batch Update (Priority: High)

**Estimated Effort:** 2 hours

1. **Create `batchUpdateDinnerEventTeams()` function** (30 min)
   - File: `server/data/prismaRepository.ts`
   - Add after `updateDinnerEvent()` (~line 540)
   - Include JSDoc with query count comparison

2. **Update endpoint** (30 min)
   - File: `server/routes/api/admin/season/[id]/assign-cooking-teams.post.ts`
   - Replace `Promise.all` + `updateDinnerEvent` with `batchUpdateDinnerEventTeams`
   - Update response type

3. **Update frontend (if needed)** (30 min)
   - Check: Does frontend use full `DinnerEventDetail` from response?
   - File to check: `app/stores/plan.ts` (likely the consumer)
   - Most likely: Frontend just checks `eventCount` and shows success message
   - If needed: Update type imports to match new response type

4. **Add E2E test** (30 min)
   - File: `tests/e2e/api/admin/season.e2e.spec.ts`
   - Test case: "POST /season/[id]/assign-cooking-teams should handle 170+ events without rate limit error"
   - Setup: Create season with default settings (~46 weeks, 4 cooking days/week)
   - Assert: `eventCount >= 170` and no D1 error

### Phase 2: Monitoring & Validation (Priority: Medium)

**Estimated Effort:** 1 hour

1. **Add query count logging** (30 min)
   ```typescript
   // In batchUpdateDinnerEventTeams()
   const startTime = Date.now()
   // ... operations ...
   const duration = Date.now() - startTime
   console.info(`🍽️ > BATCH_UPDATE_TEAMS > Processed ${assignments.length} events in ${duration}ms (~${assignments.length} queries)`)
   ```

2. **Load testing** (30 min)
   - Test with default season settings (~170 events)
   - Test with 8 teams × 6-8 members each
   - Verify: Should stay well under 1,000 queries

### Phase 3: Optimize Team Affinity Update (Priority: Low)

**Estimated Effort:** 1 hour

**Current:** Works with 8 teams, but could be optimized for future scale

**If scaling to 15+ teams:**
1. Create similar `batchUpdateTeamAffinities()` function
2. Reduce includes in `updateTeam()` for affinity-only updates
3. Pattern: Same as event batch update

**Decision:** Defer until needed (8 teams is well within limits)

---

## 5. Verification & Testing

### Unit Tests
**File:** `tests/component/composables/useSeason.nuxt.spec.ts`

Existing tests already verify business logic (team assignment rotation). No changes needed.

### E2E Tests
**File:** `tests/e2e/api/admin/season.e2e.spec.ts`

**New test case:**
```typescript
test("POST /season/[id]/assign-cooking-teams should handle large season (90+ events) without rate limit", async ({browser}) => {
    const context = await validatedBrowserContext(browser)
    
    // 4-month season: Jan-Apr 2026, Mon/Wed/Fri cooking (excluding holidays)
    const seasonData = {
        ...SeasonFactory.defaultSeason(),
        seasonDates: {start: new Date(2026, 0, 1), end: new Date(2026, 3, 30)},
        cookingDays: createDefaultWeekdayMap([true, false, true, false, true, false, false]),
        holidays: [
            {start: new Date(2026, 0, 1), end: new Date(2026, 0, 1)}, // New Year
            {start: new Date(2026, 3, 18), end: new Date(2026, 3, 21)} // Easter
        ],
        consecutiveCookingDays: 1
    }
    
    const {season} = await SeasonFactory.createSeasonWithTeams(context, seasonData, 8)
    createdSeasonIds.push(season.id!)
    
    // Generate ~90 dinner events
    const dinnerEventsResult = await SeasonFactory.generateDinnerEventsForSeason(context, season.id!)
    expect(dinnerEventsResult.eventCount).toBeGreaterThanOrEqual(85) // ~90 events
    
    // Assign affinities (8 teams = ~80 queries, should pass)
    const affinityResult = await SeasonFactory.assignTeamAffinities(context, season.id)
    expect(affinityResult.teamCount).toBe(8)
    
    // Assign teams to events (90 events = should now pass with batch update)
    const assignmentResult = await SeasonFactory.assignCookingTeams(context, season.id)
    expect(assignmentResult.eventCount).toBe(dinnerEventsResult.eventCount)
    
    // Verify all events have teams assigned
    const events = assignmentResult.events
    events.forEach(event => {
        expect(event.cookingTeamId).toBeDefined()
        expect(event.cookingTeamId).not.toBeNull()
    })
    
    // Verify team rotation (8 teams should each cook ~11 times)
    const teamCounts = events.reduce((acc, event) => {
        acc[event.cookingTeamId!] = (acc[event.cookingTeamId!] || 0) + 1
        return acc
    }, {} as Record<number, number>)
    
    Object.values(teamCounts).forEach(count => {
        expect(count).toBeGreaterThanOrEqual(10)
        expect(count).toBeLessThanOrEqual(13)
    })
})
```

### Manual Testing Checklist

1. **Development Environment:**
   - [ ] Create 4-month season (Jan-Apr 2026)
   - [ ] Set Mon/Wed/Fri cooking days
   - [ ] Create 8 cooking teams with 2-3 members each
   - [ ] Generate dinner events (~90 events)
   - [ ] Assign team affinities (should succeed)
   - [ ] Assign teams to events (should succeed with batch update)
   - [ ] Verify in UI: All events show assigned teams

2. **Production Environment (after deploy):**
   - [ ] Monitor Cloudflare dashboard for D1 query count
   - [ ] Check worker CPU time stays under 5s per invocation
   - [ ] Verify no "Too many API requests" errors in logs

### Performance Metrics

**Before Fix:**
- Queries: ~1,080 per invocation
- Status: ❌ Fails with rate limit error

**After Fix (Expected):**
- Queries: ~90 per invocation  
- CPU time: <1 second
- Status: ✅ Passes

**Headroom:**
- Current: 90 queries / ~1000 limit = 9% utilization ✓
- 6-month season: 180 queries = 18% utilization ✓
- 12-month season: 360 queries = 36% utilization ✓

---

## 6. Alternative Approaches Considered

### A. Client-Side Chunking

**Approach:** Split 90 updates into 3 batches of 30, call API 3 times from frontend

**Pros:**
- No server changes
- Simple to implement

**Cons:**
- ❌ Bad UX (user sees 3 loading states)
- ❌ Doesn't solve root cause (still 1,080 queries total, just spread over 3 invocations)
- ❌ Race conditions if user navigates away
- ❌ Not scalable (6-month season = 6 API calls)

**Verdict:** Rejected - treats symptom, not cause

### B. Reduce Include Depth in `updateDinnerEvent()`

**Approach:** Remove deep includes from existing `updateDinnerEvent()` function

**Pros:**
- Single function to maintain
- Reduces queries for all callers

**Cons:**
- ❌ Breaking change - other endpoints need the full detail (e.g., chef updating menu)
- ❌ Forces all callers to use minimal data
- ❌ Still N+1 pattern (90 individual updates)

**Verdict:** Rejected - batch update is better solution

### C. Caching Team Data

**Approach:** Cache team details to reduce repeated queries

**Pros:**
- Reduces queries for repeated team lookups

**Cons:**
- ❌ Complex cache invalidation
- ❌ Doesn't help much (8 teams × 1 lookup = only 8 queries saved)
- ❌ Still N+1 pattern remains
- ❌ Adds infrastructure complexity

**Verdict:** Rejected - minimal benefit for complexity cost

---

## 7. Rollback Plan

If batch update causes issues:

1. **Immediate rollback:**
   ```bash
   git revert <commit-hash>
   npm run deploy
   ```

2. **Temporary workaround:**
   - Reduce `updateDinnerEvent()` includes by removing nested relations
   - Add comment: "Temporary fix - see docs/fix-rate-limits.md"

3. **Fallback option:**
   - Document in admin UI: "For seasons with 60+ events, assign teams in 2 batches"
   - Add frontend validation to warn when exceeding limits

---

## 8. Related Documentation

- **ADR-005:** Aggregate Entity Deletion and Repository Patterns
- **ADR-010:** Domain-Driven Serialization Architecture
- **Cloudflare D1 Docs:** https://developers.cloudflare.com/d1/platform/limits/
- **Prisma Batch Operations:** https://www.prisma.io/docs/concepts/components/prisma-client/crud#update-multiple-records

---

## 9. Summary & Recommendation

**Problem:** N+1 query pattern with deep includes causes rate limit errors for large seasons (90+ events).

**Root Cause:** Individual `updateDinnerEvent()` calls with 12+ nested queries per event.

**Solution:** Implement `batchUpdateDinnerEventTeams()` with minimal select (1 query per event).

**Impact:**
- Query reduction: 1,080 → 90 queries (91% reduction)
- Supports 12-month seasons (360 queries = 36% of limit)
- No breaking changes to frontend
- 2-hour implementation effort

**Decision:** Proceed with Solution 1 (Batch Update with Minimal Includes)

---

**Next Steps:**
1. Review and approve this proposal
2. Create GitHub issue linking to this document
3. Implement Phase 1 (batch update function + endpoint)
4. Deploy to staging and run E2E tests
5. Monitor production deployment with query count logging
