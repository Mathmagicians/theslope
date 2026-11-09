# Release 0.9.0

**Status:** ✅ shipped, archived 2026-10-19 | **Date:** 2026-10-05 | **Branch:** `feature/work-roster` (PR #168)

The packages of release 0.9, where each one lives and the decisions behind them. Next: `../chores-0.9.1.md`,
`../release-0.9.3/feature-0.9.3.md`. The release poster: `../../releases/release-0.9.0.md`.

## Package inventory

| Package | What | Where | Status |
|---|---|---|---|
| Framework research spike | prisma, zod and `zod-prisma-types` compatibility; the Nuxt option surface behind the store factory | `feature-proposal-framework-adoption.md` | committed |
| CI test reporting | vitest writes the unit summary; `make test-report` and `make bdd-report` render one Playwright suite per call with counts and its failures; the reports are the run's artifacts | `Makefile`, `scripts/test-report.jq`, `scripts/bdd-report.jq` | committed (86e7c98, dd53d16, 34f4817) |
| Framework pair upgrade | pinia 4 with @pinia/nuxt 1, ical-generator 11 | `feature-proposal-framework-adoption.md` § Dependency clusters | committed |
| Store fetcher factory and store alignment | `storeAsyncData` and `apiRequest` from `useApiHandler`; the stores read and write through them | ADR-007 | committed (33a3567) |
| Fetch gating | `enabled` carries the fetch condition, `dependsOn` the chain; a dataset reads the selection a page hands the store | ADR-007 rules 8 and 9 | committed (c8788a5) |
| Re-authentication on 401 | a 401 re-authenticates and returns in place through `?redirect`; a 404 on a selected id recovers through `notFound` | ADR-007, `useApiHandler.ts`, `apiErrors.client.ts` | committed (d6fe721, 52f395c) |
| URL writer | `useUrlQueryWriter` batches the URL writes of a tick into one navigation; an edit draft starts on an edit action | ADR-006 § URL Writes, ADR-007 rule 10 | committed (42b380f) |
| Dependency policy | `.npmrc` saves tilde ranges; a minor or major moves through an explicit install | `.npmrc`, `package.json` | committed |
| Prisma bundle | prisma 7.10, zod 4.6, zod-prisma-types 3.3 and the models of the push in migration `0017_roster` | § Prisma bundle | committed (db78d61, 5dc8818, 541fc01) |
| Booking one-path | one builder family for regular and guest orders across grid, preview and day | `bug-fix-plan-v0.9.md` | committed (1929a8d, e0d00d7) |
| Joker slot | `JokerSlot` on a team with the slot form in the team card | `feature-joker-slot.md` | committed (c62dd6b, 427a625, 3cdb77c) |
| Calendar legend | one `CalendarLegend` for the chef, dinner and team calendars | `CalendarLegend.vue`, `ALERTS.legend` | committed (541fc01) |
| Team wanted poster | a dinner without a chef shows the wanted poster on the chef card | `ChefMenuCard.vue`, `COMPONENTS.wantedPoster` | committed (ba5604c) |
| Waitlist | queue, assignment on release, extra portions, one booking path, UI, the calendar chips | `feature-waitlist.md`, ADR-016 | committed (5eedd34, 5f50af2, c151d74, f4892ad, 0a37cc4, 9cad84a, 627f2f6) |
| Chef spending | expense rows per dinner, the chef endpoints, the Budget pane with the ticket changes | § Chef spending | committed (49ece5e, 24e9a3f, fd41213, c65feae, c90fa33, 6be90c7, 6d633d1); signed off 2026-10-19 |
| Kitchen allergy line | the dining-mode panels show the allergy kuverter; the expanded list opens with the allergen breakdown | `KitchenPreparation.vue`, `AllergyOverviewLine.vue` headers | committed (5eedd34, 49ece5e, 42b380f) |
| Chef allergen line | the chef's allergen row counts the dinner's diners in kuverter per menu allergen | `ChefMenuCard.vue`, `AllergenMultiSelector.vue` headers | committed (49ece5e) |
| Chef calendar header | the Agenda/Kalender tabs and the collapse chevron share one header row | `ChefCalendarDisplay.vue` header | committed (42b380f) |
| Ticket allergies | a booked inhabitant's live allergies on the ticket card and in the booking form | `DinnerTicket.vue`, `DinnerBookingForm.vue` headers | committed (7df4c17, bcf56c8, fd41213) |
| One team number | a team's number comes from its name, else its season position; the team bands derive from it | § Decisions 2026-10-11 | committed (0b54a73, 8d98269) |
| Season pick | the season order is active, in progress, upcoming, ended | § Decisions 2026-10-11 | committed (9a03544) |
| One breakpoint source | the design system is the one reader of the layout's `isMd` | § Decisions 2026-10-11 | committed (8d98269) |
| Calendar default waits for the viewport | `/dinner` and `/chef` land open on desktop and closed on a phone | `createBreakpoint` (`measured`) | committed (2a8d0e9) |
| Season status glyphs | the season's status as a `UBadge` from `SEASON_STATUS_GLYPHS` | § Decisions 2026-10-12 | committed (fd41213, bb3271e) |
| Spinner motion token | one spin value with the motion-reduce guard behind the save, job and ticket-change spinners | `MOTION_SPIN` | committed (c151d74) |
| Admin economy loads on request | the billing periods and the current period fetch while the economy tab is on the page | `loadBillingOverview`, ADR-007 rule 9 | committed (83597f8) |
| Team delete returns the deleted id | `DELETE /api/admin/team/[id]` answers the id of the deleted team | ADR-009 rule 7 | committed (afadb83) |
| Joker slot delete returns the deleted id | `DELETE /api/admin/team/[id]/joker-slot/[slotId]` answers the id of the deleted slot; a slot of another team answers 404 | ADR-009 rule 7 | committed (679fc8f) |
| Validation owns the types | `TicketType` and the booking action (`BookingActionSchema`, `BookingOutcome`) come from `useBookingValidation` | ADR-001 | committed (1cc6b5e, fdff39e, e3086e9) |
| Ticket portions | a ticket price row carries `portions` from the config's default prices | ADR-010 rule 7, `useTicket().withPortions` | committed (fdff39e) |
| Security patches | wrangler, `@nuxt/devtools` and prisma 7.10.1 patched; `nitro-cloudflare-dev` removed | `package.json` | committed (326ca63, b36d01d, 8c83700, 04d4fbd, 3629473, 861771d) |
| Heal endpoint removed | `heal-user-bookings`, its spec and make targets are removed; `sellTicketsToWaitlist` settles the waiting list | ADR-016 | committed (6ed207b) |
| Test sweep | dead and duplicate cases removed; cleanup fails early; factories, `gotoHydrated` and web-first waits replace raw sleeps; the `setup-season` project creates the active season once per run | `docs/testing.md` | committed (5b1616b, b7d238d, 2d17d64, 45c1f83, 084ea42, 614cec0) |
| DRY sweep | dead code and duplicate token paths removed; the specs share their mount, endpoint and session helpers | `testHelpers.ts`, `hoistedMocks.ts` | committed (72cf9d9, 6b65a70, b456b2f, 999bdbd, c0beb62, 43876aa) |
| PRF spike | passkey and PRF research with the device protocol | `../feature-proposal-relogin-faceid.md`, `feature-mobile-native-feel.md` | committed |
| One booking path, end to end | outcomes in, notification out; the scaffold survives a partial failure and reports per person; the waiting list catches up; one client write; preview and toast from one word table; the ticket history follows kuverter; the mails honour the user's channels | § One booking path, end to end | committed (2ad1429 to bf7bc75, c90fa33, 0122723, 69a5d75, 5bfc7c0, 6d633d1, 34f4817); signed off 2026-10-19; point 6b, the signed mails and their delivery, in `../chores-0.9.1.md` § Booking mail delivery |
| Docs and tooling | the user, chef and admin guides; `docs/ui.md` and the compliance tables compacted; `docs/testing.md` Rule 0; the ui and architecture skills, the frontend agent | `docs/`, `.claude/` | committed (b82852e, 38804ef, 0dfd8eb, 450bcc8) |
| Close keeps the eating mode | the nightly close writes each order's own eating mode; the orders closed since cc05ea9 keep their Spisesal | `closeOrders.ts`, `fetchPendingOrdersOnConsumedDinners` | committed (16b4035) |
| One released predicate (the kitchen box) | a released ticket nobody bought stays released after the close; the kitchen panels add up and TIL SALG keeps its title | `useOrder.ts`, `KitchenPreparation.vue` | committed (56f8e12) |
| Shared words, supply predicates and the system's identity | one set of ticket-type words and counts; "Lukket for framelding"; a stale order id is skipped; the system account from `HEY_NABO_USERNAME`; "frameldt, ADMIN korrektion" in the ticket history | `useBookingUi.ts`, `useTicket.ts`, `systemUser.ts` | committed (56f8e12) |
| A waiting-list placement happens once | the queue keeps its own placement state (`placingAt`, `placingOrderId`); recovery finishes or releases a grab older than the lease; a held entry refuses leave and change with a conflict | ADR-016, ADR-015, migration `0018_protocol` | committed (009c54c, c5a74c8, cf767b1, 06054df); signed off 2026-10-19 |
| Table loading | a table bound to a dataset that reloads binds that dataset's `loading`; `#loading` fills a table with no rows yet | ADR-018 § Table loading | committed (4e7d174, cf767b1, 558d7a4); signed off 2026-10-18 |
| One audit format for the order history | one `auditData` schema, written through `createOrderAuditData` and read through `readOrderAudit` | ADR-011 rules 5 and 6 | committed (d894021) |
| One intent path: batching and audit order | the nine review findings: the insert order as the repository's contract, bulk reads for the mails, 90-id chunks, leaves and requeues batched, one `orderSnapshotOf`, no `Promise.all` against D1, the deletes data first | ADR-014 rule 5, ADR-011 rule 6 | committed (d149e91, d894021) |
| One intent path | one generator for the preference path and the grid; the preferences and scaffold endpoints answer `?preview=true`, and every preview comes from that dry run; expected bookings | § One intent path | committed (d894021, e510f83, 805062b, d149e91, 6d633d1); signed off 2026-10-19 |
| Rules | a row's allowed modes from the decision matrix: `getBookingOptions(row, context)`, `powerOptions(rows)`; `DinnerModeSelector` cycles the enabled modes; a cancelled dinner takes no booking | ADR-016 Rules stage, compliance 13 | committed (c85962c, e3086e9, 8ed7e42, 81ad76e, 34f4817); signed off 2026-10-19 |
| Ghost until touched | a planned booking stays a ghost until touched; the first touch adopts the plan as the draft | `COMPONENTS.dinnerModeSelector.plannedButton` | committed (a40db9d); signed off 2026-10-19 |
| Release notes PDF | `make release-notes` prints every `docs/releases/*.md` as a one-page A4 PDF; the release carries it | § Release notes PDF | committed (a40db9d, ea4d10a) |
| Batched sender queue | `emit(queue, message \| message[])` validates each message and sends in chunks of a hundred through `queue.sendBatch`; a booking run's mails go in one batch | `server/utils/sender/emit.ts`, ADR-014 | committed (835a3e8) |

## Prisma bundle

One migration, `0017_roster`, applied on local, dev and prod 2026-10-08; `0018_protocol` (the placement columns) on
2026-10-18. The models and the partial unique indexes are `prisma/schema.prisma`.

| Model / change | Design |
|---|---|
| `DinnerDutyTemplate`, `DinnerDuty`, `DutyHistory`, `DutyState`, `DutyAuditAction` | `../release-0.9.3/feature-proposal-duty-roster.md` § Schema additions |
| `JokerSlot` | `feature-joker-slot.md` |
| `TicketWaitlist` | `feature-waitlist.md` |
| `LedgerEntryType`, `Transaction.type` and `description`, `Expense`, `DinnerEvent.totalCost` deprecated | `../release-0.9.3/feature-proposal-adhoc-admin-billing.md` § Data model |

## Chef spending

Expenses are rows of the `Expense` table, outside invoicing. Mockups: the headers of `ChefMenuCard.vue`,
`DinnerBudget.vue`, `ExpenseLines.vue`, `CookingRoundSpending.vue` and `TicketChanges.vue`. Words:
`app/config/bookingWords.ts`, `formatDinnerName`, `cookingRoundWords`. Specs: `chef/expenses.e2e.spec.ts`,
`ChefExpenses.e2e.spec.ts`, `chef/orderHistory.e2e.spec.ts`, the chef component specs.

## One booking path, end to end

The booking steps return outcomes and the caller notifies after the action (ADR-016 rule 9); mail is on when
`DEPLOY_URL` and the `SENDER` queue are set, and a login whose channels leave e-mail out gets no booking mail
(`wantsChannel`). A failed write batch is retried order by order and the reply counts per person (rule 10). The waiting
list is one line per ticket type, sold by `sellTicketsToWaitlist` at the end of every run (rule 11). Every booking write
goes through `bookingsStore.writeBookings`. The preview and the toast read one word table (`app/config/bookingWords.ts`;
`ActionPreview.vue` header). The ticket history replays every audit row (`TicketChanges.vue` header). Specs:
`waitlistAssignment.e2e.spec.ts`, `batchUtils.unit.spec.ts`, `useWaitlist.unit.spec.ts`, `DinnerBookingForm.nuxt.spec.ts`,
`sender/events/waitlist.unit.spec.ts`.

The mails go out with the templates of `app/config/notificationTemplates.ts`; point 6b, the signed mails and their
delivery, is `../chores-0.9.1.md` § Booking mail delivery.

## One intent path

One generator for the preference path and the grid: past the deadline a preference change buys a ticket for sale or
joins its line; the nightly job runs the same rules; a person's own earlier acts (`fetchUserIntentKeys`) are the one
guard (ADR-016 § One path, rule 5). The preferences and scaffold endpoints answer `?preview=true` with the save's own
run, writing and sending nothing (`useScaffoldPreview`); an empty draft answers the household's expected bookings,
ghosted with "Forventet bestilling ifølge præferencer" (`BookingGridView.vue`, `ActionPreview.vue` headers). An Ingen
is a cancellation on record (`recordCancellation`). A run's claims settle once per dinner after the household loop and
join as one batch (`createWaitlistEntries`); writes carry no retries beyond ADR-016 rule 10 (decided 2026-10-18), and
the write-failure dashboard is `../release-0.9.3/feature-0.9.3.md`. Specs: `household/preferences.e2e.spec.ts`,
`scaffoldPrebookings.unit`, `useWaitlist.unit`, `ActionPreview.nuxt.spec`, `BookingGridView.nuxt.spec`.

## Release notes PDF

`make release-notes` renders every `docs/releases/*.md` through GitHub's markdown API (`gh api /markdown`), wraps it
in `docs/releases/poster.head.html` (`github-markdown-css` 5.9.0, `<base href>` on the releases folder, an A4 print
zoom) and prints `<notes>.pdf` with `npx playwright pdf --paper-format A4`; the PDFs are gitignored. Every CICD build
uploads them as the artifact `release-notes`; `create-release` downloads it, creates the release with a one-line body
and attaches the PDFs (`gh release upload --clobber`), installing nothing. The poster's images, the QR code to the
login page included, live in `docs/releases/release-<v>/`.

## ADR review

`/code-review 168` against `docs/adr.md`, 2026-10-17 at 5165b4f: eleven findings (ADR-007, 009, 010, 013, 014, 015,
016, 017), each signed by the architect 2026-10-17, fixed in 56f8e12 and 5883d6b; `formatPlace` in a server-imported
composable is settled by ADR-017 rule 6.

## Decisions

**2026-10-05**
- One Prisma migration package for the push; the push earns v0.9; sizing is t-shirt.
- A research spike precedes a major upgrade; an upgrade removes workarounds and follows the framework's own shapes.
- Prisma and zod ride the Prisma bundle pinned at 7.10 and 4.6. Stable framework features only: `enabled` is in.
- A dependency sits in `package.json` while a file imports it; `@vueuse/core` left.
- CI reporting is per tool: vitest reports the unit run, `make test-report` one Playwright suite per call.
- Waitlist: the queue assigns by itself in strict FIFO; the chef releases extra portions; four notification kinds and
  the chef buildup threshold.
- Chef spending is tracking: expenses stay outside invoicing, and a chef's dinner expenses balance across the season.
- The dinner economy is one collapsed Budget pane: three boxes, the ticket table and the Forbrug entry.

**2026-10-06**
- The PRF spike is complete; its findings live in `../feature-proposal-relogin-faceid.md`.

**2026-10-07** (Prisma bundle)
- `TicketWaitlist` carries an unplaced order in its create shape as JSON, keyed by dinner, inhabitant and
  `isGuestTicket`; a guest entry sits on the booking member's `inhabitantId`.
- Partial unique indexes: one regular waitlist entry and one regular order per person per dinner.

**2026-10-08** (ledger, migration, order uniqueness, ui suite)
- Ledger and expenses share `LedgerEntryType { REGULAR, ADHOC }`; `Expense` is its own table with a `User` payee
  (`paidByUserId`, SET NULL) and a `userSnapshot`; an adhoc charge's household lives in `orderSnapshot`.
- `DinnerEvent.totalCost` is deprecated; the dinner's cost is the sum of its expense rows (ADR-010 rule 6).
- `strictUndefinedChecks` stays a preview feature; the zod generator emits enums only.
- Migration `0017_roster` adds columns with `ALTER TABLE … ADD COLUMN` and carries the `totalCost` → `Expense` data line.
- A unique violation answers 409 (ADR-002); the UI sends the order id for updates (ADR-016).
- A schema change is followed by a review of the tests and validation comments that encode the old rule.
- Dependency policy: tilde ranges; Nuxt stays on 4.6.0. Local Playwright runs use three workers, CI one.
- One URL writer for the app (ADR-006 § URL Writes); ui specs navigate through `gotoHydrated` and URL assertions poll.

**2026-10-11**
- Ticket allergies: `ICONS.allergy` on the card and the compact `AllergyTypeDisplay` line in the expanded row; the
  card's row 1 is three fixed slots: special, type, how you eat.
- One team number: the number in the team's name, else its season position plus one (`getTeamNumber`).
- Season pick: active, in progress, upcoming, ended (`sortSeasonsByActivePriority`); the pick is the first season
  that has yet to end.
- One breakpoint source: `useTheSlopeDesignSystem` injects the layout's `isMd`; the household calendar's open state
  is `?cal=`.

**2026-10-12**
- Season status: `SEASON_STATUS_GLYPHS`, rendered as a `UBadge`.
- One booking path: a member sends a desired order through the scaffold; the generator decides create or claim by the
  deadline, and the executor claims a released ticket or queues (ADR-016).
- Waitlist UI: the queued row shows the wish ghosted under the hourglass; the save label previews the outcome.
- Tests: one level per behaviour, the lowest that proves it (`docs/testing.md` Rule 0).

**2026-10-13**
- The billing periods load on request (`loadBillingOverview`); the order snapshot on a transaction stays.
- A single delete returns the deleted id and a bulk delete the count (ADR-009 rule 7).

**2026-10-14** (one booking path, end to end)
- Notification happens after the action, from the outcomes the booking steps return (ADR-016 rule 9).
- Mail is configured or off: `DEPLOY_URL` is the one source of the site; unset, e-mail is off and logs.
- The scaffold survives a partial failure and reports per person; the toast is red as soon as one item failed.
- A ticket sale is its own event (`TICKET_SOLD`); a waiting entry hears when it gets a ticket
  (`WAITLIST_TICKET_ASSIGNED`) or an extra portion (`WAITLIST_EXTRA_PORTION`).
- The ticket history replays system updates; a change between eating modes stays out of it; the nightly close is one
  line for the dinner.

**2026-10-16** (one booking path, end to end)
- The waiting list is one first-come-first-served line per ticket type (`sellTicketsToWaitlist`); a sold ticket keeps
  its price row.
- The kitchen box is one box under TIL SALG: the tickets for sale and the waiting list together.
- One vocabulary: a household frigiver a ticket, it is til salg, someone køber it, the people waiting stand på
  ventelisten; a place reads "Voksen #3".
- The guest form opens on Voksen and its button names the guests ("Tilmeld gæst", "Tilmeld gæster").

**2026-10-17** (one booking path, end to end)
- The kitchen box's waiting list: one row per household in join order, each person with the place in the line.
- The waiting list's glyph is the Hugeicons hourglass; each part of the TIL SALG box carries its glyph beside its
  kuverter.
- The close keeps each order's eating mode.
- A waiting-list placement: recovery matches the order an unrecorded placement wrote; the lease is 10 minutes, and a
  line stops at a grabbed entry.

**2026-10-18**
- Texts live in config modules under `app/config/` (ADR-017 rules 6 and 7).
- One intent path: a preference change past the deadline buys or joins like a grid booking, through one generator;
  the nightly job runs the same rules; c151d74's "System mode never reaches the claim bucket" was unsigned and goes.
- The preferences endpoint stays the inhabitant's resource; the scaffold endpoint writes orders only. Both answer
  `?preview=true`, combined with `?adminBypass=true`; every preview comes from the server's dry run.
- An Ingen from the booking page is a cancellation on record (`recordCancellation`); cc05ea9's bare-NONE skip was
  unsigned and goes.
- A cell without an order shows the expected booking, ghosted; an expected ticket looks like a waiting-list ticket
  (#7).
- One `ActionPreview` renders every preview, grouped per day; one grouping builder, `linesBy` (ADR-014).
- #25: the toast is the preview compacted, one line per day; "Sidste ændring" shows the same lines.
- A preference save runs on the weekdays its draft changes (`ScaffoldOptions.weekdays`).
- A season-wide run settles its claims per dinner and ticket type and joins as one batch; the e2e singleton season
  opens at activation, and the closed-dinner cases keep their own seasons.
- ADR-011 rule 6: the data write first, the audit row after. ADR-014 rule 5: a read over a list is one chunked query.
- Batching and audit order, items 1 to 11: the insert order is the repository's contract; the repository owns
  chunking and sequence; `writeBatchOrEach` for creates, updates, deletes, cancellations and requeues, one attempt
  (`writeBatchOnce`) for the joins and the leavers.
- Writes carry no retries beyond that; the write-failure dashboard goes to 0.9.2.
- The C4 diagrams in the README are experimental and outside the release.
- The architecture skill is signed; the five non-test agents drop `disallowedTools`.
- Chef spending: a dinner without a menu title reads "Fællesspisning"; the round heading reads "Hele <team>, periode
  <first date>-<last date>"; the spending tables read dd/MM (#16).

**2026-10-19**
- #3: a confirmed key keeps the dinner hands-off — "automated runs should not override explicit user intent".
- "The run's season is its dinners' season" is rejected and reverted; a run keeps the given season, else the active one.
- #26, #27: an interval reads as `formatDateRange` renders it; Madbestilling's lines read dd/MM.
- #32: a power change reaches every place the household holds on the dinner.
- #33: a defect — the booking grid and the day view behave the same.
- Rules, the remedy for #11 and #34: the views derive a row's modes from the decision matrix; a guest's bare Ingen
  with no ticket lands nothing; a claim or a reclaim under a locked mode lands as Spisesal.
- The legend reads "sharply vertical, icon then explanation": one entry per row in every Forklaring.
- Ghost until touched (the user's "a!"): solid means a booking or an intent; #48: a queued wish stays a ghost under
  the hourglass — "keep it, should be visible you dont have it".
- #41, #49: the cancelled dinner is a fix with no ADR line — "adr is archietcture decision, this is coherent
  implementation !"; one 2 px strike in the past-day ink (`CANCELLED_STRIKE`); no edit mode on a cancelled dinner.
- Consumed and cancelled dinners: a cancelled dinner is closed to every run, a consumed one to every run but an
  admin's correction (`adminCorrection`).
- #43, #51: the release PDF is the standalone artefact, built in the CICD job and attached to the release; the
  release job installs nothing.
- #59: the ui steps stay skipped behind a red api step — "fail early, ui suites should not run on top of broken api".
- #64: the booking mails honour the user's channel setting — "64 yes, needs to start asap".
- #61, #62, #63: moved to 0.9.1 — point 6b, the signed mails and their delivery, the Waitlist notifications e2e, the scaffold case of an order
  bought by another household.
- #1: the slow client after a grid save is a 0.9.1 chore.
- Minimal test seasons — "test seasons should be minimal regarding what the test wants to prove" (`docs/testing.md`);
  the remaining fixtures in `../chores-0.9.1.md` § Minimal test seasons.
- Batched sender queue — "queue should follow our pattern of 1 or list … + our chunker, this release".

## Coverage

| Package | Tests |
|---|---|
| Framework upgrades | `npm run pre:all`, `make unit-test`, `npm run test:e2e:api` |
| Factory, gating, 401 | the store specs' gated rows; `Login.e2e.spec.ts` |
| Prisma bundle | `migrations.unit.spec.ts`; `household.e2e.spec.ts` (409 for a duplicate pbsId) |
| Joker slot | `jokerSlot.e2e.spec.ts`, `JokerSlotForm.nuxt.spec.ts`, `CookingTeamCard.nuxt.spec.ts` |
| Waitlist, one booking path | `waitlistAssignment.e2e.spec.ts`, `Waitlist.e2e.spec.ts`, `household/scaffold.e2e.spec.ts` |
| Chef spending | `chef/expenses.e2e.spec.ts`, `ChefExpenses.e2e.spec.ts`, `chef/orderHistory.e2e.spec.ts` |
| Admin economy, deletes | `bookings.nuxt.spec.ts`, `team.e2e.spec.ts`, `jokerSlot.e2e.spec.ts`, `plan.nuxt.spec.ts` |
| One intent path | `household/preferences.e2e.spec.ts`, `serial/admin/scaffold-prebookings.e2e.spec.ts`, `scaffoldPrebookings.unit.spec.ts` |
| Rules, ghost until touched | `useBooking.nuxt.spec.ts` (the rules matrix), `DinnerModeSelector.nuxt.spec.ts`, `BookingGridView.nuxt.spec.ts`, `DinnerBookingForm.nuxt.spec.ts`, `DinnerBookingForm.e2e.spec.ts` |
| Batched sender queue, mail opt-out | `sender/emit.unit.spec.ts`, `sender/events/*.unit.spec.ts`, `sender-event-*.e2e.spec.ts` |

Every browser check of the release passed by 2026-10-19 (PWA install 2026-10-13).

## ADR notes

| ADR | Change in this release |
|---|---|
| ADR-002 | 409 for a unique violation |
| ADR-006 | § URL Parameters and § URL Writes |
| ADR-007 | `storeAsyncData` and `apiRequest`, rules 7 to 10 |
| ADR-009 | rule 7, what a delete returns |
| ADR-010 | rule 6, a deprecated column's value; rule 7, `portions` filled on read |
| ADR-011 | rule 5, the `auditData` format; rule 6, the data write first and the audit row after |
| ADR-012 | conditional spread in `where`, `Prisma.skip` in `data` |
| ADR-014 | `writeBatchOrEach`, `linesBy`; six simultaneous connections; rule 5, a read over a list is one chunked query |
| ADR-015 | the waitlist clear in daily maintenance; the scaffold's idempotency through the generator; `sellTicketsToWaitlist`; the placement lease |
| ADR-016 | the Rules stage; the claim, leave and requeue buckets; rules 5 and 9 to 13; § One path with `?preview=true`; the placement paragraph |
| ADR-017 | rules 6 and 7, texts in config modules under `app/config/` |
| ADR-018 | separators; table loading; the usage rules |
