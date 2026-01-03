# Ticket Claim Feature - Remaining Work

Core booking is complete (Order CRUD, audit trail, scaffolding). This documents the **claim** feature for released tickets.

## What's Done

- Order states: BOOKED, RELEASED, CLOSED, CANCELLED
- Order timestamps: `releasedAt` set atomically on RELEASE transition (enables FIFO claim queue)
- `[id].post.ts` handles release: dinnerMode → NONE after deadline → state RELEASED, USER_CANCELLED audit
- OrderHistory denormalized: inhabitantId, dinnerEventId, seasonId
- DEADLINE_LABELS centralized in useBooking()

## Analysis Summary

### Release Already Works
`[id].post.ts` + `getOrderCancellationAction()` already handles release correctly:
- Before deadline: DELETE order (USER_CANCELLED)
- After deadline: UPDATE state → RELEASED (USER_CANCELLED)

USER_CANCELLED covers both cases - same user intent. Distinguish by `orderId` null check in history.

### `releasedAt` Sufficient for Timing
Set in `updateOrdersToState()` when transitioning to RELEASED. Enables:
- FIFO ordering: `ORDER BY releasedAt ASC`
- No OrderHistory extension needed for timing

### Provenance via OrderSnapshotSchema
Extend auditData JSON (no schema migration) with:
- `inhabitantName` - "Anna B.H." (colloquial, via `formatNameWithInitials` from useHousehold)
- `householdShortname` - "AR_1"
- `householdId` - for filtering
- `allergies` - `["Peanuts", "Gluten"]` (just allergy type names, lightweight)

## Remaining Work

### 1. Authorization Fix
`[id].post.ts` missing `requireHouseholdAccess` - add it.

### 2. Extend OrderSnapshotSchema
```typescript
OrderSnapshotSchema.extend({
    inhabitantName: z.string(),
    householdShortname: z.string(),
    householdId: z.number()
})
```
Update `createOrderAuditData` to include these from fetched order relations.

### 3. Add USER_CLAIMED Audit Action
```prisma
USER_CLAIMED  // User claimed released ticket from another household
```

### 4. Query Endpoint Enhancement
Extend existing `/api/order` with state filter:
```
GET /api/order?state=RELEASED&dinnerEventId=X
```

### 5. Claim Endpoint
```
POST /api/order/[id]/claim
Body: { inhabitantId: number }
```
- Validate: order state = RELEASED, inhabitant belongs to user's household
- Update: inhabitantId, bookedByUserId, state → BOOKED
- Audit: USER_CLAIMED with original household in snapshot

## Business Rules

**Release:** Anyone from household, only after framelding deadline
**Claim:** Anyone, assigns to their household inhabitant, original price preserved
**Liability:** Unclaimed RELEASED → original household pays
**FIFO:** First released = first in claim queue (`ORDER BY releasedAt ASC`)

---

## UI Design: Released Tickets on Day View

No marketplace page - users claim on dinner day view (first come first served).

### Edit Mode - Released Tickets Available

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📅 Onsdag 15. januar • Tatziki med fladbrød                                 │
│ ───────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ Framelding: ⚪ Lukket                                                       │
│                                                                             │
│  Hvem                                        Hvordan spiser I         Pris  │
│ ───────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  ⚡ Hele familien                            [🍽️][🕐][🛍️][❌]       [Gem]  │
│                                                                             │
│ ───────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  Anna Larsen              Voksen             [🍽️][🕐][🛍️][❌]        55 kr │
│                                                                             │
│  Bob Larsen               Voksen             [🍽️][🕐][🛍️][❌]        55 kr │
│  🔄 fra AR_1                                                                │
│                                                                             │
│  Clara Larsen             Barn               [🍽️][🕐][🛍️][❌]        35 kr │
│                                                                             │
│ ───────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  👤 Tilføj gæst           [Voksen ▼]         [🍽️][🕐][🛍️]          [Tilføj] │
│                                                                             │
│  🎟️ Ledige:  [Voksen] 2  [Barn] 1                                           │
│              fra B12     fra S31_2                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Edit Mode - NO Released Tickets (Guest Row Disabled)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📅 Onsdag 15. januar • Tatziki med fladbrød                                 │
│ ───────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ Framelding: ⚪ Lukket                                                       │
│                                                                             │
│  Hvem                                        Hvordan spiser I         Pris  │
│ ───────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  ⚡ Hele familien                            [🍽️][🕐][🛍️][❌]       [Gem]  │
│                                                                             │
│ ───────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  Anna Larsen              Voksen             [🍽️][🕐][🛍️][❌]        55 kr │
│                                                                             │
│  Clara Larsen             Barn               [🍽️][🕐][🛍️][❌]        35 kr │
│                                                                             │
│ ───────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  👤 Tilføj gæst           (disabled - ingen ledige billetter)               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### View Mode - Showing Provenance on Claimed Tickets

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📅 Onsdag 15. januar • Tatziki med fladbrød                                 │
│ ───────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  Hvem                                        Hvordan spiser I         Pris  │
│ ───────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  Anna Larsen              Voksen             🍽️ Spisesal              55 kr │
│                                                                             │
│  Bob Larsen               Voksen             🍽️ Spisesal              55 kr │
│  🔄 fra AR_1                                                                │
│                                                                             │
│  Clara Larsen             Barn               🛍️ Takeaway              35 kr │
│                                                                             │
│  Gæst                     Voksen             🍽️ Spisesal              55 kr │
│  🔄 fra B12                                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Original Owner View - Released Tickets Status

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📅 Onsdag 15. januar • Tatziki med fladbrød                                 │
│ ───────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  Hvem                                        Status                         │
│ ───────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  Erik Hansen              Voksen             📤 FRIGIVET                    │
│                                              ✅ Overtaget af S31            │
│                                                                             │
│  Freja Hansen             Barn               📤 FRIGIVET                    │
│                                              ⏳ Venter...                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key UX Elements

| Element | Design |
|---------|--------|
| **Provenance display** | `🔄 fra [shortname]` badge under booking |
| **Available tickets** | Grouped by type: `[Voksen] 2  [Barn] 1` with shortnames |
| **Guest ticket type** | Dropdown `[Voksen ▼]` to select type |
| **Guest row disabled** | When no released tickets: "(disabled - ingen ledige billetter)" |
| **Original owner** | Shows `✅ Overtaget af [shortname]` or `⏳ Venter...` |
