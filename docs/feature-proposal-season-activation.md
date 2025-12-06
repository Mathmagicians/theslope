# Feature Proposal: Season Activation & Auto-Booking

**Status:** Approved | **Date:** 2025-12-04 | **Updated:** 2025-12-06

## Already Implemented

- ✅ `maskWeekDayMap` - Generic pure function in `useWeekDayMapValidation.ts`
- ✅ `createPreferenceClipper` - Curried function in `useSeason.ts` using `maskWeekDayMap`
- ✅ `chunkPreferenceUpdates` - Uses `chunkArray` from `batchUtils.ts`
- ✅ `updateInhabitantPreferencesBulk` - Bulk update in repository
- ✅ Preference clipping on season activation (`POST /api/admin/season/active`)
- ✅ Season deactivation (`POST /api/admin/season/deactivate`)
- ✅ UI for activate/deactivate in `SeasonStatusDisplay.vue`
- ✅ `createOrders` bulk function with audit trail in `financesRepository.ts`
- ✅ `dateToWeekDay` - Exported utility in `utils/season.ts`
- ✅ `reconcilePreBookings` - Curried function configured from `pruneAndCreate`
- ✅ `createPreBookingGenerator` - Curried function for generating desired orders from preferences
- ✅ `determineTicketType` - Age-based ticket type lookup in `useTicket.ts`
- ✅ Unit tests for `createPreBookingGenerator` and `reconcilePreBookings`

## Next: User Cancellation Tracking & Scaffold Endpoint

### Decision: Filter Cancelled Orders Inside Generator

**Problem:** User deletes a BOOKED order → order is gone → System scaffolds → creates new order (unwanted!)

**Solution:** Track user cancellations in OrderHistory, query latest action per inhabitant-dinnerEvent, pass excluded keys INTO `createPreBookingGenerator` (not post-processing).

### Implementation Tasks

#### 1. Schema Changes (Prisma)

Add `OrderAuditAction` enum and denormalized columns to `OrderHistory`:

```prisma
enum OrderAuditAction {
  USER_BOOKED      // User manually booked
  USER_CANCELLED   // User cancelled their booking (respect in scaffolding)
  ADMIN_DELETED    // Admin deleted (may recreate)
  SYSTEM_SCAFFOLD  // System auto-created from preferences
  SYSTEM_PRUNED    // System removed (preference changed to NONE)
  BULK_IMPORT      // Imported from billing CSV
}

model OrderHistory {
  id                Int              @id @default(autoincrement())
  orderId           Int?
  order             Order?           @relation(fields: [orderId], references: [id], onDelete: SetNull)
  action            OrderAuditAction // Changed from String to enum
  performedByUserId Int?
  performedByUser   User?            @relation(fields: [performedByUserId], references: [id], onDelete: SetNull)
  auditData         String
  timestamp         DateTime         @default(now())

  // Denormalized for cancellation queries (orderId becomes NULL after deletion)
  inhabitantId      Int?
  dinnerEventId     Int?

  @@index([orderId])
  @@index([performedByUserId])
  @@index([timestamp])
  @@index([inhabitantId, dinnerEventId, action]) // For cancellation lookups
}
```

**Why denormalized columns?** When Order is deleted, `orderId` becomes NULL (SET NULL). We need `inhabitantId` + `dinnerEventId` to query "which combinations were cancelled by user".

#### 2. Zod Schema Updates (`useBookingValidation.ts`)

Update `AuditActionSchema` to match Prisma enum:

```typescript
const OrderAuditActionSchema = z.enum([
  'USER_BOOKED',
  'USER_CANCELLED',
  'ADMIN_DELETED',
  'SYSTEM_SCAFFOLD',
  'SYSTEM_PRUNED',
  'BULK_IMPORT'
])

// Update AuditContextSchema to use new enum
const AuditContextSchema = z.object({
  action: OrderAuditActionSchema,
  performedByUserId: z.number().int().positive().nullable(),
  source: z.string().min(1)
})
```

#### 3. Repository Changes

**`deleteOrder` in `financesRepository.ts`:**
- Before deleting, create OrderHistory entry with denormalized fields
- Accept `performedByUserId` to distinguish USER_CANCELLED vs ADMIN_DELETED

```typescript
async function deleteOrder(
  d1Client: D1Database,
  id: number,
  performedByUserId: number | null  // null = admin, non-null = user
): Promise<OrderDisplay> {
  // 1. Fetch order to get inhabitantId, dinnerEventId
  const order = await prisma.order.findUnique({ where: { id } })

  // 2. Create audit entry with denormalized fields
  await prisma.orderHistory.create({
    data: {
      orderId: id,
      action: performedByUserId ? 'USER_CANCELLED' : 'ADMIN_DELETED',
      performedByUserId,
      inhabitantId: order.inhabitantId,      // Denormalized
      dinnerEventId: order.dinnerEventId,    // Denormalized
      auditData: JSON.stringify({ orderSnapshot: order })
    }
  })

  // 3. Delete order (orderId in OrderHistory becomes NULL)
  return prisma.order.delete({ where: { id } })
}
```

**New `fetchLatestCancellations` in `financesRepository.ts`:**

```typescript
type CancelledBookingKey = `${number}-${number}` // inhabitantId-dinnerEventId

async function fetchLatestCancellations(
  d1Client: D1Database,
  dinnerEventIds: number[]
): Promise<Set<CancelledBookingKey>> {
  // Get latest action per inhabitant-dinnerEvent combination
  // Only return keys where latest action is USER_CANCELLED
  const cancellations = await prisma.$queryRaw`
    SELECT inhabitantId, dinnerEventId
    FROM OrderHistory h1
    WHERE action = 'USER_CANCELLED'
      AND dinnerEventId IN (${Prisma.join(dinnerEventIds)})
      AND timestamp = (
        SELECT MAX(timestamp) FROM OrderHistory h2
        WHERE h2.inhabitantId = h1.inhabitantId
          AND h2.dinnerEventId = h1.dinnerEventId
      )
  `

  return new Set(
    cancellations.map(c => `${c.inhabitantId}-${c.dinnerEventId}`)
  )
}
```

#### 4. Generator Changes (`useSeason.ts`)

Update `createPreBookingGenerator` to accept excluded keys:

```typescript
const createPreBookingGenerator = (
  householdId: number,
  ticketPrices: TicketPrice[],
  dinnerEvents: DinnerEventDisplay[],
  excludedKeys?: Set<string>  // inhabitantId-dinnerEventId combinations to skip
) => {
  const excluded = excludedKeys ?? new Set()

  return (inhabitants) =>
    inhabitants.flatMap(inhabitant => {
      // ... existing validation ...

      return dinnerEvents
        .map(de => {
          // Skip if user previously cancelled this combination
          const key = `${inhabitant.id}-${de.id}`
          if (excluded.has(key)) return null

          // ... rest of existing logic ...
        })
        .filter(...)
    })
}
```

#### 5. Rebooking Handling

When user rebooks (creates order after cancelling), the new `USER_BOOKED` entry becomes the latest action. Next scaffold query will see `USER_BOOKED` as latest, not `USER_CANCELLED` → order gets created.

**No history rewriting needed** - query always gets latest action per key.

### Scaffold Endpoint

**Endpoint:** `POST /api/admin/dinner-event/scaffold-prebookings`
- Called by: activate season (days 1-60) OR daily cron (day 61)
- Input: `{ dinnerEventIds: number[] }`

**Flow:**
1. Fetch dinner events for given IDs
2. Fetch all households with inhabitants
3. Fetch ticket prices for season
4. **Fetch latest cancellations** for dinner event IDs
5. For each household:
   - Generate desired orders (passing excludedKeys)
   - Reconcile with existing orders
   - Create/delete as needed

### Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `OrderAuditAction` enum, denormalized columns to `OrderHistory` |
| `composables/useBookingValidation.ts` | Update `AuditActionSchema` to match enum |
| `server/data/financesRepository.ts` | Update `deleteOrder`, add `fetchLatestCancellations` |
| `composables/useSeason.ts` | Add `excludedKeys` param to `createPreBookingGenerator` |
| Migration | Create migration for schema changes |

---

## Summary

Automated order lifecycle management with a **rolling 60-day pre-booking window**. System creates preference-based orders for the next 60 days; users can manually book beyond that. Daily and monthly scheduled tasks handle order scaffolding, dinner consumption, and billing.

## Key Concepts

### Pre-Bookings vs User Bookings

| Type | Created By | Window | Mutable |
|------|-----------|--------|---------|
| **Pre-booking** | System (based on preferences) | Rolling 60 days | Yes (BOOKED state) |
| **User booking** | User (manual action) | Any future date | Follows normal rules |

Pre-bookings are idempotent scaffolding - users can still manually book dinners beyond the 60-day window.

### Preference Clipping

```
Season cookingDays:     { mon: true,  tue: false, wed: true,  thu: false, fri: true  }
User preferences:       { mon: DINEIN, tue: DINEIN, wed: TAKEAWAY, thu: DINEIN, fri: DINEIN }
                                        ↓ CLIP ↓
Stored preferences:     { mon: DINEIN, tue: NONE,   wed: TAKEAWAY, thu: NONE,   fri: DINEIN }
```

Non-cooking days are clipped to NONE. Same logic as `WeekDayMapDinnerModeDisplay` with `parentRestriction` prop.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ADMIN ACTION: Activate Season                                              │
│  1. Clip all inhabitants' preferences to season.cookingDays                 │
│  2. Scaffold pre-bookings for next 60 days                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  DAILY CRON: 02:00 Copenhagen (01:00 UTC)                                   │
│  1. CONSUME: Mark yesterday's dinners → CONSUMED                            │
│  2. CLOSE: Mark orders on consumed dinners → CLOSED                         │
│  3. TRANSACT: Create transactions for closed orders                         │
│  4. SCAFFOLD: Create pre-bookings for day +60 (rolling window edge)         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  MONTHLY CRON: 1st of month, 04:00 Copenhagen (03:00 UTC)                   │
│  1. Aggregate transactions from previous month                              │
│  2. Generate invoices per household                                         │
│  3. Mark transactions as invoiced                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  USER ACTIONS (anytime)                                                     │
│  • Save preferences → clip + sync pre-bookings within 60-day window         │
│  • Manual booking → create order for any future dinner (beyond window OK)   │
│  • Release order → BOOKED → RELEASED (available for others)                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Scheduled Tasks (Nitro)

Using [Nitro Scheduled Tasks](https://nitro.build/guide/tasks) with [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/).

### Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    experimental: {
      tasks: true
    },
    scheduledTasks: {
      // Daily: 01:00 UTC = 02:00 Copenhagen
      '0 1 * * *': ['daily-maintenance'],
      // Monthly: 1st at 03:00 UTC = 04:00 Copenhagen
      '0 3 1 * *': ['monthly-billing']
    }
  }
})
```

```toml
# wrangler.toml - must match scheduledTasks patterns
[env.prod.triggers]
crons = ["0 1 * * *", "0 3 1 * *"]

[env.dev.triggers]
crons = ["0 1 * * *", "0 3 1 * *"]
```

### Task Definitions

```typescript
// server/tasks/daily-maintenance.ts
export default defineTask({
  meta: {
    name: 'daily-maintenance',
    description: 'Consume dinners, close orders, create transactions, scaffold pre-bookings'
  },
  async run({ context }) {
    const db = context.cloudflare.env.DB

    const result = await dailyMaintenance(db)

    console.info('Daily maintenance completed:', result)
    return { result }
  }
})
```

```typescript
// server/tasks/monthly-billing.ts
export default defineTask({
  meta: {
    name: 'monthly-billing',
    description: 'Generate invoices for previous month'
  },
  async run({ context }) {
    const db = context.cloudflare.env.DB

    const result = await monthlyBilling(db)

    console.info('Monthly billing completed:', result)
    return { result }
  }
})
```

---

## Daily Maintenance Logic

### Query Budget (Single Cron Invocation)

| Step | Queries | Notes |
|------|---------|-------|
| Fetch yesterday's dinners | ~1 | Filter by date + state |
| Update dinner states → CONSUMED | ~1 | Single update |
| Fetch BOOKED orders for consumed dinners | ~1 | |
| Close orders + create transactions | ~30 | ~120 orders ÷ 8 per batch |
| Fetch day +60 dinner events | ~1 | |
| Scaffold pre-bookings for day +60 | ~15 | ~120 inhabitants ÷ 8 |
| **Total** | **~50** ✅ | Well within D1's 1,000 limit |

### Implementation

```typescript
// server/utils/dailyMaintenance.ts
export async function dailyMaintenance(db: D1Database): Promise<DailyMaintenanceResult> {
  const prisma = await getPrismaClientConnection(db)
  const yesterday = subDays(new Date(), 1)
  const scaffoldDate = addDays(new Date(), 60)

  // 1. CONSUME: Mark yesterday's dinners
  const consumedDinners = await prisma.dinnerEvent.updateMany({
    where: {
      date: { gte: startOfDay(yesterday), lt: endOfDay(yesterday) },
      state: 'ANNOUNCED'  // Only announced dinners get consumed
    },
    data: { state: 'CONSUMED' }
  })

  // 2. CLOSE: Mark orders on consumed dinners
  const closedOrders = await prisma.order.updateMany({
    where: {
      dinnerEvent: { state: 'CONSUMED' },
      state: 'BOOKED'
    },
    data: {
      state: 'CLOSED',
      closedAt: new Date()
    }
  })

  // 3. TRANSACT: Create transactions for closed orders
  const ordersToTransact = await prisma.order.findMany({
    where: {
      state: 'CLOSED',
      Transaction: null  // No transaction yet
    },
    include: { inhabitant: { include: { user: true } } }
  })

  for (const order of ordersToTransact) {
    await createTransactionForOrder(prisma, order)
  }

  // 4. SCAFFOLD: Create pre-bookings for day +60
  const scaffoldResult = await scaffoldPreBookingsForDate(prisma, scaffoldDate)

  return {
    dinnersConsumed: consumedDinners.count,
    ordersClosed: closedOrders.count,
    transactionsCreated: ordersToTransact.length,
    preBookingsCreated: scaffoldResult.created
  }
}
```

---

## Order Sync Rules

| Preference | Existing Order | Action |
|------------|----------------|--------|
| `NONE` | `BOOKED` | Delete pre-booking |
| `NONE` | `RELEASED`/`CLOSED` | No action (user/system decision) |
| `DINEIN`/`TAKEAWAY` | None | Create pre-booking |
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
| Worker memory | **128 MB** | Concurrent operations consume memory |

---

## Bulk Order Creation Pattern

**Problem:** Original `createOrders` used `Promise.all` with N concurrent `prisma.order.create()` calls, exceeding Worker memory limits.

**Solution:** Household sharding at caller level + simple bulk insert in `createOrders`.

### Responsibility Split

| Layer | Responsibility |
|-------|----------------|
| **Zod Schema** | Structure validation (`OrderCreateWithPriceSchema`) |
| **Caller** | Business validation (same household, valid prices), shard, chunk ≤8, `Promise.all` |
| **`createOrders`** | `createManyAndReturn`, audit trail, return IDs (trusts caller) |

### Zod Schema (in `useBookingValidation`)

```typescript
const OrderCreateWithPriceSchema = OrderCreateSchema.extend({
    priceAtBooking: z.number().int().positive()
})

type OrderCreateWithPrice = z.infer<typeof OrderCreateWithPriceSchema>
```

### `createOrders` Signature

```typescript
interface CreateOrdersResult {
    householdId: number
    createdIds: number[]
}

interface AuditContext {
    action: 'BULK_IMPORT' | 'SYSTEM_SCAFFOLD' | 'USER_BOOKED'
    performedByUserId: number | null
    source: string
}

type OrderCreateWithPrice = OrderCreate & { priceAtBooking: number }

async function createOrders(
    d1Client: D1Database,
    ordersData: OrderCreateWithPrice[],  // ≤8 orders (caller chunks)
    auditContext: AuditContext
): Promise<CreateOrdersResult>
```

### `createOrders` Implementation

```typescript
async function createOrders(
    d1Client: D1Database,
    householdId: number,  // Caller validates, passes householdId
    ordersData: OrderCreateWithPrice[],
    auditContext: AuditContext
): Promise<CreateOrdersResult> {
    const prisma = await getPrismaClientConnection(d1Client)

    // 1. Bulk insert orders, get IDs (DB is source of truth)
    const created = await prisma.order.createManyAndReturn({
        data: ordersData,
        select: { id: true }
    })
    const createdIds = created.map(o => o.id)

    // 2. Bulk insert audit trail
    await prisma.orderHistory.createMany({
        data: createdIds.map(orderId => ({
            orderId,
            action: auditContext.action,
            performedByUserId: auditContext.performedByUserId,
            auditData: JSON.stringify({ source: auditContext.source, householdId })
        }))
    })

    return { householdId, createdIds }
}
```

### Caller Pattern (Billing Import)

```typescript
const chunk = <T>(arr: T[], size: number): T[][] =>
    Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
        arr.slice(i * size, i * size + size)
    )

const CHUNK_SIZE = 8

// Caller validates households once, then chunks
// ordersByHousehold: Map<householdId, OrderCreateWithPrice[]>

const operations = [...ordersByHousehold.entries()]
    .flatMap(([householdId, orders]) =>
        chunk(orders, CHUNK_SIZE).map(orderChunk => ({ householdId, orderChunk }))
    )

// Parallel execution
const results = await Promise.all(
    operations.map(({ householdId, orderChunk }) =>
        createOrders(d1Client, householdId, orderChunk, {
            action: 'BULK_IMPORT',
            performedByUserId: adminUserId,
            source: 'csv_billing'
        })
    )
)

// Aggregate
const totalCreated = results.reduce((sum, r) => sum + r.createdIds.length, 0)
```

### Query Budget

| Per `createOrders` call | Queries |
|-------------------------|---------|
| `createManyAndReturn` | 1 |
| `createMany` (audit) | 1 |
| **Total** | **2** |

| Caller validation (once) | Queries |
|--------------------------|---------|
| Fetch all households | 1 |
| Fetch ticket prices | 1 |
| **Total** | **2** |

**Full import:** 2 + (50 households × ~7 chunks × 2 queries) = **~702 queries** ✅

### Files to Update

| File | Current | Update Required |
|------|---------|-----------------|
| `server/data/financesRepository.ts` | `createOrders` with `Promise.all` + internal validation | ✅ `createManyAndReturn` + audit, trusts caller |
| `server/routes/api/order/index.put.ts` | Calls `createOrders`, returns `OrderDisplay[]` | ✅ Validate, chunk, pass `householdId`, return IDs (household powermode) |
| `server/routes/api/admin/billing/import.post.ts` | Calls `createOrders` per household | ✅ Validate, chunk, `Promise.all`, pass `householdId` |
| `composables/useBookingValidation.ts` | `OrderCreateSchema` | ✅ Add `OrderCreateWithPriceSchema` |
| Season activation (new) | N/A | Follow caller pattern |
| Daily scaffolding (new) | N/A | Follow caller pattern |

---

### Why Rolling Window Helps

| Approach | Orders at Activation | Daily Scaffolding |
|----------|---------------------|-------------------|
| Full season (180 days) | 21,600 | 0 |
| **Rolling 60 days** | ~7,200 | ~120/day ✅ |

Rolling window keeps both activation AND daily maintenance well within limits.

---

## Season Activation (One-Time)

When admin activates a season:

1. **Clip preferences** for all inhabitants to match `cookingDays`
2. **Scaffold pre-bookings** for next 60 days only

### Query Budget (Activation)

| Per Household (~5 inhabitants) | Queries |
|--------------------------------|---------|
| Fetch season + dinner events (60 days) | ~3 |
| Fetch household + inhabitants | ~2 |
| Clip preferences | 5 |
| Fetch existing orders | ~1 |
| Create pre-bookings (5 × 40 events ÷ 8) | ~25 |
| **Total per household** | **~36** ✅ |

**Full activation:** ~35 households × ~36 queries = ~1,260 queries

Still needs household sharding (sequential calls), but much lighter than full-season scaffolding.

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| **Scheduled Tasks** |
| `server/tasks/daily-maintenance.ts` | Create | Daily cron task definition |
| `server/tasks/monthly-billing.ts` | Create | Monthly cron task definition |
| **Business Logic** |
| `server/utils/dailyMaintenance.ts` | Create | Consume, close, transact, scaffold |
| `server/utils/monthlyBilling.ts` | Create | Invoice generation |
| `server/utils/orderScaffolding.ts` | Create | Pre-booking creation logic |
| **Composables** |
| `composables/useSeasonActivation.ts` | Create | `clipPreferencesToSeason()` |
| `composables/useOrderSync.ts` | Create | `computeOrderSync()` |
| **API Endpoints** |
| `server/routes/api/admin/season/[id]/activate.post.ts` | Create | Activation orchestrator |
| **Configuration** |
| `nuxt.config.ts` | Modify | Add `scheduledTasks` |
| `wrangler.toml` | Modify | Add `[triggers] crons` |

---

## Test Strategy

| Test Type | Coverage |
|-----------|----------|
| **Unit** | `clipPreferencesToSeason()` - all weekday combinations |
| **Unit** | `computeOrderSync()` - all preference/order state combinations |
| **Unit** | `scaffoldPreBookingsForDate()` - idempotency |
| **E2E** | Season activation creates 60-day pre-bookings |
| **E2E** | Daily maintenance consumes + scaffolds correctly |
| **E2E** | Monthly billing generates invoices |
| **E2E** | Preference save syncs pre-bookings within window |
| **E2E** | User can book beyond 60-day window manually |
| **E2E** | Idempotency (re-run produces same result) |

---

## ADR Compliance

- **ADR-007:** Store handles activation with progress state, components show loading
- **ADR-009:** Rolling window + daily scaffolding stays within D1's 1,000 query limit
- **ADR-010:** Pure functions in composables, serialization in repository
- **ADR-011:** Respects order states (only BOOKED orders modified)
- **ADR-012:** Use `Prisma.skip` for optional fields in order creation

---

## Design Decisions

1. **`bookedByUserId`:** Set to `null` (SYSTEM) - pre-bookings are system-generated
2. **Activation trigger:** Manual admin action via UI
3. **Audit trail:** Order creation logs `OrderHistory` entry (action: `SYSTEM_CREATED`)
4. **Retry handling:** All operations are idempotent - re-run safely
5. **Rolling window:** 60 days - balances UX (users see upcoming dinners) with efficiency
6. **Cron timing:** Daily at 02:00, Monthly at 04:00 Copenhagen time
7. **User bookings:** Users can manually book any future dinner, including beyond 60-day window
