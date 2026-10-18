# Release 0.9.0

**Status:** In progress | **Date:** 2026-10-05 | **Updated:** 2026-10-18 | **Branch:** `feature/work-roster`

The packages of release 0.9, where each one lives and the decisions behind them. Work after this release lives in
`../chores-0.9.1.md`.

## Package inventory

| Package | What | Where | Status |
|---|---|---|---|
| Framework research spike | prisma, zod and `zod-prisma-types` compatibility; the Nuxt option surface behind the store factory | `../archived/feature-proposal-framework-adoption.md` | committed |
| CI test reporting | vitest writes the unit summary; `make test-report` renders one Playwright suite per call with counts and the report link | § CI test reporting | committed (86e7c98, dd53d16) |
| Framework pair upgrade | pinia 4 with @pinia/nuxt 1, ical-generator 11 | `../archived/feature-proposal-framework-adoption.md` § Dependency clusters | committed |
| Store fetcher factory and store alignment | `storeAsyncData` and `apiRequest` from `useApiHandler`; the stores read and write through them | ADR-007 | committed (33a3567) |
| Fetch gating | `enabled` carries the fetch condition, `dependsOn` the chain; a dataset reads the selection a page hands the store | ADR-007 rules 8 and 9 | committed (c8788a5) |
| Re-authentication on 401 | a 401 re-authenticates and returns in place through `?redirect`; a 404 on a selected id recovers through `notFound` | ADR-007, `app/composables/useApiHandler.ts`, `app/plugins/apiErrors.client.ts` | committed (d6fe721, 52f395c) |
| URL writer | `useUrlQueryWriter` batches the URL writes of a tick into one navigation; an edit draft starts on an edit action | ADR-006 § URL Writes, ADR-007 rule 10 | committed (42b380f) |
| Dependency policy | `.npmrc` saves tilde ranges; a minor or major moves through an explicit install | `.npmrc`, `package.json` | committed |
| Prisma bundle | prisma 7.10, zod 4.6, zod-prisma-types 3.3 and the models of the push in migration `0017_roster` | § Prisma bundle | committed (db78d61, 5dc8818, 541fc01) |
| Booking one-path | one builder family for regular and guest orders across grid, preview and day | `../archived/bug-fix-plan-v0.9.md` | committed (1929a8d, e0d00d7) |
| Joker slot | `JokerSlot` on a team with the slot form in the team card | `../archived/feature-joker-slot.md` | committed (c62dd6b, 427a625, 3cdb77c) |
| Calendar legend | one `CalendarLegend` for the chef, dinner and team calendars | `CalendarLegend.vue`, `ALERTS.legend` | committed (541fc01) |
| Team wanted poster | a dinner without a chef shows the wanted poster on the chef card | `ChefMenuCard.vue`, `COMPONENTS.wantedPoster` | committed (ba5604c) |
| Waitlist | queue, assignment on release, extra portions, one booking path, UI, the calendar chips | `../archived/feature-waitlist.md`, ADR-016 | committed (5eedd34, 5f50af2, c151d74, f4892ad, 0a37cc4, 9cad84a, 627f2f6) |
| Waitlist notifications | the serial e2e asserting each of the four kinds writes its Delivery row | § Waitlist notifications | planned, after point 6b |
| Chef spending | expense rows per dinner, the chef endpoints, the Budget pane with the ticket changes | § Chef spending | • committed (49ece5e, 24e9a3f, fd41213, c65feae)<br>• reopened 2026-10-18 from the user's test of the Budget pane<br>• signed off 2026-10-18 (c90fa33)<br>• the dd/MM dates (`DAY_MONTH_MASK`, `app/utils/date.ts`) ✅ 2026-10-19, uncommitted<br>• dd/MM in Madbestilling's lines ✅ 2026-10-19, uncommitted |
| Kitchen allergy line | the dining-mode panels show the allergy kuverter; the expanded list opens with the allergen breakdown | § Kitchen allergy line | committed (5eedd34, 49ece5e, 42b380f) |
| Chef allergen line | the chef's allergen row counts the dinner's diners in kuverter per menu allergen | § Chef allergen line | committed (49ece5e) |
| Chef calendar header | the Agenda/Kalender tabs and the collapse chevron share one header row | § Chef calendar header | committed (42b380f) |
| Ticket allergies | a booked inhabitant's live allergies on the ticket card and in the booking form | § Ticket allergies | committed (7df4c17, bcf56c8, fd41213) |
| One team number | a team's number comes from its name, else its season position; the team bands derive from it | § Decisions 2026-10-11 | committed (0b54a73, 8d98269) |
| Season pick | the season order is active, in progress, upcoming, ended | § Decisions 2026-10-11 | committed (9a03544) |
| One breakpoint source | the design system is the one reader of the layout's `isMd` | § Decisions 2026-10-11 | committed (8d98269) |
| Calendar default waits for the viewport | `/dinner` and `/chef` land open on desktop and closed on a phone | `createBreakpoint` (`measured`) | committed (2a8d0e9) |
| Season status glyphs | the season's status as a `UBadge` from `SEASON_STATUS_GLYPHS` | § Decisions 2026-10-12 | committed (fd41213, bb3271e) |
| Spinner motion token | one spin value with the motion-reduce guard behind the save, job and ticket-change spinners | `MOTION_SPIN` in `useTheSlopeDesignSystem.ts` | committed (c151d74) |
| Admin economy loads on request | the billing periods and the current period fetch while the economy tab is on the page | `loadBillingOverview` in `app/stores/bookings.ts`, ADR-007 rule 9 | committed (83597f8) |
| Team delete returns the deleted id | `DELETE /api/admin/team/[id]` answers the id of the deleted team | ADR-009 rule 7 | committed (afadb83) |
| Joker slot delete returns the deleted id | `DELETE /api/admin/team/[id]/joker-slot/[slotId]` answers the id of the deleted slot; a slot of another team answers 404 | ADR-009 rule 7 | committed (679fc8f) |
| Validation owns the types | `TicketType` and the booking row action (`BookingRowActionSchema`) come from `useBookingValidation` | ADR-001 | committed (1cc6b5e, fdff39e) |
| Ticket portions | a ticket price row carries `portions` from the config's default prices | ADR-010 rule 7, `useTicket().withPortions` | committed (fdff39e) |
| Security patches | wrangler, `@nuxt/devtools` and prisma 7.10.1 patched; `nitro-cloudflare-dev` removed | `package.json` | committed (326ca63, b36d01d, 8c83700, 04d4fbd, 3629473, 861771d) |
| Heal endpoint removed | `heal-user-bookings`, its spec and make targets are removed; `sellTicketsToWaitlist` settles the waiting list | ADR-016 | committed (6ed207b) |
| Test sweep | dead and duplicate cases removed; cleanup fails early; factories, `gotoHydrated` and web-first waits replace raw sleeps; the `setup-season` project creates the active season once per run | `docs/testing.md` | packages 1–6 committed (5b1616b, b7d238d, 2d17d64, 45c1f83, 084ea42, 614cec0) |
| DRY sweep | dead code and duplicate token paths removed; the specs share their mount, endpoint and session helpers | `tests/component/testHelpers.ts`, `tests/component/hoistedMocks.ts` | committed (72cf9d9, 6b65a70, b456b2f, 999bdbd, c0beb62, 43876aa) |
| PRF spike | passkey and PRF research with the device protocol | `../feature-proposal-relogin-faceid.md`, `../archived/feature-mobile-native-feel.md` | committed |
| One booking path, end to end | outcomes in, notification out; the scaffold survives a partial failure and reports per person; the waiting list catches up; one client write; preview and toast from one word table; the ticket history follows kuverter | § One booking path, end to end | • points 1–7 committed (2ad1429 to bf7bc75)<br>• the toast words ✅ 2026-10-18<br>• the mail after a join, the line in the form, one client write ✅ 2026-10-19<br>• the reply per person ✅ 2026-10-19 (fix uncommitted)<br>• the ticket history ✅ 2026-10-19 (fix part in 0122723, the rest uncommitted)<br>• #20 open<br>• "Booking grid: the name summary and the guest add on a phone" implemented 2026-10-19, uncommitted; the name summary (#28) ✅ 2026-10-19, #29 and #30 in your test<br>• #31 ("Household members: the preferences editor fits a phone") with its follow-ups (the hint's wrap, the day form's power row) implemented 2026-10-19, uncommitted, in your test<br>• #32 (power mode reaches the household's queue entries) implemented 2026-10-19, uncommitted, in your test on dev<br>• point 6 reopened for the preference preview, part 1 committed (c90fa33)<br>• point 6b brief signed, runs after One audit format for the order history |
| Docs and tooling | the user, chef and admin guides; `docs/ui.md` and the compliance tables compacted; `docs/testing.md` Rule 0; the ui skill and the frontend agent; the architecture skill, listed by the architect, Nuxt and frontend agents | `docs/`, `.claude/skills/`, `.claude/agents/` | committed (b82852e, 38804ef, 0dfd8eb, 450bcc8); the architecture skill and the agent files in the working tree |
| Close keeps the eating mode | the nightly close writes each order's own eating mode | `server/utils/closeOrders.ts`, `fetchPendingOrdersOnConsumedDinners` | committed (16b4035) |
| One released predicate (the kitchen box) | a released ticket nobody bought stays released after the close; the kitchen panels add up and TIL SALG keeps its title | `app/composables/useOrder.ts`, `KitchenPreparation.vue` | committed (56f8e12) |
| Shared words, supply predicates and the system's identity | one set of ticket-type words and counts; "Lukket for framelding"; a stale order id is skipped; the system account from `HEY_NABO_USERNAME`; "frameldt, ADMIN korrektion" in the ticket history | `app/composables/useBookingUi.ts`, `app/composables/useTicket.ts`, `server/utils/systemUser.ts` | committed (56f8e12) |
| A waiting-list placement happens once | the queue keeps its own placement state (`placingAt`, `placingOrderId`); migration `0018_protocol`; recovery reports what it finishes; a held entry refuses leave and change with a conflict | § A waiting-list placement happens once | • in your test since 2026-10-18 (009c54c, c5a74c8, cf767b1)<br>• the extra portions and one line per ticket type ✅ 2026-10-18<br>• reopened 2026-10-18: `household/preferences.e2e.spec.ts:296` red, a released ticket to the first in line (#17) |
| Table loading | a table bound to a dataset that reloads binds that dataset's `loading`: Nuxt UI's loading bar runs while the rows stay, a write's re-read included; `#loading` fills a table with no rows yet; the day bill, the household's notes and the grid's lock chips wait for the bookings (ADR-018 § Table loading) | ADR-018 § Table loading | signed off 2026-10-18 (4e7d174, cf767b1, 558d7a4) |
| One audit format for the order history | one `auditData` schema, written and read through one pair of functions | § One audit format for the order history | brief signed 2026-10-17; implemented 2026-10-18 in One intent path's commit; e2e (`orderHistory`, `preferences`, `scaffold`, `maintenance`, `waitlistAssignment`) after UI step 2 |
| One intent path: batching and audit order | the nine review findings: the insert order as the repository's contract, bulk reads for the mails, the waiting-list read in 90-id chunks, leaves and requeues batched, one `orderSnapshotOf`, no `Promise.all` against D1, `countReleasedTickets` in one query, the join pairing contract tested; the push fix in `groupBy` and `waitingLines`; the deletes data first (ADR-011 rule 6) | § One intent path, Batching and audit order | brief signed 2026-10-18, running |
| One intent path | one generator for the preference path and the grid: past the deadline a preference change buys a ticket for sale or joins its line; the nightly job runs the same rules; the preferences endpoint and the scaffold endpoint answer `?preview=true`, and every preview in the app comes from that dry run | § One intent path | • brief signed 2026-10-18<br>• implemented 2026-10-18 (d894021, e510f83)<br>• reopened 2026-10-18 from the e2e slot (a season-wide run claimed the queued people again); the fix with steps 2 (claims settled once per dinner) and 3 (the notification step reads in bulk, one PrismaClient per binding) implemented 2026-10-18, uncommitted; e2e running<br>• the day form's preview, the preference editor, the guest form, the week-view preview, the expected cell to Ingen ✅ 2026-10-18<br>• the expected ticket and the legend (#7) ✅ 2026-10-19<br>• reopened 2026-10-18 on #5 (the grid's expected cells green, a second implementation) and #11 (an expected dinner cannot be set to Ingen in the day view, power mode cannot cycle in the grid's future view)<br>• #3 settled 2026-10-19: a confirmed key keeps the dinner hands-off, automated runs do not override explicit user intent; the written change reverted |

## Open before the release

| Item | State |
|---|---|
| One booking path, end to end | point 6 (the preference preview) and point 6b, § One booking path, end to end |
| One intent path | running, § One intent path |
| Browser checks and open decisions | #1, #3–#24, § Verifications with human eyes and the OPEN decisions |
| Waitlist notifications | planned, § Waitlist notifications |
| CI summary | read on the Actions run page: categories, counts, red ui failures, report links |
| Visual check per UI package | the route → viewport → element tables, carried into the PR description |

## CI test reporting

Vitest writes the unit summary. `make test-report` renders a Playwright suite (api, ui, smoke) from its JSON with
counts, a ❌ heading on failures and the report artifact link. The ui suite keeps `continue-on-error`.

## Prisma bundle

One package and one migration, `0017_roster`, applied on local, dev and prod 2026-10-08. The models, the majors and
the partial unique indexes are `prisma/schema.prisma`.

| Model / change | Design |
|---|---|
| `DinnerDutyTemplate`, `DinnerDuty`, `DutyHistory`, `DutyState`, `DutyAuditAction` | `../feature-proposal-duty-roster.md` § Schema additions |
| `JokerSlot` | `../archived/feature-joker-slot.md` |
| `TicketWaitlist` | `../archived/feature-waitlist.md` |
| `LedgerEntryType`, `Transaction.type` and `description`, `Expense`, `DinnerEvent.totalCost` deprecated | `../feature-proposal-adhoc-admin-billing.md` § Data model |

## Chef spending

Signed 2026-10-11 and 12. Expenses are rows of the `Expense` table, outside invoicing. The chef card carries the
Madbestilling row and its editor, the Budget pane with its boxes, the ticket table, the dinner's and the team's
spending and Se billetændringer. Mockups: the headers of `ChefMenuCard.vue`, `DinnerBudget.vue`, `ExpenseLines.vue`,
`CookingRoundSpending.vue` and `TicketChanges.vue`. The grocery line's note is prefilled by
`useBilling.expenseNoteWords`. Specs: `chef/expenses.e2e.spec.ts`, `ChefExpenses.e2e.spec.ts`,
`chef/orderHistory.e2e.spec.ts`, the chef component specs.

Reopened 2026-10-18 from the user's test of the Budget pane on `/chef`: a dinner without a menu title reads
"Fællesspisning" in its heading ("Fællesspisning, 10/11/2026"), in the total row and in the round's Middag cell; the
team round's heading reads "Hele <team>, periode <first date>-<last date>". Words: `app/config/bookingWords.ts`;
code: `formatDinnerName` in `useBooking.ts`, `cookingRoundWords` in `useBookingUi.ts`. Reopened 2026-10-18 (#16):
the dates in the spending tables read dd/MM, as the mockups draw them, the round heading and the Dato column alike.

## Kitchen allergy line

UX signed 2026-10-08, stats bar ink 2026-10-10. The dining-mode panel heads carry the allergy glyph and the kuverter
of allergic diners; the expanded list opens with the overview line and marks each diner's allergy types. Mockups:
`KitchenPreparation.vue` and `AllergyOverviewLine.vue` headers. Code: `useAllergy.ts` (`computeAllergenOverview`,
`computeAffectedDiners`), `AllergyTypeDisplay.vue` compact face, `COMPONENTS.kitchen`, `COMPONENTS.allergyOverview`.
Specs: `useAllergy.unit.spec`, `KitchenPreparation.nuxt.spec`, `AllergyTypeDisplay.nuxt.spec`.

## Chef allergen line

UX signed 2026-10-09. The ALLERGENER row counts the dinner's diners per menu allergen through the same overview; the
edit panel is the allergy panel. Mockups: `ChefMenuCard.vue` and `AllergenMultiSelector.vue` headers. Specs:
`ChefMenuCard.nuxt.spec` (Allergen line).

## Chef calendar header

Signed 2026-10-10. One header row: the Agenda/Kalender tabs beside a chevron over a `UCollapsible`; `/chef` hydrates
with one footer. Mockup: `ChefCalendarDisplay.vue` header. Tokens: `COMPONENTS.chefCalendar`,
`COMPONENTS.collapsible`. Specs: `ChefCalendarDisplay.nuxt.spec`, `Chef.e2e.spec` (hydration guard).

## Ticket allergies

UX signed 2026-10-11. A booked inhabitant's live allergies: the glyph in the ticket card's special slot and the
compact allergy line in the expanded row. Mockups: `DinnerTicket.vue` and `DinnerBookingForm.vue` headers. Specs:
`DinnerTicket.nuxt.spec`, `DinnerBookingForm.nuxt.spec`, `useCoreValidation.unit.spec`, `Dinner.e2e.spec` (Ticket
allergies).

## One booking path, end to end

### Problem

An admin's preference change for a whole household (power mode) released the tickets past the deadline, then failed
when the first released ticket went to the waiting list: the scaffold resolved the mail settings without a request, and
locally `DEPLOY_URL` is unset. The failure skipped the rest of the household's steps (the cancellations of the open
dinners and the assignment to the waiting list) and dropped the household's counts from the reply, so the toast read
only "fejlede", in green. Other views in the session kept the old released counts until reload, the waiting list stayed
beside tickets for sale, and "Se billetændringer" left the releases out (it drops every system update).

### Points

Each point is presented with its files and code, and signed off on its own.

| Point | What | Status |
|---|---|---|
| 1. Mail is configured or off | The notification service decides its channels from the environment; `DEPLOY_URL` unset means e-mail is off, a channel that is off logs the kind and the missing setting and reports not sent; the request fallback goes; `npm run dev` sets `DEPLOY_URL` locally | ✅ signed off 2026-10-14, implemented |
| 2. Notification after the action | The scaffold and the waiting-list steps send nothing and return outcomes that carry what a notification needs; the caller passes them to the notification service | ✅ signed off 2026-10-14, implemented |
| 3. The scaffold survives a partial failure | A failed write batch is retried order by order; the rest of the household runs on; the reply counts the orders per action, lists them per person for a household run and lists the failed orders; the preview and the reply name the action through one function (`actionOfUpdate`) | ✅ signed off 2026-10-15, implemented |
| 4. The waiting list catches up | A dinner's waiting list is one first-come-first-served line per ticket type; every save and every nightly run ends by selling the tickets for sale to the first in their type's line (`sellTicketsToWaitlist`), idempotent (ADR-015); a claim buys while nobody waits in its type's line; a place counts within its line; the save preview counts the tickets for sale of the row's type | ✅ signed off 2026-10-16, implemented |
| 4b. The views show each line | The chef's alert, the booking form and the kitchen box name the waiting list per ticket type; the kitchen box holds the tickets for sale and the waiting list together | kitchen box ✅ signed off 2026-10-16, implemented (§ Mockup — kitchen box); the chef's alert ✅ signed off 2026-10-17, implemented (`SUPPLY_WORDS.queuedCount`, mockup in `ChefMenuCard.vue`); its ask in singular and plural (`SUPPLY_WORDS.chefAsk`) ✅ signed off 2026-10-18, checks 10 and 11 |
| 4c. The preview sells each ticket once | The save preview settles the claims in order as the save does: the first claims of a ticket type buy that type's tickets for sale, the rest join its waiting list (`bookingOutcomes` takes one order or a list, `supplyOfType`); the guest form opens on Voksen and its button names the guests | ✅ signed off 2026-10-16, implemented; the settlement moved to the server's dry run 2026-10-18, words unchanged (One intent path, e510f83) |
| 5. One client write | Every write that changes bookings goes through `bookingsStore.writeBookings`: the request, then the household's orders, the upcoming orders, the tickets for sale, the waiting list and the dinner on view re-read once; the waiting list per locked dinner derives from the one waiting-list read; the households store keeps its own household re-reads | ✅ signed off 2026-10-17, implemented |
| 6. Preview and toast from one word table | Future words in the preview, past words in the toast, grouped per person; the toast is red as soon as one item failed, green otherwise. A preference change, one person or power mode, previews what Gem does above the buttons, in the grid's words and badges; the preference endpoint answers `?preview=true` with the save's own run without its writes; a small loader shows while the preview loads | reopened 2026-10-18: the preference preview, mockup ✅ signed off 2026-10-17, revised ✅ 2026-10-18 (§ Mockup — preference preview); implemented 2026-10-18 through One intent path (`useScaffoldPreview`, `ActionPreview`; e510f83); toast look implemented 2026-10-16 (`scaffoldToastLook`); the words ✅ signed off 2026-10-17, implemented (5165b4f) (§ Mockup — toast and preview); the toast is the preview compacted, one line per day, and "Sidste ændring" shows the same lines, signed and implemented 2026-10-18 (#25), uncommitted |
| 6b. The mails speak the booking words | The waiting-list mails greet the one who hears and name the person they are about, carry the ticket line of the booking page and the badge's help text, and link to the dinner's booking page; a mail is sent once per subject, version, kind and recipient (`sendOnce`), right after the action, and daily maintenance resends the missing ones over the dinners to come | mockup ✅ signed off 2026-10-17 (§ Mockup — waiting-list mails); the words in `app/config/bookingWords.ts`, the mail and toast lines from them in `useBooking.ts`, the icons in `useBookingUi.ts` ✅ signed off 2026-10-18; the recipient rule and the delivery ✅ signed off 2026-10-18; brief signed, runs after One audit format for the order history |
| 7. The ticket history follows kuverter | Every audit row replays, user or system alike; a line for each change of kuverter; a system run and the nightly close are one line for the dinner; the replay ends equal to state; the Af column names the performer by inhabitant name ("System" for a job), both history reads share one select and `formatPerformer`, the reason rides on the event from the recorded `source` ("tilmeldt, ADMIN korrektion"), the deadline row spans the table between the stretch since the deadline and the older rows, the table binds `COMPONENTS.table.historyUi` | mockup and brief ✅ signed off 2026-10-17 (§ Mockup — ticket history), implemented; reopened 2026-10-18 from the user's test (#24), the fix signed 2026-10-18, implemented and ✅ signed off 2026-10-19, uncommitted in part |

### Coverage

The preference-change cases (`household/preferences.e2e.spec.ts`, `admin/inhabitant.e2e.spec.ts`,
`serial/admin/scaffold-prebookings.e2e.spec.ts`) release tickets on dinners without a waiting list; the waiting-list
cases release through the member's booking route. The package adds the case that joins them.

| Case | Level |
|---|---|
| GIVEN a dinner past its booking deadline with a waiting entry at a household's ticket price WHEN an admin sets the household's preferences to Ingen THEN the first in the waiting list holds the ticket, the household's orders on open dinners are cancelled, and the reply lists the release and the cancellation with no failure | serial API e2e, `waitlistAssignment.e2e.spec.ts` |
| The same with e-mail off: the booking work completes and the reply carries the outcomes | unit, the scaffold with no `DEPLOY_URL` |
| GIVEN a batch write that fails WHEN it is retried order by order THEN the orders that land are reported and only the failing order is listed as failed | unit, `batchUtils.unit.spec.ts` |
| GIVEN an adult then a child waiting WHEN a child ticket is released THEN the child holds it and the adult still waits; daily maintenance then sells nothing more on that dinner | serial API e2e, `waitlistAssignment.e2e.spec.ts` |
| GIVEN a child waiting WHEN a household releases one child's ticket and claims one for its other child in one save THEN the waiting child holds the released ticket and the claimer joins the child line | serial API e2e, `waitlistAssignment.e2e.spec.ts` |
| One line per ticket type in join order; a place counts within its line | unit, `useWaitlist.unit.spec.ts` |
| A child row on a dinner with only an adult ticket for sale saves as "Skriv på venteliste", with a child ticket as "Køb billet" | component, `DinnerBookingForm.nuxt.spec.ts` |

### Mockup — preference preview ✅ signed off 2026-10-17

```
One person
 Opdater fællesspisning præferencer for Knud
 Man [Spis][Sen][Take][Ingen]  Tir [...]  Ons [...]  Tor [...]
      [cancel badge]    Knud frameldes: 7 middage, 02/11/2026 – 14/12/2026
      [released badge]  Knud frigiver sin billet: 20/10/2026, 21/10/2026
      [edit badge]      Knud ændrer spisemåde til Takeaway: 27/10/2026, 03/11/2026
                                                   [Annuller] [Gem]

Power mode
 Power mode: Opdater præferencer for hele husstanden
 (warning) Du er ved at aktivere power mode ...
 Man [Spis][Sen][Take][Ingen]  Tir [...]  Ons [...]  Tor [...]
      [cancel badge]    Knud frameldes: 7 middage, 02/11/2026 – 14/12/2026
      [cancel badge]    Lene frameldes: 6 middage, 02/11/2026 – 14/12/2026
      [released badge]  Lene frigiver sin billet: 20/10/2026
                                           [Annuller] [Gem for alle]

While the preview loads
 Man [Spis][Sen][Take][Ingen]  Tir [...]  Ons [...]  Tor [...]
      (sync, spinning)  Prøver at beregne hvad I skal spise hvornår...
                                                   [Annuller] [Gem]
```

The preview is empty while the draft equals the saved preferences. The preference endpoint,
`POST /api/household/inhabitants/[id]/preferences` (a member, and an admin with `?adminBypass=true`), runs the save with
`?preview=true` and returns its result without writing; the lines read it through `formatActionPreview`'s words.

Revised 2026-10-18 ✅: the lines carry the buy, queue and sold outcomes of the dry run ("Anna skrives på ventelisten
(Voksen #3)", "1 billet sælges til ventelisten"), grouped per day under the day's separator with no date in the text
(§ One intent path, Mockup — preview lines); the scaffold endpoint answers `?preview=true` the same way, so the grid,
the day form and the guest form read their preview from it.

### Mockup — toast and preview ✅ signed off 2026-10-17

```
Grid save after the deadline
Preview  [buy badge]    Anna køber en billet til salg: 19/10/2026
         [queue badge]  Anna skrives på ventelisten: 20/10/2026, 21/10/2026
         [queue badge]  Gæst af Anna skrives på ventelisten: 20/10/2026
Toast    Bookinger processeret                                    (green)
           Anna: 1 købt, 2 på ventelisten (Voksen #3, Voksen #5)
           Gæst af Anna: 1 på ventelisten (Voksen #6)

Grid power mode: Takeaway on Thursday (open), Ingen on Friday (past the deadline)
Preview  [edit badge]      Anna ændrer spisemåde til Takeaway: 22/10/2026
         [edit badge]      Lars ændrer spisemåde til Takeaway: 22/10/2026
         [released badge]  Anna frigiver sin billet: 23/10/2026
         [released badge]  Lars frigiver sin billet: 23/10/2026
Toast    Bookinger processeret                                    (green)
           Anna: 1 frigivet, 1 ændret spisemåde
           Lars: 1 frigivet, 1 ændret spisemåde

Preference power mode: Monday to Ingen, one order fails
Toast    Alle præferencer opdateret                               (red)
           Knud: 7 frameldt, 2 frigivet
           Lene: 6 frameldt, 2 frigivet, 1 opdatering fejlede
           1 billet solgt til ventelisten
           42 uændret
```

Revised 2026-10-18 ✅: the preview lines are grouped per day and carry no date in the text (§ One intent path, Mockup —
preview lines); the words stand. Signed 2026-10-18 (#25), the toast lines of the block above superseded: the toast is
the preview compacted, one line per day, "dd/MM  word: names · word: names"; a released ticket's fate reads
"frigivet (solgt): …" or "frigivet (til salg): …" from the sale's `sellerInhabitantId`; the failed group reads
"FEJLET: names" and turns the toast red; "Sidste ændring" shows the same lines, what happened, never the preview; the
per-person counts are gone.

| Action | Preview, after the name | Toast, after the count |
|---|---|---|
| BOOK | tilmeldes | tilmeldt |
| CANCEL | frameldes | frameldt |
| RELEASE | frigiver sin billet | frigivet |
| RECLAIM | tilmeldes igen | tilmeldt igen |
| BUY | køber en billet til salg | købt |
| QUEUE | skrives på ventelisten | på ventelisten (Voksen #3) |
| LEAVE | forlader ventelisten | forlod ventelisten |
| REQUEUE | ændrer spisemåde til <spisemåde> (venteliste) | ændret spisemåde (venteliste) |
| CHANGE_MODE | ændrer spisemåde til <spisemåde> | ændret spisemåde |
| CHANGE_PRICE | ændrer billettype | ændret billettype |

`<spisemåde>` is the person's eating mode, `MODE_WORDS[dinnerMode].label`: Spisesal, Sen or Takeaway.

### Mockup — waiting-list mails ✅ signed off 2026-10-17

```
WAITLIST_JOINED  → the user who booked
Emne: Skråningen: Emil står på ventelisten til 20/10/2026 · Lasagne
  Kære Lene,

  20/10/2026 · Lasagne
  Emil: 1 på ventelisten (Barn #1)
  Barn · 35 kr · Spisesal

  Du får automatisk tildelt en billet, hvis en kommer til salg, eller chefkokken frigiver portioner.
  Du betaler, når du får en billet fra ventelisten.
  Du kan altid afmelde din ventelisteplads, hvis du ikke har brug for den alligevel.

  Se bookingen: https://skraaningen.dk/dinner?date=20/10/26

WAITLIST_TICKET_ASSIGNED  → the user who booked
Emne: Skråningen: Emil har fået en billet til 20/10/2026 · Lasagne
  20/10/2026 · Lasagne
  Emil: 1 købt
  Barn · 35 kr · Spisesal · fra Hansen
  Du betaler for billetten. Vi glæder os til at se jer.
  Se bookingen: …

WAITLIST_EXTRA_PORTION  → the user who booked
  20/10/2026 · Lasagne
  Emil: 1 tilmeldt
  Barn · 35 kr · Spisesal
  Køkkenholdet laver flere portioner, og en af dem er til Emil. Vi glæder os til at se jer.
  Se bookingen: …

TICKET_SOLD  → each user in the selling household
Emne: Skråningen: 1 billet til 20/10/2026 · Lasagne er solgt
  20/10/2026 · Lasagne
  1 billet solgt til ventelisten        (1 billet solgt til Jensen, when a user bought it)
  Voksen · 55 kr
  I betaler ikke længere for den.
  Se bookingen: …

WAITLIST_BUILDUP  → the chef, in the words of the chef's alert
Emne: Skråningen: 3V 1B på venteliste til 20/10/2026 · Lasagne
  3V 1B på venteliste · 5 portioner
  Skrånere mangler billetter til din middag — har du mulighed for at mætte flere munde?
  Det gør du under Flere på middagen: https://skraaningen.dk/chef
```

A guest reads "Gæst af Anna". The booking page's waiting-list badge carries the same help text. The join outcome
carries the guest flag, the ticket price and the eating mode; a sale carries the buyer's booking user, eating mode and
guest flag.

Delivery, signed 2026-10-18. The recipient is the member who acted (`bookedByUserId`, when it is a member), else the
person's own login, else the first member of the household with a login; `TICKET_SOLD` goes to every member of the
selling household with a login, `WAITLIST_BUILDUP` to the chef. A scaffolded order keeps the system user as
`bookedByUserId`. The booking step returns outcomes; the notification step resolves, composes and queues a complete
message; the worker sends what it gets (ADR-016 rule 9). `DeliverySubject` gains `TICKET_WAITLIST` (a join, by its
entry), `ORDER` (assigned, extra portion, sold, by the order) and `DINNER_EVENT` (the buildup, by the dinner); the
column is TEXT on D1 (`migrations/0015_notifications.sql`), so the change regenerates the client (`make d1-prisma`)
with no migration file. `sendOnce` reads the Delivery rows, emits and records, one mail per subject, version, kind and
recipient (the billing pattern, `monthlyBillingService.ts`); the version comes from the history: `TICKET_WAITLIST` 1,
`ORDER` the number of BUY rows, `DINNER_EVENT` 1 plus the number of EXTRA_PORTIONS rows. Every booking mail, the
buildup included, goes right after the action; daily maintenance gains a step that checks the owed notifications over
the dinners still to come and resends the missing ones through the same rows, reported like `clearWaitlist`; the
per-join buildup check in `server/utils/sender/events/waitlist.ts` goes. The chef's deadline reminders belong to daily
maintenance in `../feature-proposal-notification-triggers.md`.

### Mockup — ticket history ✅ signed off 2026-10-17

```
Se billetændringer                                                                       [v]
Dato              Husstand  Ændring                      Billetter · kuverter     Indtægter
21/10/2026 02:00  System    lukket                       30V 11B 3b · 35,5        2.035 kr
20/10/2026 19:10  S_14      købt 1V                      30V 11B 3b · 35,5        2.035 kr
20/10/2026 12:40  S_22      ændret billettype 1B → 1V    30V 11B 3b · 35,5        2.035 kr
20/10/2026 09:05  S_31      frigivet 2V                  29V 12B 3b · 35          2.015 kr
── Framelding lukker · 19/10/2026 18:00 ─────────────────────────────────────────────────
[Vis fuld historik]
```

Every audit row replays, user or system. Every ticket event is a line: tilmeldt, frameldt, frigivet, købt, tilmeldt
igen, ændret billettype, and the nightly close as one line, "lukket"; a switch between eating modes is no ticket event.
Billetter and kuverter count what the dinner is paid for: a released ticket stays until someone buys it, so a release
and a sale leave them unchanged. The Ændring column reads the toast words of § Mockup — toast and preview with the
tickets the event touched. Rows by the same actor, the user or the system, in the same minute are one line (`collapseByKey`):
its events in the word table's action order, named by its household when it
touched one, else System for the system and the short names for a user. The last line equals the tickets and kuverter paid for on the dinner.

### Mockup — kitchen box ✅ signed off 2026-10-16

The mockup lives in the `KitchenPreparation.vue` header. Code: `WaitlistQueueSummarySchema.lines`, the bookings store's
`selectedDinnerWaitlist`, `COMPONENTS.kitchen.queue`. Specs: `KitchenPreparation.nuxt.spec` (TIL SALG box),
`bookings.nuxt.spec` (the queue's lines).

## Waitlist notifications

Planned. `WAITLIST_JOINED`, `WAITLIST_TICKET_ASSIGNED`, `WAITLIST_EXTRA_PORTION`, `WAITLIST_BUILDUP`, `TICKET_SOLD` are templates in
`app/config/notificationTemplates.ts` and events in `server/utils/sender/events/waitlist.ts`, sent after the booking
action from its outcomes. The package is one serial e2e that joins a queue, releases a ticket and portions,
crosses the buildup threshold and asserts each event writes its Delivery row: the `sendOnce` row of point 6b, one per
subject, version, kind and recipient.

## Close keeps the eating mode

### Problem

The nightly close wrote Spisesal into every order it closed. A consumed dinner's kitchen box showed its Takeaway and Sen
orders under Spisesal, and a released ticket nobody bought counted as an active Spisesal order.

### Root cause

cc05ea9 (Bookings stability, #62) moved the close from `updateOrdersToState` (state only) to `updateOrdersBatch`, to
write audit rows; `buildUpdateData` writes the `dinnerMode` it is given, and the close passed `DINEIN`.

### Solution

`fetchPendingOrdersOnConsumedDinners` selects `dinnerMode`; the close passes each order's own mode. The orders closed
since cc05ea9 keep the Spisesal they carry.

### TDD

`tests/e2e/api/serial/admin/maintenance.e2e.spec.ts`: a Takeaway order keeps its mode through the close.

### Affected areas

`server/utils/closeOrders.ts`, `server/data/financesRepository.ts`, `tests/e2e/api/serial/admin/maintenance.e2e.spec.ts`.

## One audit format for the order history

### Problem

`OrderHistory.orderId` is NULL once its order is deleted (`onDelete: SetNull`). The rows `createOrders` writes
(`{source, orderData}`) and `updateOrdersBatch` writes (`{state, dinnerMode, ticketPriceId, priceAtBooking}`) carry no
order id in `auditData`, so the ticket history cannot group the rows of one person's deleted guest orders.

### Solution

One Zod schema for `auditData`, `{change, orderSnapshot, source?}`; `change` takes its values from the existing enums
(`BookingAction` plus `CLOSE`), and the column keeps its type. The writers (`createOrders`, `updateOrdersBatch`,
`claimOrder`, `deleteOrder`) write through `createOrderAuditData`. The readers (the ticket-history replay, the
order-history endpoint, the preferences intents, the claim provenance) read through `readOrderAudit`, which maps the
three legacy shapes and returns null for what a row cannot tell. The history groups rows by order id, else by dinner and
household, and prints "?" for a ticket it cannot attribute. The replay's `collapseByKey` adopts `linesBy`
(`app/utils/batchUtils.ts`, One intent path).

Implemented 2026-10-18: `OrderAuditChangeSchema` and `OrderAuditDataSchema` in `useBookingValidation.ts`,
`createOrderAuditData` and `readOrderAudit`, one snapshot builder `orderSnapshotOf` for every repository write in
`financesRepository.ts`; `recordCancellation` takes LEAVE for a waiting-list leave; "?" is
`BOOKING_WORDS.unknownHousehold`. Specs: `useBookingValidation.unit`, `useBooking.nuxt` (the replay),
`scaffoldPrebookings.unit`, `waitlistAssignment.unit`; the e2e specs named in the inventory row.

The legacy cancellations on upcoming dinners hold no guest ticket in production, dev or local, so an unknown guest flag
reads as a regular ticket. The count re-runs after the 0.9 deploy.

## One intent path

### Problem

A preference change past the deadline leaves the locked dinners untouched, while a grid booking buys a ticket for sale
or joins the waiting list. A household that sets a weekday to Spis after the deadline gets nothing on those dinners.

An Ingen on the booking page for a person without an order is skipped, so the nightly run books the person again from
the preferences. The grid shows Ingen for everyone on a month beyond the 60-day window, since it reads the orders only,
and a member cannot cancel what the run will book.

### Root cause

c151d74 (2026-10-12) emptied the claim bucket of the preference path (`app/composables/useBooking.ts`,
`[Bucket.claim]: []`), wrote "System mode never reaches the claim bucket" into ADR-016 and added the unit case that
asserts it (`useBooking.nuxt.spec.ts`), outside its brief and without a decision.

cc05ea9 (2026-01-20, Bookings stability, #62, on main) made a bare NONE a skip, wrote the ADR-016 matrix row
`absent, = NONE → SKIP` and the unit case at `useBooking.nuxt.spec.ts:670`, without a decision; the suites cancel an
existing order only. The same commit left the grid reading the orders without the preferences
(`BookingGridView.vue:215`).

### Solution

One generator for the preference path and the grid: past the deadline a preference buys a ticket for sale of its type
or joins its line; the nightly job runs the same rules, idempotent, with no flag; a person's own earlier acts
(`fetchUserIntentKeys`) stay the one guard. The preferences endpoint stays the inhabitant's resource (CRUD) and the
scaffold endpoint writes orders only; both answer `?preview=true` with the save's own run dry (it reads supply and
returns the result; the writes and the mails happen at save time), and `?adminBypass=true` combines with it. Every
preview in the app comes from the dry run through one line builder; the browser's settlement (`supplyOfType`,
`bookingOutcomes`, `previewOutcome`) goes; a loader shows while the preview is pending. The package moves the rest of
`useBooking.ts`'s and `useBookingUi.ts`'s words to `app/config/bookingWords.ts` (ADR-017 rule 7). Preview part 1's
per-inhabitant dry run and the power-mode filter stay as the shape. Mockup: § Mockup — preference preview, revised
2026-10-18.

An Ingen from the booking page is recorded as a cancellation, with an order, a waiting entry or nothing:
`decideOrderAction` puts a bare NONE in the delete bucket; one writer, `recordCancellation` in `financesRepository.ts`,
writes the OrderHistory row (`orderId` null without an order); `createWaitlistEntries`, `updateWaitlistEntryOrder` and
`deleteWaitlistEntry` write their OrderHistory row with the audit context; the nightly run and a later preference
change respect the row through `fetchUserIntentKeys`.

A cell without an order shows what the scaffold will do: the grid and the day form read the household's expected
bookings from the dry run with an empty draft (`?preview=true`, `orders: []`, system mode on the dinners in view),
render the mode ghosted (`COMPONENTS.bookingGrid.expectedBadge`), carry the legend entry "Forventet bestilling ifølge
præferencer" and bind the table's loading to the read. An expected ticket in the day view looks like a waiting-list
ticket: the sliders glyph (`ICONS.preferences`) in the special slot, a neutral edge, the mode ghosted on neutral; the
power row's consensus counts the expected modes and reads ghosted when every row is expected. A preview with an empty draft answers the household's expected
bookings.

One component, `ActionPreview`, renders every preview, the preference editor included: the lines grouped per day under
a `USeparator` on `COMPONENTS.separator.moment` with weekday and date, within a day per action in the word table's
order, then per person, a sale to the waiting list last in its day; the separator shows on a one-day surface too, and
a line carries no date in its text. The toast is the preview compacted, one line per day, and "Sidste ændring" shows
the same lines (#25). A preference save runs on the weekdays its draft changes (`ScaffoldOptions.weekdays`); the
nightly run keeps the other weekdays in step; the preview has the same scope, and the result names its dinners
(`ScaffoldResult.dinners`). One grouping builder,
`linesBy(keyOf, toLine, order)` in `app/utils/batchUtils.ts` beside `groupBy`, `chunkArray` and `pruneAndCreate`
(ADR-014), groups the preview's days and lines and the toast's per-person lines; Billetændringer's `collapseByKey`
adopts it in One audit format for the order history.

Reopened 2026-10-18 from the e2e slot: the season activation ran past 30 s with D1 constraint errors. A season-wide
run read the waiting-list entries only with a `householdId`, so the queued people were claimed again on every run
(ADR-015), and a claim cost about five statements per person, about a thousand per closed dinner, past D1's limit.
Fix, signed: every run reads its dinners' entries and hands each household its own; the claims settle per dinner and
ticket type on one supply read and join as one batch (`createWaitlistEntries`: the entries and their history rows in
two bulk writes). A season-wide run claims for everyone whose preference eats on a closed dinner. The e2e singleton
season (`setup-season`, `SeasonFactory.defaultSeasonData`) is open at activation (`ticketIsCancellableDaysBefore` 0),
so the activation books everyone; the closed-dinner cases keep their own seasons (`createActiveSeasonFromTomorrow`
keeps 8 by its own constant).

The fix, implemented 2026-10-18: a household's claims on a dinner settle in one pass (one line read, one
tickets-for-sale count per type while nobody waits, the buys one by one, the joins as one batch); `joinWaitlist` is the
batch and `createWaitlistEntries` writes the entries and their QUEUE rows in two bulk writes; `createWaitlistEntry` and
`fetchWaitlistForHousehold` are gone. A later chunk of a batch that fails leaves the earlier entries without their
QUEUE row and mail, as a failed `createOrders` chunk does; the retry one by one counts them unchanged (decided
2026-10-18: writes carry no retries; a write-failure dashboard for the admin is `../feature-0.9.2.md` § Write-failure
dashboard). Specs:
`scaffoldPrebookings.unit`, `waitlistAssignment.unit`; the `setup-season` e2e project is the proof.

Step 2, signed and implemented 2026-10-18: the household loop writes its books, cancels, releases, leaves and requeues
and collects its claims; after the loop each dinner settles once (one line read, one tickets-for-sale count per type
nobody waits for, the claims settled in memory across the households in run order, the buys one by one, one join
batch, the places from one `joinedOf` pass over the batch), so a claim sees every release, leave and requeue the run
made before it, whichever household made it; "a claim buys while nobody waits in its line" and the final sale stand
(ADR-016). Within a household's `results` the BUY and QUEUE lines follow its LEAVE and REQUEUE lines; the shapes stand
and the UI sorts. The e2e activation went from about 1,300 repository calls to about 9, and the line is read and
parsed once per dinner. Specs: `scaffoldPrebookings.unit`, `useWaitlist.unit`; the `setup-season` e2e project is the
proof.

Step 3, implemented 2026-10-18: after step 2 the e2e activation still ran past a minute and hung the dev server in
`notifyBookingOutcomes`, which resolved each of several hundred joined events with three reads in one `Promise.all`,
a new PrismaClient per call. The notification step reads once per run: the dinners and households memoised one at a
time, one inhabitants read (`fetchInhabitantsByIds`) and one users read (`fetchUsersByIds`) in 90-id chunks one after
another, and composes from maps; the mails, recipients and words stand, pinned by new cases. `getPrismaClientConnection`
makes one client per D1 binding (a WeakMap keyed by the binding, holding the connecting promise; a failed connect is
dropped). A read over a list is one chunked query (ADR-014 rule 5). Specs: `sender/events/waitlist.unit`,
`database.unit` (the client cache's three rules).

### Batching and audit order

Signed 2026-10-18, running. The nine findings of the package's review, each with the user's answer: the insert order
is the repository's contract; the join batch has no retry; the mails read the dinners and the households in bulk; the
waiting-list read chunks at 90 ids; the leaves of a household go in one call and the requeues in one batch; one
snapshot builder, `orderSnapshotOf`; no `Promise.all` against D1, the repository chunks inside, and
`countReleasedTickets` answers every ticket type in one query; the join pairing contract is documented and tested. With
them: `groupBy` and `waitingLines` push in place, and a delete writes the data first and its audit row after (ADR-011
rule 6).

Decided 2026-10-18, items 6, 8, 9 and 10; the package holds items 1 to 11 with nothing open. A run's wishes are paired with
their written places by the entry's key (person, dinner, guest flag); the repository returns the places in the order
the wishes went in and says so in its doc, and identical guest keys fall back to that order. Taking people off the waiting
list and rewriting their places go per household: one `deleteMany` over the places, then one history write from the
run's snapshots; a rewritten place is one `update`, one after another, then one history write; the write first, the
history row after; `$transaction` is used nowhere (the D1 adapter ignores it). The repository owns chunking and
sequence: `fetchOrders` keeps its 90-id chunks inside (the scaffolder's own chunking and `chunkFetchIds` go),
`fetchWaitlistForDinners` and the audit read of `updateOrdersBatch` chunk at 90 through `readByIds`, no `Promise.all`
against D1; `countReleasedTicketsByType` answers every ticket type in one statement. Retries: ADR-016 rule 10 stands
for creates, updates, deletes, bare cancellations and rewritten places (`writeBatchOrEach`); the joins and the leavers
get one attempt (`writeBatchOnce`), since a retry would insert an entry again or report a false conflict. The retries
in the system: rule 10's batches, `claimOrder`'s three tries on a lost race, the sender queue's three deliveries.

### Mockup — preview lines ✅ signed off 2026-10-18

Implemented 2026-10-18; the mockup lives in the `ActionPreview.vue` header. Code: `useScaffoldPreview`,
`previewLines` and `linesBy`; test-ids `action-preview`, `action-preview-day`, `action-preview-loading`,
`dinner-mode-legend-expected`. Specs: `ActionPreview.nuxt.spec`, `BookingGridView.nuxt.spec`,
`DinnerBookingForm.nuxt.spec`, `useBookingUi.nuxt.spec`, `batchUtils.unit.spec`, with `registerScaffoldEndpoint`.

ADR-016, ADR-015, ADR-014 and ADR-011 carry the package's rules since 2026-10-18 (§ ADR notes).

### Mockup — expected bookings ✅ signed off 2026-10-18

Implemented 2026-10-18; the mockup lives in the `BookingGridView.vue` header. A ghosted mode is the dry run's expected
booking (`COMPONENTS.bookingGrid.expectedBadge`, the legend entry "Forventet bestilling ifølge præferencer"); a draft on it
previews as a cancellation or a booking.

## A waiting-list placement happens once

### Problem

A sale or an extra-portion placement writes the order, then deletes the queue entry. D1 runs the two writes without a
transaction (the D1 adapter ignores `$transaction`, https://www.prisma.io/docs/orm/overview/databases/cloudflare-d1), so a
crash between them leaves the entry. A guest entry has no unique index: a rerun sells or places it again, and the
household pays twice.

### Solution

The queue keeps its own state: `TicketWaitlist` gains `placingAt DateTime?` and `placingOrderId Int?`, a plain id
without a relation, so the order model stays as it is.

1. A run grabs an entry by setting `placingAt` where it is null; a sale's grab also records the released order it moves.
2. It writes the order, records `placingOrderId`, then removes the entry.
3. Recovery reads an entry with `placingAt` set and finishes or releases it.

Regular and guest entries are placed exactly once.

Recovery runs first in every run, over its dinners, for grabs older than the lease (`theslope.waitlistPlacingLeaseMinutes`,
10). It finishes an entry whose order landed and releases one whose order did not; an entry without a recorded order is
matched to the order its run wrote on the dinner, person, guest flag and price row after the grab. A ticket type's line
stops at an entry still grabbed, as it stops at its first miss.

### Decisions

- 2026-10-17: recovery matches the order an unrecorded placement wrote; the queue's own state settles it.
- 2026-10-17: the lease is 10 minutes, and a line stops at a grabbed entry, so the first come, first served order holds.

### Migration

`0018_protocol` adds the two nullable columns, applied on local, dev and prod 2026-10-18. B6, the ticket allergies and the ticket price portions ride their own
releases.

## ADR review

`/code-review 168` against `docs/adr.md`, 2026-10-17, read-only at 5165b4f. The architect signs off each
remediation after a discussion with the peer that owns its code (`app/`, `server/`: orchestrator); the fix follows the
sign-off.

| # | Rule | Where | Breach | Architect sign-off | Fix |
|---|---|---|---|---|---|
| 1 | One booking path (ADR-016): a stale order id is skipped | `app/composables/useBooking.ts:205` | `decideOrderAction` throws when an order id is not found; a released order sold to another household sinks the member's whole save, reported as no failure | ✅ 2026-10-17 | 56f8e12 |
| 2 | Display types for batches, D1 query limit (ADR-009, ADR-014) | `server/utils/waitlistAssignment.ts:45` | each queued claim reloads the full dinner and season (about 20–25 queries); around 40 claims reach D1's 1,000-query limit and the save fails part-way | ✅ 2026-10-17 | 5883d6b |
| 3 | Idempotent jobs (ADR-015) | `server/utils/waitlistAssignment.ts:123` | a sale writes the order before deleting the queue entry; a crash between the two fails the next run with a 409 at that entry each time | ✅ 2026-10-17 | 5883d6b |
| 4 | External calls warn and never block (ADR-013); notify after the action (ADR-016) | `server/routes/api/household/order/scaffold.post.ts:61` and 8 other endpoints | a failed recipient lookup while building the mails turns a saved booking into a 500, and the member retries | ✅ 2026-10-17 | 5883d6b |
| 5 | A store's dataset key stays constant (ADR-007) | `app/stores/allergies.ts:116` | the key changes with the url and an extra refresh fires: up to 3 requests race per filter change | ✅ 2026-10-17 | 5883d6b |
| 6 | UI words in `use<Domain>Ui` (ADR-017) | `app/composables/useBooking.ts:136` | `formatPlace` ("Voksen #3") sits in a composable the server imports | ✅ resolved by the ADR-017 update | ADR-017 |
| 7 | Stores own writes and toasts (ADR-007) | `app/components/common/HelpButton.vue:60` | the feedback POST goes through `apiRequest` in the component | ✅ 2026-10-17 | 5883d6b |
| 8 | App code imports from `app/` and `shared/` (ADR-017) | `app/components/common/HelpButton.vue:39` | types imported from `~~/server/integration/github/githubClient` | ✅ 2026-10-17 | 5883d6b |
| 9 | Validation composables export a serialized schema (ADR-010) | `app/composables/useDutyValidation.ts:39` | `SerializedJokerSlot` is a hand-written type; the `affinity` JSON goes unvalidated | ✅ 2026-10-17 | 5883d6b |
| 10 | A single delete returns the deleted id (ADR-009) | `server/data/waitlistRepository.ts:75` | `deleteWaitlistEntry` returns `void` | ✅ 2026-10-17 | 5883d6b |
| 12 | One booking path (ADR-016, rule 5) | `server/utils/scaffoldPrebookings.ts:124-132` | the "REVERT after healing" relaxation outlives the healing endpoint this PR removes; a user-mode run without a `userId` records SYSTEM audits | ✅ 2026-10-17 | 5883d6b |

## Decisions

**2026-10-05**
- One Prisma migration package for the push; the push earns v0.9; sizing is t-shirt.
- The push starts from the framework corner: a research spike precedes a major upgrade, and an upgrade removes
  workarounds and follows the framework's own shapes.
- Prisma and zod ride the Prisma bundle pinned at 7.10 and 4.6. Stable framework features only: `enabled` is in.
- A dependency sits in `package.json` while a file imports it; `@vueuse/core` left.
- CI reporting is per tool: vitest reports the unit run, `make test-report` one Playwright suite per call.
- Waitlist: the queue assigns by itself in strict FIFO by portion weight, one ticket per inhabitant; the chef releases
  extra portions; four notification kinds and the chef buildup threshold.
- Chef spending is tracking: expenses stay outside invoicing, and a chef's dinner expenses balance across the season.
- Release-portions is one form with two entries: the [Flere] menu of `ChefMenuCard` and a CTA alert while the queue
  holds entries. The kitchen stats panel's fourth box alternates TIL SALG and VENTELISTE.
- The dinner economy is one collapsed Budget pane: three boxes, the ticket table and the Forbrug entry; ticket types
  read their Danish names through `useTicket`.

**2026-10-06**
- The PRF spike is complete; its findings live in `../feature-proposal-relogin-faceid.md`.

**2026-10-07** (Prisma bundle)
- `TicketWaitlist` carries an unplaced order in its create shape as JSON, keyed by dinner, inhabitant and
  `isGuestTicket`; a guest entry sits on the booking member's `inhabitantId`; portion weights stay the config mapping.
- Partial unique indexes through the `partialIndexes` preview: one regular waitlist entry and one regular order per
  person per dinner.
- The store packages and the majors install run one after the other.

**2026-10-08** (ledger, migration, order uniqueness, ui suite)
- Ledger and expenses share `LedgerEntryType { REGULAR, ADHOC }`: a REGULAR entry hangs off its source, an ADHOC
  entry stands alone with a description.
- `Expense` is its own table, a list per dinner plus basisvarer rows; the payee is a `User` (`paidByUserId`,
  SET NULL) with a `userSnapshot`.
- `DinnerEvent.totalCost` is deprecated; the dinner's cost is the sum of its expense rows (ADR-010 rule 6).
- An adhoc charge's household lives in `orderSnapshot`.
- `strictUndefinedChecks` stays a preview feature; the zod generator emits enums only.
- Migration `0017_roster` adds columns with `ALTER TABLE … ADD COLUMN` and carries the `totalCost` → `Expense` data
  line.
- A unique violation answers 409 (ADR-002, `eventHandlerHelper`); the UI sends the order id for updates (ADR-016).
  The framelding billing import's e2e test is skipped.
- A schema change is followed by a review of the tests and validation comments that encode the old rule, before the
  suites run.
- Dependency policy: tilde ranges in `.npmrc` and `package.json`; Nuxt stays on 4.6.0.
- Local Playwright runs use three workers, CI one.
- One URL writer for the app (ADR-006 § URL Writes); ui specs that interact navigate through `gotoHydrated`
  (`docs/testing.md` Rule 3a) and URL assertions poll.

**2026-10-11**
- Ticket allergies: the ticket signals allergies with `ICONS.allergy` on the card and the compact
  `AllergyTypeDisplay` line in the expanded row. The card's row 1 is three fixed slots: special (state, guest,
  allergy), type, how you eat. The state colour paints the edge and the state glyph; the type colour paints the badge
  and the guest and allergy glyphs.
- One team number: the number in the team's name, else its position in the season's team list plus one
  (`getTeamNumber`); a site that shows a team passes the season's list.
- Season pick: seasons order active, in progress, upcoming, ended (`sortSeasonsByActivePriority`); the pick is the
  first season of that order that has yet to end.
- One breakpoint source: `useTheSlopeDesignSystem` injects the layout's `isMd`; a value that follows the breakpoint
  is a responsive token, behaviour reads `breakpoint`, and the household calendar's open state is `?cal=`.

**2026-10-12**
- Season status: `SEASON_STATUS_GLYPHS` keyed by the four statuses, rendered as a `UBadge` by the season selector and
  the season status display.
- One booking path: a member sends a desired order through the scaffold; the generator decides create or claim by the
  deadline, and the executor claims a released ticket or queues (ADR-016). Waitlist reads are open to a logged-in member.
- Waitlist UI: the queued row shows the wish ghosted (`COMPONENTS.waitlist`) through `DinnerModeSelector`, the
  hourglass takes the state cell, and the save label previews the outcome.
- Tests: one level per behaviour, the lowest that proves it (`docs/testing.md` Rule 0).

**2026-10-13**
- The billing periods and the current period load on request (`loadBillingOverview`); the order snapshot on a
  transaction stays, since a transaction outlives its order.
- A single delete returns the deleted id and a bulk delete the count (ADR-009 rule 7); the team and joker slot deletes
  are single `delete` calls.
- Page composition: the frames stay (`../archived/feature-proposal-framework-adoption.md`).

**2026-10-14** (one booking path, end to end)
- Notification happens after the action: the scaffold and the waiting-list steps do the booking work and return
  outcomes; the caller hands them to the notification service, which picks the channels and decides whether each is
  set in the environment.
- Mail is configured or off: `DEPLOY_URL` is the one source of the site; unset, e-mail is off and logs.
- The scaffold survives a partial failure and reports per person.
- Toast colour B: red as soon as one item failed, green otherwise.
- A ticket sale is its own event: whenever a released ticket gets a new owner, the selling household hears it,
  named with the buying household's shortname (`TICKET_SOLD`). A waiting entry hears when it gets a ticket, a released
  one (`WAITLIST_TICKET_ASSIGNED`, naming seller and buyer) or one of the chef's extra portions
  (`WAITLIST_EXTRA_PORTION`). The chef cooks more; the waiting entries that fit get regular orders.
- Outcomes are one list per event (`joined`, `ticketsSold`, `waitlistTicketsSold`), with no nullable field standing for
  a second meaning; the claim returns the selling household, so the sold mail reaches the household whose ticket it was.
- The ticket history replays system updates; a change between eating modes stays out of it (option A); the nightly
  close is one line for the dinner.

**2026-10-16** (one booking path, end to end)
- The waiting list is one first-come-first-served line per ticket type: a released child ticket goes to the first child
  waiting, whoever waits in the adult line. The sale is `sellTicketsToWaitlist`; a line without supply logs info.
- A sold ticket keeps its price row: the buyer pays its price and eats its portions.
- The kitchen box holds the tickets for sale and the waiting list together (point 4b).
- The kitchen box is one box under the title TIL SALG: the waiting list buys what is for sale. Its waiting-list part
  carries the hourglass and the word VENTELISTE, its portions and its ticket count, without a share.
- One vocabulary across the views: a household frigiver a ticket, the ticket is til salg, someone køber it, the people
  waiting stand på ventelisten. A place is "#n i kø" ("#" throughout); the ticket type names the line: the shorthand
  beside the name in the kitchen ("Emil (B #1)"), the word in a sentence ("Barn: #1 i kø"), "Billettype: Barn" in the
  mail, and the row's ticket beside the place badge in the booking form. A count after a number uses the shorthands
  (4V, 1B).
- The guest form's button names the guests ("Tilmeld gæst", "Tilmeld gæster"); its preview lines name each guest's
  outcome. The guest form opens on Voksen.

**2026-10-17** (one booking path, end to end)
- The kitchen box's waiting list reads like the other boxes' rows: one row per household, in the order its first member
  joined, each person with the place in the line of the ticket type.
- The waiting list's glyph is the Hugeicons hourglass, the set of the role icons: an outline that fills its box like the
  glyphs beside it. Icon use is symmetric: each part of the TIL SALG box carries its glyph beside its kuverter, as the
  allergy line does, the released glyph and the hourglass; the titles and the list headings carry none.
- The preview and the toast read from one word table: the preview names each person's action with its dinners' dates, the
  toast counts per person and closes with the sales to the waiting list and the unchanged orders. A waiting-list place
  reads as the ticket badge names its type, "Voksen #3", in the preview, the toast, the booking form's waiting-list badge
  and the kitchen box.
- The close keeps each order's eating mode; the orders closed since cc05ea9 keep their Spisesal (§ Close keeps the
  eating mode).

**2026-10-18**
- Texts live in config modules under `app/config/` (ADR-017 rules 6 and 7): new text starts there, and an existing
  literal moves there when its file is touched.
- The mails speak the booking words (point 6b): the words the mails share live in `app/config/bookingWords.ts`;
  `useBooking.ts` builds the mail and toast lines from them and `useBookingUi.ts` adds the icons.
- One intent path: a preference change past the deadline buys a ticket for sale or joins the waiting list like a grid
  booking, through one generator; the nightly job runs the same rules, idempotent, with no flag; a person's own earlier
  acts stay the one guard. c151d74's "System mode never reaches the claim bucket" was unsigned and goes.
- The preferences endpoint stays the inhabitant's resource (CRUD); the scaffold endpoint writes orders only ("letting
  scaffold change preferences would be mixing concerns"). Both answer `?preview=true`, and `?adminBypass=true`
  combines with it.
- Every preview in the app comes from the server's dry run, the most exact source, and the browser's settlement logic
  goes; a loader shows while the preview is pending.
- ADR-017 rule 7 reaches a fix's own texts (option a); One intent path moves the rest of `useBooking.ts`'s and
  `useBookingUi.ts`'s words because it touches those files.
- An Ingen from the booking page is a cancellation on record, with an order, a waiting entry or nothing; one writer,
  `recordCancellation`; the waiting-list writes carry their OrderHistory row. cc05ea9's bare-NONE skip and its matrix
  row were unsigned and go.
- A cell without an order shows the scaffold's expected booking, ghosted, from the dry run with an empty draft; the
  legend reads "Forventet bestilling ifølge præferencer".
- #7, signed 2026-10-18: an expected ticket looks like a waiting-list ticket, the sliders glyph (`ICONS.preferences`)
  in the special slot, a neutral edge, the mode ghosted on neutral; the legend entry carries the glyph beside the
  ghosted mode; the power row's consensus counts the expected modes and reads ghosted when every row is expected; the
  grid's expected cells are grey-ghosted like a queued wish without the hourglass (this settles #12).
- #1 (2026-10-19): the client's 3 s re-read chain after a grid save is a low-priority chore to investigate in 0.9.1
  (`../chores-0.9.1.md` § Slow client after a save).
- **OPEN** #33 One booking path: the grid shows no row for a queued guest, while the day form does. a) the grid gets
  the row; b) the grid stays as it is.
- **OPEN** #34 One booking path: both power rows take their disabled modes from the first inhabitant. a) the disabled
  modes come from the household's rows together; b) as it is.
- #32 (2026-10-19) One booking path, power mode reaches the household's queue entries: a power change on a dinner
  reaches every place the household holds there — a queued inhabitant's intent names the person's place, every other
  place (the guests', the people outside the targets) gets its own intent at its held price; Ingen leaves, another
  mode requeues; the consensus counts a queued row's wish and, on the grid, the expected cells.
- 2026-10-19: "the run's season is its dinners' season" is rejected and reverted; a run keeps the given season, else
  the active one. The local e2e rounds flipping the active season are a test matter, not a production need.
- The legend reads "sharply vertical, icon then explanation": every Forklaring panel (the dinner, chef and team
  calendars', the grid's, the day form's) is one list, one entry per row, the sample in a fixed column
  (`COMPONENTS.legend.list`, `legend.sample`; `entries` gone), the hint last; "Blandet", "Ændret" and "På venteliste
  (#n)" live in `bookingWords.ts`.
- A preview with an empty draft answers the household's expected bookings.
- The preview lines on every surface are grouped per day (a `USeparator` on `COMPONENTS.separator.moment` with weekday
  and date), within a day per action in the word table's order, then per person, a sale to the waiting list last in
  its day; the separator shows on a one-day surface too. One component, `ActionPreview`, renders every preview, the
  preference editor included, and a line carries no date in its text. The toast keeps its per-person counts.
- One grouping builder, `linesBy(keyOf, toLine, order)` in `app/utils/batchUtils.ts` (ADR-014's curried utilities):
  the preview's day and line grouping and the toast's per-person lines use it; Billetændringer's `collapseByKey`
  adopts it in One audit format for the order history.
- Point 6b, the mails: the recipient is the member who acted, else the person's own login, else the household's first
  login; `TICKET_SOLD` to the selling household's logins, `WAITLIST_BUILDUP` to the chef; a scaffolded order keeps the
  system user as `bookedByUserId`.
- Point 6b, delivery: the notification step resolves, composes and queues a complete message after the booking step
  (ADR-016 rule 9); `DeliverySubject` gains `TICKET_WAITLIST`, `ORDER` and `DINNER_EVENT` with no migration file (TEXT
  column); `sendOnce` sends once per subject, version, kind and recipient, the version from the history; every booking
  mail goes right after the action and daily maintenance resends the missing ones over the dinners to come. The chef's
  deadline reminders go to daily maintenance in the notification-triggers proposal.
- A season-wide run claims for everyone whose preference eats on a closed dinner; every run reads its dinners'
  waiting-list entries and hands each household its own, settles the claims per dinner and ticket type on one supply
  read and joins as one batch (`createWaitlistEntries`).
- The e2e singleton season opens (`ticketIsCancellableDaysBefore` 0): a closed activation queued every inhabitant,
  slowed the suite and sold a released ticket in the shared household at once; the closed-dinner cases keep their own
  seasons. Option B, confirmed: the eight cases that leaned on its closed dinners (`waitlistAssignment.e2e`'s seven,
  `scaffold-prebookings.e2e:429`) get their own closed seasons; the serial projects hold the closed-dinner cases, each
  on its own season; the serial `scaffold-prebookings` spec stays apart from the parallel `scaffold` spec (the admin's
  season scaffold and the system runs against the member's booking write). `HouseholdBookings.e2e:173` splits into two
  cases.
- ADR-011 rule 6: the data write first, the audit row after; a delete reads its snapshot, deletes, then writes the
  row; a missing row is the write-failure dashboard's (0.9.2), a stale one must not exist. ADR-014: six simultaneous
  connections per invocation; rule 5, a read over a list is one chunked query, the chunks one after another or in one
  `batch()`.
- One intent path: batching and audit order, a package on the nine review findings: the insert order is the
  repository's contract; no retry for the join batch; the mails read dinners and households in bulk; the waiting-list
  read chunks at 90; leaves per household in one call, requeues in one batch; one snapshot builder `orderSnapshotOf`;
  no `Promise.all` against D1, the repository chunks inside, `countReleasedTickets` answers all types in one query; the
  join pairing contract documented and tested; the push fix in `groupBy` and `waitingLines`; the deletes data first.
- Batching and audit order, items 6 and 8: leaves and rewritten places per household, the write first and one history
  write after; the repository owns chunking (90 ids through `readByIds`) and sequence, `countReleasedTicketsByType`
  in one statement. Retries: `writeBatchOrEach` for creates, updates, deletes, bare cancellations and rewritten places;
  one attempt (`writeBatchOnce`) for the joins and the leavers; otherwise only `claimOrder`'s three tries on a lost
  race and the sender queue's three deliveries. Item 9: the wishes pair with their places by the entry's key, the
  repository returns the places in wish order and identical guest keys fall back to it. Item 10: `groupBy` and
  `waitingLines` push into the group. The package holds items 1 to 11, nothing open.
- The run's claims settle once per dinner after the household loop, one join batch across the households, so a claim
  sees every release the run made before it; a longer setup budget for the e2e activation was rejected.
- Writes carry no retries for now; a failed later chunk of a join batch stays as `createOrders`' shape. A dashboard
  that surfaces the partial batches to the admin goes to 0.9.2 (`../feature-0.9.2.md` § Write-failure dashboard).
- The C4 diagrams in the README (`docs/architecture/`, `make c4`, `make c4-check` in `pre:all`) are experimental and
  outside the release: no sign-off, no row.
- #25: one look for the preview, the toast and "Sidste ændring"; signed as: the toast is the preview compacted, one
  line per day "dd/MM  word: names · word: names", a released ticket's fate "frigivet (solgt)" or "frigivet (til
  salg)", the failed group "FEJLET: names" with the toast red; "Sidste ændring" shows the same lines (what happened);
  the preview stands; the per-person counts go.
- A preference save runs on the weekdays its draft changes (`ScaffoldOptions.weekdays`, `changedWeekdays`); the
  nightly run keeps the other weekdays in step; `?preview=true` has the same scope. The result names its dinners
  (`ScaffoldResult.dinners`). The toast block of § Mockup — toast and preview is
  redrawn for its sign-off.
- 2026-10-19, #3 One intent path, confirmed keys: option a (a preference books a job-deleted confirmed dinner again) is
  rejected and reverted — "automated runs should not override explicit user intent"; a confirmed key keeps the dinner
  hands-off, ADR-016 rule 5 unchanged.
- #16 Chef spending: the dates in the spending tables read dd/MM, as the mockups draw them ("periode 03/11–10/11",
  Dato "03/11"); the table is crowded, and the short format reads better. #27 (2026-10-19): Madbestilling's lines
  table reads dd/MM too, for consistency. #26 (2026-10-19): an interval reads as `formatDateRange` renders it, with a
  hyphen ("periode 03/11-10/11"), the app's default; the mockups and the fixtures that drew an en dash follow.
- The architecture skill (`.claude/skills/architecture/SKILL.md`) is signed; senior-architect,
  nuxt-typescript-developer and frontend-engineer list it. The five non-test agents drop `disallowedTools` (option b);
  "no Playwright outside the test engineer" stays a rule of the briefs and the peer-sessions skill.
- Chef spending: a dinner without a menu title reads "Fællesspisning"; the team round's heading reads
  "Hele <team>, periode <first date>-<last date>".

## Coverage

| Package | Tests |
|---|---|
| Framework upgrades | `npm run pre:all`, `make unit-test`, `npm run test:e2e:api` per cluster |
| Factory, gating, 401 | `../archived/feature-proposal-framework-adoption.md` § Shipped — pointers; the store specs' gated rows; `Login.e2e.spec.ts` |
| Prisma bundle | `migrations.unit.spec.ts`; `household.e2e.spec.ts` (409 for a duplicate pbsId) |
| Joker slot | `jokerSlot.e2e.spec.ts`, `JokerSlotForm.nuxt.spec.ts`, `CookingTeamCard.nuxt.spec.ts` |
| Waitlist | `waitlistAssignment.e2e.spec.ts`, `Waitlist.e2e.spec.ts`; the pieces in `../archived/feature-waitlist.md` |
| Waitlist notifications | planned: the serial e2e of § Waitlist notifications |
| Chef spending | `chef/expenses.e2e.spec.ts`, `ChefExpenses.e2e.spec.ts`, `chef/orderHistory.e2e.spec.ts`, the chef component specs |
| Admin economy loads on request | `bookings.nuxt.spec.ts` (gated reads), `admin-tab.nuxt.spec.ts` |
| Team and joker slot deletes return the deleted id | `team.e2e.spec.ts`, `jokerSlot.e2e.spec.ts`, `plan.nuxt.spec.ts` |
| Validation owns the types | `useBooking.nuxt.spec.ts` (`getNewOrderAction`, `getBookingOptions`) |
| One intent path | API e2e: a preference change past the deadline buys a ticket for sale, else joins its line; `?preview=true` on both endpoints writes nothing and sends nothing; an empty-draft preview answers the expected bookings; a bare Ingen writes its OrderHistory row and the nightly run respects it. Unit: `decideOrderAction` with a bare NONE; the dry placement. Component: the grid's and the day form's ghosted cells, legend entry and loading; one preview line builder |
| UI packages | the component specs named in their sections |

## Verifications with human eyes

| Check | Where | State |
|---|---|---|
| Visual check per UI package | route → viewport → DS element → expectation, in the PR description | per package |
| PWA install and icon | phone home screen | ✅ 2026-10-13 |
| CI summary | Actions run page: categories, counts, red ui failures, report links | open |
| Table loading, checks 1–7 | 1 `/household/<S>/bookings` Uge or Måned; 2 the same, Dag; 3 `/dinner`; 4 `/chef` Budget, a dinner in another round; 5 `/household/<S>/allergies`; 6 `/admin/economy`; 7 `/admin/households`, `/admin/users`, `/admin/system`, `/admin/allergies` on first load | ✅ 2026-10-18 |
| #17 A waiting-list placement happens once: a released Voksen ticket to the first in line | a locked dinner with someone waiting for Voksen: another household releases a Voksen ticket; the first in the Voksen line holds it | open; `household/preferences.e2e.spec.ts:296` red 2026-10-18 |
| A waiting-list placement happens once, checks 13 and 14 | `/chef` Rediger, Frigiv portioner; a locked dinner with a child ticket released and only adults waiting | ✅ 2026-10-18 |
| Chef alert words, checks 10 and 11 | `/chef` Rediger, one person waiting, then two or more | ✅ 2026-10-18 |
| Chef spending (the budget's words), checks 1 and 2 | `/chef?date=2026-11-10`, Budget open: 1 the dinner's heading and total row; 2 the round's heading and Middag cell | ✅ 2026-10-18 |
| Chef spending: the Madbestilling editor's round heading | `/chef?date=2026-11-10`, the editor open: "Hele <team>, periode …" | ✅ 2026-10-18 |
| Chef spending: a dinner with a menu title | `/chef`: the title in the heading, the total row and the Middag cell | ✅ 2026-10-18 |
| Chef spending: the spending tables on a phone | both tables scroll sideways inside their box, the page stays | ✅ 2026-10-18 |
| Chef spending: dd/MM in Madbestilling's lines | `/chef`, "Rediger madbestilling" open, 375px (the table scrolls in its box) and desktop: the lines' Dato reads "12/04" | ✅ 2026-10-19 |
| Chef spending: dd/MM dates in the spending tables | `/chef`, Budget open, phone and desktop: this dinner's heading "Risotto, 14/04" and its receipts' Dato "12/04"; the team's "Hele Madhold 2, periode 03/11-10/11" with dd/MM per day; "Fællesspisning, 10/11" without a title; the same heading under Madbestilling's "Rediger madbestilling" | ✅ 2026-10-18 |
| One booking path: the mail after a join (points 1 and 2) ✅ 2026-10-19 | `/dinner`, a locked dinner with no ticket for sale: book a person; the toast reads "på ventelisten (Voksen #n)" and the WAITLIST_JOINED mail reaches the booking user's mailbox after it | open |
| #19 One booking path: the reply per person (point 3) | the household page, a person's preferences in power mode, a day to Ingen: the toast lists each person with counts ("Knud: 7 frameldt, 2 frigivet") and closes with the sales to the waiting list and the unchanged orders. Revised 2026-10-18: `/household/<S>/members`, one person, one weekday to Ingen: the toast and "Sidste ændring" list that weekday's dates only, one line per day "dd/MM  word: names"; a released ticket reads "(solgt)" or "(til salg)"; the preview as before | reopened 2026-10-18 (five repeats on unrelated days, no dates); the fix implemented 2026-10-18, uncommitted | ✅ 2026-10-19 |
| #32 One booking path: power mode reaches the household's queue entries | `/dinner` on dev once deployed, a dinner with a queued guest, power mode to Ingen: the preview lists the release and the leaves; after the save no place remains and the ticket goes to the next household; "Hele familien" reads the wishes, not Blandet | reported 2026-10-19 on dev build 62b (one guest stayed booked, the alert read "Husstanden står på ventelisten med 2 billetter"); the fix implemented 2026-10-19, uncommitted, open |
| #31 Household members: the preferences editor fits a phone | `/household/<S>/members` at 375px — the editor closed, one person open with a preview, power mode open with a preview: nothing moves sideways, the preview's right border visible; the power row shows three faces, "+N" and the count (`COMPONENTS.avatar.powerRowMax`), on desktop too; the hint under the editor wraps between modes with each glyph beside its word, every word whole (`householdCard.hintMode`); the day form's power row shows three faces too | reported 2026-10-19 (six 28px faces side by side pushed the members table past the box); the fix and its follow-ups implemented 2026-10-19, uncommitted, open |
| #20 One booking path: the button names the outcome (point 4) | `/dinner`, a locked dinner with a Voksen ticket for sale and none for Barn: a Barn row's button reads "Skriv på venteliste", a Voksen row's "Køb billet" | open |
| One booking path: the line in the form (point 4b) ✅ 2026-10-19 | `/dinner`, a locked dinner where a person of the household waits: the row shows the hourglass and the badge with the type and the place, "Voksen #3", the help text on the badge | open |
| One booking path: the guest form (point 4c) | `/dinner`, a locked dinner with one Voksen ticket for sale: the guest form opens on Voksen; two guests make the button "Tilmeld gæster", and the preview shows one guest buying and one joining the line | ✅ 2026-10-18, with the guest form of One intent path |
| One booking path: one client write (point 5) ✅ 2026-10-19 | `/dinner` after a save: the kitchen box, the calendar chips and the form show the new state with no reload; `/household/<S>/bookings`: the grid and Dag show the save with no reload | open |
| One booking path: the toast words (point 6) ✅ 2026-10-18 | `/household/<S>/bookings`, a grid save past the deadline that queues: the toast "Bookinger processeret", green, with "Anna: 1 på ventelisten (Voksen #3)" per person; the preview lines are #4 | open |
| One intent path: the week-view preview ✅ 2026-10-18 | `/household/<S>/bookings?view=week`, a dinner inside the window, edit, one cell clicked: under the grid the loader line (spinning sync, "Prøver at beregne hvad I skal spise hvornår..."), then "Du er ved at ændre familiens booking", a separator "ti 20/10/2026", lines in action order then household order; the longest line inside the panel | open |
| #5 One intent path: a month beyond the window | `?view=month` on a month beyond the 60-day window: cells without an order outlined in the mode's colour with a muted glyph; a person who cancelled reads plain Ingen; the legend entry "Forventet bestilling ifølge præferencer"; the loading bar under the headers while the read loads | reopened 2026-10-18: the day view's expected cells are right, the week and month views' render green instead of muted grey, a second implementation beside the ticket's ("WHERE IS THE DRY"); the check on dev once deployed: the month beyond the window shows ghosted expected cells |
| One intent path: an expected cell set to Ingen ✅ 2026-10-18 | the same month, edit, an expected cell set to Ingen: the cell reads Ingen with the modified accent; the preview reads "Anna frameldes" under that day | open |
| One intent path: a day-view row without an order ✅ 2026-10-19 | `/dinner` on a far-future dinner with no orders, phone and desktop: each row's ticket with the sliders glyph, a neutral edge and the mode ghosted grey; the power row ghosted Takeaway when everyone is expected, "Blandet" when one row differs; the legend entry "Forventet bestilling ifølge præferencer"; `/household/<S>/bookings` month beyond the window: the expected cells grey-ghosted like a queued wish without the hourglass. The legend, one entry per row with the sample in a fixed column and the hint last: the grid's Forklaring shows eight rows (the four modes, Blandet, Ændret, På venteliste, Forventet) with every explanation starting on one vertical line; the day form's shows the modes, Blandet and Forventet | reopened 2026-10-18 (half-muted modes, power mode showing Ingen, no accent on the tab; the legend "sharply vertical, icon then explanation"); the fixes implemented 2026-10-18, uncommitted | ✅ 2026-10-19 |
| #30 Booking grid: the day view on a phone | `/household/<S>/bookings`, Dag, at 375px: the page keeps its width, the form has a 16px side gutter and its table scrolls sideways in its box, as on `/dinner` | reported 2026-10-19; the fix implemented 2026-10-19, uncommitted, open |
| One intent path: the day form's preview on an open dinner | day view, an open dinner, a row expanded: the loader, then one separator with the line; the save label reads Book, Køb billet, Skriv på venteliste or Opdater from the reply | ✅ 2026-10-18 |
| One intent path: the day form's preview on a closed dinner | day view, a closed dinner, a row expanded, and a queued row: "Anna skrives på ventelisten (Voksen #3)", "… (venteliste)"; the label follows | ✅ 2026-10-18 |
| One intent path: the guest form | the guest form, from the grid and from the day form: title "Du er ved at tilføje gæster", one separator, a line per outcome ("Gæst af Anna (Voksen ×2) …"), button "Tilmeld gæst(er)" | ✅ 2026-10-18 |
| One intent path: one person's preference editor | `/household/<S>/members`, one person's editor, a day changed: the loader, then the lines under day separators with no date in the text; nothing while the draft equals the saved preferences | ✅ 2026-10-18 |
| One intent path: power mode | the same, power mode: lines for every member under each day, in household order | ✅ 2026-10-18 |
| #11 One intent path: the expected cell in edit mode (a look) | the cell shows the mode solid; the view face alone is outlined | reopened 2026-10-18 as a defect: editing 02/02, an expected dinner, the day view cannot set the row to Ingen; the grid's future view cannot cycle in power mode; the grid's single cell goes to Ingen; the check on dev once deployed: an expected row goes to Ingen in the day view and power mode cycles |
| One intent path: the expected badge's colour (a look) | settled with #7 on 2026-10-18: a neutral ghost like a queued wish, without the hourglass | ✅ 2026-10-18 |
| Booking grid: the name summary (#28) | `/household/<S>/bookings`, week and month, a person with tickets, a released ticket and a place: three badges by the name — the ticket count, the released count, the hourglass count — each only above 0; a places-only person shows the hourglass alone | reported 2026-10-18; the fix implemented 2026-10-19, uncommitted | ✅ 2026-10-19 |
| #29 Booking grid: the guest add on a phone | `/household/<S>/bookings` at 375px, edit mode, scrolled right to an open dinner, the guest chevron tapped: the guest form opens below in view, the width of the visible box, and stays in view while the table scrolls sideways; desktop as before | reported 2026-10-18; the fix implemented 2026-10-19, uncommitted, open |
| One booking path: the ticket history (point 7) ✅ 2026-10-19 | `/chef`, a dinner with a release and a sale: Billetændringer lists "frigivet 1V" and "købt 1V" lines, a nightly close as one System "lukket" line; the last row's Billetter · kuverter equals the kitchen box's paid tickets; "Vis fuld historik" opens the rest. Revised 2026-10-19: `/chef` Billetændringer on a dinner past Framelding, 375px and desktop — one line per row, the table scrolls in its box; Af after Husstand with names ("System" for a job); the chips level with the text; the deadline row last, and between the two stretches after "Vis fuld historik"; an admin-override save reads "…, ADMIN korrektion"; the order timeline on `/dinner` shows names | reopened 2026-10-18 (no actor, an unexplained "tilmeldt" after the deadline, alignment, the "lukket" line gone with the full history, cramped on a phone); the fix implemented 2026-10-19, part in 0122723, the rest uncommitted | ✅ 2026-10-19 |

## ADR notes

| ADR | Change in this release |
|---|---|
| ADR-002 | 409 for a unique violation |
| ADR-006 | § URL Parameters and § URL Writes |
| ADR-007 | `storeAsyncData` and `apiRequest`, rules 7 to 10 |
| ADR-009 | rule 7, what a delete returns |
| ADR-010 | rule 6, a deprecated column's value; rule 7, `portions` filled on read |
| ADR-011 | rule 5, the `auditData` format `{change, orderSnapshot, source?}`; rule 6, the data write first and the audit row after |
| ADR-012 | conditional spread in `where`, `Prisma.skip` in `data` |
| ADR-014 | `writeBatchOrEach`, `linesBy`; six simultaneous connections per invocation; rule 5, a read over a list is one chunked query |
| ADR-015 | the waitlist clear in daily maintenance; the scaffold's idempotency through the generator, reading the entries and the claim, leave and requeue buckets; `sellTicketsToWaitlist` |
| ADR-016 | the claim bucket, the queue entry rows, the two deadline sets; rule 9, notification after the action; rule 10, a failed batch retried order by order; rule 11, one line per ticket type; § One path with `?preview=true` on both endpoints and the empty-draft preview; the matrix rows `absent, = NONE → CANCEL (recorded)` and `found, = NONE → LEAVE (recorded)`; rule 5, a person's own acts are intent; rule 12, a waiting entry's write writes its OrderHistory row; key files `previewSale`, `joinedOf`, `recordCancellation` |
| ADR-017 | rules 6 and 7, texts in config modules under `app/config/` |
| ADR-018 | separators; table loading; the usage rules |
