# Waitlist — queue, auto-assign, extra portions (shipped in release 0.9)

**Status:** ✅ shipped: backend 2026-10-09, one booking path and the UI 2026-10-12 | **Signed:** design 2026-10-07, member faces 2026-10-06 and 12, chef side 2026-10-05, one booking path 2026-10-12 | **Umbrella:** `../this-pr/release-0.9.0.md`

After the booking deadline a member claims a released ticket or stands in line for one; the chef releases extra
portions; the queue is strict FIFO by portion weight, idempotent and replay-safe.

| Piece | Where |
|---|---|
| Model `TicketWaitlist` (an unplaced order in its create shape, as JSON; one regular entry per person per dinner) | `prisma/schema.prisma`, migration `0017_roster` |
| Assignment: the pure resolver and the executor, the release hand-over, portion weights from config | `server/utils/waitlistAssignment.ts` |
| One booking path: the scaffold decides create, claim, leave, requeue; a lost claim race queues (ADR-016) | `server/utils/scaffoldPrebookings.ts`, `app/composables/useBooking.ts`, `POST /api/household/order/scaffold` (`?adminBypass=true` for the admin's correction) |
| The chef's supply | `POST /api/chef/dinner/[id]/extra-portions` |
| The queue read, open to every member | `GET /api/order/waitlist?dinnerEventIds=…`, the isomorphic `useWaitlist` for rows, position, size and portion need |
| Maintenance | the daily job clears the entries of consumed dinners (ADR-015) |
| Member faces: queued as a badge on Ingen, the ghost of the wish after the deadline, the grid cell and legend, the ticket state | `DinnerBookingForm.vue`, `DinnerModeSelector.vue`, `BookingGridView.vue`, `DinnerModeLegend.vue`, `DinnerTicket.vue` (mockups in the headers) |
| Chef side: demand-driven release, one form with two triggers; the kitchen stats' alternating fourth box | `ChefMenuCard.vue`, `KitchenPreparation.vue` |
| Notifications: `WAITLIST_JOINED`, `WAITLIST_TICKET_ASSIGNED`, `WAITLIST_EXTRA_PORTION`, `WAITLIST_BUILDUP`, `TICKET_SOLD`, sent after the booking action from its outcomes | `app/config/notificationTemplates.ts`, `server/utils/sender/events/waitlist.ts` (`notifyBookingOutcomes`, `notifyExtraPortions`); the Delivery-row e2e is the "Waitlist notifications" package in `../this-pr/release-0.9.0.md` |
| Specs | the resolver unit spec, the scaffold and waitlist API specs, the serial `waitlistAssignment` and `Waitlist` e2e, the component specs of the five faces |

Removed with the one booking path: `PUT`/`DELETE`/`GET /api/household/waitlist`, `GET /api/chef/dinner/[id]/waitlist`,
`POST /api/order/claim`, `PUT /api/order`, `POST /api/order/[id]`, `DELETE /api/order/[id]`.

The no-seat notice at dinner start is `../chores-0.9.1.md` § Waitlist: no-seat notice at dinner start.
