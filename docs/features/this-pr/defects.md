# 0.9.1 defects

**Date:** 2026-10-27 | **Specs:** [chores-0.9.1.md](chores-0.9.1.md), [feature-notification-delivery.md](feature-notification-delivery.md)

The DRY and architecture review of the pull request, against `.claude/skills/architecture/SKILL.md` (Code rules),
`.claude/skills/dry/SKILL.md`, `docs/adr.md` and `docs/testing.md`. **Decision** holds the user's choice (fix in this
release, or the release it moves to) with its date; **Verified** holds the date the documentar read the reported fix in
the code and its specs, its commit, what the fix does and where to see it; **Signed off** holds the date the user
accepts the fix. A signed-off or no-change row moves to § Done.

## Notification delivery (5)

| # | Defect | Rule | Where | Owner | Decision | Verified | Signed off |
|---|---|---|---|---|---|---|---|
| 137 | The chef's waiting-list buildup notice links to the chef page without the chef's dinner | § Chef deadlines (the notice's link) | `waitlist.ts:111` | orchestrator | fix in 0.9.1, 2026-10-28: the link comes from `buildChefUrl` with the dinner's team and date, as the chef deadlines notice builds it; a chef with no team gets the dinner by its date | 2026-10-28 (34ff620, 148f965): `buildChefUrl` on the dinner's team and date; e2e in the ship run | |
| 138 | The chef deadlines notice's red lines say "i dag" ("Publicer menuen i dag", "Middagen er i dag") on a run the evening before the deadline's day | § Chef deadlines | `app/config/notificationTemplates.ts:87`, `:95` | orchestrator | fix in 0.9.1, 2026-10-28: the day word follows the deadline's day against the run's day, "i dag" or "i morgen", through the date utilities | 2026-10-28 (34ff620, 148f965): "i dag" or "i morgen" from the deadline's day against the run's day in Copenhagen (`isSameDayInTimezone`); e2e in the ship run | |
| 139 | The DAILY_MAINTENANCE job's chef deadlines step reads the active season with its dinners, then the dinners again | ADR-014 | `chef-deadlines.ts:94`, `:100` | orchestrator | fix in 0.9.1, 2026-10-28: the step reads the dinners once | 2026-10-28 (34ff620, 148f965): the dinners read once, from the season; e2e in the ship run | |
| 140 | An overdue deadline's line in the chef deadlines notice drops its countdown; the signed line format carries one on every missing deadline | § Chef deadlines (mockup) | `server/utils/sender/events/chef-deadlines.ts` | orchestrator | fix in 0.9.1, 2026-10-28: the line carries the time since its deadline ("2 dage siden") through the date utility | 2026-10-28 (34ff620, 148f965): the time since the deadline, "9 dage siden" (`formatTimeSince`); e2e in the ship run | |
| 136 | The order read with provenance (`GET /api/order?includeProvenance=true`) scans every USER_CLAIMED row of OrderHistory on each call (split from defect 131) | ADR-014 | `financesRepository.ts:740-745` | orchestrator | fix in 0.9.1, 2026-10-28: one lookup per order on the order's history index, a query fix | 2026-10-28 (34ff620, 148f965): one lookup per order on the order index, the latest by time then id; API case `chef/orderHistory.e2e.spec.ts:116`, in the ship run | |

## Booking views (3)

| # | Defect | Rule | Where | Owner | Decision | Verified | Signed off |
|---|---|---|---|---|---|---|---|
| 73 | DeadlineBadge carries two raw classes | ADR-018 | `DeadlineBadge.vue` | orchestrator | fix in 0.9.1, 2026-10-27 | 2026-10-27 (002c4ae): the badge binds the design system's deadline badge tokens. See QA #114 | |
| 74 | 79 `Pick` types in 21 files take parts of a domain type; 16 of them in files this pull request changes (`SavedRow` in `DinnerBookingForm.vue`, 12 in `useBookingUi.ts`, 3 in the waiting-list sender event). `ticketStateOf` takes a `Pick` because it reads both a desired order and a booked one | Domain types | `DinnerBookingForm.vue`, `useBookingUi.ts`, `useBooking.ts`, `server/utils/sender/events/waitlist.ts` | orchestrator | fix in 0.9.1, 2026-10-27 | 2026-10-28: the waiting-list sender event's three are gone; open: `SavedRow`, 11 in `useBookingUi.ts`, 67 in 19 files in all | |
| 109 | On a phone the budget box's round heading is wider than its box: "ex / inkl. moms" is cut off at the box's edge | ADR-018 | `CookingRoundSpending.vue`, `useTheSlopeDesignSystem.ts` (`COMPONENTS.dinnerBudget.roundHeading`, `boxLine`) | orchestrator | fix in 0.9.1, 2026-10-28: on a phone "ex / inkl. moms" takes its own line under the heading; desktop as it is | 2026-10-28: on a phone "ex / inkl. moms" wraps below the badge and the period, on the right (`COMPONENTS.dinnerBudget.headingLine`, `headingUnits`). See QA #122 | |

## Access, users, admin, layout (7)

| # | Defect | Rule | Where | Owner | Decision | Verified | Signed off |
|---|---|---|---|---|---|---|---|
| 48 | The allergy store's override flag is optional for one spec's sake | Code rule 1 | `stores/allergies.ts` | orchestrator, test-engineer | fix in 0.9.1, 2026-10-27 | 2026-10-28 (34ff620): each allergy change takes its override flag as a required argument; e2e in the ship run | |
| 49 | The override query has three shapes, one of them sending `adminBypass=false` | DRY | `allergies.ts`, `households.ts`, `bookings.ts` | orchestrator | fix in 0.9.1, 2026-10-27 | 2026-10-28 (34ff620): a member's move-out date and booking save send no override (`adminBypassQuery`); e2e in the ship run | |
| 50 | The partial user serializer lives in the repository; the serialized user schema has no reader | ADR-010 compliance 3 | `prismaRepository.ts`, `useCoreValidation.ts` | orchestrator | fix in 0.9.1, 2026-10-27 | 2026-10-28 (34ff620): a user update writes the fields it carries (`serializeUserUpdate`); e2e in the ship run | |
| 51 | The user display carries an appearance its read leaves out, so it reads the default | Code rule 7 | `useCoreValidation.ts` | orchestrator | fix in 0.9.1, 2026-10-27 | 2026-10-28 (34ff620): the user display read includes appearance (`USER_DISPLAY_SELECT`); e2e in the ship run | |
| 56 | The preference save takes a string map; its preview takes the typed week map | Domain types | `households.ts` | orchestrator | fix in 0.9.1, 2026-10-27 | 2026-10-28 (34ff620): preference saves take a typed week map; e2e in the ship run | |
| 147 | The chef page for a person on no team shows "Ingen madhold" in the info alert | ADR-018 | `/chef` (`MyTeamSelector.vue:97`) | orchestrator | fix in 0.9.1, 2026-10-28: it binds the design system's empty state alert, neutral and centred; reopened 2026-10-28 (QA #148: no calendar, nothing to open as a guest): `/chef` for a person on no team opens on the season's next dinner, as a visit to that dinner's team; "Ingen madhold" shows when no dinner is ahead | 2026-10-28: "Ingen madhold" binds `ALERTS.emptyState` (34ff620, 148f965); reopened, in flight | |
| 130 | The allergy poster's text and its Tilbage button read faint on the poster's white page | ADR-018 | `/admin/allergies/pdf` (`pages/admin/allergies/pdf.vue`) | orchestrator | fix in 0.9.1, 2026-10-28: Tilbage takes the Print button's style (`BUTTONS.primaryAction`); the poster's texts read in contrast on the white page | 2026-10-28: the page renders in light mode (`colorMode: 'light'`, `pdf.vue:13`) on `BG.page` through `COMPONENTS.allergyPoster`; Tilbage binds `BUTTONS.primaryAction` (`pdf.vue:64`); poster spec 4/4. Committed f4bb23f. See QA #132–#135; #132–#134 signed off 2026-10-28 | |

## Tests (1)

| # | Defect | Rule | Where | Owner | Decision | Verified | Signed off |
|---|---|---|---|---|---|---|---|
| 61 | Local copies of shared spec helpers: the icon reader three times, the test-id lookup six times, the price fields, rename wrappers of the default price | testing.md Rule 4 | the component specs | test-engineer | fix in 0.9.1, 2026-10-27 | 2026-10-28: 20 spec files read the shared helpers, `OrderFactory.priceFieldsOf` (34ff620); 2026-10-28: the `priceRowOf` alias gone, `useBooking.nuxt` 334/334; closes on its commit | |

## Done

- #22 Ticket type and price read the person's age today — 002c4ae, signed off 2026-10-27
- #24 Grid column chip counted the household's released tickets — 6a4f22e, signed off 2026-10-27
- #25 Booking features lacked 0-portion ticket examples — 002c4ae, signed off 2026-10-27
- #54 Household page raw classes, inline ui, icon literals — 002c4ae, signed off 2026-10-27
- #55 Three avatar groups patched ui inline — 002c4ae, signed off 2026-10-27
- #87 Billetændringer listed every household of a run unwrapped — fba24af, signed off 2026-10-27
- #93 Save and cancel buttons rendered at four sizes — b8c971b, signed off 2026-10-27
- #66 System tab's component-local read; ADR-007 exception reworded (542b274) — no change, 2026-10-27
- #75 No architecture rule fails a raw class — no change, 2026-10-27
- #23 Six tables kept their open row by position — 9e75cef, 542b274, signed off 2026-10-28
- #41 A price row's lookup and presentation built in three places — fba24af, a7f6285, signed off 2026-10-28
- #42 The day view wrote the released badge twice — 002c4ae, signed off 2026-10-28
- #43 A person's ticket counts filtered every order inside — a7f6285, signed off 2026-10-28
- #44 Three exports had no reader outside their spec — a7f6285, signed off 2026-10-28
- #45 The power save bound an empty object — b8c971b, signed off 2026-10-28
- #46 The guest form's draft type restated its schema — a7f6285, 71d02f0, signed off 2026-10-28
- #47 Two unreachable grid guards; count test ids without the row — a7f6285, signed off 2026-10-28
- #67 The runbook's dedupe key lacked the user part — 9e75cef, signed off 2026-10-28
- #68 The compliance row lacked `useExpandableRow`'s unit spec — 9e75cef, signed off 2026-10-28
- #69 testing.md listed six test helpers short — 9e75cef, signed off 2026-10-28
- #70 The guides read the booking views before this release — 9e75cef, signed off 2026-10-28
- #71 The economy Menu column read the wrong field — ea978dd, signed off 2026-10-28
- #95 The guest form copied the guest order builder — b8c971b, signed off 2026-10-28
- #98 The season import declared its own `getTeamNumber` — 6a4f22e, signed off 2026-10-28
- #99 `PUT /api/admin/team` failed on a parallel team delete — 542b274, signed off 2026-10-28
- #102 The budget's team round read "Hele Madhold 2" — 0d0144b, signed off 2026-10-27
- #103 The arrow marking the dinner on view wrapped — 0d0144b, signed off 2026-10-27
- #104 The team card showed a taken role only after a reload — 0d0144b, signed off 2026-10-27
- #120 No case held "a cancelled dinner sends no notification" — 2c32354, signed off 2026-10-28
- #121 Composables the server imports read `#imports` — 2c32354, signed off 2026-10-28
- #33 A dinner's buildup version counted the deliveries of every notification — f4bb23f, signed off 2026-10-28
- #131 A dinner's booking history read scanned the whole OrderHistory table: four indexes, `migrations/0019_indexes.sql`, applied on local, dev and prod — 67568cd, c4d3c44, signed off 2026-10-28
- #58 Three API specs repeated the notification features — deleted in 002c4ae, closed 2026-10-28
- #60 The DAILY_MAINTENANCE service spec covered the failed run only — 002c4ae, f4bb23f, closed 2026-10-28
- #62 The economy table spec passed the removed row key — `rowIdOf`, 002c4ae, closed 2026-10-28
- #63 The API error guard kept a declaration across cases — `openCase` resets them, 002c4ae, closed 2026-10-28
- #64 `Pick` types, a date mask literal and config literals in three test files — 002c4ae and later commits, closed 2026-10-28
- #65 The notification step pattern left out the chef deadline notice — `@fixme` off, f4bb23f, closed 2026-10-28
- #59 The sender specs copied the log spy and the channel-off value; the factory built references by hand — `deliveryReferencePrefix`, 34ff620, closed 2026-10-28
- #101 On a phone the visiting tab set "Ikke dit hold" beside the team icon — 34ff620, signed off 2026-10-28
- #150 A failed dinner write toasted the generic status text in place of its `TEAM_WORDS` failure word (since 345b2f5) — 5eb3841, signed off 2026-10-28
- #52 The job boxes matched stat icons by position — `jobRunStats`, `JobStat`, the bell on Notifikationer, 34ff620, signed off 2026-10-28
- #53 The column visibility helpers had no caller — removed with the team calendar's selection, 34ff620, 148f965, signed off 2026-10-28
- #57 The history table's header token repeated the table header's value — `table.historyUi` on `table.ui`, 34ff620, signed off 2026-10-28
- #38 The grid compared the view with a string — 9e75cef, signed off 2026-10-28
- #39 "Gæst af" written three times — fba24af, b8c971b, signed off 2026-10-28
- #40 The booking context built in each view — fba24af, signed off 2026-10-28
- #72 The grid read the household's residency once at setup — fba24af, signed off 2026-10-28
- #78 The chef page toasted four store actions — 002c4ae, signed off 2026-10-28
- #79 TeamRoleStatus named the role icons by raw name — 002c4ae, signed off 2026-10-28
- #82 The bookings store toasted six literal titles — fba24af, signed off 2026-10-28
- #86 The household page named its tabs as literals — 002c4ae, signed off 2026-10-28
- #96 Four pages named their meta tag by the page — 6a4f22e, signed off 2026-10-28
- #146 `DinnerBookingForm.nuxt.spec` logged an error after its last test — `NuxtIcon` stubbed, a flush after the unmount, 76/76, 34ff620, closed 2026-10-28
- #27 A booking status run read the season, its dinners and their deliveries twice — 39e14a6, 542b274, signed off 2026-10-28
- #29 A dry run wrote the sent-twice log line — 39e14a6, 542b274, signed off 2026-10-28
- #30 E-mail off logged a warning outside the `app: not queued` query — 39e14a6, 542b274, signed off 2026-10-28
- #31 The delivery dry run read the season before the e-mail channel — 39e14a6, 542b274, signed off 2026-10-28
- #32 "Nothing sent" was written in four places — 39e14a6, 542b274, signed off 2026-10-28
- #34 The composer took the notification kind as a string — 39e14a6, 542b274, signed off 2026-10-28
- #35 `jobRunId` was an option no caller passed; the options were `Pick` types — 39e14a6, 542b274, signed off 2026-10-28
- #36 The background booking notification call was copied at eight routes — 39e14a6, 542b274, signed off 2026-10-28
- #37 Each delivery scanned the recorded deliveries twice — 39e14a6, 542b274, signed off 2026-10-28
