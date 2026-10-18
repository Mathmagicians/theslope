---
name: architecture
description: Use before proposing or briefing a change to an endpoint, a repository function, a server utility, a composable, a store or a component in TheSlope, and when reviewing a proposal. The proposal names its ADR, its compliance rows and every caller; an endpoint keeps its resource, a server utility is called, the browser renders what the server answers.
---

# Architecture

## ADRs

- A proposal names the ADR it follows (`ADR-016 [Unified Booking Through Scaffold]`) and quotes the line it changes.
  A changed line is written into `docs/adr.md` after the user's yes, by the orchestrator, never by a subagent.
- A decision-matrix row, a bucket (`create`, `claim`, `leave`, …) or a cascade (`onDelete` in
  `prisma/schema.prisma`) changes only through a dated decision in the release spec.
- `docs/adr-compliance-backend.md` is read before an endpoint is proposed, `docs/adr-compliance-frontend.md` before a
  component or a store; the rows the change touches are named in the brief.

## Endpoints, server utilities, composables

- An endpoint owns one resource: `server/routes/api/household/inhabitants/[id]/preferences.post.ts` writes
  `Inhabitant.dinnerPreferences`, `server/routes/api/household/order/scaffold.post.ts` takes desired orders. Both call
  `scaffoldPrebookings` (`server/utils/scaffoldPrebookings.ts`); neither writes the other's column.
- A server utility is called with an option before a second utility is written (`ScaffoldOptions.preview`, not a
  `previewPrebookings`); an endpoint takes a query flag before a new route is added (`?preview=true`, `?adminBypass=true`).
- The server decides, the browser renders: `app/components/**` send a draft (`DesiredOrder[]`, `WeekDayMap<DinnerMode>`)
  and format the `ScaffoldResult` that comes back; `app/composables/useBooking.ts` is the one generator, imported by
  `server/utils/scaffoldPrebookings.ts` (ADR-017).
- Words users read live in `app/config/*.ts` (`bookingWords.ts`, `notificationTemplates.ts`); a composable formats, a
  store reads and writes through `useApiHandler`, a component binds tokens (ADR-007, ADR-017, ADR-018).

## One of each

- One generator (`resolveDesiredOrdersToBuckets`), one line builder (`previewLines` in `useBookingUi.ts`), one audit
  format (`createOrderAuditData` / `readOrderAudit`), one word table (`BOOKING_WORDS`). A proposal that adds a second
  names the first and removes it in the same package (`/dry`).

## Trace before you claim

- Every statement about behaviour cites `file:line`; every caller of a changed function is listed
  (`grep -rn "scaffoldPrebookings(" server app`); a regression names its commit (`git log -S"<text>"`).
- The blast radius is a table: file, change, the specs whose assertions move.

## Presenting

- One decision per round, options as columns with one line of pro and con each, the drafted option marked "as drawn";
  the code shown is the diff the user will read (`/plan-and-supervise`).
