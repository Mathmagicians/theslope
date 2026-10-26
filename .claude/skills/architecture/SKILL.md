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
  `previewPrebookings`); an endpoint takes a query flag before a new route is added (`?adminBypass=true`, `?bypassDeadlines=true`).
  A read is a `GET` and a preview is a read (ADR-004): the draft travels in the query (`orders=`, `dinnerPreferences=`).
- The server decides, the browser renders: `app/components/**` send a draft (`DesiredOrder[]`, `WeekDayMap<DinnerMode>`)
  and format the `ScaffoldResult` that comes back; `app/composables/useBooking.ts` is the one generator, imported by
  `server/utils/scaffoldPrebookings.ts` (ADR-017).
- Words users read live in `app/config/*.ts` (`bookingWords.ts`, `notificationTemplates.ts`); a composable formats, a
  store reads and writes through `useApiHandler`, a component binds tokens (ADR-007, ADR-017, ADR-018).

## Reads and writes over a list

- A read over a list of ids is one chunked query (`fetchHouseholdsByIds` in `server/data/prismaRepository.ts`), never one
  query per item; a step that scales with the rows of a run (the scaffold's claims, the mails of its outcomes) reads once
  and works from maps. Writes go through `createManyAndReturn` and `writeBatchOrEach` (ADR-014).
- D1 allows six simultaneous connections per invocation, 1,000 queries and 100 bound parameters per statement: the
  chunks of a read run one after another or in one `batch()`; a `Promise.all` over rows or chunks against D1 is a fault.

## One of each

- One generator (`resolveDesiredOrdersToBuckets`), one line builder (`previewLines` in `useBookingUi.ts`), one audit
  format (`createOrderAuditData` / `readOrderAudit`), one word table (`BOOKING_WORDS`). A proposal that adds a second
  names the first and removes it in the same package (`/dry`).

## Code rules

The user's review rules. A breach is a finding in the report, never a shortcut.

1. Unit tests never drive production code. A signature, an optional field, a union parameter or a widened type exists
   for production callers only; a spec adapts to it (`emitted?` kept optional for a `toEqual`, a parameter taking
   `T[] | () => Promise<T[]>` because a spec passes lists, `kind: string` because a spec passes `'NOPE'`).
2. A result is computed from the data in every path, never hardcoded inside a branch (`if (dryRun) return {counts: {sent: 0}}`).
3. Filter once, early, and pass the filtered list on. A helper receives the list it reports on, never the whole list
   plus a set to filter inside.
4. Exit early on a precondition before any load or read (the channel off before the sender event loads its data).
5. A dry run is the same code path stopped before the execution; it reports exactly what the execution does, and nothing
   beside it.
6. No magic strings where a type exists: enum members (`SenderEventSchema.enum.MONTHLY_BILLING`, in LOG tags too),
   `z.literal(Enum.enum.X)` to narrow, a zod transform to an enum plus a `switch` to discriminate, never `'x' in obj`.
7. No state the data model cannot produce: trace it through `prisma/schema.prisma` and the import first. A null guard
   on impossible data narrows silently; it gets no counter, field, log line or word.
8. A missing required setting (the accountant mailbox) is an error, not a warning.
9. Names in the domain's words: `notificationsForAccountant`, `notificationsOnSeason`, a sender event sends, a
   notification tells. No invented terms (owe, rerun, hand-over, unaddressed); email names the channel only.
10. Use the repo's helper over a hand-rolled check (`getRequiredUser`, not a session read and a 401 branch); follow the
    sibling's pattern before writing a new one.
11. A refactor keeps behaviour and recorded data as they are; the new code adapts to them.
12. A change to behaviour or to a signed spec is presented as before/after snippets and waits for the user's yes; a
    deviation from the brief stops the work and goes in the report.

## Trace before you claim

- Every statement about behaviour cites `file:line`; every caller of a changed function is listed
  (`grep -rn "scaffoldPrebookings(" server app`); a regression names its commit (`git log -S"<text>"`).
- The blast radius is a table: file, change, the specs whose assertions move.

## Presenting

- One decision per round, options as columns with one line of pro and con each, the drafted option marked "as drawn";
  the code shown is the diff the user will read (`/plan-and-supervise`).
