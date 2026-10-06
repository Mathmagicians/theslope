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
  id              Int           @id @default(autoincrement())
  dinnerEventId   Int
  dinnerEvent     DinnerEvent   @relation(fields: [dinnerEventId], references: [id], onDelete: Cascade)
  inhabitantId    Int           // the person, or the booking member for a guest
  inhabitant      Inhabitant    @relation(fields: [inhabitantId], references: [id], onDelete: Cascade)
  isGuestTicket   Boolean       @default(false)
  ticketPriceId   Int?          // guest: chosen at join (validation requires it); regular: null
  ticketPrice     TicketPrice?  @relation(fields: [ticketPriceId], references: [id], onDelete: SetNull)
  allergyTypeIds  String?       // guest allergies, JSON — the guest-order shape
  state           WaitlistState @default(WAITING)   // WAITING | ASSIGNED | CANCELLED
  assignedOrderId Int?                              // the order the assignment produced / claimed
  createdAt       DateTime      @default(now())

  // one regular entry per person per dinner; guests share the member's inhabitantId like orders do
  // partial unique index via the Prisma 7.4 `partialIndexes` preview: WHERE isGuestTicket = 0
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

A regular entry's ticket is derived at sweep time with the existing age-at-dinner-date resolver
(`getTicketPriceForInhabitant`, the one scaffolding uses) — nothing is stored on the entry, a birthday between join
and dinner changes nothing, and a mid-season price edit reaches unassigned entries as it reaches unscaffolded
bookings. A guest entry carries its chosen `ticketPriceId` and allergies. Freezing happens on the order the sweep
creates (`ticketPriceId` + `priceAtBooking`), regular or guest (`buildDesiredOrder` / `buildGuestDesiredOrder`
shapes). Supply is measured in portions (`ticketPrice.portionSize`). The resolver walks the queue in strict
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

**Member faces — queued is a badge on Ingen, never a mode** ✅ signed 2026-10-06

A new `ICONS.waitlist` design-system token (hourglass glyph, picked at implementation); the badge renders through
the same `useBookingUi` badge path as the swap/deadline markers, shared by day and grid. On assignment the order
lands as Spiser med (DINEIN), changeable afterwards like any order within the rules.

```
DinnerBookingForm — efter deadline, udsolgt
  Anna    Ingen                                  [Skriv på venteliste]
  Bo      Ingen  [sandglas #2 i køen]            [Forlad ventelisten]
  Emil    Spiser med                             (har billet)
  ...billet tildelt -> Bo: Spiser med (badge væk, normal ordre)

BookingGridView — celle for en person i kø: Ingen-tilstanden med
sandglas-badge i hjørnet; legenden får "sandglas = på venteliste (#n)".
Ledige billetter efter deadline viser [Tag billet] som i dag (claim).
```

**Chef side — demand-driven release** ✅ signed 2026-10-05

One release-portions form, two triggers: a permanent entry `Frigiv portioner` in ChefMenuCard's [Flere]-menu (the
findable home next to the chef's actions), and a CTA alert directly under the action row that renders only while
the queue is non-empty. Both open the same form; the prefill is the queue's portion need.

```
ChefMenuCard
  [Rediger menu] [Annoncer] [Flere v]
                             +- Frigiv portioner
  +----------------------------------------------------------------+
  | (i) Mange skrånere mangler en billet til din middag — har du   |
  |     mulighed for at mætte flere munde?    [Frigiv portioner]   |
  +----------------------------------------------------------------+
  form:  Kan du frigive [ 2,5 ] portioner?  [Frigiv] [Fortryd]
```

Queue/for-sale status lives in the kitchen stats panel as the alternating fourth box — never both, since
auto-assign consumes supply while anyone queues:

```
KitchenPreparation:  TAKEAWAY 12   SPISESAL 28   SPIS SENT 5   TIL SALG 2
                                                        eller: VENTELISTE 4
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
