# Feature Proposal: Waitlist — queue, auto-assign, extra portions

**Status:** backend committed 2026-10-09; UI implemented 2026-10-12 | **Date:** 2026-10-05 | **Branch:** `feature/work-roster` (umbrella: `release-0.9.0.md`)

## Problem

After the booking deadline a dinner is closed; the only way in is a RELEASED ticket, and the backend sells those
first-click-wins (`POST /api/order/claim` — FIFO by `releasedAt`, retry, USER_CLAIMED audit). No surface tells a
member that tickets exist, a member on a sold-out dinner has no way to stand in line, and a chef who cooked for more
has no way to sell the surplus.

## Design ✅ signed 2026-10-07

### Queue

The waiting list carries unplaced orders: an entry holds the order in its create shape (the `DesiredOrder` /
`OrderCreateWithPrice` schema the scaffolder uses — ticket price, price, dinner mode, guest flag, booker, guest
allergies) as a JSON column typed by that schema (ADR-010), plus the keys the queue is read and constrained by.
One inhabitant, one ticket per entry; a guest entry carries the booking member's `inhabitantId` with
`isGuestTicket` true. FIFO by `createdAt`. An entry exists while waiting: leaving deletes it, assignment places its
order through `createOrders` and deletes it.

```prisma
// An unplaced order waiting for a ticket; `order` holds it in the order-create shape
model TicketWaitlist {
  id            Int         @id @default(autoincrement())
  dinnerEventId Int
  dinnerEvent   DinnerEvent @relation(fields: [dinnerEventId], references: [id], onDelete: Cascade)
  inhabitantId  Int
  inhabitant    Inhabitant  @relation(fields: [inhabitantId], references: [id], onDelete: Cascade)
  isGuestTicket Boolean     @default(false)
  order         String // JSON typed by the order-create schema
  createdAt     DateTime    @default(now())

  @@index([dinnerEventId, createdAt])
  @@index([inhabitantId])
}
```

Back-relations `DinnerEvent.waitlist`, `Inhabitant.waitlistEntries`. Partial unique index
`(dinnerEventId, inhabitantId) WHERE isGuestTicket = 0` (Prisma 7.4 `partialIndexes`): one regular entry per person
per dinner. The matching index on `Order` refuses a second regular order for the same person and dinner, which makes
the assignment replay-safe.

### Assignment

`assignWaitlist(dinnerEventId, portions)` is an ADR-016-shaped reconciliation: a pure resolver walks the entries in
strict FIFO (no overtaking) and takes each entry whose portion weight fits the supply; the executor places those
orders and deletes the entries. Supply arrives as an event, never as a stored quantity: a RELEASED order (the
existing conditional claim consumes it) or the chef's release of N portions, which turns the first entries that fit
into orders at once. The entry's price stands as written at join — age at the dinner date for a regular entry, the
chosen price for a guest — and freezes on the order (`ticketPriceId`, `priceAtBooking`). Portion weights come from
the config mapping (`getPortionsForTicketType`): 2.5 portions against a queue voksen, barn, voksen, barn feed the
first three (1 + 0.5 + 1), the fourth waits. Daily maintenance deletes the entries of a dinner that reaches CONSUMED.

### Notifications

All through the shipped sender pipe (`feature-proposal-notification-triggers.md` § Trigger catalog carries the kinds):

| Event | Recipient |
|---|---|
| Ticket assigned | the assigned inhabitant's user — "Du har fået billet til <middag>" |
| Queue joined | the joining user — position included |
| Queue buildup over threshold | the dinner's chef — prompts releasing extra portions |
| Ticket sold | the releasing household — "Din billet er solgt" |

The chef also sees the live queue size on the dinner (`ChefMenuCard`).

## One booking path ✅ signed 2026-10-12

A member always sends a desired order through `POST /api/household/order/scaffold`. The generator decides the bucket
from the deadline; the executor settles the supply at that instant (ADR-016, amended rows):

| Desired order | Dinner | Bucket | The executor |
|---|---|---|---|
| no order, a mode | open | create | books |
| no order, a mode | closed | claim | claims a released ticket at that price, FIFO; none, or the race lost: creates the queue entry at the frozen price with the wish, reports the position |
| a queue entry, NONE | closed | leave | deletes the entry |
| a queue entry, another mode or price | closed | requeue | rewrites the entry's order, position kept |
| a queue entry, unchanged | closed | idempotent | nothing |

System mode never reaches the claim bucket. `DesiredOrder` carries `waitlistEntryId`; `ScaffoldResult` reports
`claimed`, `queued` with positions, `left` and `requeued`; a lost claim race queues.

### Endpoints

| Endpoint | Does | Guard |
|---|---|---|
| `POST /api/household/order/scaffold` | the one booking write: book, claim or queue, leave, requeue, mode change, cancel, release with the hand-over to the queue head, rebook | household member, admin bypass |
| `POST /api/chef/dinner/[id]/release-portions` | the chef's supply | a chef of the dinner's team |
| `GET /api/order/waitlist?dinnerEventIds=…` | every entry of those dinners in queue order: inhabitant, household, guest flag, the wish, the frozen price, created at | any member |

The client derives a household's rows, the position (the index in the dinner's queue), the queue size and the
portion need per dinner with the isomorphic `useWaitlist`, the same rule the server's assignment uses. Removed:
`PUT`/`DELETE /api/household/waitlist`, `GET /api/household/waitlist`, `GET /api/chef/dinner/[id]/waitlist`,
`POST /api/order/claim`, `PUT /api/order`, `POST /api/order/[id]`, `DELETE /api/order/[id]`; the admin correction is the scaffold with
`?adminBypass=true`, which hands the scaffolder `OPEN_DEADLINES`.

## Mockups

The mockups live in the component headers.

| Mockup | Signoff | Header |
|---|---|---|
| Member faces: queued is a badge on Ingen, never a mode | ✅ signed 2026-10-06 | `DinnerBookingForm.vue` |
| DinnerBookingForm after the deadline, sold out: the queued row shows the ghost of the wish | ✅ signed 2026-10-12 | `DinnerBookingForm.vue`, `DinnerModeSelector.vue` |
| BookingGridView queued cell and the legend entry | ✅ signed 2026-10-12 | `BookingGridView.vue`, `DinnerModeLegend.vue` |
| DinnerTicket queued state | ✅ signed 2026-10-12 | `DinnerTicket.vue` |
| Chef side: demand-driven release, one form with two triggers | ✅ signed 2026-10-05 | `ChefMenuCard.vue` |
| Kitchen stats: the alternating fourth box | ✅ signed 2026-10-05 | `KitchenPreparation.vue` |

## TDD

| Change | Tests |
|---|---|
| `TicketWaitlist` + sweep | unit spec for the pure resolver (FIFO, portion fitting, replay repair); serial e2e: release → head assigned, extra portions → first N assigned, re-run sweep → no double assignment |
| Queue through the scaffold | scaffold API spec (claim a ticket for sale, else queue with the position; guest entry; leave; requeue keeps the place; a repeated wish is idempotent; system mode queues nothing; admin correction); waitlist API spec (the entries read) |
| Day/grid UI | component specs (sold-out face, queue position, available face), BDD e2e: join → release → ticket assigned |
| Chef extra portions | API spec + component spec (ChefMenuCard), serial e2e via sweep |
| Notifications | serial e2e: each event writes its Delivery row |

## Affected

Prisma bundle (`TicketWaitlist`), assignment in `server/utils/`,
queue endpoints, `bookings.ts` store, `DinnerBookingForm.vue`, `BookingGridView.vue`, `ChefMenuCard.vue`,
`useBookingUi`, sender events + templates, `docs/adr-compliance-*.md` rows.
