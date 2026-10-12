# Release 0.9.0 — work-roster push overview

**Status:** Draft | **Date:** 2026-10-05 | **Updated:** 2026-10-13 (done work compacted, deferrals moved out of this-pr) | **Branch:** `feature/work-roster`

The umbrella spec for this push (the finished push earns v0.9). Each package is briefed and approved in chat before
any agent starts; detail lives in the linked docs. All Prisma work lands as ONE migration package (model sign-off
first, `.claude/skills/prisma/SKILL.md`). Every package runs `/dry` on its diff and follows `/code-comments`;
ADR-compliance rows update in the same change; broken windows in touched files are fixed by the touching package.
Sizing is informal t-shirt sizes.

## Package inventory

| Package | What | Detail | Size | Status |
|---|---|---|---|---|
| Framework research spike | prisma 7/8-RC + zod 4 + `zod-prisma-types` compatibility; removable workarounds and adoptable features; Nuxt roadmap evidence that `useAsyncData`'s option surface (`enabled`, `createUseAsyncData`) and named layout slots survive coming releases | `../archived/feature-proposal-framework-adoption.md` § Dependency clusters | S | committed |
| CI test reporting | Job summary: vitest's built-in GitHub summary + per-suite Playwright sections with report links | below | S | committed |
| Framework pair upgrade | pinia 4 + @pinia/nuxt 1, @vueuse/core 15, ical-generator 11 | `../archived/feature-proposal-framework-adoption.md` § Dependency clusters | S | committed |
| Store fetcher factory + store alignment | `storeAsyncData` from `useApiHandler`, schema-driven types; every store converges on it (the misaligned fetch handling across stores, release-plan I2) | `../archived/feature-proposal-framework-adoption.md` | M–L | committed |
| Fetch gating | `enabled` carries the fetch condition; id-in-key gates need nothing extra, login gates clear on logout; folded in 2026-10-07: datasets key on the real selection (no copy refs, no component watches), `selectedSeasonId = userChoice ?? getDefaultSeasonId()`, `dependsOn` for SSR of dependent chains | `../archived/feature-proposal-framework-adoption.md` | M–L | committed (fine-tuning open: stale-selection 404) |
| Prisma bundle | ALL prisma/zod/migration work in one go: the prisma + zod majors the spike green-lights, `zod-prisma-types` regen, every new model of the push, one migration | below | L | committed (migration `0017_roster` on local, dev and prod 2026-10-08; later schema changes ride their packages) |
| Duty roster (F5a) | Templates, duties, audit trail | `../feature-proposal-duty-roster.md` | L | deferred to the next release 2026-10-13 (signed off: schema 2026-10-07, roster UX 2026-10-05); the joker slot shipped (`../archived/feature-joker-slot.md`) |
| Joker + vacancy overviews | `JokerSlot`, dinner "missing" face, CTC faces, shift counts, volunteering moves to duty level + data separation | `../feature-proposal-duty-roster.md` § Joker + § Roster UX | L | the joker slot ✅ committed (c62dd6b, 427a625, 3cdb77c); the faces, overviews and data separation deferred with the roster |
| Roster sign-off + cross-team swap (F5b) | Derived auto-sign + godkend-alligevel, duty swap | `../feature-proposal-duty-roster.md` Phases 4–5 | M | deferred with the roster |
| Waitlist | Queue, auto-assign sweep, extra portions, one booking path, UI | `../archived/feature-waitlist.md` | L | committed (backend 2026-10-09, one booking path and UI 2026-10-12) |
| Waitlist notifications | the serial e2e asserting each of the four shipped kinds writes its Delivery row | this doc § Waitlist notifications | S | planned |
| Kitchen allergy line | the dining-mode panels show the allergy kuverter; the expanded list opens with the allergen breakdown and chips beside each diner | this doc § Kitchen allergy line | S | committed (5eedd34, 49ece5e) |
| Chef allergen line | the chef's allergen section counts this dinner's diners in kuverter per menu allergen; the edit panel becomes the allergy panel | this doc § Chef allergen line | S | committed (49ece5e); selector population planned |
| Chef calendar header | the Agenda/Kalender tabs and the collapse chevron share one header row above a `UCollapsible`; `/chef` hydrates with one footer | this doc § Chef calendar header | S | committed (42b380f) |
| Ticket allergies | the booking form shows a booked inhabitant's live allergies on the ticket card (glyph) and in the expanded row (compact elements); guest ids and swapped tickets: `../chores-0.9.1.md` § Ticket allergies on the order | this doc § Ticket allergies | S | committed (7df4c17, bcf56c8, fd41213); guest and swapped tickets planned for 0.9.1 |
| One team number | a team's number comes from its name, else its season position; every team band derives from it (`/admin/teams`, `/chef`, `/dinner`) | this doc § Decisions 2026-10-11 (one team number) | S | committed (0b54a73, 8d98269) |
| Season pick prefers the one in progress | the season order is active, in progress, upcoming, ended; the e2e teardown keeps a non-past active season | this doc § Decisions 2026-10-11 (season pick) | S | committed (9a03544) |
| One breakpoint source | the design system is the one reader of the layout's `isMd`; components bind responsive tokens, behaviour reads `breakpoint`; the household calendar's open state moves to `?cal=` | this doc § Decisions 2026-10-11 (one breakpoint source) | S | committed (8d98269) |
| Calendar default waits for the viewport | `/dinner` and `/chef` land open on desktop and closed on a phone; the breakpoint reads null until the layout measures it | this doc § Small packages | S | committed (2a8d0e9) |
| Season status glyphs | the season's status as a `UBadge` from `SEASON_STATUS_GLYPHS`, in the season selector and the status display | this doc § Small packages | S | committed (fd41213, bb3271e) |
| Notifications | the remaining kinds: chef deadlines, roster, reminders, job failed, dinner cancelled, duty swapped | `../feature-proposal-notification-triggers.md` | M | next release (2026-10-13) |
| Adhoc billing + EXPENSE | Ad-hoc charges + chef spending as EXPENSE rows; Mit forbrug + admin economy spending views | `../feature-proposal-adhoc-admin-billing.md`, `../feature-proposal-season-spending.md` | L | the ledger, the expense table, the chef endpoints and the budget pane committed (49ece5e, 24e9a3f, fd41213, c65feae); the charges and the spending views next release (2026-10-13) |
| Season spending | the Sæsontrend view, the admin economy Forbrug, the basisvarer entry | `../feature-proposal-season-spending.md` | L | next release (mockups signed 2026-10-05 and 06) |
| PRF spike | Passkey/PRF research + device protocol | `../feature-proposal-relogin-faceid.md` (parked proposal), `../archived/feature-mobile-native-feel.md` | S | committed (S5 re-login parked out of 0.9) |
| Page composition | Master/detail + tab frames, `md` breakpoint | `../archived/feature-proposal-framework-adoption.md` | M | decided 2026-10-13: the frames stay; closed |
| Order snapshot | Frozen `ticketType` on Order + backfill — the portion resolver reads it | `../chores-0.9.1.md` § Order snapshot | S | planned for 0.9.1 |
| Booking one-path | One builder family for regular + guest orders across grid/preview/day; guest cells editable; power includes guests; honest toasts | `../archived/bug-fix-plan-v0.9.md` | M–L | committed |
| Billing delivery report + interrupted runs | Repository fills delivery state on every read; stale RUNNING runs | `../bug-fix-billing-delivery-report.md` | M | next release (three decisions open) |
| Motion tokens | Raw motion classes into the design system | `chores-0.9.1.md` § Raw utility classes | S | planned for 0.9.1 |
| Dinner-page follow-ups | PR #166 leftovers on `/dinner` | `../chores-0.9.1.md` § Stored dinner dates, § Dinner page remounts on claim, § Catch-up amounts, § Job schedule module; the shipped rows `../archived/bug-fix-dinner-page-and-dates.md` | S | planned for 0.9.1 |

## Build order

The push starts from the framework corner (decision 2026-10-05): the upgrade philosophy is remove workarounds,
follow the framework's own shapes, adopt new features where they earn it.

1. Framework research spike ✅ + CI test reporting ✅ + PRF spike ✅ (S5 parked, nothing of it in the bundle)
2. Framework pair upgrade ✅ (pinia 4 + @pinia/nuxt 1, ical-generator 11; @vueuse/core removed)
3. Store fetcher factory + store alignment ✅ → Fetch gating ✅
4. Prisma bundle ✅ (majors, every model of the push, migration `0017_roster` applied 2026-10-08)
5. Duty roster → next release (`../feature-proposal-duty-roster.md`); the joker slot landed ✅
6. Waitlist ✅ → Waitlist notifications (this release, § Waitlist notifications)
7. Adhoc + EXPENSE: the ledger, the expense table and the budget pane ✅; the charges and the spending views → next release
8. Page composition: decided 2026-10-13, the frames stay

Landed beside the order, 2026-10-08 to 12: the kitchen and chef allergy lines, the chef calendar header, the ticket
allergies, the chef budget pane, and the small packages of § Small packages.

One e2e runner at a time; packages that run Playwright are sequenced.

## CI test reporting

✅ committed: vitest 5 writes the unit summary itself; `make test-report` renders each Playwright suite (api, ui, smoke) from its JSON with counts, a ❌ heading on failures and the report artifact link; `continue-on-error` stays (decision 2026-10-05). The summary layout verifies on a CI run of this branch (§ Verifications).

## Prisma bundle

One package, one migration, produced by the Make targets after the user signs off every model. Contents:

| Model / change | Source |
|---|---|
| `DinnerDutyTemplate`, `DinnerDuty` (+ `jokerSlotId`), `DutyHistory`, `DutyState`, `DutyAuditAction` | `../feature-proposal-duty-roster.md` § Schema additions |
| `JokerSlot` | `../feature-proposal-duty-roster.md` § Joker |
| `TicketWaitlist` (an unplaced order in its create shape, as JSON) | `../archived/feature-waitlist.md` § Design |
| `LedgerEntryType` (`REGULAR`, `ADHOC`), `Transaction.type` + `description`, `Expense` (list per dinner, payee user), `DinnerEvent.totalCost` kept and deprecated | `../feature-proposal-adhoc-admin-billing.md` § Data model — ledger and expenses modelled symmetrically |

### Signed model set ✅ applied 2026-10-08

The models, the majors (prisma 7.10, zod 4.6, zod-prisma-types 3.3), the partial unique indexes and the `totalCost` data line are `prisma/schema.prisma` and migration `0017_roster`, applied on local, dev and prod 2026-10-08; the decisions are in § Decisions rounds 5 to 8. `../chores-0.9.1.md` drops the deprecated column.

## Chef spending

Expenses are EXPENSE rows in the transaction ledger, excluded from invoicing (decision 2026-10-05) —
`../feature-proposal-adhoc-admin-billing.md` § Expense type. Surfaces:

✅ implemented (24e9a3f, fd41213, c65feae, 52f395c, c151d74; signed 2026-10-11 and 12). The Madbestilling row and editor, the Budget pane with its boxes, the ticket table, this dinner's and the team's spending fragments and Se billetændringer: the mockups live in the headers of `ChefMenuCard.vue`, `DinnerBudget.vue`, `ExpenseLines.vue`, `CookingRoundSpending.vue` and `TicketChanges.vue`; the rules in § Decisions and `docs/ui.md`. The grocery line's note is prefilled by `useBilling.expenseNoteWords` and the route writes it when the body carries none.

The season view behind [Se sæsontrend], the admin economy Forbrug and the basisvarer entry are `../feature-proposal-season-spending.md` (signed mockups 2026-10-05 and 06; next release, 2026-10-13).

## Kitchen allergy line

✅ implemented (5eedd34, 49ece5e, 42b380f; UX signed 2026-10-08, stats bar ink option C 2026-10-10). The dining-mode
panel heads carry the allergy glyph and the kuverter of allergic diners; the expanded list opens with the overview line
and marks each diner's allergy types; the no-allergy sun has its own ink. Mockups: `KitchenPreparation.vue` and
`AllergyOverviewLine.vue` headers. Code: `useAllergy.ts` (`computeAllergenOverview`, `computeAffectedDiners`),
`AllergyTypeDisplay.vue` compact face, `COMPONENTS.kitchen`, `COMPONENTS.allergyOverview`. Specs: `useAllergy.unit.spec`,
`KitchenPreparation.nuxt.spec`, `AllergyTypeDisplay.nuxt.spec`.

## Chef allergen line

✅ implemented (49ece5e; UX signed 2026-10-09). The ALLERGENER row counts this dinner's diners per menu allergen through
the same overview; the edit panel is the allergy panel. Mockups: `ChefMenuCard.vue` and `AllergenMultiSelector.vue`
headers. Specs: `ChefMenuCard.nuxt.spec` (Allergen line). Open: the selector counts a population through a ticket
allergies map (brief halted 2026-10-10, re-presented after the 0.9.1 ticket allergies design).

## Chef calendar header

✅ implemented (42b380f; option B signed 2026-10-10). One header row, the Agenda/Kalender tabs beside a chevron over a
`UCollapsible`; `/chef` hydrates with one footer. Mockup: `ChefCalendarDisplay.vue` header. Tokens:
`COMPONENTS.chefCalendar`, `COMPONENTS.collapsible`. Specs: `ChefCalendarDisplay.nuxt.spec`, `Chef.e2e.spec`
(hydration guard).

## Ticket allergies

✅ implemented (7df4c17, bcf56c8, fd41213; UX signed 2026-10-11). A booked inhabitant's live allergies: the glyph in the
ticket card's special slot and the compact allergy line in the expanded row. The card row is three fixed slots, special
(state, guest, allergy), type and how you eat; the state colour paints the edge and the state glyph, the type colour the
badge and the info glyphs; the guest-of row aligns with the add-guest row. Mockups: `DinnerTicket.vue` and
`DinnerBookingForm.vue` headers. Specs: `DinnerTicket.nuxt.spec`, `DinnerBookingForm.nuxt.spec`,
`useCoreValidation.unit.spec`, `Dinner.e2e.spec` (Ticket allergies). Guest and swapped tickets:
`../chores-0.9.1.md` § Ticket allergies on the order.

## Small packages of 2026-10-11 and 12

All implemented and committed; the rules are in § Decisions.

| Package | Commit | Pointers |
|---|---|---|
| One team number | 0b54a73, 8d98269 | committed (0b54a73, 8d98269) |
| Calendar default waits for the viewport | 2a8d0e9 | committed (2a8d0e9) |
| Season pick prefers the one in progress | 9a03544 | committed (9a03544) |
| One breakpoint source | 8d98269 | committed (8d98269) |
| Season status glyphs | fd41213, bb3271e | committed (fd41213, bb3271e) |
| Spinner motion token | 2026-10-13, uncommitted | one value with the motion-reduce guard behind `saveIconSaving`, `jobIconRunning` and `ticketChanges.spinner`; the rest of the motion sweep is `../chores-0.9.1.md` § Raw utility classes |

## Waitlist notifications

The four kinds shipped with the waitlist backend: `WAITLIST_JOINED`, `WAITLIST_TICKET_ASSIGNED`, `WAITLIST_BUILDUP` and `WAITLIST_TICKET_SOLD` are templates in `app/config/notificationTemplates.ts` and events in `server/utils/sender/events/waitlist.ts`, emitted from the assignment and the scaffold. The package is the test row the waitlist proposal left open: a serial e2e that joins a queue, releases a ticket and portions, crosses the buildup threshold, and asserts each event writes its Delivery row. S, planned.

## Decisions

**2026-10-05** (questions round 1)
- One Prisma migration package for the whole push; CI reporting added as a package; t-shirt sizing; the push earns v0.9.
- Joker: per-dinner volunteering; any inhabitant; vacancy surfaces as a "missing" on the dinner; team-card and big
  overview (split on teams / on people) for the admin; per-member shift counts (chefkok / fast tjans / joker) in the
  team card; `/chef` is the member planning surface.
- Volunteering today writes season membership (`CookingTeamAssignment`) — the designed way to live without a roster.
  The roster replaces it; the shipped rows get a one-time data separation the user reviews and applies before ship.
- Waitlist: auto-assign; the queue is authoritative, idempotent, safe to replay; one inhabitant one ticket; chef
  releases extra portions, resolver fits queue entries by portion weight in strict FIFO; all four notifications plus
  the chef buildup threshold.
- Chef spending is the EXPENSE transaction type in the adhoc design, answering "how much can I spend": dinner
  expenses balance per chef across the season (overspending a single dinner is fine when the season balances);
  basisvarer expenses are dinner-less and track against the køkkenbidrag pool; payment happens automatically in the
  bank — the feature is tracking only, excluded from invoicing, no PBS flow.
- Framework corner first; research spike before any major upgrade. e2e ui keeps `continue-on-error`, failures red.
- CI reporting is per-tool (correction 2026-10-05): vitest 5's built-in GitHub summary reports the unit run (2026-10-07); `make test-report` is
  Playwright-only, one call per suite (api, ui, smoke) — no cross-format normalization.

**2026-10-05** (round 2, after the spike)
- Store fetcher factory approved, paired with the store alignment sweep: every store converges on the factory in
  the same package (the misaligned fetch handling across stores, release-plan I2).
- No experimental framework features unless avoiding one costs heavy workarounds — named layout slots stay out;
  `enabled` is stable and in.
- Framework pair upgrade approved, runs first. Prisma + zod ride the Prisma bundle pinned at 7.10 + 4.6 — RC
  versions are out of discussion (npm `latest` of prisma is an 8-RC).
- No dependency we don't actively import: `@vueuse/core` (zero imports) leaves package.json; the package that
  first imports it (the `isMd` work) adds it back.
- Adhoc + EXPENSE ship in this release, sequenced last among the feature packages (not highest priority).
- All prisma, zod and migration work happens in one go: the Prisma bundle carries the majors, the regen and every
  new model in a single package.
- Waitlist is strict FIFO: no overtaking — a smaller entry behind a too-big head waits.
- **Page composition (closed 2026-10-13: the frames stay, `../archived/feature-proposal-framework-adoption.md`):** decided from the spike's research results, presented with findings, recommendations
  and options per topic (two-pane frame, tab scaffolding, `isMd` source). Direction stated 2026-10-05: a layout
  already exists and the hope is the new Nuxt reduces complexity — the spike verifies whether named layout slots
  and `useBreakpoints`/`ssrWidth` carry that.
- **Store fetcher factory API (closed: shipped 33a3567):** drafted in `../archived/feature-proposal-framework-adoption.md`; signoff waits for the
  spike's Nuxt-roadmap evidence that the underlying option surface stays — building on a surface Nuxt is about to
  change is premature (user, 2026-10-05).

**2026-10-05** (round 3, `/chef` UX iteration — all signed, mockups in the linked docs)
- CTC drives the roster: dinner face leads with "who comes today" (vacancies, swaps, joker status), season face
  (admin teams) leads with the regular team + jokertjanser + shift counts + view-only game-plan drill-down; which
  face leads follows the dinner context. The Flytter badge is dropped from `/chef`.
- A template row IS one seat — capacity is modelled with rows, counts in the UI are derived; no `requiredCount`.
  Slot times/tasks are templates, edited in the team's template editor, not on the daily roster.
- Sign-off is derived: all seats filled → auto-signed (system actor); short → "MANGLER n" + chef's
  [Godkend alligevel] (chef actor). Members self-serve their own rows; duty-level admin bypass parked.
- Release-portions is demand-driven with a permanent home: entry in ChefMenuCard's [Flere]-menu + a CTA alert under
  the action row while the queue is non-empty; both open one form prefilled with the queue's portion need.
- Queue/for-sale status is the kitchen stats panel's alternating fourth box (TIL SALG n / VENTELISTE n — never both).
- The dinner economy is one collapsed Budget pane (3 boxes + ticket table + Forbrug entry + [Se sæsontrend] button
  unfolding the season view). Broken window fixed with the package: the budget's ticket table renders raw enum
  (`ADULT`/`CHILD`, `DinnerBudget.vue:171`) — Danish names via `useTicket`.

**2026-10-06** (round 4, UX)
- Waitlist member faces: queued is a badge on Ingen, never a mode — `ICONS.waitlist` (hourglass) through the
  `useBookingUi` badge path, "#n i køen"; assignment defaults the order to Spiser med, changeable afterwards.
- Admin economy Forbrug: month rows with dinner drill-down, scope switcher (alle chefkokke / én chefkok /
  Madbudget); basisvarer entry is admin-only, in that section. `SeasonBudgetOverview` takes `grouping: day | month`.
- Vacancy big overview: per team, chronological, origin on each hole (joker note / who released); no person
  linkage — no `coversInhabitantId`. Calendar gap markers as DS tokens, ink-coloured: chef hat = missing chef,
  joker hat = unfilled joker seat, dot = unfilled regular seat.
- PRF spike complete; S5 re-login parked out of 0.9 — the lightweight-vs-full comparison by platform, the
  hypotheses and the spike findings live in `../feature-proposal-relogin-faceid.md`; `WebAuthnCredential` leaves
  the bundle; the mobile-native-feel sprint doc is archived to pointers.

**2026-10-07** (round 5, Prisma bundle fine-tuning)
- The bundle is the ux session's with the user (model set + implementation); the majors install and the
  orchestrator's store packages never run concurrently — the bundle starts after the factory package lands and is
  committed.
- `TicketWaitlist` carries an unplaced order: the order-create shape as JSON (`order`), keyed by dinner, inhabitant
  and `isGuestTicket`; a guest entry sits on the booking member's `inhabitantId`. Assignment places the order through
  `createOrders` and deletes the entry; the chef's release is an action, nothing about supply is stored on the dinner;
  portion weights stay the config mapping (no `portionSize` column).
- Partial unique indexes via Prisma 7.4's `partialIndexes` preview: one regular waitlist entry per person per
  dinner, and one regular order per person per dinner (reverses the 2026-10-05 drop; zero duplicates verified, no
  backfill).
- The zod-4 surface includes the error utilities outside the composables (`validtation.ts`,
  `useDateRangeValidation.ts`, `eventHandlerHelper.ts`, the two sender sites).

**2026-10-08** (round 6, ledger)
- Ledger and expenses are modelled symmetrically: one `LedgerEntryType { REGULAR, ADHOC }` on `Transaction` and
  `Expense`; a REGULAR entry hangs off its source (order, dinner), an ADHOC entry stands alone with a description.
- Expenses are their own table, a list per dinner (REGULAR) plus basisvarer rows (ADHOC); the payee is a `User`
  (`paidByUserId`, SET NULL) with a `userSnapshot`, the reporting user is the payer; the reimbursement stream
  reads `User.expenses`.
- `DinnerEvent.totalCost` is kept and deprecated; the dinner's cost is the sum of its expense rows, GROCERIES_DONE
  derives from them, and `../chores-0.9.1.md` drops the column in the release after 0.9.
- An adhoc charge's household lives in `orderSnapshot`, as an order's does; no `householdId` column, no snapshot
  rewrite.
- `strictUndefinedChecks` stays a preview feature in 7 (the generated types carry `Skip` only with the flag); the
  zod generator emits enums only (`createInputTypes`/`createModelTypes` false), which brought the root typecheck back
  under the default heap.

**2026-10-08** (round 7, migration)
- B6 `Order.orderSnapshot` is parked for the release after 0.9 (`../chores-0.9.1.md` § Order snapshot); the 0.9 schema set is
  closed with the six new tables, the two `Transaction` columns and the two partial unique indexes.
- Migration `0017_roster`: the `Transaction` rebuild Prisma emitted is rewritten to `ALTER TABLE … ADD COLUMN` (the
  existing `orderId` and `invoiceId` indexes stay); the `totalCost` → `Expense` data line is appended; the flattened
  copy is regenerated and identical; `migrations.unit.spec.ts` passes.
- Local rehearsal on a dev copy: `make d1-copy-dev-to-local` → `make d1-check-order-duplicates-local` (`[]`) →
  `make d1-migrate-local` (parent-link counts unchanged) → one `Expense` per dinner with a cost, equal to it.
- dev and prod migrated 2026-10-08 with the old code serving: one `Expense` per dinner with a cost, equal to it;
  parent-link counts unchanged in both. The temporary `d1-check-order-duplicates-*` targets leave
  the Makefile.

**2026-10-08** (round 8, order uniqueness in the tests)
- A second regular order for an inhabitant on a dinner answers 409 Conflict: Prisma's unique violation is mapped in
  `eventHandlerHelper` beside the not-found mapping, and ADR-002's code table carries 409. No upsert; the UI sends the
  order id for updates (ADR-016).
- Tests rewritten to the rule: `order.e2e.spec.ts` cleans up after each test and asserts 409 for a duplicate and for
  two regular items in one batch, 201 for regular plus guest; `dinnerEvent.e2e.spec.ts` asserts one 201 and one 409
  for two parallel creates; `household.e2e.spec.ts` asserts 409 for a duplicate pbsId; `season.e2e.spec.ts` puts its
  holiday on the first cooking day (the holiday fell on a weekend on some weekdays, which failed main's pipeline the
  same day).
- Every schema change is followed by a review of the tests and the validation comments that encode the old rule,
  before the suites run.
- The framelding billing import books every ticket on the first inhabitant and now answers 409; its e2e test is skipped
  and the import in the export format is the third chore in `../chores-0.9.1.md`.
- Local Playwright runs use three workers (CI runs one): at the default of half the cores the local D1 proxy drops
  requests, seen as `fetch failed` 500s and a data-mapper error on the dev copy; both vanish at one worker and in CI.

**2026-10-08** (round 9, ui suite on the local dev copy)
- Dependency policy: `.npmrc` saves tilde ranges and every `package.json` range is `~<locked version>`; a minor or
  major moves only through an explicit install. Nuxt stays on 4.6.0 (an unasked move from 4.5.2 that a regenerated
  lockfile let through); local Playwright runs use three workers.
- Two causes behind the stable ui failures, both proven in the browser against the running app:
  `useQueryParam` instances on one page navigated from private snapshots of the query and the last writer dropped
  the others' keys (URL writes now queue on the Nuxt app, `_urlWrites`); and `CookingTeamCard` seeded its edit
  field from a computed at setup, which the server rendered before the team resolved while the client hydrated the
  real name, so hydration replaced the field under the user's typing (the draft now starts on focus). The same
  server-rendered-but-unhydrated window is why interacting e2e tests wait for hydration before typing, and URL
  assertions poll instead of reading once.
- One URL writer for the app (`useUrlQueryWriter`, ADR-006 § URL Writes): the writes of a tick batch per app instance,
  apply in priority order and land in one navigation; `useQueryParam`, `useEntityFormManager`, `useSeasonSelector` and
  `useTabNavigation` write through it, an explicit write outranks a parameter's auto-sync. The ui specs that interact
  navigate through `gotoHydrated` (docs/testing.md Rule 3a), since the server renders the controls 9 to 15 seconds
  before the handlers attach on the local dev server. Two e2e tests waited for a household response the server render
  now answers; they wait for the rendered page instead. Targeted proof 2026-10-09 (AdminTeams, household, SeasonSelector,
  HouseholdCard, HouseholdMembers, HouseholdAllergies, Dinner, Chef): every case outside AdminTeams passes; the three
  AdminTeams cases (rename, member finder, joker slot) sit on the roster package's in-flight AdminTeams and store work.
- Closed 2026-10-13 (the full ui run passed, the one red fixed the same night): the season dropdown cases under load, the holiday list editor's double-matched locator, and the full-suite
  run once the roster package has landed.
**2026-10-11** (ticket allergies)
- A ticket carries a stored allergy list or follows its holder's live profile: own tickets live, guest tickets the ids
  chosen at booking, swapped tickets the releasing owner's profile ids frozen at the claim (after the deadline; a
  second swap keeps the first list). Ids, never names. The stored list and the guest allergy report move to
  `../chores-0.9.1.md` § Ticket allergies on the order (in the `Order.orderSnapshot` column of its § Order snapshot); 0.9 shows the live profile on the
  ticket.
- The ticket signals allergies with `ICONS.allergy` on the card and the compact `AllergyTypeDisplay` line in the
  expanded row; the names badge on the card and the name-cell badge go.
- The card's row 1 is three fixed slots: special (state | guest | allergy cells), type, how you eat. The state colour
  paints the edge and the state glyph; the type colour paints the badge and the guest and allergy glyphs. One 20px
  glyph size.
**2026-10-11** (one team number)
- A cooking team's number has one source: the number in its name, else its position in the season's full team list plus
  one (`getTeamNumber`). Every site that shows a team passes the season's list, so a renamed team without a number
  wears the same rainbow stop on `/admin/teams`, `/chef` and `/dinner`.
**2026-10-11** (season pick)
- Seasons order active > current > future > past (`sortSeasonsByActivePriority`); the pick is the first non-past season of that order, so the e2e teardown keeps a non-past active season and activates only when the pick differs.
**2026-10-11** (one breakpoint source)
- `useTheSlopeDesignSystem` is the one place that injects the layout's `isMd`: a value that follows the breakpoint is a responsive token (`SIZES`, `RESPONSIVE_ICONS`, `TABLE_COLUMNS`, `COMPONENTS.masterDetail.detailAsPane`), behaviour reads `breakpoint` (`isMd`, `measured`), and the household calendar's open state is `?cal=`, defaulting to the measured viewport; `designSystemUsage.unit.spec.ts` fails a `.vue` outside the layout that injects `isMd`.

**2026-10-12** (season status marks)
- The season status is one icon beside the name, `SEASON_STATUS_GLYPHS` keyed by the four statuses: a green dot active, the team band's yellow dot in progress, the sprout in the calendar's holiday green upcoming, a grey dot ended; the season selector and the season status display render it as a `UBadge` whose settings come from the set, no component. The emoji set `STATUS_GLYPHS` is gone; dinner rows and the budget carry no season status.

**2026-10-12** (one booking path)
- The waitlist is not a second write: a member always sends a desired order through the scaffold; the generator decides create or claim by the deadline, the executor claims a released ticket or queues, and a queue entry rides the same matrix (leave, requeue, idempotent). Reads are open to every member; one read returns a dinner's entries in queue order and the client derives positions, sizes and portion need with `useWaitlist`. The join, leave, claim and single-order update endpoints go (`../archived/feature-waitlist.md` § One booking path).

**2026-10-12** (waitlist UI)
- The queued row shows the wish as a ghost of a booking (`COMPONENTS.waitlist`, no fill, muted ink) through `DinnerModeSelector` on the ticket card, the booking form and the grid cell; the ticket's edge keeps the normal face and the hourglass takes the state cell. The save carries the chosen mode and its label previews the outcome (Book, Køb billet, Skriv på venteliste); guests queue through the guest form's save. The notice for a member left without a seat goes to 0.9.1.

**2026-10-13** (server payload)
- The billing periods and the current period load on request: the bookings store gates both datasets on a getter the admin page hands it at setup (`loadBillingOverview(() => activeTab === 'economy')`, ADR-007 rule 9), so the member pages carry neither. The order snapshot on a transaction stays: a transaction outlives its order. The users store, the dinner Detail's tickets and `HouseholdDisplay` are chores (`chores-0.9.1.md` § Server payload of the shared stores).

## Coverage

| Package | Tests |
|---|---|
| Framework spike | report only; upgrade clusters verify with `npm run pre:all`, `make unit-test`, `npm run test:e2e:api` per cluster |
| CI test reporting | committed |
| Factory + gating | per `../archived/feature-proposal-framework-adoption.md` § Coverage |
| Prisma bundle | committed (migration `0017_roster` on local, dev and prod 2026-10-08; later schema changes ride their packages) |
| Duty roster | deferred (`../feature-proposal-duty-roster.md`); the joker slot: `jokerSlot.e2e.spec.ts`, `JokerSlotForm.nuxt.spec.ts`, `CookingTeamCard.nuxt.spec.ts` |
| Waitlist | Queue, auto-assign sweep, extra portions, one booking path, UI | `../archived/feature-waitlist.md` | L | committed (backend 2026-10-09, one booking path and UI 2026-10-12) |
| Waitlist notifications | the serial e2e asserting each of the four shipped kinds writes its Delivery row | this doc § Waitlist notifications | S | planned |
| Notifications | the remaining kinds: chef deadlines, roster, reminders, job failed, dinner cancelled, duty swapped | `../feature-proposal-notification-triggers.md` | M | next release (2026-10-13) |
| Chef spending | `chef/expenses.e2e.spec.ts`, `ChefExpenses.e2e.spec.ts`, `chef/orderHistory.e2e.spec.ts`, the chef component specs; the charges and the spending views deferred |

## Verifications with human eyes

| Check | Where | When |
|---|---|---|
| Visual check per UI package | route → viewport → DS element → expectation, posted per package, carried into the PR description | per package |
| PWA install + icon | phone home screen (carried over from `chore/npm-dependencies`) | ✅ signed off by the user 2026-10-13 |
| CI summary | Actions run page: categories, counts, red ui failures, report links | first CI run |
| Data separation list | membership vs one-off volunteer rows, reviewed and applied by the user | with the roster, next release |
| Admin economy spending | totals sanity against a real season | with `../feature-proposal-season-spending.md` |
| Page composition | Master/detail + tab frames, `md` breakpoint | `../archived/feature-proposal-framework-adoption.md` | M | decided 2026-10-13: the frames stay; closed |

## ADR notes

- ADR-007 amendment (factory + gating) per `../archived/feature-proposal-framework-adoption.md`.
- Duty roster ADR table in `../feature-proposal-duty-roster.md` § ADR compliance; the waitlist sweep follows ADR-015
  (idempotent reconciliation) and ADR-016 (pure resolver → executor).
- ADR-011 supplement (transaction variants) per `../feature-proposal-adhoc-admin-billing.md`.
