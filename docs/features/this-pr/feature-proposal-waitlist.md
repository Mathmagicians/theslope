# Feature Proposal: Waitlist — queue, auto-assign, extra portions

**Status:** Draft | **Date:** 2026-10-05 | **Branch:** `feature/work-roster` (umbrella: `release-0.9.0.md`)

## Problem

After the booking deadline a dinner is closed; the only way in is a RELEASED ticket, and the backend sells those
first-click-wins (`POST /api/order/claim` — FIFO by `releasedAt`, retry, USER_CLAIMED audit). No surface tells a
member that tickets exist, a member on a sold-out dinner has no way to stand in line, and a chef who cooked for more
has no way to sell the surplus.

## Design

### Queue

One inhabitant, one ticket per entry. The queue is the authoritative structure; every hand-out is a state transition
on a queue row, idempotent and safe to replay (D1 has no transactions — single-statement conditional updates carry
the race avoidance, ADR-015).

```prisma
model TicketWaitlist {
  id             Int           @id @default(autoincrement())
  dinnerEventId  Int
  dinnerEvent    DinnerEvent   @relation(fields: [dinnerEventId], references: [id], onDelete: Cascade)
  inhabitantId   Int
  inhabitant     Inhabitant    @relation(fields: [inhabitantId], references: [id], onDelete: Cascade)
  state          WaitlistState @default(WAITING)   // WAITING | ASSIGNED | CANCELLED
  assignedOrderId Int?                              // the order the assignment produced / claimed
  createdAt      DateTime      @default(now())

  @@unique([dinnerEventId, inhabitantId])
  @@index([dinnerEventId, state])
}
```

Joining = committing to buy. FIFO by `createdAt`. Leaving the queue sets CANCELLED.

### Auto-assign sweep

`assignWaitlist(dinnerEventId)` is an ADR-016-shaped reconciliation: a pure resolver computes desired assignments
from (WAITING entries in FIFO order, available supply), the executor applies them. It runs on every supply or demand
write — ticket release, extra-portion release, queue join — and from the daily maintenance as backstop.

- Ownership of an entry is taken with `updateMany WHERE id = ? AND state = 'WAITING'` → 1 affected row wins.
- A RELEASED order is consumed through the existing conditional-claim mechanism; an extra portion produces a new
  order priced by the claimant's own ticket type at assignment time.
- A replay repairs half-done work: an ASSIGNED entry without `assignedOrderId` gets its order created; nothing is
  done twice.

### Portion resolver

Supply is measured in portions (`getPortionsForTicketType`, `useOrder.ts`). The resolver walks the queue in strict
FIFO (no overtaking) and consumes each entry's portion weight while it fits: 2.5 released portions against a queue
voksen, barn, voksen, barn feeds the first three (1 + 0.5 + 1), the fourth waits.

### Chef releases extra portions

The chef enters a portion count on the dinner ("N ekstra portioner"); the sweep consumes them for the queue,
leftovers stay claimable in the UI. Stored on the dinner (`DinnerEvent.extraPortionsReleased`); the remaining supply
is derived (released minus portions of orders the sweep created), so the write is convergent.

### Notifications

All through the shipped sender pipe (`feature-proposal-notification-triggers.md` § Trigger catalog carries the kinds):

| Event | Recipient |
|---|---|
| Ticket assigned | the assigned inhabitant's user — "Du har fået billet til <middag>" |
| Queue joined | the joining user — position included |
| Queue buildup over threshold | the dinner's chef — prompts releasing extra portions |
| Ticket sold | the releasing household — "Din billet er solgt" |

The chef also sees the live queue size on the dinner (`ChefMenuCard`).

## Mockups

**Day view — sold out, join the queue** ⏳ awaiting signoff

```
Lasagne — tirsdag 15/04              Udsolgt — 3 på venteliste
  Anna     [Skriv på venteliste]
  Bo       Nr. 2 på ventelisten      [Forlad ventelisten]
```

**Day view — tickets available after deadline** ⏳ awaiting signoff

```
Lasagne — tirsdag 15/04              2 ledige billetter
  Anna     [Tag billet]
```

**Grid view cell** ⏳ awaiting signoff

```
  ti 15/04          ┌──────────┐   ┌──────────┐
                    │ Lasagne  │   │ Lasagne  │
                    │ 2 ledige │   │ 3 i kø   │
                    └──────────┘   └──────────┘
```

**ChefMenuCard — queue size + extra portions** ⏳ awaiting signoff

```
Venteliste: 4 (2,5 portioner)
Ekstra portioner:  [ 2,5 ]  [Frigiv]       Frigivet: 2,5 · Solgt: 2,5
```

## TDD

| Change | Tests |
|---|---|
| `TicketWaitlist` + sweep | unit spec for the pure resolver (FIFO, portion fitting, replay repair); serial e2e: release → head assigned, extra portions → first N assigned, re-run sweep → no double assignment |
| Queue join/leave endpoint | Playwright API spec (join, duplicate join 409 via unique, leave) |
| Day/grid UI | component specs (sold-out face, queue position, available face), BDD e2e: join → release → ticket assigned |
| Chef extra portions | API spec + component spec (ChefMenuCard), serial e2e via sweep |
| Notifications | serial e2e: each event writes its Delivery row |

## Affected

Prisma bundle (`TicketWaitlist`, `WaitlistState`, `DinnerEvent.extraPortionsReleased`), sweep in `server/utils/`,
queue endpoints, `bookings.ts` store, `DinnerBookingForm.vue`, `BookingGridView.vue`, `ChefMenuCard.vue`,
`useBookingUi`, sender events + templates, `docs/adr-compliance-*.md` rows.
