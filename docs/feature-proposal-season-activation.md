# Feature Proposal: Season Activation & Auto-Booking

**Status:** Approved | **Date:** 2025-12-04 | **Strategy:** Shard by Household

## Summary

When a season is activated, clip all inhabitants' preferences to the season's cooking days and sync orders accordingly. Maintain data integrity on every preference save. Use **household-level sharding** to stay within D1's 1,000 query limit.

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
│  1. For each household (sequential API calls):                  │
│     a. Clip inhabitants' preferences to season.cookingDays      │
│     b. Sync orders: create missing, update changed, delete NONE │
│  2. Progress: "Syncing household 12/35..."                      │
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

---

## D1 Platform Constraints

**Sources:** [D1 Limits](https://developers.cloudflare.com/d1/platform/limits/), [Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)

| Constraint | Limit | Impact |
|------------|-------|--------|
| Subrequests per Worker invocation | **1,000** (paid) / 50 (free) | Each Prisma query = 1 subrequest |
| Bound parameters per query | **100** | Order (~12 fields) → max **8 rows per INSERT** |

### Scale Analysis

**Real numbers:** 120 inhabitants × 180 dinner events = **21,600 potential orders**

Single-call approach: 21,600 ÷ 8 rows per INSERT = **2,700 queries ❌ EXCEEDS 1,000**

---

## Sharding Strategy: By Household ✅

**Process one household at a time via sequential API calls.**

| Per Household (~5 inhabitants) | Calculation | Queries |
|--------------------------------|-------------|---------|
| Fetch season + dinner events | | ~3 |
| Fetch household + inhabitants | | ~2 |
| Clip preferences | 5 updates | 5 |
| Fetch existing orders | | ~1 |
| Create orders | 5 × 180 ÷ 8 | ~113 |
| Update/delete orders | | ~10 |
| **Total per household** | | **~134** ✅ |

**Full activation:** ~35 households × 1 API call each = **35 sequential calls**

### Why Household Sharding?

1. **Aligns with existing powermode** - `HouseholdCard.vue` already updates all inhabitants at once
2. **Reusable** - Same endpoint powers user-facing "sync my bookings" feature
3. **Natural retry boundary** - If one household fails, others unaffected
4. **Clear progress** - "Syncing household 12/35..."
5. **Acceptable latency** - ~35 calls for admin operation run once per season

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/admin/season/[id]/activate` | Orchestrates activation (calls household sync) |
| `POST` | `/api/admin/household/[id]/sync-orders` | Sync single household to season |

### Activate Endpoint (Orchestrator)

```typescript
// POST /api/admin/season/[id]/activate
// Orchestrates household-by-household sync

interface ActivateSeasonRequest {
  // Optional: resume from specific household on retry
  startFromHouseholdId?: number
}

interface ActivateSeasonResponse {
  season: SeasonDisplay
  sync: {
    householdsProcessed: number
    householdsTotal: number
    inhabitantsClipped: number
    ordersCreated: number
    ordersUpdated: number
    ordersDeleted: number
  }
}
```

### Household Sync Endpoint (Worker)

```typescript
// POST /api/admin/household/[id]/sync-orders
// Syncs one household to active season

interface HouseholdSyncRequest {
  seasonId: number
}

interface HouseholdSyncResponse {
  householdId: number
  inhabitantsClipped: number
  ordersCreated: number
  ordersUpdated: number
  ordersDeleted: number
}
```

---

## Implementation

### Pure Functions (`composables/useSeasonActivation.ts`)

```typescript
import { WEEKDAYS, type WeekDay } from '~/composables/useWeekday'
import { DinnerMode, type WeekDayMap } from '~/composables/useWeekDayMapValidation'

/**
 * Clip preferences to season's cooking days
 * Non-cooking days → NONE, cooking days → keep existing
 */
export const clipPreferencesToSeason = (
  preferences: WeekDayMap<DinnerMode> | null,
  cookingDays: WeekDayMap<boolean>
): WeekDayMap<DinnerMode> => {
  const { createDefaultWeekdayMap } = useWeekDayMapValidation({
    valueSchema: DinnerModeSchema,
    defaultValue: DinnerMode.DINEIN
  })

  const clipped = createDefaultWeekdayMap(DinnerMode.DINEIN)

  for (const day of WEEKDAYS) {
    clipped[day] = cookingDays[day]
      ? (preferences?.[day] ?? DinnerMode.DINEIN)
      : DinnerMode.NONE
  }

  return clipped
}

/**
 * Get weekday from date (Danish weekday names)
 */
export const getWeekdayFromDate = (date: Date): WeekDay => {
  const dayIndex = date.getDay()
  // Sunday = 0, Monday = 1, etc. Map to Danish weekday names
  const mapping: Record<number, WeekDay> = {
    0: 'søndag',
    1: 'mandag',
    2: 'tirsdag',
    3: 'onsdag',
    4: 'torsdag',
    5: 'fredag',
    6: 'lørdag'
  }
  return mapping[dayIndex]
}
```

### Order Sync Logic (`composables/useOrderSync.ts`)

```typescript
import type { DinnerEventDisplay, OrderDisplay, InhabitantDetail, TicketPrice } from '~/types'

interface OrderSyncResult {
  toCreate: OrderCreate[]
  toUpdate: Array<{ id: number; dinnerMode: DinnerMode }>
  toDelete: number[]
}

/**
 * Compute order sync operations (pure function)
 * Compares preferences against existing orders for all dinner events
 */
export const computeOrderSync = (
  dinnerEvents: DinnerEventDisplay[],
  preferences: WeekDayMap<DinnerMode>,
  existingOrders: OrderDisplay[],
  inhabitant: InhabitantDetail,
  ticketPrices: TicketPrice[]
): OrderSyncResult => {
  const toCreate: OrderCreate[] = []
  const toUpdate: Array<{ id: number; dinnerMode: DinnerMode }> = []
  const toDelete: number[] = []

  // Index existing orders by dinnerEventId for O(1) lookup
  const ordersByEvent = new Map(
    existingOrders.map(o => [o.dinnerEventId, o])
  )

  for (const event of dinnerEvents) {
    const weekday = getWeekdayFromDate(new Date(event.date))
    const preference = preferences[weekday]
    const existingOrder = ordersByEvent.get(event.id)

    if (preference === DinnerMode.NONE) {
      // Should not have order
      if (existingOrder?.state === 'BOOKED') {
        toDelete.push(existingOrder.id)
      }
      // RELEASED/CLOSED: no action (immutable)
    } else {
      // Should have order with this dinnerMode
      if (!existingOrder) {
        toCreate.push({
          dinnerEventId: event.id,
          inhabitantId: inhabitant.id,
          dinnerMode: preference,
          ticketPriceId: getTicketPriceForInhabitant(inhabitant, ticketPrices),
          priceAtBooking: getTicketPriceForInhabitant(inhabitant, ticketPrices, true),
          state: 'BOOKED'
        })
      } else if (existingOrder.state === 'BOOKED' && existingOrder.dinnerMode !== preference) {
        toUpdate.push({ id: existingOrder.id, dinnerMode: preference })
      }
      // Same mode or RELEASED/CLOSED: no action
    }
  }

  return { toCreate, toUpdate, toDelete }
}

/**
 * Determine ticket price based on inhabitant age
 */
const getTicketPriceForInhabitant = (
  inhabitant: InhabitantDetail,
  ticketPrices: TicketPrice[],
  returnPrice = false
): number => {
  // Logic to determine ADULT/CHILD/BABY based on birthDate and maximumAgeLimit
  const ticketPrice = ticketPrices.find(tp => {
    if (!inhabitant.birthDate) return tp.ticketType === 'ADULT'
    const age = calculateAge(inhabitant.birthDate)
    if (tp.maximumAgeLimit && age <= tp.maximumAgeLimit) return true
    return tp.ticketType === 'ADULT' && !tp.maximumAgeLimit
  })

  return returnPrice ? ticketPrice?.price ?? 0 : ticketPrice?.id ?? 0
}
```

### Repository Functions (`server/data/seasonActivationRepository.ts`)

```typescript
/**
 * Sync orders for a single household to match season preferences
 * Called per-household to stay within D1's 1,000 query limit
 */
export async function syncHouseholdOrders(
  d1Client: D1Database,
  householdId: number,
  seasonId: number
): Promise<HouseholdSyncResponse> {
  const prisma = await getPrismaClientConnection(d1Client)

  // 1. Fetch season with cooking days and dinner events (~2 queries)
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: {
      dinnerEvents: { select: { id: true, date: true, state: true } },
      ticketPrices: true
    }
  })

  // 2. Fetch household with inhabitants (~1 query)
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    include: {
      inhabitants: {
        select: { id: true, dinnerPreferences: true, birthDate: true }
      }
    }
  })

  const cookingDays = deserializeCookingDays(season.cookingDays)
  const futureEvents = season.dinnerEvents.filter(e =>
    new Date(e.date) > new Date() && e.state === 'SCHEDULED'
  )

  let totalClipped = 0
  let totalCreated = 0
  let totalUpdated = 0
  let totalDeleted = 0

  for (const inhabitant of household.inhabitants) {
    // 3. Clip preferences (~1 query per inhabitant)
    const currentPrefs = inhabitant.dinnerPreferences
      ? deserializePreferences(inhabitant.dinnerPreferences)
      : null
    const clippedPrefs = clipPreferencesToSeason(currentPrefs, cookingDays)

    await prisma.inhabitant.update({
      where: { id: inhabitant.id },
      data: { dinnerPreferences: serializePreferences(clippedPrefs) }
    })
    totalClipped++

    // 4. Fetch existing orders for this inhabitant (~1 query)
    const existingOrders = await prisma.order.findMany({
      where: {
        inhabitantId: inhabitant.id,
        dinnerEventId: { in: futureEvents.map(e => e.id) }
      },
      select: { id: true, dinnerEventId: true, dinnerMode: true, state: true }
    })

    // 5. Compute sync operations (pure function, 0 queries)
    const { toCreate, toUpdate, toDelete } = computeOrderSync(
      futureEvents,
      clippedPrefs,
      existingOrders,
      inhabitant,
      season.ticketPrices
    )

    // 6. Execute sync (~N queries, chunked by Prisma)
    if (toCreate.length > 0) {
      await prisma.order.createMany({ data: toCreate })
      totalCreated += toCreate.length
    }

    for (const update of toUpdate) {
      await prisma.order.update({
        where: { id: update.id },
        data: { dinnerMode: update.dinnerMode }
      })
      totalUpdated++
    }

    if (toDelete.length > 0) {
      await prisma.order.deleteMany({
        where: { id: { in: toDelete } }
      })
      totalDeleted += toDelete.length
    }
  }

  return {
    householdId,
    inhabitantsClipped: totalClipped,
    ordersCreated: totalCreated,
    ordersUpdated: totalUpdated,
    ordersDeleted: totalDeleted
  }
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `composables/useSeasonActivation.ts` | Create | `clipPreferencesToSeason()`, `getWeekdayFromDate()` |
| `composables/useOrderSync.ts` | Create | `computeOrderSync()` |
| `server/data/seasonActivationRepository.ts` | Create | `syncHouseholdOrders()` |
| `server/routes/api/admin/season/[id]/activate.post.ts` | Create | Activation orchestrator |
| `server/routes/api/admin/household/[id]/sync-orders.post.ts` | Create | Per-household sync |
| `server/routes/api/admin/household/inhabitants/[id].post.ts` | Modify | Clip + sync on preference save |
| `stores/plan.ts` | Extend | `activateSeason()` action with progress |

---

## Integration Points

### Existing Powermode

The existing `updateAllInhabitantPreferences()` in `households.ts` should trigger clip + sync:

```typescript
// After powermode updates all inhabitants in a household
await $fetch(`/api/admin/household/${householdId}/sync-orders`, {
  method: 'POST',
  body: { seasonId: activeSeasonId }
})
```

### Heynabo Import

When importing inhabitants from Heynabo, sync the household:

```typescript
// After creating new inhabitant
await $fetch(`/api/admin/household/${householdId}/sync-orders`, {
  method: 'POST',
  body: { seasonId: activeSeasonId }
})
```

### UI Progress Feedback

```typescript
// stores/plan.ts
const activateSeason = async (seasonId: number) => {
  activationProgress.value = { current: 0, total: 0, status: 'loading' }

  const households = await $fetch('/api/admin/household')
  activationProgress.value.total = households.length

  for (const household of households) {
    await $fetch(`/api/admin/household/${household.id}/sync-orders`, {
      method: 'POST',
      body: { seasonId }
    })
    activationProgress.value.current++
  }

  activationProgress.value.status = 'complete'
}
```

---

## Test Strategy

| Test Type | Coverage |
|-----------|----------|
| Unit | `clipPreferencesToSeason()` - all weekday combinations |
| Unit | `computeOrderSync()` - all preference/order state combinations |
| Unit | `getWeekdayFromDate()` - date to Danish weekday mapping |
| E2E | Season activation flow with progress |
| E2E | Preference save triggers order sync |
| E2E | New inhabitant gets clipped preferences + orders |
| E2E | Idempotency (re-activation produces same result) |
| E2E | Respects RELEASED/CLOSED orders (immutable) |

---

## ADR Compliance

- **ADR-007:** Store handles activation with progress state, components show loading
- **ADR-009:** Per-household calls stay within D1's 1,000 query limit
- **ADR-010:** Clip/sync pure functions in composables, serialization in repository
- **ADR-011:** Respects order states (only BOOKED orders modified)
- **ADR-012:** Use `Prisma.skip` for optional fields in order creation

---

## Design Decisions

1. **`bookedByUserId`:** Set to `null` (SYSTEM) - orders are system-generated, not user-booked
2. **Activation trigger:** Manual admin action - admin explicitly activates season via UI
3. **Audit trail:** Yes - order creation logs first `OrderHistory` entry (action: `SYSTEM_CREATED`)
4. **Retry handling:** Operation is idempotent - simply re-run activation if it fails
