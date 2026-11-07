# 0.9.1 chores

**Status:** Feature complete 2026-11-05, the ship gate green 2026-11-07 | **Date:** 2026-10-08 | **Builds on:** release 0.9 (`../release-0.9.0.md` § Prisma bundle)

The release carries one migration, four indexes (defect 131, `migrations/0019_indexes.sql`, c4d3c44); the other schema
work is in `../../release-0.9.3/feature-0.9.3.md`. Release 0.9 shipped in f5b5205 (#168).

QA with human eyes: [qa.md](qa.md), every check signed off. Review defects: [defects.md](defects.md), every row fixed
and verified; the ship gate's e2e closes them.

## Delivered

| Delivery | Description or spec | Gherkin | Status |
|---|---|---|---|
| Workflow checks | `run:` reads `${{ }}` through `env`; `pre:all` runs CodeQL's Actions queries | – | done 93834f4 |
| Household data access and GET previews | ADR-004 § Access; previews are GETs | – | done 52c5d68 |
| Three faces on a phone (#171) | Three faces below md, five from md | – | done 0b6d7d0, signed off 2026-10-27 |
| One master-detail layout (#169) | `LAYOUTS.masterDetailPage` on the list-and-detail pages | – | done 0b6d7d0, signed off 2026-10-27 |
| Tests at the lowest level | Access cases per `docs/testing.md` Rule 0 | – | done ef54aa6 |
| Ticket counts per person | `personTicketCounts` in `useOrder` for the grid's name cell | – | done 4349c92, 8401b44, a7f6285 |
| UI cases fail on an unexpected API error | An undeclared 4xx or 5xx fails the UI case (`apiErrorGuard.ts`) | – | done 52c5d68, fc87352 |
| Dev-server flakes in CI | Three retry flakes fixed; a dropped D1 connection answers 503 | – | done 4349c92, fc87352 |
| Preferences at an inhabitant's creation | `InhabitantCreateSchema` omits `dinnerPreferences` | – | done 6a0b5e7 |
| User saves and deserializers | Partial save by id; one deserializer per user type | – | done f7a4b6f, signed off 2026-10-27 |
| The job boxes' latest run | Each job box reads its own latest run (`AdminSystem.vue`) | – | done 17c3401, signed off 2026-10-27 |
| Zero-portion tickets get a place | Books and cancels as before the deadline (ADR-016) | – | done 17c3401, signed off 2026-10-27 |
| Tables keep their columns on a phone | Job history and users scroll sideways | – | done d159610, signed off 2026-10-27 |
| Tables key their rows by id | `getRowId`, `useExpandableRow` | – | done ea978dd, d159610, 6a4f22e, 542b274, signed off 2026-10-27 |
| The grid shows the day view's tickets | `BookingGridView.vue` header | – | done ea978dd, aa1e6e3, 002c4ae, 6a4f22e, signed off 2026-10-27 |
| Chef calendar visit | A member opens another team's dinners from the chef calendar; a member on no team lands on the next dinner's team; the own teams, the users and the allergy managers load when a page asks (`loadMyTeams`, `loadUsers`, `loadAllergyManagers`), so `/chef` paints the visited team on the server render (ADR-007 compliance 9); mockups in `pages/chef/index.vue`, `MyTeamSelector.vue` | `chef-page.feature` | done 002c4ae, fba24af, 34ff620, 148f965, 65bfaa1, 694b803; signed off 2026-10-28 and 2026-11-02 |
| One path for the grid and the day view | ADR-016 compliance 13; `personOnDinner`, `guestItemsOf`, `useExpectedBookings`, `isDinnerCancelled` | – | done 9e75cef, fba24af, a7f6285, 2c32354 |
| Scaffold: a save naming an order bought by another household | The save lists it in `failed` and the rest lands; unit case `scaffoldPrebookings.unit.spec.ts:314` | – | done f5b5205 |
| Minimal test seasons | A season spans the dinners its cases prove (`docs/testing.md` § Strategy: Control the Season, Control the Deadline) | – | done 2c32354 |
| The app reads the time through `useClock` | ADR-017 compliance 8; the server render and the client agree on the minute | – | done 542b274 |
| Delete responses | A bulk delete reports the ids it read before the delete; a single delete answers the deleted id (ADR-009 rule 7) | – | done f4bb23f |
| Avatar ring colours | Each face rings in its surface's semantic colour (`docs/ui.md` § Faces) | – | done f4bb23f, signed off 2026-10-28 |
| Heynabo logo on the import's job box | `/admin/system`; mockup in `AdminSystem.vue` | – | done 3dbea43, signed off 2026-10-29 |
| Unit suite under load | The worker cap (`vitest.config.ts`, half the cores); `untilTrue` in `HouseholdBookings.nuxt.spec.ts`; the session mock holds nuxt-auth-utils' `User` (`hoistedMocks.ts`) | – | done da5dbf9, 6e72c11 |
| Cleanup steps run independently | Every cleanup step runs, a delete accepts a 404, the failures fail the hook together: `attemptAll` in `tests/e2e/testHelpers.ts`, the rule in `docs/testing.md` § Cleanup | – | done 923f9fd |
| Notification delivery | [feature-notification-delivery.md](feature-notification-delivery.md); the DAILY_MAINTENANCE job runs both notification steps and completes PARTIAL on a failed one, a background run logs its failure, a dinner deleted meanwhile leaves only its own notifications out (defects 155–157) | `booking-notifications.feature`, `billing-notifications.feature`, `chef-deadline-notifications.feature`, `delivery-records.feature`, `test-message.feature` | done 8fa59aa, 39e14a6, 16586f1, 542b274, f4bb23f, 34ff620, da5dbf9, 6e72c11; signed off 2026-10-27 |
| Words in `app/config/` | Every word users read lives in a config module (ADR-017 compliance 6, 7; defect 158): the calendar, spending, store and validation sweeps; the menu keeps its item names as its own config; the household card's preferences help reads the booking selector's mode words; every "kr" through `PRICE_WORDS.kroner`; `CookingTeamBadges` takes a size | – | done 3dbea43, fe67464, da5dbf9, 6e72c11, 923f9fd, 694b803 |
| Typed rows and no casts | Typed row schemas (ADR-010 compliance 3; defect 74), weekday maps and route params typed, the household page's redirect keeping its query (ADR-006 compliance 4), `useBooking`, `useBookingUi` and the waiting-list mail without casts, `NonEmpty<T>` | – | done 5eb3841, 3dbea43, fe67464, 923f9fd |
| Danger button contrast | `COMPONENTS.dangerButton` per mode, `TEXT.onFill`; the contrast gate measures the ink on the gradient's stops | – | done 694b803, signed off 2026-11-02 |
| Page header | The header follows the framework's own: collapses at md in every part, the drawer closing past md, the links by breakpoint so the desktop first paint has no jump, the spoken names, one sticky bar on `COMPONENTS.pageHeader`; the logo sized for Firefox, the drawer's help reads Hjælp | – | done 694b803, 5131622; signed off 2026-11-05 |
| Power mode's preview as one run | `?allInhabitants=true` on the preferences GET and POST: one scaffold over every inhabitant's draft, the store sends one request (defect 159) | `preferences.feature` | done e2bee68 |
| Heynabo token on the server | The token lives in the session's server-only `secure` data (`getRequiredHeynaboToken`); a chef write without it answers 401 (ADR-013; defect 160); route and middleware specs (`docs/testing.md` § Route and Middleware Testing) | – | done 624ce70 |
| Guides | `docs/chef-guide.md`, `docs/user-guide.md`, `docs/admin-guide.md` in step with 0.9.1 | – | done 923f9fd |
| Cost line types | The economy's cost line reads the domain types, an order or a transaction by kind; the order index under `includeCostContext` returns the dinner and eater as Display types (ADR-009); an eater's name comes from the order, the admin PBS view groups by the eater's household | – | done 3810af0, signed off 2026-11-02 |
| Chunked writes | `chunkTeamAssignments`; the Heynabo import's `chunkSaves` and `chunkUserLinks` in `useHeynabo`, 50 links per call (ADR-014) | – | done 3810af0 |
| Snapshot types | `OrderSnapshot` on a transaction, `OrderAuditSnapshot` on a history row, stated once in `fragments/domainFragments`; the stored keys and the written JSON unchanged | – | done 3810af0 |
| Hand-rolled Nuxt UI types | The design system and five components type their Nuxt UI bindings from the framework's own types; the rendered HTML identical | – | done a0a36a0 |
| Order spec non-null assertions | The order specs read through `present` and `itemAt` (`tests/component/listHelpers.ts`); `docs/testing.md`'s examples follow | – | done a0a36a0 |
| Raw JSON in the job history | A season import run's Resultat cell reads as stats | – | done a0a36a0 |
| Unused household prop | The prop goes; the economy tables keep the app's table loading pattern, the household's economy tab's Loader covers the first load only (decided 2026-11-02) | – | done 3810af0 |
| teamService duplicate | A team save is the one trigger for assigning a season's teams; the two season assign endpoints and their response types go (decided 2026-11-02) | – | done 3810af0 |
| Toast copies in components | The store reports its action's result (ADR-007): no green toast on a failed season activation, one warning toast on a failed save (decided 2026-11-05, a failed save is no error), the check icon on the allergy, expense and menu toasts; deactivating with no active season is idempotent | – | done 29bfa22, e2bee68, fd21bbd |
| Household tabs without a household; household link without tab | The tabs branch on `isNoHouseholds`; a link carrying no tab opens the household page | – | done e2bee68 |
| Definite assignment; error status casts | The server assigns its values on every path; the error status reads lose their casts | – | done e2bee68 |
| Heynabo import POST | The admin's Heynabo import runs as a POST | `cron-jobs.feature` | done 624ce70 |
| Job trigger writers | The job endpoints and the user list validate their query (ADR-002); `JobTriggerSchema` (`CRON`, `ADMIN`), `adminTrigger`; the `schema.prisma` comment names `ADMIN:season-import` | – | done 624ce70, 187f731 |
| Raw date masks | Two date-with-weekday formats remain, one root in `app/utils/date.ts`; the preview's separators `tor. 22/10`, the grid's column date padded, the chef mail's moments `10/10/2026 18:00` | – | done 29e0e66, signed off 2026-11-05 |
| Inline dinner schema | The team and booking dinner schemas build on `DinnerEventFragmentSchema`; `AdminTeams` reads `BUTTON_WORDS.back` | – | done 29e0e66 |
| Uncaught failed writes | A failed store write in a component handler is caught and logged in the ADR-004 format; no empty catch remains in `app/` | – | done fd21bbd |
| Eslint skips public routes | `eslint.config.mjs` unignores `app/pages/public/` and `server/routes/api/public/` | – | done 187f731 |
| DinnerDetailPanel raw classes; share links button; help button name; help texts without a route | `COMPONENTS.dinnerDetailPanel`; the external link a `UButton` with `to`; Hjælp as the help's spoken name; the admin help entries no tab reaches go | – | done 187f731 |
| Spec non-null assertions; API specs that repeat BDD features | `MyTeamSelector.nuxt` and `Login.e2e` through `present` and `itemAt`; `sender-event-test.e2e`'s member-403 case goes (`test-message.feature` covers it) | – | done 09ee166 |
| Delivery dry run covers both gated events | `GET /api/admin/sender/delivery?dryRun=` takes `BOOKING_STATUS` or `CHEF_DEADLINES`; `make theslope-sender-dry-run-booking-emails-<env>` reads both, so the dry run shows every mail the flag gates (found on the prod check: the chef deadline notices were missing) | `booking-notifications.feature`, `chef-deadline-notifications.feature` | in the tree 2026-11-07 (v 198/198, eslint 0); open: its BDD run |
| Workflow lint recovers | `make lint-gh-actions` removes `.output/codeql-actions` before `gh codeql database create`, so a half-built database from an interrupted run no longer fails `pre:all` | – | in the tree 2026-11-07 |

## Ship

The gate on the tree, 2026-11-07: lint 0, the workflow lint green, C4 clean, ts, ts:server, ts:node and ts:workers 0,
v 3365/3365 (184 files); pw-api 250/253 (3 skipped: the local-only import specs on gitignored files), pw-e2e 124/126
(UI parallel 98/100, serial 26/26), bdd 59/59 (api 36, ui 23). The two UI reds, `AdminTeams.e2e.spec.ts:246` and
`:286`, are timeouts of the parallel run that pass alone (9/9 earlier the same day): load, on the flake watch. The
gate closes defects 136–140, 48–51 and 56.

| Step | State |
|---|---|
| CI on the final commit | 42410074984 red at `d1-prisma-check`: the `schema.prisma` comment change needs `make d1-prisma` (the generated client embeds the schema text), the regenerated `prisma/generated/client/internal/class.ts` goes in your commit; then a green run to read |
| The PR body | the spec pointer to `archived/release-0.9.1/`, the Tests from the gate |
| `user/preferences.e2e.spec.ts` (5 cases), covered by `user/preferences.feature` and `test-message.feature` | its removal waits for your yes; defects 50 and 51 then read the feature |
| The test-engineer's deferred items: the date sweep in `Dinner.e2e.spec.ts:49-57`, the BDD moves of the ten lookup specs and `Waitlist.e2e.spec.ts:87` | not started; 0.9.1 or the next release, your call |
