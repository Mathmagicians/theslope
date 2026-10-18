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
| Chef spending | expense rows per dinner, the chef endpoints, the Budget pane with the ticket changes | § Chef spending | committed (49ece5e, 24e9a3f, fd41213, c65feae); reopened 2026-10-18 from the user's test of the Budget pane; in your test since 2026-10-18: checks 1–5 open |
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
| One booking path, end to end | outcomes in, notification out; the scaffold survives a partial failure and reports per person; the waiting list catches up; one client write; preview and toast from one word table; the ticket history follows kuverter | § One booking path, end to end | points 1–7 committed (2ad1429 to bf7bc75); 6 reopened for the preference preview, part 1 committed (c90fa33); 6b mockup signed off, code brief owed |
| Docs and tooling | the user, chef and admin guides; `docs/ui.md` and the compliance tables compacted; `docs/testing.md` Rule 0; the ui skill and the frontend agent; the architecture skill, listed by the architect, Nuxt and frontend agents | `docs/`, `.claude/skills/`, `.claude/agents/` | committed (b82852e, 38804ef, 0dfd8eb, 450bcc8); the architecture skill and the agent files in the working tree |
| Close keeps the eating mode | the nightly close writes each order's own eating mode | `server/utils/closeOrders.ts`, `fetchPendingOrdersOnConsumedDinners` | committed (16b4035) |
| One released predicate (the kitchen box) | a released ticket nobody bought stays released after the close; the kitchen panels add up and TIL SALG keeps its title | `app/composables/useOrder.ts`, `KitchenPreparation.vue` | committed (56f8e12) |
| Shared words, supply predicates and the system's identity | one set of ticket-type words and counts; "Lukket for framelding"; a stale order id is skipped; the system account from `HEY_NABO_USERNAME`; "frameldt, ADMIN korrektion" in the ticket history | `app/composables/useBookingUi.ts`, `app/composables/useTicket.ts`, `server/utils/systemUser.ts` | committed (56f8e12) |
| A waiting-list placement happens once | the queue keeps its own placement state (`placingAt`, `placingOrderId`); migration `0018_protocol`; recovery reports what it finishes; a held entry refuses leave and change with a conflict | § A waiting-list placement happens once | in your test since 2026-10-18 (009c54c, c5a74c8, cf767b1): checks 13 and 14 ✅ 2026-10-18; reopened 2026-10-18: `household/preferences.e2e.spec.ts:296` red, a released ticket to the first in line (check 12) |
| Table loading | a table bound to a dataset that reloads binds that dataset's `loading`: Nuxt UI's loading bar runs while the rows stay, a write's re-read included; `#loading` fills a table with no rows yet; the day bill, the household's notes and the grid's lock chips wait for the bookings (ADR-018 § Table loading) | ADR-018 § Table loading | in your test since 2026-10-18 (4e7d174, cf767b1, 558d7a4): checks 1, 2, 3 and 5 ✅ 2026-10-18; 4, 6 and 7 open |
| One audit format for the order history | one `auditData` schema, written and read through one pair of functions | § One audit format for the order history | signed off 2026-10-17; runs after "Shared words, supply predicates and the system's identity" |
| One intent path | one generator for the preference path and the grid: past the deadline a preference change buys a ticket for sale or joins its line; the nightly job runs the same rules; the preferences endpoint and the scaffold endpoint answer `?preview=true`, and every preview in the app comes from that dry run | § One intent path | brief signed 2026-10-18; the server half and the words implemented 2026-10-18, uncommitted; the surfaces (UI step 2) running; e2e after them |

## Open before the release

| Item | State |
|---|---|
| One booking path, end to end | point 6 (the preference preview) and point 6b, § One booking path, end to end |
| One intent path | running, § One intent path |
| Browser checks | Table loading 4, 6 and 7; A waiting-list placement happens once 12; Chef spending 1–5; § Verifications with human eyes |
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
code: `formatDinnerName` in `useBooking.ts`, `cookingRoundWords` in `useBookingUi.ts`.

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
| 4c. The preview sells each ticket once | The save preview settles the claims in order as the save does: the first claims of a ticket type buy that type's tickets for sale, the rest join its waiting list (`bookingOutcomes` takes one order or a list, `supplyOfType`); the guest form opens on Voksen and its button names the guests | ✅ signed off 2026-10-16, implemented; 2026-10-18 the settlement moves to the server's dry run, words unchanged (§ One intent path) |
| 5. One client write | Every write that changes bookings goes through `bookingsStore.writeBookings`: the request, then the household's orders, the upcoming orders, the tickets for sale, the waiting list and the dinner on view re-read once; the waiting list per locked dinner derives from the one waiting-list read; the households store keeps its own household re-reads | ✅ signed off 2026-10-17, implemented |
| 6. Preview and toast from one word table | Future words in the preview, past words in the toast, grouped per person; the toast is red as soon as one item failed, green otherwise. A preference change, one person or power mode, previews what Gem does above the buttons, in the grid's words and badges; the preference endpoint answers `?preview=true` with the save's own run without its writes; a small loader shows while the preview loads | reopened 2026-10-18: the preference preview, mockup ✅ signed off 2026-10-17, revised ✅ 2026-10-18 (§ Mockup — preference preview); part 1 (the server dry run, `previewPreferences` in the households store) implemented 2026-10-18 and kept as the shape; the rest rides One intent path (§ One intent path); toast look implemented 2026-10-16 (`scaffoldToastLook`); the words ✅ signed off 2026-10-17, implemented (5165b4f) (§ Mockup — toast and preview) |
| 6b. The mails speak the booking words | The waiting-list mails greet the one who hears and name the person they are about, carry the ticket line of the booking page and the badge's help text, and link to the dinner's booking page; a mail is sent once per subject, version, kind and recipient (`sendOnce`), right after the action, and daily maintenance resends the missing ones over the dinners to come | mockup ✅ signed off 2026-10-17 (§ Mockup — waiting-list mails); the words in `app/config/bookingWords.ts`, the mail and toast lines from them in `useBooking.ts`, the icons in `useBookingUi.ts` ✅ signed off 2026-10-18; the recipient rule and the delivery ✅ signed off 2026-10-18; brief signed, runs after One audit format for the order history |
| 7. The ticket history follows kuverter | Every audit row replays, user or system alike; a line for each change of kuverter; a system run and the nightly close are one line for the dinner; the replay ends equal to state | mockup and brief ✅ signed off 2026-10-17 (§ Mockup — ticket history) |

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
preview lines); the words stand. A toast line counts per person, in the word table's action order; the sales to the
waiting list and the unchanged orders count for the household.

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
writes the OrderHistory row (`orderId` null without an order); `createWaitlistEntry`, `updateWaitlistEntryOrder` and
`deleteWaitlistEntry` write their OrderHistory row with the audit context; the nightly run and a later preference
change respect the row through `fetchUserIntentKeys`.

A cell without an order shows what the scaffold will do: the grid and the day form read the household's expected
bookings from the dry run with an empty draft (`?preview=true`, `orders: []`, system mode on the dinners in view),
render the mode ghosted (`COMPONENTS.bookingGrid.expectedBadge`), carry the legend entry "Forventet efter
præferencer" and bind the table's loading to the read. A preview with an empty draft answers the household's expected
bookings.

One component, `ActionPreview`, renders every preview, the preference editor included: the lines grouped per day under
a `USeparator` on `COMPONENTS.separator.moment` with weekday and date, within a day per action in the word table's
order, then per person, a sale to the waiting list last in its day; the separator shows on a one-day surface too, and
a line carries no date in its text. The toast keeps its per-person counts. One grouping builder,
`linesBy(keyOf, toLine, order)` in `app/utils/batchUtils.ts` beside `groupBy`, `chunkArray` and `pruneAndCreate`
(ADR-014), groups the preview's days and lines and the toast's per-person lines; Billetændringer's `collapseByKey`
adopts it in One audit format for the order history.

### Mockup — preview lines ✅ signed off 2026-10-18

```
 ── to 22/10/2026 ──────────────────────────────
 [edit badge]      Anna ændrer spisemåde til Takeaway
 [edit badge]      Lars ændrer spisemåde til Takeaway
 ── fr 23/10/2026 ──────────────────────────────
 [released badge]  Anna frigiver sin billet
 [released badge]  Lars frigiver sin billet
 ── ti 27/10/2026 ──────────────────────────────
 [buy badge]       Anna køber en billet til salg
 [sold badge]      1 billet sælges til ventelisten
 while the preview loads:
 (sync, spinning)  Prøver at beregne hvad I skal spise hvornår...
```

ADR-016 follows at landing: one path with the audit source as the difference, `?preview=true` on both endpoints, the
empty-draft preview, the matrix row `absent, = NONE → CANCEL (recorded)` and the queue-entry row `found, = NONE →
LEAVE (recorded)`. ADR-011: the waiting-list writes carry an OrderHistory row.

### Mockup — expected bookings ✅ signed off 2026-10-18

```
Januar 2027, S_31                         Forklaring: [ghost] forventet efter præferencer
            ti 05/01   on 06/01   ti 12/01   on 13/01
Anna        (Spis)     (Spis)     (Spis)     (Spis)
Bo          (Take)     Ingen      (Take)     Ingen
Emil        Ingen      (Spis)     (Spis)     (Spis)
 [cancel badge]  Anna frameldes: 12/01/2027
 [book badge]    Bo tilmeldes: 06/01/2027
                                                   [Annuller] [Gem]
```

A ghosted mode is the dry run's expected booking; a draft on it previews as a cancellation or a booking in the words
of § Mockup — toast and preview.

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
  legend reads "Forventet efter præferencer".
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
| Table loading, checks 1, 2, 3 and 5 | 1 `/household/<S>/bookings` Uge or Måned; 2 the same, Dag; 3 `/dinner`; 5 `/household/<S>/allergies` | ✅ 2026-10-18 |
| Table loading, checks 4, 6 and 7 | 4 `/chef` Budget, a dinner in another round; 6 `/admin/economy`; 7 `/admin/households`, `/admin/users`, `/admin/system`, `/admin/allergies` on first load | open |
| A waiting-list placement happens once, check 12 | a locked dinner with someone waiting for Voksen: another household releases a Voksen ticket; the first in the Voksen line holds it | open; `household/preferences.e2e.spec.ts:296` red 2026-10-18 |
| A waiting-list placement happens once, checks 13 and 14 | `/chef` Rediger, Frigiv portioner; a locked dinner with a child ticket released and only adults waiting | ✅ 2026-10-18 |
| Chef alert words, checks 10 and 11 | `/chef` Rediger, one person waiting, then two or more | ✅ 2026-10-18 |
| Chef spending (the budget's words), checks 1–5 | `/chef?date=2026-11-10`, Budget open: 1 the dinner's heading and total row; 2 the round's heading and Middag cell; 3 the Madbestilling editor's round heading; 4 a dinner with a menu title; 5 phone, the spending tables scroll inside their box | open |

## ADR notes

| ADR | Change in this release |
|---|---|
| ADR-002 | 409 for a unique violation |
| ADR-006 | § URL Parameters and § URL Writes |
| ADR-007 | `storeAsyncData` and `apiRequest`, rules 7 to 10 |
| ADR-009 | rule 7, what a delete returns |
| ADR-010 | rule 6, a deprecated column's value; rule 7, `portions` filled on read |
| ADR-011 | at One intent path's landing, the waiting-list writes carry an OrderHistory row |
| ADR-012 | conditional spread in `where`, `Prisma.skip` in `data` |
| ADR-014 | `writeBatchOrEach`; at One intent path's landing, `linesBy` |
| ADR-015 | the waitlist clear in daily maintenance; the scaffold's idempotency through the generator; `sellTicketsToWaitlist` |
| ADR-016 | the claim bucket, the queue entry rows, the two deadline sets; rule 9, notification after the action; rule 10, a failed batch retried order by order; rule 11, one line per ticket type; at One intent path's landing, one path with `?preview=true` on both endpoints, the empty-draft preview, the matrix rows `absent, = NONE → CANCEL (recorded)` and `found, = NONE → LEAVE (recorded)` |
| ADR-017 | rules 6 and 7, texts in config modules under `app/config/` |
| ADR-018 | separators; table loading; the usage rules |
