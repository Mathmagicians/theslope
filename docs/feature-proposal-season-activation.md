# Feature Proposal: Season Activation & Auto-Booking

**Status:** Proposed | **Date:** 2025-12-04

## Summary

When a season is activated, clip all inhabitants' preferences to the season's cooking days and sync orders accordingly. Maintain data integrity on every preference save.

## Core Concept: Preference Clipping

```
Season cookingDays:     { mon: true,  tue: false, wed: true,  thu: false, fri: true  }
User preferences:       { mon: DINEIN, tue: DINEIN, wed: TAKEAWAY, thu: DINEIN, fri: DINEIN }
                                        ↓ CLIP ↓
Stored preferences:     { mon: DINEIN, tue: NONE,   wed: TAKEAWAY, thu: NONE,   fri: DINEIN }
```

Same logic as `WeekDayMapDinnerModeDisplay` with `parentRestriction` prop - but persisted to database.

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  TRIGGER: Season Activated                                      │
│  1. Clip ALL inhabitants' preferences to season.cookingDays     │
│  2. Sync orders: create missing, update changed, delete NONE'd  │
├─────────────────────────────────────────────────────────────────┤
│  TRIGGER: Preference Saved                                      │
│  1. Clip preference to active season.cookingDays before save    │
│  2. Sync orders for that inhabitant                             │
├─────────────────────────────────────────────────────────────────┤
│  TRIGGER: New Inhabitant Added                                  │
│  1. Clip default preferences to active season.cookingDays       │
│  2. Scaffold orders for future dinner events                    │
└─────────────────────────────────────────────────────────────────┘
```

## Order Sync Rules

| Preference | Existing Order | Action |
|------------|----------------|--------|
| `NONE` | `BOOKED` | Delete order |
| `NONE` | `RELEASED`/`CLOSED` | No action (user/system decision) |
| `DINEIN`/`TAKEAWAY` | None | Create order |
| `DINEIN`/`TAKEAWAY` | `BOOKED` (different mode) | Update dinnerMode |
| `DINEIN`/`TAKEAWAY` | `BOOKED` (same mode) | No action |
| `DINEIN`/`TAKEAWAY` | `RELEASED`/`CLOSED` | No action (immutable) |

**Key:** Only `BOOKED` orders are system-managed. `RELEASED`/`CLOSED` are immutable.

## Implementation

### Pure Functions (`composables/useSeason.ts`)

```typescript
/**
 * Clip preferences to season's cooking days
 * Non-cooking days → NONE, cooking days → keep existing
 */
const clipPreferencesToSeason = (
  preferences: WeekDayMap<DinnerMode> | null,
  cookingDays: WeekDayMap<boolean>
): WeekDayMap<DinnerMode> => {
  const clipped = createDefaultWeekdayMap(DinnerMode.DINEIN)

  for (const day of WEEKDAYS) {
    clipped[day] = cookingDays[day]
      ? (preferences?.[day] ?? DinnerMode.DINEIN)
      : DinnerMode.NONE
  }

  return clipped
}
```

### Order Sync (`composables/useOrder.ts`)

```typescript
/**
 * Compute order sync operations (pure function)
 * Returns arrays of orders to create/update/delete
 */
const computeOrderSync = (
  dinnerEvents: DinnerEventDisplay[],
  preferences: WeekDayMap<DinnerMode>,
  existingOrders: OrderDisplay[],
  inhabitant: InhabitantDetail,
  ticketPrices: TicketPrice[]
): { toCreate: OrderCreate[]; toUpdate: OrderUpdate[]; toDelete: number[] }
```

### Repository Functions

```typescript
// Clip and sync single inhabitant (used on preference save)
clipAndSyncInhabitant(d1Client, inhabitantId, preferences): Promise<SyncResult>

// Clip and sync all inhabitants (used on season activation)
clipAndSyncAllInhabitants(d1Client, seasonId): Promise<BulkSyncResult>

// Onboard new inhabitant to active season
onboardInhabitantToActiveSeason(d1Client, inhabitantId): Promise<void>
```

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/admin/season/[id]/activate` | Activate season + clip + sync |
| `POST` | `/api/admin/season/[id]/scaffold-orders` | Manual re-scaffold (idempotent) |

### Activate Response

```typescript
interface ActivateSeasonResponse {
  season: SeasonDisplay
  sync: {
    inhabitantsClipped: number
    ordersCreated: number
    ordersUpdated: number
    ordersDeleted: number
  }
}
```

## D1 Platform Constraints

**Sources:** [D1 Limits](https://developers.cloudflare.com/d1/platform/limits/), [Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)

| Constraint | Limit | Impact |
|------------|-------|--------|
| Subrequests per Worker invocation | **1,000** (paid) / 50 (free) | Each Prisma query = 1 subrequest |
| Bound parameters per query | **100** | Order (~12 fields) → max **8 rows per INSERT** |
| `db.batch()` raw API | 1 subrequest total | Bypasses limit but loses Prisma type safety |

### Scale Analysis

**Real numbers:** 120 inhabitants × 180 dinner events = **21,600 potential orders**

Prisma `createMany` auto-chunks based on 100-param limit:
- 21,600 orders ÷ 8 rows per INSERT = **2,700 queries ❌ EXCEEDS 1,000**

---

## Sharding Strategies

Natural sharding boundaries exist. Each option stays within D1 limits.

### Option A: Shard by Dinner Event

**Process one dinner event at a time.**

| Per Event | Calculation | Queries |
|-----------|-------------|---------|
| Fetch data | | ~3 |
| Create orders | 120 inhabitants ÷ 8 rows | ~15 |
| **Total per event** | | **~18** ✅ |

```typescript
// 180 API calls, ~18 queries each
POST /api/admin/dinner-event/[id]/scaffold-orders
```

| Pros | Cons |
|------|------|
| Very safe margin | 180 sequential calls (slow) |
| Natural retry boundary | Network overhead |
| Progress: "Event 45/180..." | |

---

### Option B: Shard by Household ⭐ Recommended

**Process one household at a time.**

| Per Household (~5 inhabitants) | Calculation | Queries |
|--------------------------------|-------------|---------|
| Fetch data | | ~5 |
| Clip preferences | 5 updates | 5 |
| Create orders | 5 × 180 ÷ 8 | ~113 |
| Update/delete | | ~10 |
| **Total per household** | | **~133** ✅ |

```typescript
// ~35 API calls, ~133 queries each
POST /api/household/[id]/sync-orders?seasonId=X
```

| Pros | Cons |
|------|------|
| Aligns with user mental model | Variable household sizes |
| Reusable for user "sync my bookings" | ~35 calls for full activation |
| Matches existing powermode pattern | |

---

### Option C: Shard by Day of Week

**Process all events for one weekday at a time.**

| Per Weekday | Calculation | Queries |
|-------------|-------------|---------|
| Events | 180 ÷ 5 cooking days = ~36 | |
| Create orders | 120 × 36 ÷ 8 | ~540 |
| Fetch + overhead | | ~50 |
| **Total per weekday** | | **~590** ✅ |

```typescript
// 5 API calls (one per cooking day), ~590 queries each
POST /api/admin/season/[id]/scaffold-orders?weekday=mandag
```

| Pros | Cons |
|------|------|
| Only 5 API calls | Large batches |
| Logical grouping | Less granular progress |

---

### Option D: Lazy Scaffolding (On-Demand)

**Don't scaffold upfront. Create orders when needed.**

| Trigger | Action |
|---------|--------|
| User opens household page | Scaffold that household |
| Chef announces dinner | Scaffold that event |
| Nightly cron | Scaffold next 7 days |

```typescript
// Middleware pattern
const ensureOrdersExist = async (householdId, seasonId) => {
  const count = await countOrders(householdId, seasonId)
  if (count === 0) await scaffoldHousehold(householdId, seasonId)
}
```

| Pros | Cons |
|------|------|
| No upfront cost | First load is slow |
| Scales naturally | Harder to reason about state |
| Fast activation | |

---

### Option E: Raw `db.batch()` (Bypass Prisma)

**Use D1's batch API directly - unlimited statements in 1 subrequest.**

```typescript
const statements = ordersToCreate.map(order =>
  env.DB.prepare(`INSERT INTO "Order" (...) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(order.dinnerEventId, order.inhabitantId, ...)
)
await env.DB.batch(statements)  // 1 subrequest for ALL 21,600 inserts!
```

| Pros | Cons |
|------|------|
| Single API call | Loses Prisma type safety |
| No chunking needed | Manual SQL maintenance |
| | 30-second timeout applies |

---

## Recommendation

| Criteria | Best Option |
|----------|-------------|
| **Simplicity** | A (by event) |
| **UX alignment** | B (by household) ⭐ |
| **Fewest calls** | C (by weekday) or E (raw batch) |
| **Scalability** | D (lazy) |

**Recommended: Option B (by household)** because:
1. Aligns with existing powermode pattern in `HouseholdCard`
2. Reusable for user-facing "sync my bookings" feature
3. ~35 API calls is acceptable for admin operation
4. Clear retry boundary per household
5. Progress feedback: "Syncing household 12/35..."

For future optimization, consider **Option D (lazy)** as system scales.

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `composables/useSeason.ts` | Extend | `clipPreferencesToSeason()` |
| `composables/useOrder.ts` | Create | `computeOrderSync()` |
| `server/data/prismaRepository.ts` | Extend | Clip + sync repository functions |
| `server/routes/api/admin/season/[id]/activate.post.ts` | Create | Activation endpoint |
| `server/routes/api/admin/household/inhabitants/[id].post.ts` | Modify | Clip + sync on save |
| `stores/plan.ts` | Extend | `activateSeason()` action |

## Integration Points

### Existing Powermode

The existing `updateAllInhabitantPreferences()` in `households.ts` can trigger clip + sync:

```typescript
// After powermode updates all inhabitants
await clipAndSyncAllInhabitants(d1Client, activeSeasonId)
```

### Heynabo Import

When importing inhabitants from Heynabo, call `onboardInhabitantToActiveSeason()` for each new inhabitant.

## Test Strategy

| Test Type | Coverage |
|-----------|----------|
| Unit | `clipPreferencesToSeason()`, `computeOrderSync()` |
| E2E | Season activation flow, preference save + order sync |
| E2E | New inhabitant onboarding |
| E2E | Idempotency (re-activation produces same result) |

## ADR Compliance

- **ADR-007:** Store handles activation, components show loading states
- **ADR-009:** Batch operations use Display types (lightweight)
- **ADR-010:** Clip/sync functions in composables, serialization in repository
- **ADR-011:** Respects order states (only BOOKED modified)
- **ADR-012:** Use `Prisma.skip` for optional fields

## Open Questions

1. **`bookedByUserId` for children:** Use parent's userId or leave null?
2. **Activation trigger:** Manual only, or auto-activate when season dates include today?
3. **Audit trail:** Should order sync operations create `OrderHistory` entries?
